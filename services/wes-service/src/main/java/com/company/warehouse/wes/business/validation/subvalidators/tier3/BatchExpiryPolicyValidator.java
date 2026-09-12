package com.company.warehouse.wes.business.validation.subvalidators.tier3;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@Order(10)
public class BatchExpiryPolicyValidator implements PalletSubValidator {

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_3_POLICY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        return context.getExpiryDate() != null;
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        LocalDate expiryDate = context.getExpiryDate();
        LocalDate today = LocalDate.now();

        if (expiryDate.isBefore(today)) {
            result.addReject("BATCH_EXPIRED",
                    "Batch " + context.getLotNumber() + " has expired on " + expiryDate,
                    "expiryDate");
            return;
        }

        // Warning if remaining shelf life is under 60 days
        if (expiryDate.isBefore(today.plusDays(60))) {
            result.addWarning("SHORT_SHELF_LIFE",
                    String.format("Batch %s has short shelf-life (%s). Priority FEFO storage recommended.",
                            context.getLotNumber(), expiryDate),
                    "expiryDate");
        } else {
            result.addInfo("EXPIRY_VALID", "Batch expiration date " + expiryDate + " is valid", "expiryDate");
        }
    }
}
