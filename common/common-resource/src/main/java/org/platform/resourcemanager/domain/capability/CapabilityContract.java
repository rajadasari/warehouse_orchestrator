package org.platform.resourcemanager.domain.capability;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;

/**
 * Formal capability specification conforming to AAS / IDTA capability metamodels.
 */
public record CapabilityContract(
        String capabilityId,
        String version,
        String description,
        List<ParameterRule> parameterRules
) implements Serializable {

    public CapabilityContract {
        Objects.requireNonNull(capabilityId, "capabilityId must not be null");
        version = (version == null || version.isBlank()) ? "1.0.0" : version.trim();
        description = (description == null) ? "" : description.trim();
        parameterRules = (parameterRules == null) ? List.of() : List.copyOf(parameterRules);
    }

    public static CapabilityContract of(String capabilityId) {
        return new CapabilityContract(capabilityId, "1.0.0", "", List.of());
    }

    public static CapabilityContract of(String capabilityId, List<ParameterRule> rules) {
        return new CapabilityContract(capabilityId, "1.0.0", "", rules);
    }
}
