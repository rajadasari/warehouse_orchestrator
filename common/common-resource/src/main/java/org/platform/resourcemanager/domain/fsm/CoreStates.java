package org.platform.resourcemanager.domain.fsm;

import org.platform.resourcemanager.domain.model.OperationalStatus;

/**
 * Concrete implementations of ResourceState representing PackML & SEMI E10 state nodes.
 */
public final class CoreStates {

    private CoreStates() {
    }

    public record Ready() implements ResourceState {
        @Override public String name() { return "READY"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.AVAILABLE; }
        @Override public boolean isFinal() { return false; }
    }

    public record Starting() implements ResourceState {
        @Override public String name() { return "STARTING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Running() implements ResourceState {
        @Override public String name() { return "RUNNING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Holding() implements ResourceState {
        @Override public String name() { return "HOLDING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Held() implements ResourceState {
        @Override public String name() { return "HELD"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Unholding() implements ResourceState {
        @Override public String name() { return "UNHOLDING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Completing() implements ResourceState {
        @Override public String name() { return "COMPLETING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Complete() implements ResourceState {
        @Override public String name() { return "COMPLETE"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.AVAILABLE; }
        @Override public boolean isFinal() { return false; }
    }

    public record Stopping() implements ResourceState {
        @Override public String name() { return "STOPPING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Stopped() implements ResourceState {
        @Override public String name() { return "STOPPED"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.AVAILABLE; }
        @Override public boolean isFinal() { return false; }
    }

    public record Aborting() implements ResourceState {
        @Override public String name() { return "ABORTING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.FAULTED; }
        @Override public boolean isFinal() { return false; }
    }

    public record Aborted() implements ResourceState {
        @Override public String name() { return "ABORTED"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.FAULTED; }
        @Override public boolean isFinal() { return false; }
    }

    public record Resetting() implements ResourceState {
        @Override public String name() { return "RESETTING"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.BUSY; }
        @Override public boolean isFinal() { return false; }
    }

    public record Faulted(String reason) implements ResourceState {
        public Faulted() { this("Unspecified fault"); }
        @Override public String name() { return "FAULTED"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.FAULTED; }
        @Override public boolean isFinal() { return false; }
    }

    public record Retired() implements ResourceState {
        @Override public String name() { return "RETIRED"; }
        @Override public OperationalStatus defaultStatus() { return OperationalStatus.MAINTENANCE; }
        @Override public boolean isFinal() { return true; }
    }

    public static ResourceState ready() { return new Ready(); }
    public static ResourceState running() { return new Running(); }
    public static ResourceState stopped() { return new Stopped(); }
    public static ResourceState faulted(String reason) { return new Faulted(reason); }
}
