package com.company.warehouse.wes.business.resource.composer.service.impl;

import com.company.warehouse.common.industrial.gateway.SpringDeviceGatewayFactory;
import com.company.warehouse.common.industrial.scenario.IndustrialScenarioManager;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.service.EntityServiceExecutor;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode;
import org.eclipse.milo.opcua.stack.core.types.builtin.Variant;
import org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn;
import org.platform.gateway.scenario.engine.ScenarioExecutionReport;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service executor handling industrial PLC operations:
 * READ_TAG, WRITE_TAG, BROWSE_TAGS, and TRIGGER_SCENARIO directly connecting to target PLC.
 */
@Slf4j
@Component
public class IndustrialPlcServiceExecutor implements EntityServiceExecutor {

    private final IndustrialScenarioManager scenarioManager;
    private final com.company.warehouse.wes.business.resource.ResourceManager resourceManager;
    private final Map<String, OpcUaClient> miloClientCache = new ConcurrentHashMap<>();

    public IndustrialPlcServiceExecutor(
            IndustrialScenarioManager scenarioManager,
            @Lazy com.company.warehouse.wes.business.resource.ResourceManager resourceManager
    ) {
        this.scenarioManager = scenarioManager;
        this.resourceManager = resourceManager;
    }

    private static final Set<String> SUPPORTED_METHODS = Set.of(
            "READ_TAG", "WRITE_TAG", "TRIGGER_SCENARIO", "BROWSE_TAGS"
    );

    @Override
    public boolean supports(String serviceName, String protocol, String category) {
        if (serviceName == null) return false;
        String mName = serviceName.trim().toUpperCase();
        if (SUPPORTED_METHODS.contains(mName)) return true;
        return "PLC".equalsIgnoreCase(category) || "HARDWARE".equalsIgnoreCase(category)
                || (protocol != null && (protocol.toLowerCase().contains("opc") || protocol.toLowerCase().contains("modbus")));
    }

    @Override
    public MethodExecutionResult execute(ComposedEntityInstance instance, String serviceName, Map<String, Object> parameters) {
        long start = System.currentTimeMillis();
        String resourceId = instance.getResourceId();
        String mName = serviceName != null ? serviceName.trim().toUpperCase() : "READ_TAG";
        Map<String, Object> params = parameters != null ? parameters : Collections.emptyMap();

        String endpointUrl = resolveEndpointUrl(instance);

        try {
            return switch (mName) {
                case "READ_TAG" -> handleReadTag(resourceId, endpointUrl, params, start);
                case "WRITE_TAG" -> handleWriteTag(resourceId, endpointUrl, params, start);
                case "TRIGGER_SCENARIO" -> handleTriggerScenario(resourceId, params, start);
                case "BROWSE_TAGS", "BROWSE" -> handleBrowseTags(resourceId, endpointUrl, params, start);
                default -> MethodExecutionResult.builder()
                        .success(false)
                        .resourceId(resourceId)
                        .methodName(mName)
                        .message("Unsupported PLC method: " + mName)
                        .statusCode(400)
                        .executionTimeMs(System.currentTimeMillis() - start)
                        .build();
            };
        } catch (Exception e) {
            log.error("Error executing PLC method '{}' on resource '{}': {}", mName, resourceId, e.getMessage(), e);
            return MethodExecutionResult.builder()
                    .success(false)
                    .resourceId(resourceId)
                    .methodName(mName)
                    .message("Failed executing PLC method: " + e.getMessage())
                    .statusCode(500)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .error(e.getMessage())
                    .build();
        }
    }

    private synchronized OpcUaClient getOrCreateClient(String endpointUrl) throws Exception {
        OpcUaClient existing = miloClientCache.get(endpointUrl);
        if (existing != null) {
            return existing;
        }
        OpcUaClient client = OpcUaClient.create(endpointUrl);
        client.connect().get();
        miloClientCache.put(endpointUrl, client);
        return client;
    }

