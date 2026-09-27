package org.platform.resourcemanager.infrastructure;

import org.platform.resourcemanager.application.port.EventPublisherPort;
import org.platform.resourcemanager.domain.event.ResourceEvent;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Thread-safe in-memory event publisher distributing events to registered consumers.
 */
public class InMemoryEventPublisher implements EventPublisherPort {

    private final List<Consumer<ResourceEvent>> subscribers = new CopyOnWriteArrayList<>();

    @Override
    public void publish(ResourceEvent event) {
        Objects.requireNonNull(event, "event must not be null");
        for (Consumer<ResourceEvent> subscriber : subscribers) {
            try {
                subscriber.accept(event);
            } catch (Exception ex) {
                // Log or handle subscriber exception without crashing caller
            }
        }
    }

    @Override
    public void subscribe(Consumer<ResourceEvent> listener) {
        Objects.requireNonNull(listener, "listener must not be null");
        subscribers.add(listener);
    }

    public void unsubscribe(Consumer<ResourceEvent> listener) {
        subscribers.remove(listener);
    }

    public void clearSubscribers() {
        subscribers.clear();
    }
}
