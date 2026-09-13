package com.company.warehouse.wes.business.process.orchestration;

import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.entity.ResourceRelationshipEntity;
import com.company.warehouse.wes.data.repository.ResourceRelationshipRepository;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Queue;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessOrchestrationService {

    private final ResourceRepository resourceRepository;
    private final ResourceRelationshipRepository relationshipRepository;
    private final ResourceManager resourceManager;

    /**
     * Resolves the primary weigh scale device associated with a given station or conveyor spur.
     */
    @Transactional(readOnly = true)
    public Optional<ResourceEntity> resolveAssociatedScale(String stationResourceId) {
        if (stationResourceId == null || stationResourceId.isBlank()) {
            return Optional.empty();
        }
        List<ResourceRelationshipEntity> sources = relationshipRepository
                .findByTargetResourceIdAndRelationTypeAndActiveTrue(stationResourceId.trim(), "DATA_SOURCE_FOR");

        for (ResourceRelationshipEntity rel : sources) {
            Optional<ResourceEntity> resOpt = resourceRepository.findActiveByResourceId(rel.getSourceResourceId());
            if (resOpt.isPresent()) {
                ResourceEntity res = resOpt.get();
                if ("WEIGH_SCALE".equalsIgnoreCase(res.getType())) {
                    log.debug("Resolved scale '{}' for station '{}'", res.getResourceId(), stationResourceId);
                    return Optional.of(res);
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Resolves the primary optical barcode scanner associated with a given station or conveyor spur.
     */
    @Transactional(readOnly = true)
    public Optional<ResourceEntity> resolveAssociatedScanner(String stationResourceId) {
        if (stationResourceId == null || stationResourceId.isBlank()) {
            return Optional.empty();
        }
        List<ResourceRelationshipEntity> sources = relationshipRepository
                .findByTargetResourceIdAndRelationTypeAndActiveTrue(stationResourceId.trim(), "DATA_SOURCE_FOR");

        for (ResourceRelationshipEntity rel : sources) {
            Optional<ResourceEntity> resOpt = resourceRepository.findActiveByResourceId(rel.getSourceResourceId());
            if (resOpt.isPresent()) {
                ResourceEntity res = resOpt.get();
                if ("BARCODE_SCANNER".equalsIgnoreCase(res.getType())) {
                    log.debug("Resolved scanner '{}' for station '{}'", res.getResourceId(), stationResourceId);
                    return Optional.of(res);
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Discovers if a valid material flow route exists between a source resource and a destination resource.
     * Uses Breadth-First Search across active 'TRANSFERS_TO' relationships.
     */
    @Transactional(readOnly = true)
    public List<String> findMaterialFlowPath(String startResourceId, String destinationResourceId) {
        if (startResourceId == null || destinationResourceId == null) {
            return Collections.emptyList();
        }
        if (startResourceId.equalsIgnoreCase(destinationResourceId)) {
            return List.of(startResourceId);
        }

        Queue<List<String>> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();

        queue.add(List.of(startResourceId));
        visited.add(startResourceId.toUpperCase());

        while (!queue.isEmpty()) {
            List<String> path = queue.poll();
            String current = path.get(path.size() - 1);

            List<String> downstream = resourceManager.getDownstreamTargets(current);
            for (String next : downstream) {
                if (next.equalsIgnoreCase(destinationResourceId)) {
                    List<String> completePath = new ArrayList<>(path);
                    completePath.add(next);
                    log.info("Found material flow path from '{}' to '{}': {}", startResourceId, destinationResourceId, completePath);
                    return completePath;
                }
                if (!visited.contains(next.toUpperCase())) {
                    visited.add(next.toUpperCase());
                    List<String> newPath = new ArrayList<>(path);
                    newPath.add(next);
                    queue.add(newPath);
                }
            }
        }

        log.warn("No material flow path found from '{}' to '{}'", startResourceId, destinationResourceId);
        return Collections.emptyList();
    }
}
