package org.platform.resourcemanager.infrastructure;

import org.platform.resourcemanager.application.port.ResourceAuditLoggerPort;
import org.platform.resourcemanager.domain.model.ResourceId;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Thread-safe append-only in-memory audit log recorder.
 */
public class InMemoryResourceAuditLogger implements ResourceAuditLoggerPort {

    private final Map<ResourceId, List<AuditEntry>> auditTrails = new ConcurrentHashMap<>();

    @Override
    public void log(ResourceId id, String action, String details, long version) {
        Objects.requireNonNull(id, "id must not be null");
        AuditEntry entry = AuditEntry.of(id, action, details, version);
        auditTrails.computeIfAbsent(id, k -> new CopyOnWriteArrayList<>()).add(entry);
    }

    @Override
    public List<AuditEntry> getAuditTrail(ResourceId id) {
        if (id == null) {
            return List.of();
        }
        List<AuditEntry> trail = auditTrails.get(id);
        return trail != null ? List.copyOf(trail) : List.of();
    }

    public void clear() {
        auditTrails.clear();
    }
}
