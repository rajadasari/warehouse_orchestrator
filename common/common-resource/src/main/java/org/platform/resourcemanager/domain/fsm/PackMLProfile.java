package org.platform.resourcemanager.domain.fsm;

import java.util.Optional;

/**
 * OMAC PackML (ISA-TR88) deterministic state machine profile.
 */
public final class PackMLProfile implements StateProfile {

    public static final PackMLProfile INSTANCE = new PackMLProfile();

    @Override
    public String profileName() {
        return "PackML_ISA-TR88";
    }

    @Override
    public Optional<ResourceState> transition(ResourceState current, StateTrigger trigger) {
        if (current instanceof CoreStates.Retired) {
            return Optional.empty(); // Retired is terminal
        }

        // Global safety triggers (Fault and Abort)
        if (trigger instanceof CoreTriggers.Fault f) {
            return Optional.of(new CoreStates.Faulted(f.reason()));
        }
        if (trigger instanceof CoreTriggers.Abort) {
            return Optional.of(new CoreStates.Aborted());
        }

        // State-dependent transitions
        if (current instanceof CoreStates.Ready) {
            if (trigger instanceof CoreTriggers.Start) {
                return Optional.of(new CoreStates.Running());
            }
            if (trigger instanceof CoreTriggers.Stop) {
                return Optional.of(new CoreStates.Stopped());
            }
        } else if (current instanceof CoreStates.Running) {
            if (trigger instanceof CoreTriggers.Pause) {
                return Optional.of(new CoreStates.Held());
            }
            if (trigger instanceof CoreTriggers.Complete) {
                return Optional.of(new CoreStates.Complete());
            }
            if (trigger instanceof CoreTriggers.Stop) {
                return Optional.of(new CoreStates.Stopped());
            }
        } else if (current instanceof CoreStates.Held) {
            if (trigger instanceof CoreTriggers.Resume) {
                return Optional.of(new CoreStates.Running());
            }
            if (trigger instanceof CoreTriggers.Stop) {
                return Optional.of(new CoreStates.Stopped());
            }
        } else if (current instanceof CoreStates.Complete) {
            if (trigger instanceof CoreTriggers.Reset) {
                return Optional.of(new CoreStates.Ready());
            }
            if (trigger instanceof CoreTriggers.Stop) {
                return Optional.of(new CoreStates.Stopped());
            }
        } else if (current instanceof CoreStates.Stopped) {
            if (trigger instanceof CoreTriggers.Reset) {
                return Optional.of(new CoreStates.Ready());
            }
            if (trigger instanceof CoreTriggers.Retire) {
                return Optional.of(new CoreStates.Retired());
            }
        } else if (current instanceof CoreStates.Aborted) {
            if (trigger instanceof CoreTriggers.Clear || trigger instanceof CoreTriggers.Reset) {
                return Optional.of(new CoreStates.Stopped());
            }
        } else if (current instanceof CoreStates.Faulted) {
            if (trigger instanceof CoreTriggers.Clear || trigger instanceof CoreTriggers.Reset) {
                return Optional.of(new CoreStates.Ready());
            }
            if (trigger instanceof CoreTriggers.Retire) {
                return Optional.of(new CoreStates.Retired());
            }
        }

        return Optional.empty();
    }
}
