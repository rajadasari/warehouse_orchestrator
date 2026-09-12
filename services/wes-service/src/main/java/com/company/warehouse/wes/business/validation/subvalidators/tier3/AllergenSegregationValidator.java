package com.company.warehouse.wes.business.validation.subvalidators.tier3;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Order(20)
public class AllergenSegregationValidator implements PalletSubValidator {

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_3_POLICY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        return context.getResolvedItem() != null || context.getCustomAttributes() != null;
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        boolean hasAllergen = false;
        String allergenDetail = "Allergens declared";

        // Check request custom attributes
        Map<String, Object> reqAttrs = context.getCustomAttributes();
        if (reqAttrs != null) {
            if (Boolean.TRUE.equals(reqAttrs.get("allergenPresent"))
                    || reqAttrs.containsKey("allergens")
                    || reqAttrs.containsKey("allergen")) {
                hasAllergen = true;
                if (reqAttrs.get("allergen") != null) {
                    allergenDetail = reqAttrs.get("allergen").toString();
                } else if (reqAttrs.get("allergens") != null) {
                    allergenDetail = reqAttrs.get("allergens").toString();
                }
            }
        }

        // Check item master custom attributes
        ItemMasterEntity item = context.getResolvedItem();
        if (item != null && item.getCustomAttributes() != null) {
            String itemAttrs = item.getCustomAttributes().toLowerCase();
            if (itemAttrs.contains("\"allergen\"") && !itemAttrs.contains("\"allergen\": \"none\"") && !itemAttrs.contains("\"allergen\":\"none\"")) {
                hasAllergen = true;
                allergenDetail = "Item Master declares allergen content";
            }
        }

        if (hasAllergen) {
            result.addWarning("ALLERGEN_PRESENT",
                    "Pallet contains allergens (" + allergenDetail + "). Segregated storage required.",
                    "allergen");
        } else {
            result.addInfo("NO_ALLERGENS", "No allergens detected on pallet", "allergen");
        }
    }
}
