package org.platform.resourcemanager.domain.model;

/**
 * High-level operational availability status of a resource for arbitration and dispatching.
 */
public enum OperationalStatus {
    AVAILABLE(true, "Ready for immediate assignment"),
    BUSY(false, "Currently processing an allocated task"),
    RESERVED(false, "Pre-allocated by an active distributed lease"),
    FAULTED(false, "Inoperable due to safety trigger or hardware fault"),
    MAINTENANCE(false, "Offline for scheduled or preventative servicing");

    private final boolean allocatable;
    private final String description;

    OperationalStatus(boolean allocatable, String description) {
        this.allocatable = allocatable;
        this.description = description;
    }

    public boolean isAllocatable() {
        return allocatable;
    }

    public String getDescription() {
        return description;
    }
}
