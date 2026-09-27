package org.platform.resourcemanager.domain.fsm;

import java.util.Optional;

/**
 * SEMI E10 semiconductor equipment reliability, availability, and maintainability (RAM) profile.
 * Maps states: Standby (Ready/Stopped), Productive (Running), Downtime (Faulted/Aborted).
 */
public final class SemiE10Profile implements StateProfile {

    public static final SemiE10Profile INSTANCE = new SemiE10Profile();

    @Override
    public String profileName() {
        return "SEMI_E10_RAM";
    }

    @Override
    public Optional<ResourceState> transition(ResourceState current, StateTrigger trigger) {
        if (current instanceof CoreStates.Retired) {
            return Optional.empty();
        }

        if (trigger instanceof CoreTriggers.Fault f) {
            return Optional.of(new CoreStates.Faulted(f.reason()));
        }
        if (trigger instanceof CoreTriggers.Abort) {
            return Optional.of(new CoreStates.Aborted());
        }

        if (current instanceof CoreStates.Ready || current instanceof CoreStates.Stopped) {
            if (trigger instanceof CoreTriggers.Start) {
                return Optional.of(new CoreStates.Running());
            }
            if (trigger instanceof CoreTriggers.Retire) {
                return Optional.of(new CoreStates.Retired());
            }
        } else if (current instanceof CoreStates.Running) {
            if (trigger instanceof CoreTriggers.Stop || trigger instanceof CoreTriggers.Complete) {
                return Optional.of(new CoreStates.Stopped());
            }
            if (trigger instanceof CoreTriggers.Pause) {
                return Optional.of(new CoreStates.Held());
            }
        } else if (current instanceof CoreStates.Held) {
            if (trigger instanceof CoreTriggers.Resume) {
                return Optional.of(new CoreStates.Running());
            }
            if (trigger instanceof CoreTriggers.Stop) {
                return Optional.of(new CoreStates.Stopped());
            }
        } else if (current instanceof CoreStates.Faulted || current instanceof CoreStates.Aborted) {
            if (trigger instanceof CoreTriggers.Reset || trigger instanceof CoreTriggers.Clear) {
                return Optional.of(new CoreStates.Ready());
            }
            if (trigger instanceof CoreTriggers.Retire) {
                return Optional.of(new CoreStates.Retired());
            }
        }

        return Optional.empty();
    }
}
