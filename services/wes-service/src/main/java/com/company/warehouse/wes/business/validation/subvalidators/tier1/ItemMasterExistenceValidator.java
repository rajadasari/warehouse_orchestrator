package com.company.warehouse.wes.business.validation.subvalidators.tier1;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Order(10)
@RequiredArgsConstructor
public class ItemMasterExistenceValidator implements PalletSubValidator {

    private final ItemMasterRepository itemRepository;

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_1_IDENTITY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        String loadType = context.getLoadType();
        // Item is required for MATERIAL and MATERIAL_WITH_SKU
        return !"NO_LOAD".equalsIgnoreCase(loadType) && !"PALLET_STACK".equalsIgnoreCase(loadType);
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        if (context.getItemCode() == null || context.getItemCode().trim().isEmpty()) {
            result.addReject("ITEM_REQUIRED", "Item code is required for loaded pallets", "itemCode");
            return;
        }

        Optional<ItemMasterEntity> itemOpt = itemRepository.findByItemCode(context.getItemCode().trim());
        if (itemOpt.isEmpty()) {
            result.addReject("ITEM_NOT_FOUND", "Item code " + context.getItemCode() + " does not exist in Item Master", "itemCode");
            return;
        }

        ItemMasterEntity item = itemOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(item.getStatus())) {
            result.addReject("ITEM_INACTIVE", "Item code " + context.getItemCode() + " is inactive / discontinued", "itemCode");
            return;
        }

        // Cache resolved item on context for Tier 2 and Tier 3
        context.setResolvedItem(item);
        result.addInfo("ITEM_VALID", "Item " + item.getItemCode() + " (" + item.getName() + ") verified", "itemCode");
    }
}
