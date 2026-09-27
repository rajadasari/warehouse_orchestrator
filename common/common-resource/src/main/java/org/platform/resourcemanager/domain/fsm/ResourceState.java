package org.platform.resourcemanager.domain.fsm;

import org.platform.resourcemanager.domain.model.OperationalStatus;

import java.io.Serializable;

/**
 * Sealed interface defining deterministic, compile-time verified operational states.
 * Conforms to OMAC PackML (ISA-TR88) and SEMI E10 operational state profiles.
 */
public sealed interface ResourceState extends Serializable permits
        CoreStates.Ready,
        CoreStates.Starting,
        CoreStates.Running,
        CoreStates.Holding,
        CoreStates.Held,
        CoreStates.Unholding,
        CoreStates.Completing,
        CoreStates.Complete,
        CoreStates.Stopping,
        CoreStates.Stopped,
        CoreStates.Aborting,
        CoreStates.Aborted,
        CoreStates.Resetting,
        CoreStates.Faulted,
        CoreStates.Retired {

    String name();

    OperationalStatus defaultStatus();

    boolean isFinal();
}
