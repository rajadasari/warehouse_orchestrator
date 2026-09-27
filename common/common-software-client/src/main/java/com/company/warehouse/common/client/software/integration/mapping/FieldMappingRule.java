package com.company.warehouse.common.client.software.integration.mapping;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Declarative rule for mapping an external source field (XPath or JSONPath)
 * into an internal canonical domain field.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FieldMappingRule implements Serializable {

    /**
     * Source path expression. Supports fallback chains separated by pipe '|'
     * Example: "//LENUM | $.palletLpn | $.huNumber"
     */
    private String sourcePath;

    /**
     * Target internal field name (e.g. "palletLpn", "skuCode", "actualWeightKg")
     */
    private String targetField;

    /**
     * Target data type: STRING, NUMBER, INTEGER, BOOLEAN, JSON
     */
    @Builder.Default
    private String dataType = "STRING";

    /**
     * Fallback default value if path is missing or null.
     */
    private Object defaultValue;

    /**
     * If true, mapping fails if field cannot be resolved.
     */
    @Builder.Default
    private boolean required = false;

    /**
     * Optional transformation regex or format pattern.
     */
    private String transformPattern;
}
