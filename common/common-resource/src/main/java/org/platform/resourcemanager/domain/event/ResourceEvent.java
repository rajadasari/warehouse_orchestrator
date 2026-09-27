package org.platform.resourcemanager.domain.event;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.time.Instant;

/**
 * CloudEvents 1.0 compliant base event interface for resource mutations.
 */
public interface ResourceEvent extends Serializable {

    String eventId();

    ResourceId resourceId();

    String eventType();

    Instant timestamp();

    default String specVersion() {
        return "1.0";
    }
}
