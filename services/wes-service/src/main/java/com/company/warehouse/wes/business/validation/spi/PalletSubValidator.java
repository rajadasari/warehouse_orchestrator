package com.company.warehouse.wes.business.validation.spi;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;

public interface PalletSubValidator {

    /** Which validation tier this check belongs to */
    ValidationTier getTier();

    /** Whether this validator applies to the given context */
    boolean supports(PalletValidationContext context);

    /** Executes validation logic and records any INFO, WARNING, or REJECT messages */
    void validate(PalletValidationContext context, ValidationResult result);

    /** Relative priority within the tier */
    default int getOrder() {
        return 0;
    }
}
