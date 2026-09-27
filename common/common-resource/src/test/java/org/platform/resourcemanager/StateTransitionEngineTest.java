package org.platform.resourcemanager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.api.exception.InvalidStateTransitionException;
import org.platform.resourcemanager.domain.fsm.*;
import org.platform.resourcemanager.domain.model.ResourceId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StateTransitionEngineTest {

    private StateTransitionEngine engine;
    private ResourceId resourceId;

    @BeforeEach
    void setUp() {
        engine = new StateTransitionEngine();
        resourceId = ResourceId.of("factory", "LINE-ROBOT-01");
    }

    @Test
    @DisplayName("Should execute valid PackML lifecycle: READY -> RUNNING -> HELD -> RUNNING -> COMPLETE -> READY")
    void shouldExecuteValidPackMLLifecycle() {
        ResourceState s1 = CoreStates.ready();

        ResourceState s2 = engine.fire(resourceId, s1, CoreTriggers.start());
        assertThat(s2).isInstanceOf(CoreStates.Running.class);

        ResourceState s3 = engine.fire(resourceId, s2, CoreTriggers.pause());
        assertThat(s3).isInstanceOf(CoreStates.Held.class);

        ResourceState s4 = engine.fire(resourceId, s3, CoreTriggers.resume());
        assertThat(s4).isInstanceOf(CoreStates.Running.class);

        ResourceState s5 = engine.fire(resourceId, s4, new CoreTriggers.Complete());
        assertThat(s5).isInstanceOf(CoreStates.Complete.class);

        ResourceState s6 = engine.fire(resourceId, s5, CoreTriggers.reset());
        assertThat(s6).isInstanceOf(CoreStates.Ready.class);
    }

    @Test
    @DisplayName("Should throw InvalidStateTransitionException on illegal state jump")
    void shouldThrowOnIllegalTransition() {
        ResourceState ready = CoreStates.ready();

        // Pause is illegal directly from Ready
        assertThatThrownBy(() -> engine.fire(resourceId, ready, CoreTriggers.pause()))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("Invalid state transition");
    }

    @Test
    @DisplayName("Should handle global safety triggers Abort and Fault from Running state")
    void shouldHandleGlobalSafetyTriggers() {
        ResourceState running = CoreStates.running();

        ResourceState aborted = engine.fire(resourceId, running, CoreTriggers.abort("E-Stop pressed"));
        assertThat(aborted).isInstanceOf(CoreStates.Aborted.class);

        ResourceState cleared = engine.fire(resourceId, aborted, CoreTriggers.clear());
        assertThat(cleared).isInstanceOf(CoreStates.Stopped.class);

        ResourceState faulted = engine.fire(resourceId, running, CoreTriggers.fault("Motor overload"));
        assertThat(faulted).isInstanceOf(CoreStates.Faulted.class);
        assertThat(((CoreStates.Faulted) faulted).reason()).isEqualTo("Motor overload");
    }

    @Test
    @DisplayName("Should support SEMI E10 state profile transitions")
    void shouldSupportSemiE10Profile() {
        ResourceState ready = CoreStates.ready();
        ResourceState running = engine.fire(resourceId, ready, CoreTriggers.start(), SemiE10Profile.INSTANCE);
        assertThat(running).isInstanceOf(CoreStates.Running.class);

        ResourceState held = engine.fire(resourceId, running, CoreTriggers.pause(), SemiE10Profile.INSTANCE);
        assertThat(held).isInstanceOf(CoreStates.Held.class);

        ResourceState resumed = engine.fire(resourceId, held, CoreTriggers.resume(), SemiE10Profile.INSTANCE);
        assertThat(resumed).isInstanceOf(CoreStates.Running.class);

        ResourceState faulted = engine.fire(resourceId, resumed, CoreTriggers.fault("Chamber vacuum leak"), SemiE10Profile.INSTANCE);
        assertThat(faulted).isInstanceOf(CoreStates.Faulted.class);

        ResourceState recovered = engine.fire(resourceId, faulted, CoreTriggers.reset(), SemiE10Profile.INSTANCE);
        assertThat(recovered).isInstanceOf(CoreStates.Ready.class);

        ResourceState retired = engine.fire(resourceId, recovered, CoreTriggers.retire(), SemiE10Profile.INSTANCE);
        assertThat(retired).isInstanceOf(CoreStates.Retired.class);

        // Terminal state check
        assertThatThrownBy(() -> engine.fire(resourceId, retired, CoreTriggers.start(), SemiE10Profile.INSTANCE))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Should check canTransition predicate accurately without throwing")
    void shouldCheckCanTransitionPredicate() {
        ResourceState ready = CoreStates.ready();
        assertThat(engine.canTransition(ready, CoreTriggers.start())).isTrue();
        assertThat(engine.canTransition(ready, CoreTriggers.pause())).isFalse();
        assertThat(engine.canTransition(ready, CoreTriggers.fault("test"))).isTrue();
        assertThat(engine.canTransition(null, CoreTriggers.start())).isFalse();
    }
}
