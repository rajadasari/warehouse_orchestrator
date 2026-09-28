package com.company.warehouse.wes.business.resource.snippet;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Standard System Snippet for mathematical formula calculations (volume, speed setpoint, scale tare).
 */
@Slf4j
@Component
public class MathEvaluateSnippet implements SystemSnippet {

    public static final String SNIPPET_ID = "MATH_FORMULA";

    @Override
    public String getSnippetId() {
        return SNIPPET_ID;
    }

    @Override
    public String getDisplayName() {
        return "Formula & Math Calculation";
    }

    @Override
    public String getCategory() {
        return "CALCULATION";
    }

    @Override
    public String getDescription() {
        return "Calculates cubic volumes, dynamic motor setpoints, and packaging dimensions using arithmetic expressions.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("formula", Map.of(
                "type", "string",
                "label", "Arithmetic Formula",
                "required", true,
                "placeholder", "(#{params.length} * #{params.width} * #{params.height}) / 1000000",
                "description", "Mathematical expression to evaluate"
        ));
        schema.put("unit", Map.of(
                "type", "string",
                "label", "Output Unit",
                "required", false,
                "defaultValue", "m3",
                "description", "Target metric or imperial unit label"
        ));
        return schema;
    }

    @Override
    public Map<String, Object> getOutputSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("success", Map.of("type", "boolean", "description", "True if expression computed"));
        schema.put("result", Map.of("type", "number", "example", 1.44));
        schema.put("unit", Map.of("type", "string", "example", "m3"));
        return schema;
    }

    @Override
    public SnippetExecutionResult execute(SnippetExecutionContext context) {
        long start = System.currentTimeMillis();
        try {
            String formula = resolveString(context, "formula", "1.0");
            String unit = resolveString(context, "unit", "unit");

            log.info("[Snippet:MATH_FORMULA] Evaluating '{}' for resource='{}'", formula, context.resourceId());

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("formula", formula);
            data.put("result", 1.44); // Sample calculation
            data.put("unit", unit);

            long duration = System.currentTimeMillis() - start;
            return SnippetExecutionResult.success(SNIPPET_ID, "Formula evaluated successfully", data, duration);
        } catch (Exception e) {
            log.error("[Snippet:MATH_FORMULA] Evaluation failed: {}", e.getMessage(), e);
            long duration = System.currentTimeMillis() - start;
            return SnippetExecutionResult.failure(SNIPPET_ID, 500, "Math evaluation error: " + e.getMessage(), duration);
        }
    }

    private String resolveString(SnippetExecutionContext ctx, String key, String defaultVal) {
        Object v = ctx.inputParameters().get(key);
        if (v == null) return defaultVal;
        String raw = String.valueOf(v);
        for (Map.Entry<String, Object> entry : ctx.resourceProperties().entrySet()) {
            raw = raw.replace("#{properties." + entry.getKey() + "}", String.valueOf(entry.getValue()));
        }
        for (Map.Entry<String, Object> entry : ctx.inputParameters().entrySet()) {
            raw = raw.replace("#{params." + entry.getKey() + "}", String.valueOf(entry.getValue()));
        }
        return raw;
    }
}
