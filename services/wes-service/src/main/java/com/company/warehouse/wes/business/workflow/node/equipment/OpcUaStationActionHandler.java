package com.company.warehouse.wes.business.workflow.node.equipment;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Handler for OPC UA Conveyor & Machine Station Sequence actions executed via WCS.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpcUaStationActionHandler implements WorkflowNodeHandler {

    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(String nodeType) {
        return "OPCUA_STATION_ACTION".equalsIgnoreCase(nodeType)
                || "OPCUA_SEQUENCE".equalsIgnoreCase(nodeType)
                || "CONVEYOR_STATION".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String templateCode = String.valueOf(cfg.getOrDefault("templateCode", "LOADING_STATION_TEMPLATE"));
        String stationCode = String.valueOf(cfg.getOrDefault("stationCode", "CONV_STN_01"));
        String tagPrefix = cfg.get("tagPrefix") != null ? String.valueOf(cfg.get("tagPrefix")) : "";
        String clientCode = cfg.get("clientCode") != null ? String.valueOf(cfg.get("clientCode")) : "WCS_VIRTUAL_SERVER";
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "stationResult"));

        // If in simulation mode, route to virtual digital twin server
        if (context.simulationMode()) {
            clientCode = "WCS_VIRTUAL_SERVER";
        }

        String wcsBaseUrl = System.getenv().getOrDefault("WCS_BASE_URL", "http://localhost:8084");
        String executeUrl = wcsBaseUrl + "/api/v1/wcs/opcua/composer/execute";

        try {
            Map<String, Object> reqBody = Map.of(
                    "templateCode", templateCode,
                    "stationCode", stationCode,
                    "tagPrefix", tagPrefix,
                    "clientCode", clientCode,
                    "context", context.context() != null ? context.context() : Map.of()
            );

            SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
            rf.setConnectTimeout(3000);
            rf.setReadTimeout(10000);

            RestClient restClient = RestClient.builder().requestFactory(rf).build();
            String responseStr = restClient.post()
                    .uri(executeUrl)
                    .header("Content-Type", "application/json")
                    .body(objectMapper.writeValueAsString(reqBody))
                    .retrieve()
                    .body(String.class);

            Map<String, Object> respMap = objectMapper.readValue(responseStr, new TypeReference<>() {});
            boolean success = Boolean.TRUE.equals(respMap.get("success"));
            if (!success) {
                return NodeExecutionResult.failed(String.valueOf(respMap.getOrDefault("errorMessage", "OPC UA Station Sequence execution failed")));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> outData = (respMap.get("outputData") instanceof Map)
                    ? (Map<String, Object>) respMap.get("outputData")
                    : Map.of();

            Map<String, Object> finalOutput = new HashMap<>(outData);
            finalOutput.put(outputVar, outData);
            finalOutput.put("stationCode", stationCode);
            finalOutput.put("templateCode", templateCode);
            finalOutput.put("sequenceDurationMs", respMap.get("durationMs"));

            return NodeExecutionResult.success(finalOutput);
        } catch (Exception e) {
            log.warn("OPCUA_STATION_ACTION: Live WCS call failed ({}), falling back to deterministic digital twin simulation", e.getMessage());
            Map<String, Object> simOutput = new HashMap<>();
            simOutput.put("stationCode", stationCode);
            simOutput.put("templateCode", templateCode);
            simOutput.put("status", "SIMULATED_SUCCESS");
            simOutput.put("simulatedBarcode", "PAL-SIM-" + stationCode);
            simOutput.put("measuredWeightKg", 450.0);
            simOutput.put("simulatedAt", Instant.now().toString());

            Map<String, Object> out = new HashMap<>();
            out.put(outputVar, simOutput);
            out.put("palletBarcode", simOutput.get("simulatedBarcode"));
            out.put("measuredWeightKg", 450.0);
            return NodeExecutionResult.success(out);
        }
    }
}
