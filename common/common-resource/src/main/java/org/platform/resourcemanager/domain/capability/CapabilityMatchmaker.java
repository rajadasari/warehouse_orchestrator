package org.platform.resourcemanager.domain.capability;

import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.SpatialCoordinate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Multi-criteria resource discovery and matchmaking engine for capability-driven dispatch.
 */
public class CapabilityMatchmaker {

    public List<Resource> findAvailable(Collection<Resource> resources, String capability) {
        if (resources == null || capability == null) {
            return List.of();
        }
        String capUpper = capability.toUpperCase().trim();
        return resources.stream()
                .filter(r -> r.getStatus() == OperationalStatus.AVAILABLE)
                .filter(r -> r.hasCapability(capUpper))
                .collect(Collectors.toList());
    }

    public List<Resource> findAndRankByProximity(
            Collection<Resource> resources,
            String capability,
            SpatialCoordinate targetLocation
    ) {
        List<Resource> candidates = findAvailable(resources, capability);
        if (targetLocation == null || candidates.isEmpty()) {
            return candidates;
        }

        List<Resource> sorted = new ArrayList<>(candidates);
        sorted.sort(Comparator.comparingDouble(r -> r.getCoordinate().distanceTo(targetLocation)));
        return Collections.unmodifiableList(sorted);
    }

    public ValidationResult validateParameters(CapabilityContract contract, Map<String, Object> parameters) {
        Objects.requireNonNull(contract, "contract must not be null");
        Map<String, Object> params = (parameters != null) ? parameters : Map.of();
        List<String> errors = new ArrayList<>();

        for (ParameterRule rule : contract.parameterRules()) {
            Object val = params.get(rule.name());
            if (val == null) {
                if (rule.required()) {
                    errors.add("Missing required parameter: " + rule.name());
                }
                continue;
            }

            if (!rule.expectedType().isInstance(val)) {
                errors.add(String.format("Parameter [%s] expects type %s but was %s",
                        rule.name(), rule.expectedType().getSimpleName(), val.getClass().getSimpleName()));
                continue;
            }

            try {
                if (!rule.customValidator().test(val)) {
                    errors.add("Parameter [" + rule.name() + "] failed validation rule constraint");
                }
            } catch (Exception ex) {
                errors.add("Parameter [" + rule.name() + "] validation threw error: " + ex.getMessage());
            }
        }

        return errors.isEmpty() ? ValidationResult.valid() : ValidationResult.invalid(errors);
    }
}
