package org.platform.resourcemanager.domain.fsm;

/**
 * Concrete implementations of StateTrigger for state machine transitions.
 */
public final class CoreTriggers {

    private CoreTriggers() {
    }

    public record Start(String operatorId) implements StateTrigger {
        public Start() { this("SYSTEM"); }
        @Override public String name() { return "START"; }
    }

    public record Pause(String reason) implements StateTrigger {
        public Pause() { this("Operator paused"); }
        @Override public String name() { return "PAUSE"; }
    }

    public record Resume(String operatorId) implements StateTrigger {
        public Resume() { this("SYSTEM"); }
        @Override public String name() { return "RESUME"; }
    }

    public record Complete() implements StateTrigger {
        @Override public String name() { return "COMPLETE"; }
    }

    public record Stop(String reason) implements StateTrigger {
        public Stop() { this("Normal shutdown"); }
        @Override public String name() { return "STOP"; }
    }

    public record Abort(String reason) implements StateTrigger {
        public Abort() { this("Emergency stop / safety interlock"); }
        @Override public String name() { return "ABORT"; }
    }

    public record Reset() implements StateTrigger {
        @Override public String name() { return "RESET"; }
    }

    public record Fault(String reason, String errorCode) implements StateTrigger {
        public Fault(String reason) { this(reason, "ERR_UNKNOWN"); }
        @Override public String name() { return "FAULT"; }
    }

    public record Clear() implements StateTrigger {
        @Override public String name() { return "CLEAR"; }
    }

    public record Retire() implements StateTrigger {
        @Override public String name() { return "RETIRE"; }
    }

    public static StateTrigger start() { return new Start(); }
    public static StateTrigger pause() { return new Pause(); }
    public static StateTrigger resume() { return new Resume(); }
    public static StateTrigger stop() { return new Stop(); }
    public static StateTrigger abort(String reason) { return new Abort(reason); }
    public static StateTrigger fault(String reason) { return new Fault(reason); }
    public static StateTrigger reset() { return new Reset(); }
    public static StateTrigger clear() { return new Clear(); }
    public static StateTrigger complete() { return new Complete(); }
    public static StateTrigger retire() { return new Retire(); }
}
