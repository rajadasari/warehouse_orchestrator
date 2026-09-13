package com.company.warehouse.wes.business.process.flow;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.common.core.enums.ValidationOutcome;
import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.business.process.step.PalletFlowStepHandler;
import com.company.warehouse.wes.business.process.step.WmsCreateOrderStepHandler;
import com.company.warehouse.wes.business.process.step.WmsPreAnnounceStepHandler;
import com.company.warehouse.wes.business.process.step.WmsReserveOrderStepHandler;
import com.company.warehouse.wes.business.process.step.WmsSendToOutboundStepHandler;
import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.subvalidators.tier3.PalletLotTrackingValidator;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.common.client.software.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.infrastructure.adapter.wms.WmsClientProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PalletFlowPipelineTest {

    @Mock
    private WmsIntegrationSpi wmsSpi;

    @Mock
    private TaskTrackingEngine taskTrackingEngine;

    @Mock
    private com.company.warehouse.wes.business.resource.ResourceManager resourceManager;

    private DynamicPayloadEngine dynamicEngine;
    private PalletFlowCoordinator coordinator;

    @BeforeEach
    void setUp() {
        dynamicEngine = new DynamicPayloadEngine(new ObjectMapper().findAndRegisterModules());

        PalletFlowStepHandler preAnnounceHandler = new WmsPreAnnounceStepHandler(wmsSpi, taskTrackingEngine);
        PalletFlowStepHandler createOrderHandler = new WmsCreateOrderStepHandler(wmsSpi, taskTrackingEngine);
        PalletFlowStepHandler reserveOrderHandler = new WmsReserveOrderStepHandler(wmsSpi, taskTrackingEngine);
        PalletFlowStepHandler sendOutboundHandler = new WmsSendToOutboundStepHandler(wmsSpi, taskTrackingEngine);

        coordinator = new PalletFlowCoordinator(List.of(
                preAnnounceHandler,
                createOrderHandler,
                reserveOrderHandler,
                sendOutboundHandler
        ));
    }

    @Test
    @DisplayName("Field-Level Validation: Missing lot on raw material inbound triggers REJECT on field 'lotNumber'")
    void testFieldLevelLotValidation_MissingLot_Rejects() {
        PalletLotTrackingValidator validator = new PalletLotTrackingValidator();

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("PAL-LOT-001")
                .itemCode("MAT-SUGAR-RAW")
                .inboundType("RAW_MATERIAL_PO")
                .lotNumber("") // Missing!
                .build();

        PalletValidationContext ctx = new PalletValidationContext(request);
        ctx.setResolvedItem(ItemMasterEntity.builder().itemCode("MAT-SUGAR-RAW").itemType("RAW_MATERIAL").build());

        ValidationResult result = new ValidationResult();
        validator.validate(ctx, result);

        assertThat(result.isRejected()).isTrue();
        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getErrors().get(0).getField()).isEqualTo("lotNumber");
        assertThat(result.getErrors().get(0).getCode()).isEqualTo("LOT_NUMBER_REQUIRED");
    }

    @Test
    @DisplayName("Dynamic Payload Engine: Resolves template dynamically for outbound WMS call")
    void testDynamicPayloadGeneration() throws Exception {
        PalletPreAnnounceCommand command = PalletPreAnnounceCommand.builder()
                .palletLpn("PAL-FILTER-001")
                .palletTypeCode("EUR_WOOD")
                .itemCode("MAT-MILK-POWDER")
                .skuCode("SKU-MILK-25KG")
                .quantity(BigDecimal.valueOf(40))
                .uom("BAG")
                .lotNumber("LOT-2026-X")
                .expiryDate(LocalDate.of(2027, 1, 1))
                .actualWeightKg(BigDecimal.valueOf(1020))
                .sourceLocation("RCV-DOCK-02")
                .build();

        String template = "{\"palletLpn\": \"{{pallet.palletLpn}}\", \"grossWeightKg\": \"{{pallet.actualWeightKg}}\", \"receivingLocation\": \"{{pallet.sourceLocation}}\"}";
        Map<String, Object> context = Map.of("pallet", command);

        String payload = dynamicEngine.buildPayload(template, context);

        com.fasterxml.jackson.databind.JsonNode rootNode = new ObjectMapper().readTree(payload);
        assertThat(rootNode.get("palletLpn").asText()).isEqualTo("PAL-FILTER-001");
        assertThat(rootNode.get("grossWeightKg").asDouble()).isEqualTo(1020.0);
        assertThat(rootNode.get("receivingLocation").asText()).isEqualTo("RCV-DOCK-02");
    }

    @Test
    @DisplayName("Token Manager: Handles unreachable endpoint without simulated tokens")
    void testTokenManagerCaching() {
        WmsClientProperties props = new WmsClientProperties();
        props.setEnabled(true);
        props.setClientId("client-1");
        props.setClientSecret("secret-1");

        TokenManager tokenManager = new TokenManager(props, resourceManager, new ObjectMapper());
        String token1 = tokenManager.getBearerToken();
        String token2 = tokenManager.getBearerToken();

        assertThat(token1).isNull();
        assertThat(token2).isNull();
        assertThat(tokenManager.getStatus().isHasToken()).isFalse();
    }

    @Test
    @DisplayName("Pallet Flow Pipeline: Full 4-step execution completes successfully")
    void testFullPalletFlowPipelineExecution() {
        UUID taskId = UUID.randomUUID();
        String taskNumber = "TSK-INB-999";
        String lpn = "PAL-FLOW-100";

        PalletFlowContext context = PalletFlowContext.builder()
                .taskId(taskId)
                .taskNumber(taskNumber)
                .palletLpn(lpn)
                .palletTypeCode("EUR_WOOD")
                .itemCode("MAT-ALMOND-01")
                .skuCode("SKU-ALMOND-10KG")
                .quantity(BigDecimal.valueOf(50))
                .uom("BAG")
                .lotNumber("LOT-ALM-55")
                .actualWeightKg(BigDecimal.valueOf(520))
                .sourceLocation("RCV-DOCK-01")
                .build();

        when(wmsSpi.preAnnouncePallet(any(PalletPreAnnounceCommand.class)))
                .thenReturn(WmsPreAnnounceResult.success("PRE-ACK-100", lpn));

        when(wmsSpi.createOrder(any(CreateOrderCommand.class)))
                .thenReturn(WmsOrderResult.success("WMS-ORD-77", "ORD-NUM-77"));

        when(wmsSpi.reserveOrder(any(ReserveOrderCommand.class)))
                .thenReturn(WmsReserveResult.success("RES-55", "WMS-ORD-77", lpn));

        when(wmsSpi.sendToOutbound(any(SendToOutboundCommand.class)))
                .thenReturn(WmsOutboundResult.success("WMS-ORD-77", lpn, "OUTBOUND-STAGE-SPUR-02"));

        boolean pipelineResult = coordinator.executeFlow(context);

        assertThat(pipelineResult).isTrue();
        assertThat(context.getPreAnnounceId()).isEqualTo("PRE-ACK-100");
        assertThat(context.getWmsOrderId()).isEqualTo("WMS-ORD-77");
        assertThat(context.getReservationId()).isEqualTo("RES-55");
        assertThat(context.getOutboundStageLocation()).isEqualTo("OUTBOUND-STAGE-SPUR-02");

        verify(wmsSpi).preAnnouncePallet(any());
        verify(wmsSpi).createOrder(any());
        verify(wmsSpi).reserveOrder(any());
        verify(wmsSpi).sendToOutbound(any());
    }
}
