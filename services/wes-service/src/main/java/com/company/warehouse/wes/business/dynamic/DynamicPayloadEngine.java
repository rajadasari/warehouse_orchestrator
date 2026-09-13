package com.company.warehouse.wes.business.dynamic;

import com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity;
import com.company.warehouse.wes.data.repository.ApiIntegrationMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * WES-specific Dynamic Payload Engine facade.
 * Manages database mapping entities and delegates template evaluation to the universal common engine.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DynamicPayloadEngine {

    private final com.company.warehouse.common.client.software.dynamic.DynamicPayloadEngine commonEngine;
    private final ApiIntegrationMappingRepository mappingRepository;

    /**
     * Finds an active dynamic mapping for a given target resource and operation type.
     */
    public Optional<ApiIntegrationMappingEntity> findActiveMapping(String targetResourceId, String operationType) {
        List<ApiIntegrationMappingEntity> mappings = mappingRepository
                .findByTargetResourceIdAndOperationTypeAndActiveTrue(targetResourceId, operationType);
        if (mappings.isEmpty()) {
            log.debug("[DynamicPayloadEngine] No active mapping found for resource='{}', operation='{}'", targetResourceId, operationType);
            return Optional.empty();
        }
        return Optional.of(mappings.get(0));
    }

    /**
     * Resolves and builds a JSON payload from a mapping template given context data.
     */
    public String buildPayload(String templateJson, Map<String, Object> context) {
        return commonEngine.buildPayload(templateJson, context);
    }

    /**
     * Resolves and builds a JSON payload with optional pretty-printing.
     */
    public String buildPayload(String templateJson, Map<String, Object> context, boolean prettyPrint) {
        return commonEngine.buildPayload(templateJson, context, prettyPrint);
    }

    /**
     * Evaluates headers template given context data.
     */
    public Map<String, String> buildHeaders(String headersTemplateJson, Map<String, Object> context) {
        return commonEngine.buildHeaders(headersTemplateJson, context);
    }

    /**
     * Resolves dynamic path variables and query parameters in a URL template.
     */
    public String resolveUrl(String urlTemplate, Map<String, Object> context) {
        return commonEngine.resolveUrl(urlTemplate, context);
    }

    /**
     * Clears in-memory template cache.
     */
    public void invalidateCache() {
        commonEngine.invalidateCache();
        log.info("[DynamicPayloadEngine] Template cache invalidated");
    }
}
