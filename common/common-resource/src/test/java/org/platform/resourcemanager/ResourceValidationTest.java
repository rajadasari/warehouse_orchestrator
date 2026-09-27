package org.platform.resourcemanager;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.api.exception.ValidationException;
import org.platform.resourcemanager.domain.builder.ResourceBuilder;
import org.platform.resourcemanager.domain.fsm.CoreStates;
import org.platform.resourcemanager.domain.model.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResourceValidationTest {

    @Test
    @DisplayName("Should build valid Resource with default status matching ready state")
    void shouldBuildValidResource() {
        ResourceId id = ResourceId.of("tenant-1", "CNC-001");
        Resource resource = ResourceBuilder.create(id)
                .name("5-Axis Milling Machine")
                .resourceClass(StandardResourceClass.EQUIPMENT)
                .category(ResourceCategory.PHYSICAL)
                .hierarchyPath("/Factory/Area1/LineA/Cell2/CNC")
                .coordinate(10.5, 20.0, 0.0)
                .addCapability(StandardCapabilities.MACHINE)
                .addCapability(StandardCapabilities.COOL)
                .addProperty("spindleRpmMax", 24000)
                .build();

        assertThat(resource.getId()).isEqualTo(id);
        assertThat(resource.getName()).isEqualTo("5-Axis Milling Machine");
        assertThat(resource.getStatus()).isEqualTo(OperationalStatus.AVAILABLE);
        assertThat(resource.getState()).isInstanceOf(CoreStates.Ready.class);
        assertThat(resource.getVersion()).isEqualTo(1L);
        assertThat(resource.hasCapability(StandardCapabilities.MACHINE)).isTrue();
        assertThat(resource.hasCapability("UNKNOWN")).isFalse();
        assertThat(resource.getProperties()).containsKey("spindleRpmMax");
    }

    @Test
    @DisplayName("Should throw ValidationException when ResourceId is missing")
    void shouldFailWhenIdIsMissing() {
        assertThatThrownBy(() -> ResourceBuilder.create().name("Invalid").build())
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("ResourceId is required");
    }

    @Test
    @DisplayName("Should parse and serialize ISA95Path correctly")
    void shouldParseISA95Path() {
        ISA95Path path = ISA95Path.parse("Automotive/Plant1/BodyShop/Line1/Cell1/Robot1");
        assertThat(path.enterprise()).isEqualTo("Automotive");
        assertThat(path.site()).isEqualTo("Plant1");
        assertThat(path.area()).isEqualTo("BodyShop");
        assertThat(path.line()).isEqualTo("Line1");
        assertThat(path.workCell()).isEqualTo("Cell1");
        assertThat(path.unit()).isEqualTo("Robot1");
        assertThat(path.toPathString()).isEqualTo("/Automotive/Plant1/BodyShop/Line1/Cell1/Robot1");
    }

    @Test
    @DisplayName("Should calculate 3D Euclidean distance correctly")
    void shouldCalculate3dDistance() {
        SpatialCoordinate c1 = SpatialCoordinate.of(0, 0, 0);
        SpatialCoordinate c2 = SpatialCoordinate.of(3, 4, 0);
        assertThat(c1.distanceTo(c2)).isEqualTo(5.0);
    }

    @Test
    @DisplayName("Should support extensible custom resource types without code modification")
    void shouldSupportCustomResourceType() {
        ResourceType droneType = ResourceType.custom("DRONE_AMR", "Autonomous aerial inspection drone");
        Resource drone = ResourceBuilder.create("aerospace", "DRN-101")
                .resourceClass(droneType)
                .build();

        assertThat(drone.getResourceClass().code()).isEqualTo("DRONE_AMR");
        assertThat(drone.getResourceClass().description()).contains("inspection drone");
    }
}
