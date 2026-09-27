package com.company.warehouse.wes.business.integration.lookup;

import com.company.warehouse.common.client.software.integration.rules.DatabaseLookupProvider;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * WES database lookup provider implementation for the 5-Tier Rule Engine.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WesDatabaseLookupProvider implements DatabaseLookupProvider {

    private final ItemMasterRepository itemMasterRepository;
    private final PalletRepository palletRepository;
    private final ResourceRepository resourceRepository;

    @Override
    public boolean exists(String lookupTarget, Object key, Map<String, Object> context) {
        if (key == null || lookupTarget == null) return false;
        String k = String.valueOf(key).trim();
        String target = lookupTarget.trim().toUpperCase();

        return switch (target) {
            case "SKU_EXISTS", "ITEM_EXISTS" -> itemMasterRepository.existsByItemCode(k);
            case "PALLET_EXISTS", "LPN_EXISTS" -> palletRepository.existsByPalletLpn(k);
            case "RESOURCE_EXISTS", "DEVICE_EXISTS" -> resourceRepository.existsByResourceId(k);
            case "RESOURCE_TAG_EXISTS", "TAG_EXISTS" -> {
                // If context contains resourceId, check if tag exists in resource configuration
                String resId = context != null && context.get("resourceId") != null
                        ? String.valueOf(context.get("resourceId")) : null;
                if (resId != null) {
                    yield resourceRepository.findByResourceId(resId).isPresent();
                }
                yield true;
            }
            default -> {
                log.debug("Unknown lookup target '{}', returning true by default", target);
                yield true;
            }
        };
    }

    @Override
    public Map<String, Object> fetchAttributes(String lookupTarget, Object key) {
        if (key == null || lookupTarget == null) return Map.of();
        String k = String.valueOf(key).trim();
        String target = lookupTarget.trim().toUpperCase();

        if ("SKU_EXISTS".equals(target) || "ITEM_EXISTS".equals(target)) {
            Optional<ItemMasterEntity> itemOpt = itemMasterRepository.findByItemCode(k);
            if (itemOpt.isPresent()) {
                ItemMasterEntity item = itemOpt.get();
                Map<String, Object> attrs = new HashMap<>();
                if (item.getName() != null) {
                    attrs.put("skuName", item.getName());
                }
                if (item.getBaseUom() != null) {
                    attrs.put("baseUom", item.getBaseUom());
                }
                return attrs;
            }
        }
        return Map.of();
    }
}
