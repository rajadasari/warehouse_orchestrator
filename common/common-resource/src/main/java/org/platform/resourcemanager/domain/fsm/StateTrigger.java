package org.platform.resourcemanager.domain.fsm;

import java.io.Serializable;

/**
 * Sealed interface for state transition triggers.
 */
public sealed interface StateTrigger extends Serializable permits
        CoreTriggers.Start,
        CoreTriggers.Pause,
        CoreTriggers.Resume,
        CoreTriggers.Complete,
        CoreTriggers.Stop,
        CoreTriggers.Abort,
        CoreTriggers.Reset,
        CoreTriggers.Fault,
        CoreTriggers.Clear,
        CoreTriggers.Retire {

    String name();
}
