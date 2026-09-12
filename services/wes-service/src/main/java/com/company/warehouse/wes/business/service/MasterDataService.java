package com.company.warehouse.wes.business.service;

import com.company.warehouse.wes.api.dto.CreateCustomAttributeRequest;
import com.company.warehouse.wes.api.dto.CreateHandlingStrategyRequest;
import com.company.warehouse.wes.api.dto.CreateItemMasterRequest;
import com.company.warehouse.wes.api.dto.CreatePalletTypeRequest;
import com.company.warehouse.wes.api.dto.CreateSkuMasterRequest;
import com.company.warehouse.wes.api.dto.CustomAttributeDto;
import com.company.warehouse.wes.api.dto.ItemMasterDto;
import com.company.warehouse.wes.api.dto.MasterDataOverviewDto;
import com.company.warehouse.wes.api.dto.PalletHandlingStrategyDto;
import com.company.warehouse.wes.api.dto.PalletTypeMasterDto;
import com.company.warehouse.wes.api.dto.SkuMasterDto;
import com.company.warehouse.wes.data.entity.CustomAttributeDefinitionEntity;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.entity.PalletHandlingStrategyEntity;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import com.company.warehouse.wes.data.entity.SkuMasterEntity;
import com.company.warehouse.wes.data.repository.CustomAttributeDefinitionRepository;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletHandlingStrategyRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.PalletTypeMasterRepository;
import com.company.warehouse.wes.data.repository.SkuMasterRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MasterDataService {

    private final ItemMasterRepository itemRepository;
    private final SkuMasterRepository skuRepository;
    private final PalletHandlingStrategyRepository strategyRepository;
    private final PalletTypeMasterRepository palletTypeRepository;
    private final CustomAttributeDefinitionRepository customAttrRepository;
    private final PalletRepository palletRepository;
    private final ObjectMapper objectMapper;

    // =========================================================================
    // OVERVIEW KPI
    // =========================================================================
    @Transactional(readOnly = true)
    public MasterDataOverviewDto getOverviewMetrics() {
        return MasterDataOverviewDto.builder()
                .totalMaterials(itemRepository.count())
                .totalSkus(skuRepository.count())
                .totalPalletTypes(palletTypeRepository.count())
                .totalStrategies(strategyRepository.count())
                .totalCustomFields(customAttrRepository.count())
                .totalPallets(palletRepository.count())
                .activeStagedPallets(palletRepository.findByStatus("STAGED").size())
                .build();
    }

    // =========================================================================
    // ITEM MASTER
    // =========================================================================
    @Transactional(readOnly = true)
    public List<ItemMasterDto> getAllItems() {
        return itemRepository.findAll().stream()
                .map(this::toItemDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ItemMasterDto createItem(CreateItemMasterRequest request) {
        if (itemRepository.existsByItemCode(request.getItemCode())) {
            throw new IllegalArgumentException("Material code already exists: " + request.getItemCode());
        }

        String customAttributesJson = "{}";
        if (request.getCustomAttributes() != null && !request.getCustomAttributes().isEmpty()) {
            try {
                customAttributesJson = objectMapper.writeValueAsString(request.getCustomAttributes());
            } catch (Exception e) {
                log.warn("Failed to serialize custom attributes, defaulting to empty", e);
            }
        }

        ItemMasterEntity entity = ItemMasterEntity.builder()
                .itemCode(request.getItemCode())
                .name(request.getName())
                .itemType(request.getItemType() != null ? request.getItemType() : "RAW_MATERIAL")
                .baseUom(request.getBaseUom())
                .allowMixedPallet(request.isAllowMixedPallet())
                .mixedPalletGroup(request.getMixedPalletGroup())
                .status("ACTIVE")
                .customAttributes(customAttributesJson)
                .build();

        return toItemDto(itemRepository.save(entity));
    }

    @Transactional
    public ItemMasterDto updateItem(UUID id, CreateItemMasterRequest request) {
        ItemMasterEntity entity = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Material not found: " + id));

        if (request.getItemCode() != null && !request.getItemCode().equalsIgnoreCase(entity.getItemCode())) {
            if (itemRepository.existsByItemCode(request.getItemCode())) {
                throw new IllegalArgumentException("Material code already exists: " + request.getItemCode());
            }
            entity.setItemCode(request.getItemCode());
        }

        if (request.getName() != null) {
            entity.setName(request.getName());
        }
        if (request.getItemType() != null) {
            entity.setItemType(request.getItemType());
        }
        if (request.getBaseUom() != null) {
            entity.setBaseUom(request.getBaseUom());
        }
        entity.setAllowMixedPallet(request.isAllowMixedPallet());
        if (request.getMixedPalletGroup() != null) {
            entity.setMixedPalletGroup(request.getMixedPalletGroup());
        }
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }

        if (request.getCustomAttributes() != null) {
            try {
                entity.setCustomAttributes(objectMapper.writeValueAsString(request.getCustomAttributes()));
            } catch (Exception e) {
                log.warn("Failed to serialize custom attributes for update", e);
            }
        }

        return toItemDto(itemRepository.save(entity));
    }

    @Transactional
    public void deleteItem(UUID id) {
        if (!itemRepository.existsById(id)) {
            throw new IllegalArgumentException("Material not found: " + id);
        }
        itemRepository.deleteById(id);
    }

    // =========================================================================
    // SKU MASTER
    // =========================================================================
    @Transactional(readOnly = true)
    public List<SkuMasterDto> getAllSkus() {
        return skuRepository.findAll().stream()
                .map(this::toSkuDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SkuMasterDto createSku(CreateSkuMasterRequest request) {
        if (skuRepository.existsBySkuCode(request.getSkuCode())) {
            throw new IllegalArgumentException("SKU code already exists: " + request.getSkuCode());
        }

        ItemMasterEntity item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + request.getItemId()));

        String customAttributesJson = "{}";
        if (request.getCustomAttributes() != null && !request.getCustomAttributes().isEmpty()) {
            try {
                customAttributesJson = objectMapper.writeValueAsString(request.getCustomAttributes());
            } catch (Exception e) {
                log.warn("Failed to serialize custom attributes, defaulting to empty", e);
            }
        }

        SkuMasterEntity entity = SkuMasterEntity.builder()
                .skuCode(request.getSkuCode())
                .item(item)
                .packageType(request.getPackageType())
                .unitsPerPackage(request.getUnitsPerPackage() != null ? request.getUnitsPerPackage() : BigDecimal.ONE)
                .barcode(request.getBarcode())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .customAttributes(customAttributesJson)
                .build();

        return toSkuDto(skuRepository.save(entity));
    }

    @Transactional
    public SkuMasterDto updateSku(UUID id, CreateSkuMasterRequest request) {
        SkuMasterEntity entity = skuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("SKU not found: " + id));

        if (request.getSkuCode() != null && !request.getSkuCode().equalsIgnoreCase(entity.getSkuCode())) {
            if (skuRepository.existsBySkuCode(request.getSkuCode())) {
                throw new IllegalArgumentException("SKU code already exists: " + request.getSkuCode());
            }
            entity.setSkuCode(request.getSkuCode());
        }

        if (request.getItemId() != null && (entity.getItem() == null || !request.getItemId().equals(entity.getItem().getId()))) {
            ItemMasterEntity item = itemRepository.findById(request.getItemId())
                    .orElseThrow(() -> new IllegalArgumentException("Item not found: " + request.getItemId()));
            entity.setItem(item);
        }

        if (request.getPackageType() != null) {
            entity.setPackageType(request.getPackageType());
        }
        if (request.getUnitsPerPackage() != null) {
            entity.setUnitsPerPackage(request.getUnitsPerPackage());
        }
        if (request.getBarcode() != null) {
            entity.setBarcode(request.getBarcode());
        }
        if (request.getIsActive() != null) {
            entity.setActive(request.getIsActive());
        }

        if (request.getCustomAttributes() != null) {
            try {
                entity.setCustomAttributes(objectMapper.writeValueAsString(request.getCustomAttributes()));
            } catch (Exception e) {
                log.warn("Failed to serialize custom attributes for SKU update", e);
            }
        }

        return toSkuDto(skuRepository.save(entity));
    }

    @Transactional
    public void deleteSku(UUID id) {
        if (!skuRepository.existsById(id)) {
            throw new IllegalArgumentException("SKU not found: " + id);
        }
        skuRepository.deleteById(id);
    }

    // =========================================================================
    // PALLET HANDLING STRATEGY (TI / HI RECIPES)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<PalletHandlingStrategyDto> getAllStrategies() {
        return strategyRepository.findAll().stream()
                .map(this::toStrategyDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public PalletHandlingStrategyDto createStrategy(CreateHandlingStrategyRequest request) {
        if (strategyRepository.existsByStrategyCode(request.getStrategyCode())) {
            throw new IllegalArgumentException("Strategy code already exists: " + request.getStrategyCode());
        }

        ItemMasterEntity item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + request.getItemId()));
        SkuMasterEntity sku = skuRepository.findById(request.getSkuId())
                .orElseThrow(() -> new IllegalArgumentException("SKU not found: " + request.getSkuId()));
        PalletTypeMasterEntity palletType = palletTypeRepository.findById(request.getPalletTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Pallet type not found: " + request.getPalletTypeId()));

        int standardPkgCount = request.getFullLayerQty() * request.getMaxLayers();
        BigDecimal totalQty = sku.getUnitsPerPackage().multiply(BigDecimal.valueOf(standardPkgCount));

        // Estimate weight and height based on packaging and pallet tare
        BigDecimal estimatedWeight = palletType.getTareWeightKg().add(BigDecimal.valueOf(standardPkgCount * 25.0));
        BigDecimal estimatedHeight = palletType.getHeightMm().add(BigDecimal.valueOf(request.getMaxLayers() * 160.0));

        String customAttributesJson = "{}";
        if (request.getCustomAttributes() != null && !request.getCustomAttributes().isEmpty()) {
            try {
                customAttributesJson = objectMapper.writeValueAsString(request.getCustomAttributes());
            } catch (Exception e) {
                log.warn("Failed to serialize custom attributes", e);
            }
        }

        PalletHandlingStrategyEntity entity = PalletHandlingStrategyEntity.builder()
                .strategyCode(request.getStrategyCode())
                .name(request.getName())
                .item(item)
                .sku(sku)
                .palletType(palletType)
                .fullLayerQty(request.getFullLayerQty())
                .maxLayers(request.getMaxLayers())
                .standardPackageCount(standardPkgCount)
                .standardTotalQuantity(totalQty)
                .expectedTotalWeightKg(estimatedWeight)
                .expectedHeightMm(estimatedHeight)
                .isDefault(request.isDefault())
                .customAttributes(customAttributesJson)
                .build();

        return toStrategyDto(strategyRepository.save(entity));
    }

    // =========================================================================
    // PALLET TYPE MASTER
    // =========================================================================
    @Transactional(readOnly = true)
    public List<PalletTypeMasterDto> getAllPalletTypes() {
        return palletTypeRepository.findAll().stream()
                .map(this::toPalletTypeDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public PalletTypeMasterDto createPalletType(CreatePalletTypeRequest request) {
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Pallet type code is required");
        }
        String code = request.getCode().trim().toUpperCase();
        if (palletTypeRepository.existsByCode(code)) {
            throw new IllegalArgumentException("Pallet type code already exists: " + code);
        }

        PalletTypeMasterEntity entity = PalletTypeMasterEntity.builder()
                .code(code)
                .name(request.getName() != null ? request.getName().trim() : code)
                .material(request.getMaterial() != null ? request.getMaterial().trim().toUpperCase() : "WOOD")
                .tareWeightKg(request.getTareWeightKg() != null ? request.getTareWeightKg() : BigDecimal.ZERO)
                .lengthMm(request.getLengthMm() != null ? request.getLengthMm() : BigDecimal.ZERO)
                .widthMm(request.getWidthMm() != null ? request.getWidthMm() : BigDecimal.ZERO)
                .heightMm(request.getHeightMm() != null ? request.getHeightMm() : BigDecimal.ZERO)
                .maxPayloadKg(request.getMaxPayloadKg() != null ? request.getMaxPayloadKg() : BigDecimal.ZERO)
                .build();

        PalletTypeMasterEntity saved = palletTypeRepository.save(entity);
        log.info("Created new Pallet Type: {} ({})", saved.getCode(), saved.getName());
        return toPalletTypeDto(saved);
    }

    @Transactional
    public PalletTypeMasterDto updatePalletType(UUID id, CreatePalletTypeRequest request) {
        PalletTypeMasterEntity entity = palletTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pallet type not found: " + id));

        if (request.getCode() != null && !request.getCode().equalsIgnoreCase(entity.getCode())) {
            String newCode = request.getCode().trim().toUpperCase();
            if (palletTypeRepository.existsByCode(newCode)) {
                throw new IllegalArgumentException("Pallet type code already exists: " + newCode);
            }
            entity.setCode(newCode);
        }

        if (request.getName() != null) {
            entity.setName(request.getName().trim());
        }
        if (request.getMaterial() != null) {
            entity.setMaterial(request.getMaterial().trim().toUpperCase());
        }
        if (request.getTareWeightKg() != null) {
            entity.setTareWeightKg(request.getTareWeightKg());
        }
        if (request.getLengthMm() != null) {
            entity.setLengthMm(request.getLengthMm());
        }
        if (request.getWidthMm() != null) {
            entity.setWidthMm(request.getWidthMm());
        }
        if (request.getHeightMm() != null) {
            entity.setHeightMm(request.getHeightMm());
        }
        if (request.getMaxPayloadKg() != null) {
            entity.setMaxPayloadKg(request.getMaxPayloadKg());
        }

        PalletTypeMasterEntity saved = palletTypeRepository.save(entity);
        log.info("Updated Pallet Type: {} ({})", saved.getCode(), saved.getName());
        return toPalletTypeDto(saved);
    }

    @Transactional
    public void deletePalletType(UUID id) {
        if (!palletTypeRepository.existsById(id)) {
            throw new IllegalArgumentException("Pallet type not found: " + id);
        }
        palletTypeRepository.deleteById(id);
        log.info("Deleted Pallet Type: {}", id);
    }

    // =========================================================================
    // CUSTOM ATTRIBUTE DEFINITIONS
    // =========================================================================
    @Transactional(readOnly = true)
    public List<CustomAttributeDto> getAllCustomAttributes() {
        return customAttrRepository.findAll().stream()
                .map(this::toCustomAttrDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CustomAttributeDto createCustomAttribute(CreateCustomAttributeRequest request) {
        if (customAttrRepository.existsByTargetEntityAndAttributeCode(request.getTargetEntity(), request.getAttributeCode())) {
            throw new IllegalArgumentException("Attribute already exists on entity: " + request.getAttributeCode());
        }

        String defaultValueJson = null;
        if (request.getDefaultValue() != null) {
            try {
                defaultValueJson = objectMapper.writeValueAsString(request.getDefaultValue());
            } catch (Exception e) {
                log.warn("Failed to serialize default_value", e);
            }
        }

        String allowedOptionsJson = null;
        if (request.getAllowedOptions() != null && !request.getAllowedOptions().isEmpty()) {
            try {
                allowedOptionsJson = objectMapper.writeValueAsString(request.getAllowedOptions());
            } catch (Exception e) {
                log.warn("Failed to serialize allowed_options", e);
            }
        }

        CustomAttributeDefinitionEntity entity = CustomAttributeDefinitionEntity.builder()
                .targetEntity(request.getTargetEntity())
                .attributeCode(request.getAttributeCode())
                .label(request.getLabel())
                .description(request.getDescription())
                .dataType(request.getDataType())
                .unitOfMeasure(request.getUnitOfMeasure())
                .appliesToCategory(request.getAppliesToCategory() != null ? request.getAppliesToCategory() : "ALL")
                .isRequired(request.isRequired())
                .defaultValue(defaultValueJson)
                .allowedOptions(allowedOptionsJson)
                .minValue(request.getMinValue())
                .maxValue(request.getMaxValue())
                .validationRegex(request.getValidationRegex())
                .isActive(true)
                .sortOrder(10)
                .build();

        return toCustomAttrDto(customAttrRepository.save(entity));
    }

    // =========================================================================
    // DTO MAPPERS
    // =========================================================================
    private ItemMasterDto toItemDto(ItemMasterEntity entity) {
        return ItemMasterDto.builder()
                .id(entity.getId())
                .itemCode(entity.getItemCode())
                .name(entity.getName())
                .itemType(entity.getItemType())
                .baseUom(entity.getBaseUom())
                .allowMixedPallet(entity.isAllowMixedPallet())
                .mixedPalletGroup(entity.getMixedPalletGroup())
                .status(entity.getStatus())
                .customAttributes(parseJsonMap(entity.getCustomAttributes()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private SkuMasterDto toSkuDto(SkuMasterEntity entity) {
        return SkuMasterDto.builder()
                .id(entity.getId())
                .skuCode(entity.getSkuCode())
                .itemId(entity.getItem().getId())
                .itemCode(entity.getItem().getItemCode())
                .itemName(entity.getItem().getName())
                .packageType(entity.getPackageType())
                .unitsPerPackage(entity.getUnitsPerPackage())
                .barcode(entity.getBarcode())
                .isActive(entity.isActive())
                .customAttributes(parseJsonMap(entity.getCustomAttributes()))
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private PalletHandlingStrategyDto toStrategyDto(PalletHandlingStrategyEntity entity) {
        return PalletHandlingStrategyDto.builder()
                .id(entity.getId())
                .strategyCode(entity.getStrategyCode())
                .name(entity.getName())
                .itemId(entity.getItem().getId())
                .itemCode(entity.getItem().getItemCode())
                .itemName(entity.getItem().getName())
                .skuId(entity.getSku().getId())
                .skuCode(entity.getSku().getSkuCode())
                .packageType(entity.getSku().getPackageType())
                .palletTypeId(entity.getPalletType().getId())
                .palletTypeCode(entity.getPalletType().getCode())
                .palletTypeName(entity.getPalletType().getName())
                .fullLayerQty(entity.getFullLayerQty())
                .maxLayers(entity.getMaxLayers())
                .standardPackageCount(entity.getStandardPackageCount())
                .standardTotalQuantity(entity.getStandardTotalQuantity())
                .expectedTotalWeightKg(entity.getExpectedTotalWeightKg())
                .expectedHeightMm(entity.getExpectedHeightMm())
                .isDefault(entity.isDefault())
                .customAttributes(parseJsonMap(entity.getCustomAttributes()))
                .build();
    }

    private PalletTypeMasterDto toPalletTypeDto(PalletTypeMasterEntity entity) {
        return PalletTypeMasterDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .material(entity.getMaterial())
                .tareWeightKg(entity.getTareWeightKg())
                .lengthMm(entity.getLengthMm())
                .widthMm(entity.getWidthMm())
                .heightMm(entity.getHeightMm())
                .maxPayloadKg(entity.getMaxPayloadKg())
                .build();
    }

    private CustomAttributeDto toCustomAttrDto(CustomAttributeDefinitionEntity entity) {
        List<String> options = Collections.emptyList();
        if (entity.getAllowedOptions() != null) {
            try {
                options = objectMapper.readValue(entity.getAllowedOptions(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }
        Object defaultVal = null;
        if (entity.getDefaultValue() != null) {
            try {
                defaultVal = objectMapper.readValue(entity.getDefaultValue(), Object.class);
            } catch (Exception ignored) {}
        }

        return CustomAttributeDto.builder()
                .id(entity.getId())
                .targetEntity(entity.getTargetEntity())
                .attributeCode(entity.getAttributeCode())
                .label(entity.getLabel())
                .description(entity.getDescription())
                .dataType(entity.getDataType())
                .unitOfMeasure(entity.getUnitOfMeasure())
                .appliesToCategory(entity.getAppliesToCategory())
                .isRequired(entity.isRequired())
                .defaultValue(defaultVal)
                .allowedOptions(options)
                .minValue(entity.getMinValue())
                .maxValue(entity.getMaxValue())
                .validationRegex(entity.getValidationRegex())
                .isActive(entity.isActive())
                .sortOrder(entity.getSortOrder())
                .build();
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.trim().isEmpty() || json.equals("{}")) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
}
