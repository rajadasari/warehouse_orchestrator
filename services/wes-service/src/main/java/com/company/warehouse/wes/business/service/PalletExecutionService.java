package com.company.warehouse.wes.business.service;

import com.company.warehouse.wes.api.dto.CreateInboundPalletRequest;
import com.company.warehouse.wes.api.dto.PalletDto;
import com.company.warehouse.wes.api.dto.PalletItemDto;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.PalletHandlingStrategyEntity;
import com.company.warehouse.wes.data.entity.PalletItemEntity;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import com.company.warehouse.wes.data.entity.SkuMasterEntity;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletHandlingStrategyRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.entity.PalletProcessLogEntity;
import com.company.warehouse.wes.data.repository.PalletProcessLogRepository;
import com.company.warehouse.wes.data.repository.PalletTypeMasterRepository;
import com.company.warehouse.wes.data.repository.SkuMasterRepository;
import com.company.warehouse.wes.api.dto.PalletProcessLogDto;
import com.company.warehouse.wes.api.dto.RecordProcessLogRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PalletExecutionService {

    private final PalletRepository palletRepository;
    private final SkuMasterRepository skuRepository;
    private final ItemMasterRepository itemRepository;
    private final PalletHandlingStrategyRepository strategyRepository;
    private final PalletTypeMasterRepository palletTypeRepository;
    private final PalletProcessLogRepository palletProcessLogRepository;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();

    @Transactional(readOnly = true)
    public List<PalletDto> getAllPallets() {
        return palletRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toPalletDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public PalletDto createInboundPallet(CreateInboundPalletRequest request) {
        String loadType = request.getLoadType() != null && !request.getLoadType().trim().isEmpty()
                ? request.getLoadType().trim().toUpperCase()
                : "MATERIAL_WITH_SKU";

        PalletHandlingStrategyEntity strategy = null;
        if (request.getStrategyId() != null) {
            strategy = strategyRepository.findById(request.getStrategyId()).orElse(null);
        }

        PalletTypeMasterEntity palletType = null;
        if (request.getPalletTypeId() != null) {
            palletType = palletTypeRepository.findById(request.getPalletTypeId()).orElse(null);
        }
        if (palletType == null && strategy != null) {
            palletType = strategy.getPalletType();
        }
        if (palletType == null) {
            palletType = palletTypeRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new IllegalStateException("No pallet types configured"));
        }

        // Generate or use unique LPN
        long seq = 100000 + random.nextInt(900000);
        String palletLpn = request.getPalletLpn() != null && !request.getPalletLpn().trim().isEmpty()
                ? request.getPalletLpn().trim()
                : "PLT-2026-" + seq;

        String location = request.getLocation() != null && !request.getLocation().trim().isEmpty()
                ? request.getLocation().trim()
                : "STAGING-LANE-01";

        String status = request.getStatus() != null && !request.getStatus().trim().isEmpty()
                ? request.getStatus().trim()
                : "STAGED";

        boolean isMixedPallet = request.getIsMixedPallet() != null ? request.getIsMixedPallet() : false;

        BigDecimal actualWeight;
        ItemMasterEntity item = null;
        List<PalletItemEntity> palletItems = new ArrayList<>();

        PalletEntity pallet = PalletEntity.builder()
                .palletLpn(palletLpn)
                .loadType(loadType)
                .palletType(palletType)
                .status(status)
                .currentLocation(location)
                .isMixedPallet(isMixedPallet)
                .customAttributes(request.getCustomAttributes() != null && !request.getCustomAttributes().isEmpty() ? writeJson(request.getCustomAttributes()) : "{}")
                .items(palletItems)
                .build();

        switch (loadType) {
            case "NO_LOAD": {
                // Empty pallet carrier
                actualWeight = request.getActualWeightKg() != null
                        ? request.getActualWeightKg()
                        : palletType.getTareWeightKg();
                pallet.setHandlingStrategy(null);
                pallet.setMixedPallet(false);
                break;
            }
            case "PALLET_STACK": {
                // Stack of empty carrier pallets
                int stackCount = 10;
                if (request.getCustomAttributes() != null && request.getCustomAttributes().containsKey("pallet_stack_count")) {
                    try {
                        stackCount = Integer.parseInt(request.getCustomAttributes().get("pallet_stack_count").toString());
                    } catch (Exception ignored) {}
                }
                actualWeight = request.getActualWeightKg() != null
                        ? request.getActualWeightKg()
                        : palletType.getTareWeightKg().multiply(BigDecimal.valueOf(stackCount));
                pallet.setHandlingStrategy(null);
                pallet.setMixedPallet(false);
                break;
            }
            case "MATERIAL": {
                // Direct Material on Pallet (bulk, loose, liquid)
                if (request.getItemId() != null) {
                    item = itemRepository.findById(request.getItemId()).orElse(null);
                }
                if (item == null && strategy != null && strategy.getItem() != null) {
                    item = strategy.getItem();
                }
                if (item == null) {
                    item = itemRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalStateException("No materials/items configured"));
                }
                BigDecimal materialQty = request.getMaterialQuantity() != null && request.getMaterialQuantity().compareTo(BigDecimal.ZERO) > 0
                        ? request.getMaterialQuantity()
                        : (request.getTotalQuantity() != null && request.getTotalQuantity().compareTo(BigDecimal.ZERO) > 0
                                ? request.getTotalQuantity()
                                : BigDecimal.valueOf(500.0));

                actualWeight = request.getActualWeightKg() != null
                        ? request.getActualWeightKg()
                        : palletType.getTareWeightKg().add(materialQty).add(BigDecimal.valueOf(random.nextDouble() * 2.0 - 1.0));

                pallet.setHandlingStrategy(strategy);

                String lotNumber = request.getLotNumber() != null && !request.getLotNumber().trim().isEmpty()
                        ? request.getLotNumber().trim()
                        : "LOT-MAT-" + item.getItemCode().substring(0, Math.min(item.getItemCode().length(), 6)) + "-2026";
                LocalDate expiryDate = request.getExpiryDate() != null
                        ? request.getExpiryDate()
                        : LocalDate.now().plusYears(1).plusMonths(random.nextInt(12));

                PalletItemEntity itemEntity = PalletItemEntity.builder()
                        .pallet(pallet)
                        .item(item)
                        .sku(null)
                        .packageCount(1)
                        .totalQuantity(materialQty)
                        .lotNumber(lotNumber)
                        .expiryDate(expiryDate)
                        .build();
                palletItems.add(itemEntity);
                break;
            }
            case "MATERIAL_WITH_SKU":
            default: {
                // Packaged SKU goods
                SkuMasterEntity sku = null;
                if (request.getSkuId() != null) {
                    sku = skuRepository.findById(request.getSkuId()).orElse(null);
                }
                if (sku == null && strategy != null) {
                    sku = strategy.getSku();
                }
                if (sku == null) {
                    sku = skuRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalStateException("No packaging SKUs configured"));
                }
                item = sku.getItem();

                if (strategy == null) {
                    strategy = strategyRepository.findBySkuIdAndIsDefaultTrue(sku.getId())
                            .orElse(strategyRepository.findAll().stream().findFirst().orElse(null));
                }

                int packageCount = request.getPackageCount() != null && request.getPackageCount() > 0
                        ? request.getPackageCount()
                        : (strategy != null ? strategy.getStandardPackageCount() : 40);

                BigDecimal totalQuantity = request.getTotalQuantity() != null
                        ? request.getTotalQuantity()
                        : sku.getUnitsPerPackage().multiply(BigDecimal.valueOf(packageCount));

                BigDecimal unitWeight = sku.getUnitsPerPackage() != null ? sku.getUnitsPerPackage() : BigDecimal.valueOf(25.0);
                actualWeight = request.getActualWeightKg() != null
                        ? request.getActualWeightKg()
                        : palletType.getTareWeightKg().add(unitWeight.multiply(BigDecimal.valueOf(packageCount)))
                                .add(BigDecimal.valueOf(random.nextDouble() * 2.0 - 1.0));

                pallet.setHandlingStrategy(strategy);

                String lotNumber = request.getLotNumber() != null && !request.getLotNumber().trim().isEmpty()
                        ? request.getLotNumber().trim()
                        : "LOT-" + sku.getSkuCode().substring(0, Math.min(sku.getSkuCode().length(), 6)) + "-2026";
                LocalDate expiryDate = request.getExpiryDate() != null
                        ? request.getExpiryDate()
                        : LocalDate.now().plusYears(1).plusMonths(random.nextInt(12));

                PalletItemEntity itemEntity = PalletItemEntity.builder()
                        .pallet(pallet)
                        .item(item)
                        .sku(sku)
                        .packageCount(packageCount)
                        .totalQuantity(totalQuantity)
                        .lotNumber(lotNumber)
                        .expiryDate(expiryDate)
                        .build();
                palletItems.add(itemEntity);
                break;
            }
        }

        pallet.setActualWeightKg(actualWeight);

        PalletEntity saved = palletRepository.save(pallet);
        log.info("Successfully created live inbound Pallet LPN={} loadType={}", saved.getPalletLpn(), saved.getLoadType());

        // Automatically record initial process log
        try {
            PalletProcessLogEntity initialLog = PalletProcessLogEntity.builder()
                    .pallet(saved)
                    .palletLpn(saved.getPalletLpn())
                    .processStage("INBOUND")
                    .location(saved.getCurrentLocation())
                    .status(saved.getStatus())
                    .propertiesSnapshot(saved.getCustomAttributes() != null && !saved.getCustomAttributes().isEmpty() ? saved.getCustomAttributes() : "{}")
                    .notes("Pallet registered at inbound receiving")
                    .build();
            palletProcessLogRepository.save(initialLog);
        } catch (Exception e) {
            log.warn("Failed to record initial process log for pallet {}: {}", saved.getPalletLpn(), e.getMessage());
        }

        return toPalletDto(saved);
    }

    @Transactional
    public PalletProcessLogDto recordProcessLog(UUID palletId, RecordProcessLogRequest request) {
        PalletEntity pallet = palletRepository.findById(palletId)
                .orElseThrow(() -> new IllegalArgumentException("Pallet not found: " + palletId));

        String stage = request.getProcessStage() != null && !request.getProcessStage().trim().isEmpty()
                ? request.getProcessStage().trim().toUpperCase()
                : "CHECK";
        if (stage.length() > 10) {
            stage = stage.substring(0, 10);
        }

        if (request.getLocation() != null && !request.getLocation().trim().isEmpty()) {
            pallet.setCurrentLocation(request.getLocation().trim());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            pallet.setStatus(request.getStatus().trim());
        }

        // Merge properties into active customAttributes on pallet
        Map<String, Object> currentProps = new HashMap<>(parseJsonMap(pallet.getCustomAttributes()));
        if (request.getProperties() != null) {
            currentProps.putAll(request.getProperties());
        }
        String mergedJson = writeJson(currentProps);
        pallet.setCustomAttributes(mergedJson);
        palletRepository.save(pallet);

        PalletProcessLogEntity logEntity = PalletProcessLogEntity.builder()
                .pallet(pallet)
                .palletLpn(pallet.getPalletLpn())
                .processStage(stage)
                .location(pallet.getCurrentLocation())
                .status(pallet.getStatus())
                .propertiesSnapshot(mergedJson)
                .notes(request.getNotes())
                .build();

        PalletProcessLogEntity savedLog = palletProcessLogRepository.save(logEntity);
        log.info("Recorded process log stage={} for pallet LPN={}", stage, pallet.getPalletLpn());
        return toProcessLogDto(savedLog);
    }

    @Transactional(readOnly = true)
    public List<PalletProcessLogDto> getPalletProcessLogs(UUID palletId) {
        return palletProcessLogRepository.findByPalletIdOrderByCreatedAtDesc(palletId).stream()
                .map(this::toProcessLogDto)
                .collect(Collectors.toList());
    }

    private PalletProcessLogDto toProcessLogDto(PalletProcessLogEntity entity) {
        return PalletProcessLogDto.builder()
                .id(entity.getId())
                .palletId(entity.getPallet() != null ? entity.getPallet().getId() : null)
                .palletLpn(entity.getPalletLpn())
                .processStage(entity.getProcessStage())
                .location(entity.getLocation())
                .status(entity.getStatus())
                .propertiesSnapshot(parseJsonMap(entity.getPropertiesSnapshot()))
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private PalletDto toPalletDto(PalletEntity entity) {
        List<PalletItemDto> itemDtos = entity.getItems() != null
                ? entity.getItems().stream().map(it -> {
                    UUID skuId = it.getSku() != null ? it.getSku().getId() : null;
                    String skuCode = it.getSku() != null ? it.getSku().getSkuCode() : null;
                    String pkgType = it.getSku() != null ? it.getSku().getPackageType() : "BULK";
                    UUID itmId = it.getItem() != null ? it.getItem().getId() : (it.getSku() != null && it.getSku().getItem() != null ? it.getSku().getItem().getId() : null);
                    String itmCode = it.getItem() != null ? it.getItem().getItemCode() : (it.getSku() != null && it.getSku().getItem() != null ? it.getSku().getItem().getItemCode() : null);
                    String itmName = it.getItem() != null ? it.getItem().getName() : (it.getSku() != null && it.getSku().getItem() != null ? it.getSku().getItem().getName() : null);
                    String baseUom = it.getItem() != null ? it.getItem().getBaseUom() : (it.getSku() != null && it.getSku().getItem() != null ? it.getSku().getItem().getBaseUom() : "KG");

                    return PalletItemDto.builder()
                            .id(it.getId())
                            .itemId(itmId)
                            .itemCode(itmCode)
                            .skuId(skuId)
                            .skuCode(skuCode)
                            .itemName(itmName)
                            .packageType(pkgType)
                            .packageCount(it.getPackageCount())
                            .totalQuantity(it.getTotalQuantity())
                            .baseUom(baseUom)
                            .lotNumber(it.getLotNumber())
                            .serialNumber(it.getSerialNumber())
                            .expiryDate(it.getExpiryDate())
                            .build();
                }).collect(Collectors.toList())
                : Collections.emptyList();

        UUID directItemId = entity.getItems() != null && !entity.getItems().isEmpty() && entity.getItems().get(0).getItem() != null ? entity.getItems().get(0).getItem().getId() : null;
        String directItemCode = entity.getItems() != null && !entity.getItems().isEmpty() && entity.getItems().get(0).getItem() != null ? entity.getItems().get(0).getItem().getItemCode() : null;
        String directItemName = entity.getItems() != null && !entity.getItems().isEmpty() && entity.getItems().get(0).getItem() != null ? entity.getItems().get(0).getItem().getName() : null;
        String directUom = entity.getItems() != null && !entity.getItems().isEmpty() && entity.getItems().get(0).getItem() != null ? entity.getItems().get(0).getItem().getBaseUom() : null;

        return PalletDto.builder()
                .id(entity.getId())
                .palletLpn(entity.getPalletLpn())
                .loadType(entity.getLoadType() != null ? entity.getLoadType() : "MATERIAL_WITH_SKU")
                .strategyId(entity.getHandlingStrategy() != null ? entity.getHandlingStrategy().getId() : null)
                .strategyCode(entity.getHandlingStrategy() != null ? entity.getHandlingStrategy().getStrategyCode() : "CUSTOM")
                .strategyName(entity.getHandlingStrategy() != null ? entity.getHandlingStrategy().getName() : "Direct Pallet Stack")
                .palletTypeId(entity.getPalletType().getId())
                .palletTypeCode(entity.getPalletType().getCode())
                .palletTypeName(entity.getPalletType().getName())
                .itemId(directItemId)
                .itemCode(directItemCode)
                .itemName(directItemName)
                .materialBaseUom(directUom)
                .status(entity.getStatus())
                .currentLocation(entity.getCurrentLocation())
                .isMixedPallet(entity.isMixedPallet())
                .actualWeightKg(entity.getActualWeightKg())

                .customAttributes(parseJsonMap(entity.getCustomAttributes()))
                .items(itemDtos)
                .createdAt(entity.getCreatedAt())
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

    private String writeJson(Object obj) {
        if (obj == null) return "{}";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
