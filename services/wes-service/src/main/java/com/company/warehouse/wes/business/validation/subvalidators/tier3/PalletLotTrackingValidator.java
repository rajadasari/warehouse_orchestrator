package com.company.warehouse.wes.business.validation.subvalidators.tier3;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Validates lot tracking requirements.
 * If the pallet carries materials and is inbound from a supplier PO or manufacturing,
 * lot number is mandatory.
 */
@Component
@Order(5)
public class PalletLotTrackingValidator implements PalletSubValidator {

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_3_POLICY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        String loadType = context.getLoadType();
        return !"NO_LOAD".equalsIgnoreCase(loadType) && !"PALLET_STACK".equalsIgnoreCase(loadType);
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        String lotNumber = context.getLotNumber();
        String inboundType = context.getInboundType();

        boolean requiresLot = "RAW_MATERIAL_PO".equalsIgnoreCase(inboundType)
                || "FINISHED_GOODS_MFG".equalsIgnoreCase(inboundType)
                || (context.getResolvedItem() != null && "RAW_MATERIAL".equalsIgnoreCase(context.getResolvedItem().getItemType()));

        if (requiresLot && (lotNumber == null || lotNumber.trim().isEmpty())) {
            result.addReject(
                    "LOT_NUMBER_REQUIRED",
                    "Lot/Batch number is mandatory for material receipt of type " + (inboundType != null ? inboundType : "RAW_MATERIAL"),
                    "lotNumber"
            );
        } else if (lotNumber != null && !lotNumber.trim().isEmpty()) {
            result.addInfo("LOT_NUMBER_RECORDED", "Lot number " + lotNumber.trim() + " recorded", "lotNumber");
        }
    }
}
