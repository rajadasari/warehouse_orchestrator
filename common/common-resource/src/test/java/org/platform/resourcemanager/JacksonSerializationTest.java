package org.platform.resourcemanager;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.api.dto.CreateResourceRequest;
import org.platform.resourcemanager.api.dto.ResourceResponse;
import org.platform.resourcemanager.api.dto.UpdateResourceRequest;
import org.platform.resourcemanager.domain.model.DynamicProperty;
import org.platform.resourcemanager.domain.model.ISA95Path;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.model.SpatialCoordinate;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JacksonSerializationTest {

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("Should serialize and deserialize ResourceId record cleanly")
    void shouldRoundTripResourceId() throws Exception {
        ResourceId id = ResourceId.of("tenant-abc", "ROBOT-99");
        String json = mapper.writeValueAsString(id);
        assertThat(json).contains("tenant-abc").contains("ROBOT-99");

        ResourceId deserialized = mapper.readValue(json, ResourceId.class);
        assertThat(deserialized).isEqualTo(id);
    }

    @Test
    @DisplayName("Should serialize and deserialize SpatialCoordinate record cleanly")
    void shouldRoundTripSpatialCoordinate() throws Exception {
        SpatialCoordinate coord = SpatialCoordinate.of(12.5, 45.0, 3.2, 90.0, "ZONE-B");
        String json = mapper.writeValueAsString(coord);
        assertThat(json).contains("12.5").contains("ZONE-B");

        SpatialCoordinate deserialized = mapper.readValue(json, SpatialCoordinate.class);
        assertThat(deserialized).isEqualTo(coord);
    }

    @Test
    @DisplayName("Should serialize and deserialize ISA95Path record cleanly")
    void shouldRoundTripISA95Path() throws Exception {
        ISA95Path path = ISA95Path.parse("Acme/Plant2/Stamping/Line4/Cell1/Press");
        String json = mapper.writeValueAsString(path);
        assertThat(json).contains("Acme").contains("Plant2").contains("Press");

        ISA95Path deserialized = mapper.readValue(json, ISA95Path.class);
        assertThat(deserialized.enterprise()).isEqualTo("Acme");
        assertThat(deserialized.unit()).isEqualTo("Press");
    }

    @Test
    @DisplayName("Should serialize and deserialize CreateResourceRequest DTO")
    void shouldRoundTripCreateResourceRequest() throws Exception {
        CreateResourceRequest req = new CreateResourceRequest(
                "tenant-1", "CNC-55", "5-Axis CNC", "EQUIPMENT", "PHYSICAL",
                "/Plant/Area/Line/Cell/Unit", 10.0, 20.0, 30.0,
                Set.of("CUT", "MILL"), Map.of("rpm", 12000)
        );

        String json = mapper.writeValueAsString(req);
        CreateResourceRequest deserialized = mapper.readValue(json, CreateResourceRequest.class);

        assertThat(deserialized.tenantId()).isEqualTo("tenant-1");
        assertThat(deserialized.resourceId()).isEqualTo("CNC-55");
        assertThat(deserialized.capabilities()).contains("CUT", "MILL");
    }

    @Test
    @DisplayName("Should serialize and deserialize UpdateResourceRequest DTO")
    void shouldRoundTripUpdateResourceRequest() throws Exception {
        UpdateResourceRequest req = new UpdateResourceRequest(
                1.0, 2.0, 3.0,
                Set.of("CAP1"), Set.of("CAP2"),
                Map.of("k", "v"), Set.of("oldK"),
                4L
        );

        String json = mapper.writeValueAsString(req);
        UpdateResourceRequest deserialized = mapper.readValue(json, UpdateResourceRequest.class);

        assertThat(deserialized.expectedVersion()).isEqualTo(4L);
        assertThat(deserialized.x()).isEqualTo(1.0);
        assertThat(deserialized.capabilitiesToAdd()).contains("CAP1");
    }

    @Test
    @DisplayName("Should serialize and deserialize ResourceResponse DTO")
    void shouldRoundTripResourceResponse() throws Exception {
        ResourceResponse resp = new ResourceResponse(
                "tenant-1", "RES-01", "Welder", "EQUIPMENT", "PHYSICAL",
                "AVAILABLE", "READY", "/Site/Line/Welder",
                1.0, 2.0, 3.0,
                Set.of("WELD"), Map.of("power", 220),
                1L, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"
        );

        String json = mapper.writeValueAsString(resp);
        ResourceResponse deserialized = mapper.readValue(json, ResourceResponse.class);

        assertThat(deserialized.resourceId()).isEqualTo("RES-01");
        assertThat(deserialized.status()).isEqualTo("AVAILABLE");
        assertThat(deserialized.capabilities()).contains("WELD");
    }

    @Test
    @DisplayName("Should serialize and deserialize DynamicProperty with Instant timestamp")
    void shouldRoundTripDynamicProperty() throws Exception {
        DynamicProperty prop = DynamicProperty.of("pressurePsi", 145.7);
        String json = mapper.writeValueAsString(prop);
        assertThat(json).contains("pressurePsi").contains("145.7");

        DynamicProperty deserialized = mapper.readValue(json, DynamicProperty.class);
        assertThat(deserialized.key()).isEqualTo("pressurePsi");
        assertThat(deserialized.timestamp()).isNotNull();
    }

    @Test
    @DisplayName("Should polymorphically serialize and deserialize ResourceState")
    void shouldRoundTripPolymorphicResourceState() throws Exception {
        org.platform.resourcemanager.domain.fsm.ResourceState state = new org.platform.resourcemanager.domain.fsm.CoreStates.Faulted("Motor temperature exceeded 85C");
        String json = mapper.writeValueAsString(state);
        assertThat(json).contains("@type").contains("FAULTED").contains("Motor temperature exceeded 85C");

        org.platform.resourcemanager.domain.fsm.ResourceState deserialized =
                mapper.readValue(json, org.platform.resourcemanager.domain.fsm.ResourceState.class);
        assertThat(deserialized).isInstanceOf(org.platform.resourcemanager.domain.fsm.CoreStates.Faulted.class);
        assertThat(((org.platform.resourcemanager.domain.fsm.CoreStates.Faulted) deserialized).reason())
                .isEqualTo("Motor temperature exceeded 85C");
    }

    @Test
    @DisplayName("Should polymorphically serialize and deserialize StateTrigger")
    void shouldRoundTripPolymorphicStateTrigger() throws Exception {
        org.platform.resourcemanager.domain.fsm.StateTrigger trigger = new org.platform.resourcemanager.domain.fsm.CoreTriggers.Start("OP-42");
        String json = mapper.writeValueAsString(trigger);
        assertThat(json).contains("@type").contains("START").contains("OP-42");

        org.platform.resourcemanager.domain.fsm.StateTrigger deserialized =
                mapper.readValue(json, org.platform.resourcemanager.domain.fsm.StateTrigger.class);
        assertThat(deserialized).isInstanceOf(org.platform.resourcemanager.domain.fsm.CoreTriggers.Start.class);
        assertThat(((org.platform.resourcemanager.domain.fsm.CoreTriggers.Start) deserialized).operatorId())
                .isEqualTo("OP-42");
    }

    @Test
    @DisplayName("Should serialize and deserialize ResourceStateChangedEvent with polymorphic state and trigger")
    void shouldRoundTripResourceStateChangedEvent() throws Exception {
        org.platform.resourcemanager.domain.event.ResourceStateChangedEvent event =
                org.platform.resourcemanager.domain.event.ResourceStateChangedEvent.of(
                        ResourceId.of("tenant-1", "ROBOT-1"),
                        new org.platform.resourcemanager.domain.fsm.CoreStates.Running(),
                        new org.platform.resourcemanager.domain.fsm.CoreStates.Faulted("Overload"),
                        new org.platform.resourcemanager.domain.fsm.CoreTriggers.Fault("Overload", "E-401")
                );

        String json = mapper.writeValueAsString(event);
        assertThat(json).contains("ROBOT-1").contains("RUNNING").contains("FAULTED");

        org.platform.resourcemanager.domain.event.ResourceStateChangedEvent deserialized =
                mapper.readValue(json, org.platform.resourcemanager.domain.event.ResourceStateChangedEvent.class);
        assertThat(deserialized.resourceId().resourceId()).isEqualTo("ROBOT-1");
        assertThat(deserialized.oldState()).isInstanceOf(org.platform.resourcemanager.domain.fsm.CoreStates.Running.class);
        assertThat(deserialized.newState()).isInstanceOf(org.platform.resourcemanager.domain.fsm.CoreStates.Faulted.class);
        assertThat(deserialized.trigger()).isInstanceOf(org.platform.resourcemanager.domain.fsm.CoreTriggers.Fault.class);
    }
}
