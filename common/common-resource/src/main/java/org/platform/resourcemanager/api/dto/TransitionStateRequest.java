package org.platform.resourcemanager.api.dto;

import java.io.Serializable;
import java.util.Objects;

/**
 * Immutable DTO for requesting state transition on a resource.
 */
public record TransitionStateRequest(
        String triggerName,
        String reason,
        String operatorId,
        long expectedVersion
) implements Serializable {

    public TransitionStateRequest {
        Objects.requireNonNull(triggerName, "triggerName must not be null");
        triggerName = triggerName.trim().toUpperCase();
        reason = (reason == null || reason.isBlank()) ? "Standard command" : reason.trim();
        operatorId = (operatorId == null || operatorId.isBlank()) ? "OPERATOR" : operatorId.trim();
    }

    public static TransitionStateRequest of(String triggerName, long expectedVersion) {
        return new TransitionStateRequest(triggerName, "Command execution", "OPERATOR", expectedVersion);
    }

    public static TransitionStateRequest of(String triggerName, String reason, long expectedVersion) {
        return new TransitionStateRequest(triggerName, reason, "OPERATOR", expectedVersion);
    }

    public static TransitionStateRequest of(String triggerName, String reason, String operatorId, long expectedVersion) {
        return new TransitionStateRequest(triggerName, reason, operatorId, expectedVersion);
    }
}
