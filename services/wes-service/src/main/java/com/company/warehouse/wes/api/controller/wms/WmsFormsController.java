package com.company.warehouse.wes.api.controller.wms;

import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;
import com.company.warehouse.wes.data.entity.WmsTransactionLogEntity;
import com.company.warehouse.wes.data.repository.WmsTransactionLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/wms")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WmsFormsController {

    private final WmsIntegrationSpi wmsSpi;
    private final WmsTransactionLogRepository transactionLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Dispatch Pallet Pre-Announce to Third-Party WMS using saved Bearer Token.
     */
    @PostMapping("/pre-announce")
    public ResponseEntity<WmsPreAnnounceResult> preAnnouncePallet(@RequestBody PalletPreAnnounceCommand command) {
        log.info("Received WMS Form Pre-Announce for Pallet LPN: {}, Target Resource: {}",
                command.getPalletLpn(), command.getTargetResourceId());
        WmsPreAnnounceResult result = wmsSpi.preAnnouncePallet(command);

        String targetResource = command.getTargetResourceId() != null && !command.getTargetResourceId().trim().isEmpty()
                ? command.getTargetResourceId().trim()
                : "LOGIQS-AMBIENT-WMS";

        saveTransactionLog(
                "PRE_ANNOUNCE",
                command.getPalletLpn(),
                targetResource,
                result.getPreAnnounceId(),
                result.isSuccessful() ? "SUCCESS" : "FAILED",
                result.isSuccessful() ? "Pre-announce acknowledged by WMS [" + targetResource + "]" : result.getErrorMessage(),
                command,
                result
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Dispatch Order Creation to Third-Party WMS.
     */
    @PostMapping("/orders/create")
    public ResponseEntity<WmsOrderResult> createOrder(@RequestBody CreateOrderCommand command) {
        log.info("Received WMS Form Create Order for LPN: {}, Client Ref: {}", command.getPalletLpn(), command.getClientOrderRef());
        WmsOrderResult result = wmsSpi.createOrder(command);

        saveTransactionLog(
                "CREATE_ORDER",
                command.getPalletLpn(),
                command.getClientOrderRef(),
                result.getWmsOrderId(),
                result.isSuccessful() ? "SUCCESS" : "FAILED",
                result.isSuccessful() ? "WMS Order Number: " + result.getOrderNumber() : result.getErrorMessage(),
                command,
                result
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Dispatch Order Reservation to Third-Party WMS.
     */
    @PostMapping("/orders/reserve")
    public ResponseEntity<WmsReserveResult> reserveOrder(@RequestBody ReserveOrderCommand command) {
        log.info("Received WMS Form Reserve Order for Order ID: {}, LPN: {}", command.getWmsOrderId(), command.getPalletLpn());
        WmsReserveResult result = wmsSpi.reserveOrder(command);

        saveTransactionLog(
                "RESERVE_ORDER",
                command.getPalletLpn(),
                null,
                result.getReservationId(),
                result.isSuccessful() ? "SUCCESS" : "FAILED",
                result.isSuccessful() ? "Reservation confirmed for order " + command.getWmsOrderId() : result.getErrorMessage(),
                command,
                result
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Dispatch Send to Outbound to Third-Party WMS.
     */
    @PostMapping("/orders/release")
    public ResponseEntity<WmsOutboundResult> sendToOutbound(@RequestBody SendToOutboundCommand command) {
        log.info("Received WMS Form Send to Outbound for Order ID: {}, LPN: {}", command.getWmsOrderId(), command.getPalletLpn());
        WmsOutboundResult result = wmsSpi.sendToOutbound(command);

        saveTransactionLog(
                "OUTBOUND_RELEASE",
                command.getPalletLpn(),
                null,
                command.getWmsOrderId(),
                result.isSuccessful() ? "SUCCESS" : "FAILED",
                result.isSuccessful() ? "Released to Spur: " + result.getOutboundStageSpur() : result.getErrorMessage(),
                command,
                result
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Fetch recent WMS transactions for operator audit trail in the UI.
     */
    @GetMapping("/transactions")
    public ResponseEntity<List<WmsTransactionLogEntity>> getRecentTransactions() {
        return ResponseEntity.ok(transactionLogRepository.findTop50ByOrderByCreatedAtDesc());
    }

    private void saveTransactionLog(
            String type,
            String lpn,
            String orderRef,
            String refId,
            String status,
            String details,
            Object requestPayloadObj,
            Object responsePayloadObj
    ) {
        try {
            String jsonRequest = requestPayloadObj != null ? objectMapper.writeValueAsString(requestPayloadObj) : "{}";
            String jsonResponse = responsePayloadObj != null ? objectMapper.writeValueAsString(responsePayloadObj) : "{}";

            WmsTransactionLogEntity logEntity = WmsTransactionLogEntity.builder()
                    .transactionType(type)
                    .palletLpn(lpn)
                    .orderReference(orderRef)
                    .wmsReferenceId(refId)
                    .status(status)
                    .details(details)
                    .payload(jsonRequest)
                    .responsePayload(jsonResponse)
                    .build();
            transactionLogRepository.save(logEntity);
        } catch (Exception e) {
            log.warn("Failed to persist WMS transaction log: {}", e.getMessage());
        }
    }
}
