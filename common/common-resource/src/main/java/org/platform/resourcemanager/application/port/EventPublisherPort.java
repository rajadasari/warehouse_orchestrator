package org.platform.resourcemanager.application.port;

import org.platform.resourcemanager.domain.event.ResourceEvent;

import java.util.function.Consumer;

/**
 * Event publication port (SPI) for dispatching domain notifications to internal listeners
 * or external broker adapters (Kafka, MQTT, SSE).
 */
public interface EventPublisherPort {

    void publish(ResourceEvent event);

    void subscribe(Consumer<ResourceEvent> listener);
}
