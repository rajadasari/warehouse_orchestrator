package com.company.warehouse.wes.infrastructure.client.wms.mapper;

import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsCreateOrderRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsCreateOrderResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsOutboundReleaseRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsOutboundReleaseResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsPreAnnounceRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsPreAnnounceResponseDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsReserveOrderRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.WmsReserveOrderResponseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WmsPayloadMapper {

    @Mapping(target = "grossWeightKg", source = "actualWeightKg")
    @Mapping(target = "receivingLocation", source = "sourceLocation")
    @Mapping(target = "receiptTimestamp", expression = "java(java.time.Instant.now().toString())")
    WmsPreAnnounceRequestDto toWmsPreAnnounceRequest(PalletPreAnnounceCommand command);

    default WmsPreAnnounceResult toWmsPreAnnounceResult(WmsPreAnnounceResponseDto response, String palletLpn) {
        if (response == null) {
            return WmsPreAnnounceResult.failure(palletLpn, "No response received from WMS");
        }
        if (!response.isSuccess() && !"ACCEPTED".equalsIgnoreCase(response.getStatus())) {
            return WmsPreAnnounceResult.failure(palletLpn, response.getMessage() != null ? response.getMessage() : "Pre-announce rejected by WMS");
        }
        return WmsPreAnnounceResult.success(response.getPreAnnounceId(), palletLpn);
    }

    WmsCreateOrderRequestDto toWmsCreateOrderRequest(CreateOrderCommand command);

    default WmsOrderResult toWmsOrderResult(WmsCreateOrderResponseDto response) {
        if (response == null) {
            return WmsOrderResult.failure("No response received from WMS for order creation");
        }
        if (!response.isSuccess() && !"CREATED".equalsIgnoreCase(response.getStatus())) {
            return WmsOrderResult.failure(response.getMessage() != null ? response.getMessage() : "Order creation failed in WMS");
        }
        return WmsOrderResult.success(response.getWmsOrderId(), response.getOrderNumber());
    }

    @Mapping(target = "reserveStrategy", constant = "HARD_ALLOCATION")
    WmsReserveOrderRequestDto toWmsReserveOrderRequest(ReserveOrderCommand command);

    default WmsReserveResult toWmsReserveResult(WmsReserveOrderResponseDto response, String palletLpn) {
        if (response == null) {
            return WmsReserveResult.failure("No response received from WMS for order reservation");
        }
        if (!response.isSuccess() && !"RESERVED".equalsIgnoreCase(response.getStatus())) {
            return WmsReserveResult.failure(response.getMessage() != null ? response.getMessage() : "Order reservation failed in WMS");
        }
        return WmsReserveResult.success(response.getReservationId(), response.getWmsOrderId(), palletLpn);
    }

    WmsOutboundReleaseRequestDto toWmsOutboundReleaseRequest(SendToOutboundCommand command);

    default WmsOutboundResult toWmsOutboundResult(WmsOutboundReleaseResponseDto response, String palletLpn) {
        if (response == null) {
            return WmsOutboundResult.failure("No response received from WMS for outbound release");
        }
        if (!response.isSuccess() && !"RELEASED".equalsIgnoreCase(response.getStatus())) {
            return WmsOutboundResult.failure(response.getMessage() != null ? response.getMessage() : "Outbound release failed in WMS");
        }
        return WmsOutboundResult.success(response.getWmsOrderId(), palletLpn, response.getOutboundStageSpur());
    }
}
