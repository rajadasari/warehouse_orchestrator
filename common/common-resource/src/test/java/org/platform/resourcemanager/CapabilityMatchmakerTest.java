package org.platform.resourcemanager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.domain.builder.ResourceBuilder;
import org.platform.resourcemanager.domain.capability.CapabilityContract;
import org.platform.resourcemanager.domain.capability.CapabilityMatchmaker;
import org.platform.resourcemanager.domain.capability.ParameterRule;
import org.platform.resourcemanager.domain.capability.ValidationResult;
import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.SpatialCoordinate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CapabilityMatchmakerTest {

    private CapabilityMatchmaker matchmaker;
    private Resource r1;
    private Resource r2;
    private Resource r3;

    @BeforeEach
    void setUp() {
        matchmaker = new CapabilityMatchmaker();

        r1 = ResourceBuilder.create("site", "RES-01")
                .coordinate(0, 0, 0)
                .addCapability("DRILL")
                .addCapability("WELD")
                .build();

        r2 = ResourceBuilder.create("site", "RES-02")
                .coordinate(10, 0, 0)
                .addCapability("DRILL")
                .build();

        r3 = ResourceBuilder.create("site", "RES-03")
                .coordinate(3, 4, 0)
                .addCapability("DRILL")
                .build();
    }

    @Test
    @DisplayName("Should match available resources with requested capability case-insensitively")
    void shouldFindAvailableByCapability() {
        List<Resource> drillers = matchmaker.findAvailable(List.of(r1, r2, r3), "drill");
        assertThat(drillers).containsExactlyInAnyOrder(r1, r2, r3);

        List<Resource> welders = matchmaker.findAvailable(List.of(r1, r2, r3), "WELD");
        assertThat(welders).containsExactly(r1);

        List<Resource> painters = matchmaker.findAvailable(List.of(r1, r2, r3), "PAINT");
        assertThat(painters).isEmpty();
    }

    @Test
    @DisplayName("Should exclude busy or reserved resources from capability matching")
    void shouldExcludeNonAvailableResources() {
        r2.updateStatus(OperationalStatus.BUSY, r2.getVersion());
        r3.updateStatus(OperationalStatus.RESERVED, r3.getVersion());

        List<Resource> availableDrillers = matchmaker.findAvailable(List.of(r1, r2, r3), "DRILL");
        assertThat(availableDrillers).containsExactly(r1);
    }

    @Test
    @DisplayName("Should rank available matching candidates by 3D Euclidean proximity")
    void shouldRankByProximity() {
        // Target is at (0, 0, 0). Distances: r1=0, r3=5, r2=10
        SpatialCoordinate origin = SpatialCoordinate.of(0, 0, 0);
        List<Resource> ranked = matchmaker.findAndRankByProximity(List.of(r2, r1, r3), "DRILL", origin);

        assertThat(ranked).containsExactly(r1, r3, r2);
    }

    @Test
    @DisplayName("Should validate capability parameter contracts with types, presence, and rules")
    void shouldValidateParameterContracts() {
        CapabilityContract contract = CapabilityContract.of("PRECISION_DRILL", List.of(
                ParameterRule.requiredWithValidator("depthMm", Double.class, val -> (Double) val > 0.0 && (Double) val <= 100.0),
                ParameterRule.requiredWithValidator("feedRate", Integer.class, val -> (Integer) val > 0),
                ParameterRule.optional("coolantType", String.class)
        ));

        // Valid payload
        ValidationResult validResult = matchmaker.validateParameters(contract, Map.of(
                "depthMm", 25.5,
                "feedRate", 300,
                "coolantType", "OIL"
        ));
        assertThat(validResult.isValid()).isTrue();
        assertThat(validResult.errorMessages()).isEmpty();

        // Missing required parameter
        ValidationResult missingResult = matchmaker.validateParameters(contract, Map.of("depthMm", 10.0));
        assertThat(missingResult.isValid()).isFalse();
        assertThat(missingResult.errorMessages()).anyMatch(e -> e.contains("Missing required parameter: feedRate"));

        // Type mismatch
        ValidationResult typeError = matchmaker.validateParameters(contract, Map.of(
                "depthMm", "twenty-five",
                "feedRate", 300
        ));
        assertThat(typeError.isValid()).isFalse();
        assertThat(typeError.errorMessages()).anyMatch(e -> e.contains("expects type Double but was String"));

        // Rule predicate failure
        ValidationResult ruleError = matchmaker.validateParameters(contract, Map.of(
                "depthMm", 150.0,
                "feedRate", 300
        ));
        assertThat(ruleError.isValid()).isFalse();
        assertThat(ruleError.errorMessages()).anyMatch(e -> e.contains("failed validation rule constraint"));
    }
}
