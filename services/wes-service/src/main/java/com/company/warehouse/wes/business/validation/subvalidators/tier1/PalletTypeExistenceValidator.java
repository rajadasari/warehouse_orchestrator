package com.company.warehouse.wes.business.validation.subvalidators.tier1;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import com.company.warehouse.wes.data.repository.PalletTypeMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Order(20)
@RequiredArgsConstructor
public class PalletTypeExistenceValidator implements PalletSubValidator {

    private final PalletTypeMasterRepository palletTypeRepository;

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_1_IDENTITY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        return true; // All pallets must have a valid pallet type
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        if (context.getPalletTypeCode() == null || context.getPalletTypeCode().trim().isEmpty()) {
            result.addReject("PALLET_TYPE_REQUIRED", "Pallet type code is required", "palletTypeCode");
            return;
        }

        Optional<PalletTypeMasterEntity> palletTypeOpt = palletTypeRepository.findByCode(context.getPalletTypeCode().trim());
        if (palletTypeOpt.isEmpty()) {
            result.addReject("PALLET_TYPE_NOT_FOUND", "Pallet type " + context.getPalletTypeCode() + " is not registered", "palletTypeCode");
            return;
        }

        PalletTypeMasterEntity palletType = palletTypeOpt.get();
        context.setResolvedPalletType(palletType);
        result.addInfo("PALLET_TYPE_VALID", "Pallet type " + palletType.getCode() + " (" + palletType.getName() + ") verified", "palletTypeCode");
    }
}
