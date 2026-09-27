package com.company.warehouse.wes.business.resource.composer.validation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Diagnostic validation results containing errors and advisory warnings for Entity Composition.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityValidationResult implements Serializable {

    @Builder.Default
    private List<String> errors = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    public boolean isValid() {
        return errors == null || errors.isEmpty();
    }

    public void addError(String error) {
        if (errors == null) errors = new ArrayList<>();
        errors.add(error);
    }

    public void addWarning(String warning) {
        if (warnings == null) warnings = new ArrayList<>();
        warnings.add(warning);
    }

    public static EntityValidationResult valid() {
        return EntityValidationResult.builder().build();
    }

    public static EntityValidationResult failure(String error) {
        EntityValidationResult res = new EntityValidationResult();
        res.addError(error);
        return res;
    }
}
