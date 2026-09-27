package org.platform.resourcemanager.domain.fsm;

import java.util.Optional;

/**
 * Strategy interface governing state transition matrices for resources.
 */
public interface StateProfile {

    String profileName();

    Optional<ResourceState> transition(ResourceState current, StateTrigger trigger);

    default boolean canTransition(ResourceState current, StateTrigger trigger) {
        return transition(current, trigger).isPresent();
    }
}
