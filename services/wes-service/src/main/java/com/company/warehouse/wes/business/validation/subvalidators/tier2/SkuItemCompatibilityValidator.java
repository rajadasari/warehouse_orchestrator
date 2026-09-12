package com.company.warehouse.wes.business.validation.subvalidators.tier2;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.entity.SkuMasterEntity;
import com.company.warehouse.wes.data.repository.SkuMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Order(10)
@RequiredArgsConstructor
public class SkuItemCompatibilityValidator implements PalletSubValidator {

    private final SkuMasterRepository skuRepository;

    @Override
    public ValidationTier getTier() {
        return ValidationTier.TIER_2_CAPACITY;
    }

    @Override
    public boolean supports(PalletValidationContext context) {
        return "MATERIAL_WITH_SKU".equalsIgnoreCase(context.getLoadType())
                || (context.getSkuCode() != null && !context.getSkuCode().trim().isEmpty());
    }

    @Override
    public void validate(PalletValidationContext context, ValidationResult result) {
        if (context.getSkuCode() == null || context.getSkuCode().trim().isEmpty()) {
            result.addReject("SKU_REQUIRED", "SKU code is required for packaged SKU loads", "skuCode");
            return;
        }

        Optional<SkuMasterEntity> skuOpt = skuRepository.findBySkuCode(context.getSkuCode().trim());
        if (skuOpt.isEmpty()) {
            result.addReject("SKU_NOT_FOUND", "SKU " + context.getSkuCode() + " does not exist in SKU Master", "skuCode");
            return;
        }

        SkuMasterEntity sku = skuOpt.get();
        if (!sku.isActive()) {
            result.addReject("SKU_INACTIVE", "SKU " + context.getSkuCode() + " is inactive / discontinued", "skuCode");
            return;
        }

        // Check if SKU belongs to the resolved Item
        ItemMasterEntity item = context.getResolvedItem();
        if (item != null && sku.getItem() != null && !item.getId().equals(sku.getItem().getId())) {
            result.addReject("SKU_ITEM_MISMATCH",
                    "SKU " + context.getSkuCode() + " belongs to Item " + sku.getItem().getItemCode()
                            + ", not to requested Item " + item.getItemCode(),
                    "skuCode");
            return;
        }

        context.setResolvedSku(sku);
        result.addInfo("SKU_VALID", "SKU " + sku.getSkuCode() + " (Package: " + sku.getPackageType() + ") verified", "skuCode");
    }
}
