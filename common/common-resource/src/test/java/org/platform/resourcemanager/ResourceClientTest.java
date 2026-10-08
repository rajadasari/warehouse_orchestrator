package org.platform.resourcemanager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.api.ResourceClient;
import org.platform.resourcemanager.api.dto.CreateResourceRequest;
import org.platform.resourcemanager.api.dto.ResourceResponse;
import org.platform.resourcemanager.api.dto.TransitionStateRequest;
import org.platform.resourcemanager.api.dto.UpdateResourceRequest;
import org.platform.resourcemanager.api.exception.ConcurrencyConflictException;
import org.platform.resourcemanager.domain.arbitration.AllocationRequest;
import org.platform.resourcemanager.domain.arbitration.AllocationResult;
import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.topology.RelationshipType;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResourceClientTest {

    private ResourceClient client;
    private ResourceId stationId;
    private ResourceId robotId;

    @BeforeEach
    void setUp() {
        client = ResourceClient.createInMemory();
        stationId = ResourceId.of("factory", "STATION-1");
        robotId = ResourceId.of("factory", "ROBOT-1");
    }

    @Test
    @DisplayName("Should register, query, and retrieve all resources via client facade")
    void shouldRegisterAndQueryResources() {
        CreateResourceRequest req = new CreateResourceRequest(
                "factory", "STATION-1", "Assembly Station 1", "EQUIPMENT", "PHYSICAL",
                "/Factory/Line1/Station1", 10.0, 20.0, 0.0,
                Set.of("ASSEMBLE", "INSPECT"), Map.of("ratedVoltage", 480)
        );

        ResourceResponse registered = client.register(req);
        assertThat(registered.tenantId()).isEqualTo("factory");
        assertThat(registered.resourceId()).isEqualTo("STATION-1");
        assertThat(registered.status()).isEqualTo("AVAILABLE");
        assertThat(registered.state()).isEqualTo("READY");
        assertThat(registered.version()).isEqualTo(1L);
        assertThat(registered.capabilities()).contains("ASSEMBLE", "INSPECT");

        ResourceResponse fetched = client.getResource(stationId);
        assertThat(fetched).isNotNull();
        assertThat(fetched.name()).isEqualTo("Assembly Station 1");

        List<ResourceResponse> all = client.getAllResources();
        assertThat(all).hasSize(1);
    }

    @Test
    @DisplayName("Should update resource coordinates, capabilities, and properties under atomic OCC")
    void shouldUpdateResourceWithOptimisticLocking() {
        client.register(CreateResourceRequest.of("factory", "STATION-1", "Station 1", "EQUIPMENT"));

        UpdateResourceRequest update = new UpdateResourceRequest(
                15.5, 25.5, 2.0,
                Set.of("CALIBRATE"), Set.of(),
                Map.of("firmware", "v2.1.0"), Set.of(),
                1L
        );

        ResourceResponse updated = client.updateResource(stationId, update);
        assertThat(updated.version()).isEqualTo(2L);
        assertThat(updated.x()).isEqualTo(15.5);
        assertThat(updated.capabilities()).contains("CALIBRATE");
        assertThat(updated.properties()).containsEntry("firmware", "v2.1.0");

        // Attempting update with old version (1L) must trigger ConcurrencyConflictException
        UpdateResourceRequest staleUpdate = new UpdateResourceRequest(
                0.0, 0.0, 0.0, Set.of(), Set.of(), Map.of(), Set.of(), 1L
        );
        assertThatThrownBy(() -> client.updateResource(stationId, staleUpdate))
                .isInstanceOf(ConcurrencyConflictException.class);
    }

    @Test
    @DisplayName("Should transition states and propagate safety stop to interlocked neighbors")
    void shouldTransitionAndCascadeSafetyStop() {
        client.register(CreateResourceRequest.of("factory", "STATION-1", "Station 1", "EQUIPMENT"));
        client.register(CreateResourceRequest.of("factory", "ROBOT-1", "Robot 1", "EQUIPMENT"));

        // Interlock Station 1 with Robot 1
        client.link(stationId, robotId, RelationshipType.INTERLOCKED_WITH);

        // Transition Station 1 to RUNNING
        ResourceResponse running = client.transitionState(stationId,
                TransitionStateRequest.of("START", "OP-01", 1L));
        assertThat(running.state()).isEqualTo("RUNNING");
        assertThat(running.status()).isEqualTo("BUSY");

        // Transition Station 1 to ABORT
        client.transitionState(stationId,
                TransitionStateRequest.of("ABORT", "Emergency Stop", running.version()));

        // Station 1 must be ABORTED
        ResourceResponse stationAborted = client.getResource(stationId);
        assertThat(stationAborted.state()).isEqualTo("ABORTED");

        // Robot 1 must have received cascaded abort via safety interlock
        ResourceResponse robotAborted = client.getResource(robotId);
        assertThat(robotAborted.state()).isEqualTo("ABORTED");
    }

    @Test
    @DisplayName("Should allocate gang and release lease returning resources to AVAILABLE")
    void shouldAllocateGangAndRelease() {
        client.register(CreateResourceRequest.of("factory", "STATION-1", "Station 1", "EQUIPMENT"));
        client.register(CreateResourceRequest.of("factory", "ROBOT-1", "Robot 1", "EQUIPMENT"));

        AllocationRequest gangReq = AllocationRequest.of(
                Set.of(stationId, robotId), "BATCH-JOB-42", Duration.ofMinutes(15)
        );

        AllocationResult result = client.allocateGang(gangReq);
        assertThat(result.isGranted()).isTrue();

        // Both resources must now be RESERVED
        assertThat(client.getResource(stationId).status()).isEqualTo("RESERVED");
        assertThat(client.getResource(robotId).status()).isEqualTo("RESERVED");

        String leaseId = ((AllocationResult.Granted) result).lease().leaseId();
        boolean released = client.releaseLease(leaseId);
        assertThat(released).isTrue();

        // Resources return to AVAILABLE
        assertThat(client.getResource(stationId).status()).isEqualTo("AVAILABLE");
        assertThat(client.getResource(robotId).status()).isEqualTo("AVAILABLE");
    }

    @Test
    @DisplayName("Should decommission resource and clean up topology edges and active leases")
    void shouldDecommissionResource() {
        client.register(CreateResourceRequest.of("factory", "STATION-1", "Station 1", "EQUIPMENT"));
        client.register(CreateResourceRequest.of("factory", "ROBOT-1", "Robot 1", "EQUIPMENT"));
        assertThat(client.findResource(stationId)).isPresent();

        // Establish topology edge and active lease
        client.link(stationId, robotId, RelationshipType.FEEDS);
        assertThat(client.getDownstreamProductionLine(stationId)).containsExactly(robotId);

        AllocationResult alloc = client.allocateGang(AllocationRequest.of(Set.of(stationId), "JOB-1", Duration.ofMinutes(5)));
        assertThat(alloc.isGranted()).isTrue();
        assertThat(client.arbitration().getActiveLeases()).isNotEmpty();

        boolean decommissioned = client.decommissionResource(stationId);
        assertThat(decommissioned).isTrue();
        assertThat(client.findResource(stationId)).isEmpty();

        // Verify topology edges are purged
        assertThat(client.getDownstreamProductionLine(stationId)).isEmpty();
        assertThat(client.topology().getChildResources(stationId)).isEmpty();

        // Verify leases referencing decommissioned resource are released
        assertThat(client.arbitration().getActiveLeases()).isEmpty();
    }
}
