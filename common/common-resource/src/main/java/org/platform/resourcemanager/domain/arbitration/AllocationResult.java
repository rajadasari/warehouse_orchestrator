package org.platform.resourcemanager.domain.arbitration;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.util.Collections;
import java.util.Set;

/**
 * Sealed result interface for atomic gang allocation outcomes.
 */
public sealed interface AllocationResult extends Serializable permits
        AllocationResult.Granted,
        AllocationResult.Rejected {

    boolean isGranted();

    record Granted(Lease lease) implements AllocationResult {
        public Granted {
            java.util.Objects.requireNonNull(lease, "lease must not be null");
        }

        @Override
        public boolean isGranted() {
            return true;
        }
    }

    record Rejected(String reason, Set<ResourceId> unavailableResources) implements AllocationResult {
        public Rejected {
            reason = (reason == null || reason.isBlank()) ? "Resource contention" : reason;
            unavailableResources = (unavailableResources == null) ? Set.of() : Set.copyOf(unavailableResources);
        }

        @Override
        public boolean isGranted() {
            return false;
        }

        public Set<ResourceId> getUnavailableResources() {
            return Collections.unmodifiableSet(unavailableResources);
        }
    }

    static AllocationResult granted(Lease lease) {
        return new Granted(lease);
    }

    static AllocationResult rejected(String reason, Set<ResourceId> unavailable) {
        return new Rejected(reason, unavailable);
    }
}
