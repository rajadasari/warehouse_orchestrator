package org.platform.resourcemanager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.domain.arbitration.*;
import org.platform.resourcemanager.domain.builder.ResourceBuilder;
import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.infrastructure.InMemoryResourceRepository;

import java.time.Duration;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class GangArbitrationTest {

    private InMemoryResourceRepository repository;
    private GangArbitrationEngine engine;
    private Resource r1;
    private Resource r2;
    private Resource r3;

    @BeforeEach
    void setUp() {
        repository = new InMemoryResourceRepository();
        engine = new GangArbitrationEngine(repository::findById);

        r1 = ResourceBuilder.create("fab", "STATION-A").build();
        r2 = ResourceBuilder.create("fab", "TOOL-FIXTURE").build();
        r3 = ResourceBuilder.create("fab", "AMR-ROBOT-01").build();

        repository.save(r1);
        repository.save(r2);
        repository.save(r3);
    }

    @Test
    @DisplayName("Should atomically grant gang allocation for multiple available resources")
    void shouldGrantGangAllocation() {
        Set<ResourceId> requested = Set.of(r1.getId(), r2.getId());
        AllocationRequest req = AllocationRequest.of(requested, "WORKFLOW-101", Duration.ofMinutes(10));

        AllocationResult result = engine.allocateGang(req);

        assertThat(result.isGranted()).isTrue();
        assertThat(result).isInstanceOf(AllocationResult.Granted.class);

        // Verify resources are marked as RESERVED
        assertThat(r1.getStatus()).isEqualTo(OperationalStatus.RESERVED);
        assertThat(r2.getStatus()).isEqualTo(OperationalStatus.RESERVED);
        assertThat(r3.getStatus()).isEqualTo(OperationalStatus.AVAILABLE);
    }

    @Test
    @DisplayName("Should reject gang allocation and retain consistency when one resource is busy")
    void shouldRejectWhenContentionOccurs() {
        // Mark r2 as BUSY beforehand
        r2.updateStatus(OperationalStatus.BUSY, r2.getVersion());

        Set<ResourceId> requested = Set.of(r1.getId(), r2.getId(), r3.getId());
        AllocationRequest req = AllocationRequest.of(requested, "WORKFLOW-102", Duration.ofMinutes(5));

        AllocationResult result = engine.allocateGang(req);

        assertThat(result.isGranted()).isFalse();
        assertThat(result).isInstanceOf(AllocationResult.Rejected.class);

        AllocationResult.Rejected rejected = (AllocationResult.Rejected) result;
        assertThat(rejected.getUnavailableResources()).contains(r2.getId());

        // Verify r1 and r3 remain AVAILABLE (atomic all-or-nothing rollback)
        assertThat(r1.getStatus()).isEqualTo(OperationalStatus.AVAILABLE);
        assertThat(r3.getStatus()).isEqualTo(OperationalStatus.AVAILABLE);
    }

    @Test
    @DisplayName("Should release allocated lease and return resources to AVAILABLE")
    void shouldReleaseLease() {
        Set<ResourceId> requested = Set.of(r1.getId(), r3.getId());
        AllocationRequest req = AllocationRequest.of(requested, "WORKFLOW-103", Duration.ofMinutes(5));

        AllocationResult result = engine.allocateGang(req);
        assertThat(result.isGranted()).isTrue();
        String leaseId = ((AllocationResult.Granted) result).lease().leaseId();

        boolean released = engine.release(leaseId);
        assertThat(released).isTrue();

        assertThat(r1.getStatus()).isEqualTo(OperationalStatus.AVAILABLE);
        assertThat(r3.getStatus()).isEqualTo(OperationalStatus.AVAILABLE);
    }
}