    private MethodExecutionResult handleReadTag(String resourceId, String endpointUrl, Map<String, Object> params, long start) {
        String nodeIdStr = params.containsKey("nodeId") ? String.valueOf(params.get("nodeId")).trim()
                : (params.containsKey("tag") ? String.valueOf(params.get("tag")).trim() : null);

        if (nodeIdStr == null || nodeIdStr.isEmpty()) {
            return MethodExecutionResult.builder()
                    .success(false)
                    .resourceId(resourceId)
                    .methodName("READ_TAG")
                    .message("nodeId parameter is required")
                    .statusCode(400)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .build();
        }

        try {
            OpcUaClient client = getOrCreateClient(endpointUrl);
            NodeId nid = NodeId.parse(nodeIdStr);
            DataValue dv = client.readValue(0.0, TimestampsToReturn.Both, nid).get();

            Object rawVal = (dv != null && dv.getValue() != null) ? dv.getValue().getValue() : null;
            String valStr = rawVal != null ? String.valueOf(rawVal) : "null";
            String quality = (dv != null && dv.getStatusCode() != null && dv.getStatusCode().isGood()) ? "GOOD" : "BAD";

            Map<String, Object> resultData = new LinkedHashMap<>();
            resultData.put("nodeId", nodeIdStr);
            resultData.put("value", rawVal != null ? rawVal : valStr);
            resultData.put("quality", quality);
            resultData.put("sourceTimestamp", dv != null && dv.getSourceTime() != null ? dv.getSourceTime().getJavaDate().toString() : null);
            resultData.put("serverTimestamp", dv != null && dv.getServerTime() != null ? dv.getServerTime().getJavaDate().toString() : null);

            return MethodExecutionResult.builder()
                    .success(true)
                    .resourceId(resourceId)
                    .methodName("READ_TAG")
                    .message("Successfully read tag " + nodeIdStr)
                    .statusCode(200)
                    .data(resultData)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .build();
        } catch (Exception e) {
            // Invalidate cached client in case socket died
            miloClientCache.remove(endpointUrl);
            throw new RuntimeException("OPC UA Read Error: " + e.getMessage(), e);
        }
    }

    private MethodExecutionResult handleWriteTag(String resourceId, String endpointUrl, Map<String, Object> params, long start) {
        String nodeIdStr = params.containsKey("nodeId") ? String.valueOf(params.get("nodeId")).trim()
                : (params.containsKey("tag") ? String.valueOf(params.get("tag")).trim() : null);
        Object value = params.get("value");

        if (nodeIdStr == null || nodeIdStr.isEmpty()) {
            return MethodExecutionResult.builder()
                    .success(false)
                    .resourceId(resourceId)
                    .methodName("WRITE_TAG")
                    .message("nodeId parameter is required")
                    .statusCode(400)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .build();
        }

        try {
            OpcUaClient client = getOrCreateClient(endpointUrl);
            NodeId nid = NodeId.parse(nodeIdStr);
            DataValue dv = new DataValue(new Variant(value));
            StatusCode sc = client.writeValue(nid, dv).get();

            if (sc.isBad()) {
                return MethodExecutionResult.builder()
                        .success(false)
                        .resourceId(resourceId)
                        .methodName("WRITE_TAG")
                        .message("OPC UA server returned bad status code: " + sc)
                        .statusCode(500)
                        .executionTimeMs(System.currentTimeMillis() - start)
                        .build();
            }

            Map<String, Object> resultData = new LinkedHashMap<>();
            resultData.put("nodeId", nodeIdStr);
            resultData.put("writtenValue", value);
            resultData.put("statusCode", sc.toString());

            return MethodExecutionResult.builder()
                    .success(true)
                    .resourceId(resourceId)
                    .methodName("WRITE_TAG")
                    .message("Successfully wrote value to " + nodeIdStr)
                    .statusCode(200)
                    .data(resultData)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .build();
        } catch (Exception e) {
            miloClientCache.remove(endpointUrl);
            throw new RuntimeException("OPC UA Write Error: " + e.getMessage(), e);
        }
    }

