package com.company.warehouse.wes.business.workflow.routing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class WorkflowEdgeRouterTest {

    private WorkflowEdgeRouter edgeRouter;

    @BeforeEach
    void setUp() {
        edgeRouter = new WorkflowEdgeRouter();
    }

    @Test
    @DisplayName("Exclusive Gateway routes to branch where SpEL condition evaluates to true")
    void testExclusiveGatewaySpelBranch() {
        List<Map<String, Object>> edges = List.of(
                Map.of("id", "e1", "source", "gw_01", "target", "node_reject", "condition", "#context['weight'] > 1000"),
                Map.of("id", "e2", "source", "gw_01", "target", "node_heavy", "condition", "#context['weight'] > 500"),
                Map.of("id", "e3", "source", "gw_01", "target", "node_standard", "condition", "default")
        );

        Map<String, Object> context = Map.of("weight", 650);

        Optional<String> target = edgeRouter.resolveNextNode("gw_01", "GATEWAY_EXCLUSIVE", "SUCCESS", edges, context);

        assertThat(target).isPresent().contains("node_heavy");
    }

    @Test
    @DisplayName("Exclusive Gateway falls back to default edge when no conditions match")
    void testExclusiveGatewayDefaultEdgeFallback() {
        List<Map<String, Object>> edges = List.of(
                Map.of("id", "e1", "source", "gw_01", "target", "node_special", "condition", "#context['priority'] == 'HIGH'"),
                Map.of("id", "e2", "source", "gw_01", "target", "node_standard", "condition", "default")
        );

        Map<String, Object> context = Map.of("priority", "LOW");

        Optional<String> target = edgeRouter.resolveNextNode("gw_01", "GATEWAY_EXCLUSIVE", "SUCCESS", edges, context);

        assertThat(target).isPresent().contains("node_standard");
    }

    @Test
    @DisplayName("Defensive failure routing directs failed node to ON_FAILURE fallback edge")
    void testFailureRoutingTakesOnFailureEdge() {
        List<Map<String, Object>> edges = List.of(
                Map.of("id", "e1", "source", "stn_01", "target", "stn_02", "condition", ""),
                Map.of("id", "e_fail", "source", "stn_01", "target", "rework_spur", "isFailureEdge", true)
        );

        Map<String, Object> context = Map.of("station", "STN_01");

        // When node status is FAILED
        Optional<String> target = edgeRouter.resolveNextNode("stn_01", "OPCUA_STATION_ACTION", "FAILED", edges, context);

        assertThat(target).isPresent().contains("rework_spur");
    }

    @Test
    @DisplayName("Parallel Gateway resolves all downstream branch targets")
    void testParallelGatewayDownstreamResolution() {
        List<Map<String, Object>> edges = List.of(
                Map.of("id", "e1", "source", "fork_01", "target", "branch_a"),
                Map.of("id", "e2", "source", "fork_01", "target", "branch_b"),
                Map.of("id", "e3", "source", "fork_01", "target", "branch_c"),
                Map.of("id", "e_fail", "source", "fork_01", "target", "err_handler", "isFailureEdge", true)
        );

        List<String> downstreams = edgeRouter.resolveParallelDownstreamNodes("fork_01", edges);

        assertThat(downstreams).containsExactly("branch_a", "branch_b", "branch_c");
    }
}
