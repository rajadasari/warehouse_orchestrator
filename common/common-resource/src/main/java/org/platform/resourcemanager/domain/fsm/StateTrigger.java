package org.platform.resourcemanager.domain.fsm;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.io.Serializable;

/**
 * Sealed interface for state transition triggers.
 * Hardened with safe, whitelisted polymorphic Jackson serialization.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "@type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = CoreTriggers.Start.class, name = "START"),
        @JsonSubTypes.Type(value = CoreTriggers.Pause.class, name = "PAUSE"),
        @JsonSubTypes.Type(value = CoreTriggers.Resume.class, name = "RESUME"),
        @JsonSubTypes.Type(value = CoreTriggers.Complete.class, name = "COMPLETE"),
        @JsonSubTypes.Type(value = CoreTriggers.Stop.class, name = "STOP"),
        @JsonSubTypes.Type(value = CoreTriggers.Abort.class, name = "ABORT"),
        @JsonSubTypes.Type(value = CoreTriggers.Reset.class, name = "RESET"),
        @JsonSubTypes.Type(value = CoreTriggers.Fault.class, name = "FAULT"),
        @JsonSubTypes.Type(value = CoreTriggers.Clear.class, name = "CLEAR"),
        @JsonSubTypes.Type(value = CoreTriggers.Retire.class, name = "RETIRE")
})
@JsonIgnoreProperties(ignoreUnknown = true)
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

    @JsonIgnore
    String name();
}
