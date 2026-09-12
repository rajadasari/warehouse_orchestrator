package com.company.warehouse.wes.business.validation.subvalidators.tier1;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.repository.PalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Order(30)
@RequiredArgsConstructor
public class PalletLpnDuplicateValidator implements PalletSubValidator {

    private final PalletRepository palletRepository;

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_1_IDENTITY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        return context.getPalletLpn() != null && !context.getPalletLpn().trim().isEmpty();
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        Optional<PalletEntity> existingOpt = palletRepository.findByPalletLpn(context.getPalletLpn().trim());
        if (existingOpt.isPresent()) {
            PalletEntity existing = existingOpt.get();
            String status = existing.getStatus();
            if (!"SHIPPED".equalsIgnoreCase(status) && !"DECOMMISSIONED".equalsIgnoreCase(status)) {
                result.addReject("DUPLICATE_ACTIVE_LPN",
                        "Pallet LPN " + context.getPalletLpn() + " is already active in warehouse at location "
                                + existing.getCurrentLocation() + " with status " + status,
                        "palletLpn");
                return;
            }
        }
        result.addInfo("LPN_AVAILABLE", "Pallet LPN " + context.getPalletLpn() + " is available", "palletLpn");
    }
}
