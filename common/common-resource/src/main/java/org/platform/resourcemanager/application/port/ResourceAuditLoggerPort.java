package org.platform.resourcemanager.application.port;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;

/**
 * Audit trail port (SPI) for recording immutable mutation logs.
 */
public interface ResourceAuditLoggerPort {

    void log(ResourceId id, String action, String details, long version);

    List<AuditEntry> getAuditTrail(ResourceId id);

    record AuditEntry(
            String auditId,
            ResourceId resourceId,
            String action,
            String details,
            long version,
            Instant timestamp
    ) implements Serializable {
        public static AuditEntry of(ResourceId id, String action, String details, long version) {
            return new AuditEntry(java.util.UUID.randomUUID().toString(), id, action, details, version, Instant.now());
        }
    }
}
