package com.company.warehouse.wes.business.validation.subvalidators.tier2;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@Order(20)
public class PalletWeightCapacityValidator implements PalletSubValidator {

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_2_CAPACITY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        return context.getActualWeightKg() != null && context.getResolvedPalletType() != null;
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        PalletTypeMasterEntity palletType = context.getResolvedPalletType();
        BigDecimal actualWeight = context.getActualWeightKg();

        BigDecimal maxCapacity = palletType.getTareWeightKg().add(palletType.getMaxPayloadKg());

        if (actualWeight.compareTo(maxCapacity) > 0) {
            result.addReject("OVERWEIGHT_PALLET",
                    String.format("Pallet weight %.2f kg exceeds maximum rated capacity %.2f kg for %s",
                            actualWeight, maxCapacity, palletType.getCode()),
                    "actualWeightKg");
            return;
        }

        // Warning if weight is abnormally light (< tare weight - 1kg)
        if (actualWeight.compareTo(palletType.getTareWeightKg().subtract(BigDecimal.ONE)) < 0) {
            result.addWarning("ABNORMALLY_LIGHT_PALLET",
                    String.format("Pallet weight %.2f kg is less than base tare weight %.2f kg",
                            actualWeight, palletType.getTareWeightKg()),
                    "actualWeightKg");
            return;
        }

        result.addInfo("WEIGHT_VERIFIED",
                String.format("Pallet weight %.2f kg is within allowed rating (max %.2f kg)", actualWeight, maxCapacity),
                "actualWeightKg");
    }
}
