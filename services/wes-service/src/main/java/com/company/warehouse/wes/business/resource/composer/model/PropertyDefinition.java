package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Strongly typed attribute definition within an Entity Data Shape.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyDefinition implements Serializable {

    private String name;

    private String label;

    @Builder.Default
    private PropertyBaseType baseType = PropertyBaseType.STRING;

    @Builder.Default
    private boolean required = false;

    private Object defaultValue;

    private String unit;

    @Builder.Default
    private List<String> options = new ArrayList<>();

    private String description;

    @Builder.Default
    private boolean readOnly = false;
}
