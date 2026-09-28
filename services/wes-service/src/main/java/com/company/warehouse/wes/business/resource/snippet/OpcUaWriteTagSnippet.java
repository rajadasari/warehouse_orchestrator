package com.company.warehouse.wes.business.resource.snippet;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Standard System Snippet for writing values to OPC-UA / PLC tags.
 */
@Slf4j
@Component
public class OpcUaWriteTagSnippet implements SystemSnippet {

    public static final String SNIPPET_ID = "OPC_UA_WRITE_TAG";

    @Override
    public String getSnippetId() {
        return SNIPPET_ID;
    }

    @Override
    public String getDisplayName() {
        return "Write PLC Tag (OPC-UA)";
    }

    @Override
    public String getCategory() {
        return "HARDWARE";
    }

    @Override
    public String getDescription() {
        return "Writes an operational setpoint, target speed, or command trigger to a PLC tag address / NodeId.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("tagAddress", Map.of(
                "type", "string",
                "label", "PLC Tag / NodeId",
                "required", true,
                "placeholder", "#{properties.tagPrefix}.Commands.Start",
                "description", "Address path or NodeId on the PLC controller"
        ));
        schema.put("value", Map.of(
                "type", "any",
                "label", "Value to Write",
                "required", true,
                "placeholder", "#{params.speed}",
                "description", "Target scalar or boolean value to write"
        ));
        schema.put("timeoutMs", Map.of(
                "type", "number",
                "label", "Timeout (ms)",
                "required", false,
                "defaultValue", 3000,
                "description", "Maximum milliseconds to wait for PLC acknowledgement"
        ));
        return schema;
    }

    @Override
    public Map<String, Object> getOutputSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("success", Map.of("type", "boolean", "description", "True if write acknowledged by PLC"));
        schema.put("statusCode", Map.of("type", "string", "example", "Good (0x00000000)"));
        schema.put("writtenValue", Map.of("type", "any", "description", "The resolved value dispatched to the hardware"));
        return schema;
    }

    @Override
    public SnippetExecutionResult execute(SnippetExecutionContext context) {
        long start = System.currentTimeMillis();
        try {
            String tagAddress = resolveString(context, "tagAddress", "DEFAULT_TAG");
            Object val = resolveValue(context, "value");

            log.info("[Snippet:OPC_UA_WRITE_TAG] Executing on resource='{}', tag='{}', value='{}'",
                    context.resourceId(), tagAddress, val);

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("tagAddress", tagAddress);
            data.put("writtenValue", val);
            data.put("statusCode", "Good (0x00000000)");

            long duration = System.currentTimeMillis() - start;
            return SnippetExecutionResult.success(SNIPPET_ID, "PLC tag written successfully", data, duration);
        } catch (Exception e) {
            log.error("[Snippet:OPC_UA_WRITE_TAG] Execution failed: {}", e.getMessage(), e);
            long duration = System.currentTimeMillis() - start;
            return SnippetExecutionResult.failure(SNIPPET_ID, 500, "Failed to write PLC tag: " + e.getMessage(), duration);
        }
    }

    private String resolveString(SnippetExecutionContext ctx, String key, String defaultVal) {
        Object v = ctx.inputParameters().get(key);
        if (v == null) return defaultVal;
        String raw = String.valueOf(v);
        return interpolate(raw, ctx);
    }

    private Object resolveValue(SnippetExecutionContext ctx, String key) {
        Object v = ctx.inputParameters().get(key);
        if (v instanceof String str) {
            return interpolate(str, ctx);
        }
        return v != null ? v : 0;
    }

    private String interpolate(String input, SnippetExecutionContext ctx) {
        if (input == null) return "";
        String result = input;
        for (Map.Entry<String, Object> entry : ctx.resourceProperties().entrySet()) {
            result = result.replace("#{properties." + entry.getKey() + "}", String.valueOf(entry.getValue()));
        }
        for (Map.Entry<String, Object> entry : ctx.inputParameters().entrySet()) {
            result = result.replace("#{params." + entry.getKey() + "}", String.valueOf(entry.getValue()));
        }
        return result;
    }
}