    private MethodExecutionResult handleTriggerScenario(String resourceId, Map<String, Object> params, long start) {
        String scenarioId = params.containsKey("scenarioId") ? String.valueOf(params.get("scenarioId")).trim() : "TEMP_PROTECTION_RULE";
        ScenarioExecutionReport report = scenarioManager.triggerScenario(scenarioId).join();

        Map<String, Object> resultData = new LinkedHashMap<>();
        resultData.put("scenarioId", report.scenarioId());
        resultData.put("success", report.success());
        resultData.put("conditionsMet", report.conditionsMet());
        resultData.put("observedInputs", report.observedInputs());
        resultData.put("executedWrites", report.executedWrites());
        resultData.put("message", report.message());

        return MethodExecutionResult.builder()
                .success(report.success())
                .resourceId(resourceId)
                .methodName("TRIGGER_SCENARIO")
                .message(report.message() != null ? report.message() : (report.success() ? "Scenario evaluated successfully" : "Scenario execution failed"))
                .statusCode(report.success() ? 200 : 500)
                .data(resultData)
                .executionTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private MethodExecutionResult handleBrowseTags(String resourceId, String endpointUrl, Map<String, Object> params, long start) {
        try {
            OpcUaClient client = getOrCreateClient(endpointUrl);
            List<Map<String, Object>> tagsList = new ArrayList<>();

            String[] targetTags = {
                    "ns=3;s=Manufacturer", "ns=3;s=Model", "ns=3;s=OrderNumber",
                    "ns=3;s=SerialNumber", "ns=3;s=SoftwareRevision", "ns=3;s=HardwareRevision",
                    "ns=3;s=DeviceRevision", "ns=3;s=OperatingMode", "ns=3;s=EngineeringRevision",
                    "ns=3;s=RevisionCounter"
            };

            for (String tagStr : targetTags) {
                try {
                    NodeId nid = NodeId.parse(tagStr);
                    DataValue dv = client.readValue(0.0, TimestampsToReturn.Both, nid).get();
                    Object val = (dv != null && dv.getValue() != null && dv.getValue().getValue() != null)
                            ? dv.getValue().getValue() : null;

                    Map<String, Object> tagObj = new LinkedHashMap<>();
                    tagObj.put("nodeId", tagStr);
                    tagObj.put("browseName", tagStr.substring(tagStr.lastIndexOf("=") + 1));
                    tagObj.put("nodeClass", "Variable");
                    tagObj.put("value", val != null ? String.valueOf(val) : "null");
                    tagsList.add(tagObj);
                } catch (Exception ignored) {}
            }

            String[] containers = {
                    "ns=3;s=DataBlocksGlobal", "ns=3;s=Inputs", "ns=3;s=Outputs",
                    "ns=3;s=Memory", "ns=3;s=Timers", "ns=3;s=Counters"
            };
            for (String c : containers) {
                Map<String, Object> cObj = new LinkedHashMap<>();
                cObj.put("nodeId", c);
                cObj.put("browseName", c.substring(c.lastIndexOf("=") + 1));
                cObj.put("nodeClass", "Container");
                cObj.put("value", "N/A");
                tagsList.add(cObj);
            }

            // Save discovered tags directly to Resource's custom properties
            com.company.warehouse.wes.api.dto.resource.ResourceRequestDto updateReq = new com.company.warehouse.wes.api.dto.resource.ResourceRequestDto();
            Map<String, Object> newCustom = new LinkedHashMap<>();
            newCustom.put("tags", tagsList);
            newCustom.put("lastBrowsedAt", java.time.Instant.now().toString());
            updateReq.setCustomProperties(newCustom);

            resourceManager.updateResource(resourceId, updateReq);

            Map<String, Object> resultData = new LinkedHashMap<>();
            resultData.put("totalTags", tagsList.size());
            resultData.put("tags", tagsList);

            return MethodExecutionResult.builder()
                    .success(true)
                    .resourceId(resourceId)
                    .methodName("BROWSE_TAGS")
                    .message("Successfully browsed and saved " + tagsList.size() + " tags to resource")
                    .statusCode(200)
                    .data(resultData)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .build();
        } catch (Exception e) {
            log.error("Error browsing tags for resource '{}': {}", resourceId, e.getMessage(), e);
            miloClientCache.remove(endpointUrl);
            return MethodExecutionResult.builder()
                    .success(false)
                    .resourceId(resourceId)
                    .methodName("BROWSE_TAGS")
                    .message("Browse failed: " + e.getMessage())
                    .statusCode(500)
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .error(e.getMessage())
                    .build();
        }
    }

    private String resolveEndpointUrl(ComposedEntityInstance instance) {
        if (instance.getCustomProperties() != null && instance.getCustomProperties().containsKey("endpointUrl")) {
            String url = String.valueOf(instance.getCustomProperties().get("endpointUrl")).trim();
            if (!url.isEmpty()) return url;
        }
        String protocol = instance.getProtocol() != null && !instance.getProtocol().isBlank() ? instance.getProtocol() : "opc.tcp";
        String host = instance.getHost() != null && !instance.getHost().isBlank() ? instance.getHost() : "127.0.0.1";
        int port = instance.getPort() > 0 ? instance.getPort() : 4840;
        return protocol + "://" + host + ":" + port;
    }
}
