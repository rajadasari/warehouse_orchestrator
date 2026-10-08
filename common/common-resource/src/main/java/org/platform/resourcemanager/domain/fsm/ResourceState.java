package org.platform.resourcemanager.domain.fsm;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import org.platform.resourcemanager.domain.model.OperationalStatus;

import java.io.Serializable;

/**
 * Sealed interface defining deterministic, compile-time verified operational states.
 * Conforms to OMAC PackML (ISA-TR88) and SEMI E10 operational state profiles.
 * Hardened with safe, whitelisted polymorphic Jackson serialization.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "@type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = CoreStates.Ready.class, name = "READY"),
        @JsonSubTypes.Type(value = CoreStates.Starting.class, name = "STARTING"),
        @JsonSubTypes.Type(value = CoreStates.Running.class, name = "RUNNING"),
        @JsonSubTypes.Type(value = CoreStates.Holding.class, name = "HOLDING"),
        @JsonSubTypes.Type(value = CoreStates.Held.class, name = "HELD"),
        @JsonSubTypes.Type(value = CoreStates.Unholding.class, name = "UNHOLDING"),
        @JsonSubTypes.Type(value = CoreStates.Completing.class, name = "COMPLETING"),
        @JsonSubTypes.Type(value = CoreStates.Complete.class, name = "COMPLETE"),
        @JsonSubTypes.Type(value = CoreStates.Stopping.class, name = "STOPPING"),
        @JsonSubTypes.Type(value = CoreStates.Stopped.class, name = "STOPPED"),
        @JsonSubTypes.Type(value = CoreStates.Aborting.class, name = "ABORTING"),
        @JsonSubTypes.Type(value = CoreStates.Aborted.class, name = "ABORTED"),
        @JsonSubTypes.Type(value = CoreStates.Resetting.class, name = "RESETTING"),
        @JsonSubTypes.Type(value = CoreStates.Faulted.class, name = "FAULTED"),
        @JsonSubTypes.Type(value = CoreStates.Retired.class, name = "RETIRED")
})
@JsonIgnoreProperties(ignoreUnknown = true)
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

    @JsonIgnore
    String name();

    @JsonIgnore
    OperationalStatus defaultStatus();

    @JsonIgnore
    boolean isFinal();
}
