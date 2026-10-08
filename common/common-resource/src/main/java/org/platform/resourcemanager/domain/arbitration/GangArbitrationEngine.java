package org.platform.resourcemanager.domain.arbitration;

import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Deadlock-free atomic multi-resource gang arbitration engine.
 * Guarantees zero distributed deadlocks via canonical ResourceId ordering and 2-phase rollback.
 */
public class GangArbitrationEngine {

    private static final Logger log = LoggerFactory.getLogger(GangArbitrationEngine.class);

    private final Function<ResourceId, Optional<Resource>> resourceLookup;
    private final Map<String, Lease> activeLeases = new ConcurrentHashMap<>();

    public GangArbitrationEngine(Function<ResourceId, Optional<Resource>> resourceLookup) {
        this.resourceLookup = Objects.requireNonNull(resourceLookup, "resourceLookup must not be null");
    }

    public synchronized AllocationResult allocateGang(AllocationRequest request) {
        Objects.requireNonNull(request, "request must not be null");

        // Step 1: Canonical ResourceId ordering to eliminate Coffman circular wait condition
        List<ResourceId> canonicalOrder = new ArrayList<>(request.resourceIds());
        Collections.sort(canonicalOrder);

        // Step 2: Phase 1 Pre-flight verification
        Set<ResourceId> unavailable = new HashSet<>();
        List<Resource> targets = new ArrayList<>();

        for (ResourceId id : canonicalOrder) {
            Optional<Resource> opt = resourceLookup.apply(id);
            if (opt.isEmpty()) {
                unavailable.add(id);
            } else {
                Resource res = opt.get();
                if (res.getStatus() != OperationalStatus.AVAILABLE) {
                    unavailable.add(id);
                } else {
                    targets.add(res);
                }
            }
        }

        if (!unavailable.isEmpty()) {
            return AllocationResult.rejected("Resources unavailable or busy", unavailable);
        }

        // Step 3: Phase 2 Atomic Reservation with Rollback Safety
        List<Resource> successfullyReserved = new ArrayList<>();
        try {
            for (Resource res : targets) {
                long currentVersion = res.getVersion();
                res.updateStatus(OperationalStatus.RESERVED, currentVersion);
                successfullyReserved.add(res);
            }

            Lease lease = Lease.of(request.resourceIds(), request.requesterId(), request.leaseDuration());
            activeLeases.put(lease.leaseId(), lease);
            return AllocationResult.granted(lease);

        } catch (Exception collision) {
            // Collision or contention detected -> Roll back previously locked resources
            for (Resource rolledBack : successfullyReserved) {
                try {
                    rolledBack.updateStatus(OperationalStatus.AVAILABLE, rolledBack.getVersion());
                } catch (Exception ex) {
                    log.warn("Failed to rollback reservation for resourceId={}: {}", rolledBack.getId(), ex.getMessage());
                }
            }
            return AllocationResult.rejected("Concurrency collision during gang reservation: " + collision.getMessage(),
                    request.resourceIds());
        }
    }

    public synchronized boolean release(String leaseId) {
        Objects.requireNonNull(leaseId, "leaseId must not be null");
        Lease lease = activeLeases.remove(leaseId);
        if (lease == null) {
            return false;
        }

        for (ResourceId id : lease.resourceIds()) {
            resourceLookup.apply(id).ifPresent(res -> {
                if (res.getStatus() == OperationalStatus.RESERVED) {
                    try {
                        res.updateStatus(OperationalStatus.AVAILABLE, res.getVersion());
                    } catch (Exception ex) {
                        log.warn("Failed to reset status to AVAILABLE on release for resourceId={}: {}", res.getId(), ex.getMessage());
                    }
                }
            });
        }
        return true;
    }

    public synchronized boolean releaseByResource(ResourceId resourceId) {
        if (resourceId == null) {
            return false;
        }
        List<String> matchingLeaseIds = new ArrayList<>();
        for (Map.Entry<String, Lease> entry : activeLeases.entrySet()) {
            if (entry.getValue().resourceIds().contains(resourceId)) {
                matchingLeaseIds.add(entry.getKey());
            }
        }
        boolean anyReleased = false;
        for (String leaseId : matchingLeaseIds) {
            anyReleased |= release(leaseId);
        }
        return anyReleased;
    }

    public synchronized int expireStaleLeases() {
        List<String> expiredIds = new ArrayList<>();

        for (Map.Entry<String, Lease> entry : activeLeases.entrySet()) {
            if (entry.getValue().isExpired()) {
                expiredIds.add(entry.getKey());
            }
        }

        int count = 0;
        for (String expiredId : expiredIds) {
            if (release(expiredId)) {
                count++;
            }
        }
        return count;
    }

    public Optional<Lease> getLease(String leaseId) {
        return Optional.ofNullable(activeLeases.get(leaseId));
    }

    public Map<String, Lease> getActiveLeases() {
        return Collections.unmodifiableMap(activeLeases);
    }
}
