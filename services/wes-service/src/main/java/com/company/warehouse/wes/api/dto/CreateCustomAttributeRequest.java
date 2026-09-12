package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCustomAttributeRequest {
    private String targetEntity;
    private String attributeCode;
    private String label;
    private String description;
    private String dataType;
    private String unitOfMeasure;
    private String appliesToCategory;
    private boolean isRequired;
    private Object defaultValue;
    private List<String> allowedOptions;
    private BigDecimal minValue;
    private BigDecimal maxValue;
    private String validationRegex;
}
