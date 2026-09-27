package com.company.warehouse.wes.adapter.resource;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.platform.resourcemanager.application.port.EventPublisherPort;
import org.platform.resourcemanager.domain.event.ResourceEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Spring ApplicationEventPublisher adapter for common-resource EventPublisherPort.
 * Dispatches domain events to both the local Spring application context and registered listeners.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SpringEventPublisherAdapter implements EventPublisherPort {

    private final ApplicationEventPublisher applicationEventPublisher;
    private final List<Consumer<ResourceEvent>> listeners = new CopyOnWriteArrayList<>();

    @Override
    public void publish(ResourceEvent event) {
        log.debug("Publishing ResourceEvent: type={}, resourceId={}", 
                event.getClass().getSimpleName(), event.resourceId());
        
        // 1. Dispatch to Spring application context listeners
        applicationEventPublisher.publishEvent(event);

        // 2. Dispatch to custom SPI subscribers
        for (Consumer<ResourceEvent> listener : listeners) {
            try {
                listener.accept(event);
            } catch (Exception e) {
                log.error("Error dispatching event to listener", e);
            }
        }
    }

    @Override
    public void subscribe(Consumer<ResourceEvent> listener) {
        if (listener != null) {
            listeners.add(listener);
        }
    }
}
