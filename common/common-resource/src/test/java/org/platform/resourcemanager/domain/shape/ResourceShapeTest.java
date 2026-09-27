package org.platform.resourcemanager.domain.shape;

import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.template.MethodDefinition;
import org.platform.resourcemanager.domain.template.PropertyDefinition;
import org.platform.resourcemanager.domain.template.ResourceTemplate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ResourceShape & Template Composition Tests")
class ResourceShapeTest {

    @Test
    @DisplayName("Should compose properties and methods from multiple ResourceShapes into ResourceTemplate")
    void shouldComposeShapesIntoTemplate() {
        // Shape 1: BatteryPoweredShape
        ResourceShape batteryShape = new ResourceShape(
                "BATTERY_SHAPE",
                "Battery Powered Asset",
                "Reusable battery properties",
                Map.of("batteryLevel", 100.0, "isCharging", false),
                List.of(
                        PropertyDefinition.doubleProp("batteryLevel", true, 100.0, "%"),
                        PropertyDefinition.booleanProp("isCharging", true, false)
                ),
                List.of(
                        MethodDefinition.standard("requestDocking", MethodDefinition.MethodType.CONTROL, MethodDefinition.SafetyTier.OPERATIONAL, "Docks machine to charge")
                ),
                null,
                null
        );

        // Shape 2: TelemetryShape
        ResourceShape telemetryShape = new ResourceShape(
                "TELEMETRY_SHAPE",
                "Network & Sensor Telemetry",
                "Signal strength and IP",
                Map.of("rssiSignalDbm", -45),
                List.of(PropertyDefinition.integerProp("rssiSignalDbm", false, -50, "dBm")),
                List.of(MethodDefinition.standard("pingDiagnostics", MethodDefinition.MethodType.DIAGNOSTIC, MethodDefinition.SafetyTier.READ_ONLY, "Pings network")),
                null,
                null
        );

        // Template composing both shapes
        ResourceTemplate amrTemplate = new ResourceTemplate(
                "AMR_ROBOT",
                "Autonomous Mobile Robot",
                null,
                null,
                "REST",
                "Standard AMR",
                "WAREHOUSE",
                "http",
                "192.168.1.100",
                9090,
                "",
                Map.of("maxSpeed", 2.5),
                List.of(PropertyDefinition.doubleProp("maxSpeed", true, 2.0, "m/s")),
                List.of(MethodDefinition.standard("navigateTo", MethodDefinition.MethodType.EXECUTION, MethodDefinition.SafetyTier.OPERATIONAL, "Navigates to coordinate")),
                List.of(),
                List.of(batteryShape, telemetryShape),
                true,
                null,
                null
        );

        ResourceId amrId = ResourceId.of("T1", "AMR_001");
        Resource amr = amrTemplate.instantiate(amrId, "AMR Alpha", Map.of("batteryLevel", 88.5));

        // Assert composed properties
        assertNotNull(amr.getProperties().get("batteryLevel"));
        assertEquals(88.5, amr.getProperties().get("batteryLevel").value()); // overridden
        assertEquals(false, amr.getProperties().get("isCharging").value());  // from shape 1
        assertEquals(-45, amr.getProperties().get("rssiSignalDbm").value()); // from shape 2
        assertEquals(2.5, amr.getProperties().get("maxSpeed").value());     // from template

        // Assert composed capabilities (methods)
        assertTrue(amr.hasCapability("REQUESTDOCKING"));
        assertTrue(amr.hasCapability("PINGDIAGNOSTICS"));
        assertTrue(amr.hasCapability("NAVIGATETO"));
    }
}
