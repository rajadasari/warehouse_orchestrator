package com.company.warehouse.wes.business.validation.model;

import com.company.warehouse.common.core.enums.ValidationOutcome;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationMessage implements Serializable {
    private String code;
    private String message;
    private String field;
    private ValidationOutcome severity; // INFO, WARNING, REJECT
}
