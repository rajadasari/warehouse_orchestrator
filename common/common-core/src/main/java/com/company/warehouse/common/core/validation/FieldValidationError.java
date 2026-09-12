package com.company.warehouse.common.core.validation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Standard model representing a single field-level validation error across the warehouse platform.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FieldValidationError implements Serializable {

    private String field;
    private String errorCode;
    private Object rejectedValue;
    private String message;
}
