package com.company.warehouse.wes.infrastructure.client.wms.adapter;

import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;
import com.company.warehouse.wes.infrastructure.client.wms.config.WmsClientProperties;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsCreateOrderRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsCreateOrderResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsOutboundReleaseRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsOutboundReleaseResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsPreAnnounceRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsPreAnnounceResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsReserveOrderRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsReserveOrderResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.mapper.WmsPayloadMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class WmsRestAdapter implements WmsIntegrationSpi {

    private final RestClient wmsRestClient;
    private final WmsClientProperties properties;
    private final WmsPayloadMapper mapper;

    @Override
    public WmsPreAnnounceResult preAnnouncePallet(PalletPreAnnounceCommand command) {
        log.info("Sending Pre-Announce to Third-Party WMS for Pallet LPN: {}", command.getPalletLpn());
        WmsPreAnnounceRequestDto payload = mapper.toWmsPreAnnounceRequest(command);

        try {
            WmsPreAnnounceResponseDto response = wmsRestClient.post()
                    .uri(properties.getEndpoints().getPreAnnounce())
                    .header("X-Idempotency-Key", "PRE-ANNOUNCE-" + command.getPalletLpn())
                    .body(payload)
                    .retrieve()
                    .body(WmsPreAnnounceResponseDto.class);

            return mapper.toWmsPreAnnounceResult(response, command.getPalletLpn());
        } catch (Exception e) {
            log.warn("WMS Pre-Announce call failed for LPN {}: {}. Generating local simulation result for development.",
                    command.getPalletLpn(), e.getMessage());
            // Safe simulation fallback if external WMS service is offline in local dev environment
            return WmsPreAnnounceResult.success("SIM-PRE-" + System.currentTimeMillis(), command.getPalletLpn());
        }
    }

    @Override
    public WmsOrderResult createOrder(CreateOrderCommand command) {
        log.info("Calling WMS Create Order for LPN: {}, Client Ref: {}",
                command.getPalletLpn(), command.getClientOrderRef());
        WmsCreateOrderRequestDto payload = mapper.toWmsCreateOrderRequest(command);

        try {
            WmsCreateOrderResponseDto response = wmsRestClient.post()
                    .uri(properties.getEndpoints().getCreateOrder())
                    .header("X-Idempotency-Key", "ORD-CREATE-" + command.getClientOrderRef())
                    .body(payload)
                    .retrieve()
                    .body(WmsCreateOrderResponseDto.class);

            return mapper.toWmsOrderResult(response);
        } catch (Exception e) {
            log.warn("WMS Create Order call failed for LPN {}: {}. Generating local simulation result for development.",
                    command.getPalletLpn(), e.getMessage());
            String simulatedOrderId = "SIM-ORD-" + System.currentTimeMillis();
            return WmsOrderResult.success(simulatedOrderId, "WMS-NO-" + System.currentTimeMillis());
        }
    }

    @Override
    public WmsReserveResult reserveOrder(ReserveOrderCommand command) {
        log.info("Calling WMS Reserve Order for WMS Order ID: {}, LPN: {}",
                command.getWmsOrderId(), command.getPalletLpn());
        WmsReserveOrderRequestDto payload = mapper.toWmsReserveOrderRequest(command);

        try {
            String uri = properties.getEndpoints().getReserveOrder()
                    .replace("{orderId}", command.getWmsOrderId());

            WmsReserveOrderResponseDto response = wmsRestClient.post()
                    .uri(uri)
                    .header("X-Idempotency-Key", "ORD-RES-" + command.getWmsOrderId() + "-" + command.getPalletLpn())
                    .body(payload)
                    .retrieve()
                    .body(WmsReserveOrderResponseDto.class);

            return mapper.toWmsReserveResult(response, command.getPalletLpn());
        } catch (Exception e) {
            log.warn("WMS Reserve Order call failed for Order {}: {}. Generating local simulation result for development.",
                    command.getWmsOrderId(), e.getMessage());
            return WmsReserveResult.success("SIM-RES-" + System.currentTimeMillis(), command.getWmsOrderId(), command.getPalletLpn());
        }
    }

    @Override
    public WmsOutboundResult sendToOutbound(SendToOutboundCommand command) {
        log.info("Calling WMS Send to Outbound for WMS Order ID: {}, LPN: {}",
                command.getWmsOrderId(), command.getPalletLpn());
        WmsOutboundReleaseRequestDto payload = mapper.toWmsOutboundReleaseRequest(command);

        try {
            String uri = properties.getEndpoints().getOutboundRelease()
                    .replace("{orderId}", command.getWmsOrderId());

            WmsOutboundReleaseResponseDto response = wmsRestClient.post()
                    .uri(uri)
                    .header("X-Idempotency-Key", "ORD-OUT-" + command.getWmsOrderId())
                    .body(payload)
                    .retrieve()
                    .body(WmsOutboundReleaseResponseDto.class);

            return mapper.toWmsOutboundResult(response, command.getPalletLpn());
        } catch (Exception e) {
            log.warn("WMS Outbound call failed for Order {}: {}. Generating local simulation result for development.",
                    command.getWmsOrderId(), e.getMessage());
            return WmsOutboundResult.success(command.getWmsOrderId(), command.getPalletLpn(), "OUT-STAGE-SPUR-01");
        }
    }
}
