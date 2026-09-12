package com.company.warehouse.wes.business.process.flow;

import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletFlowContext implements Serializable {

    private UUID taskId;
    private String taskNumber;
    private String palletLpn;
    private String palletTypeCode;
    private String itemCode;
    private String skuCode;
    private BigDecimal quantity;
    private String uom;
    private String lotNumber;
    private LocalDate expiryDate;
    private BigDecimal actualWeightKg;
    private String sourceLocation;
    private String operatorId;
    private String inboundType;

    // Workflow state populated during execution
    private int currentSequence;
    private String preAnnounceId;
    private String wmsOrderId;
    private String wmsOrderNumber;
    private String reservationId;
    private String outboundStageLocation;
    private String failureReason;

    public static PalletFlowContext fromValidationContext(PalletValidationContext valCtx, UUID taskId, String taskNumber) {
        return PalletFlowContext.builder()
                .taskId(taskId)
                .taskNumber(taskNumber)
                .palletLpn(valCtx.getPalletLpn())
                .palletTypeCode(valCtx.getPalletTypeCode())
                .itemCode(valCtx.getItemCode())
                .skuCode(valCtx.getSkuCode())
                .quantity(valCtx.getQuantity())
                .uom(valCtx.getRequest().getUom())
                .lotNumber(valCtx.getLotNumber())
                .expiryDate(valCtx.getExpiryDate())
                .actualWeightKg(valCtx.getActualWeightKg())
                .sourceLocation(valCtx.getSourceLocation())
                .operatorId(valCtx.getOperatorId())
                .inboundType(valCtx.getInboundType())
                .currentSequence(1)
                .build();
    }
}
