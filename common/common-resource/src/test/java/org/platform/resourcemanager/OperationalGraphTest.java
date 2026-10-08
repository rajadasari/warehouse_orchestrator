package org.platform.resourcemanager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.topology.OperationalGraph;
import org.platform.resourcemanager.domain.topology.RelationshipEdge;
import org.platform.resourcemanager.domain.topology.RelationshipType;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class OperationalGraphTest {

    private OperationalGraph graph;
    private ResourceId line;
    private ResourceId station1;
    private ResourceId station2;
    private ResourceId robotArm;

    @BeforeEach
    void setUp() {
        graph = new OperationalGraph();
        line = ResourceId.of("plant1", "LINE-A");
        station1 = ResourceId.of("plant1", "STATION-1");
        station2 = ResourceId.of("plant1", "STATION-2");
        robotArm = ResourceId.of("plant1", "ROBOT-ARM");
    }

    @Test
    @DisplayName("Should maintain structural containment hierarchy")
    void shouldTrackContainment() {
        // station1 is PART_OF line
        graph.addEdge(RelationshipEdge.of(station1, line, RelationshipType.PART_OF));
        // robotArm is PART_OF station1
        graph.addEdge(RelationshipEdge.of(robotArm, station1, RelationshipType.PART_OF));

        Set<ResourceId> lineChildren = graph.getChildren(line);
        assertThat(lineChildren).containsExactly(station1);

        Optional<ResourceId> robotParent = graph.getParent(robotArm);
        assertThat(robotParent).isPresent().contains(station1);
    }

    @Test
    @DisplayName("Should traverse material routing flows downstream")
    void shouldTraceDownstreamRouting() {
        graph.addEdge(RelationshipEdge.of(station1, station2, RelationshipType.FEEDS));
        ResourceId station3 = ResourceId.of("plant1", "STATION-3");
        graph.addEdge(RelationshipEdge.of(station2, station3, RelationshipType.FEEDS));

        Set<ResourceId> downstream = graph.findDownstreamLine(station1);
        assertThat(downstream).containsExactly(station2, station3);
    }

    @Test
    @DisplayName("Should trace safety interlock clusters bidirectionally")
    void shouldFindInterlockedNodes() {
        graph.addEdge(RelationshipEdge.of(station1, robotArm, RelationshipType.INTERLOCKED_WITH));

        Set<ResourceId> interlockedWithStation = graph.findInterlockedResources(station1);
        assertThat(interlockedWithStation).containsExactly(robotArm);

        Set<ResourceId> interlockedWithRobot = graph.findInterlockedResources(robotArm);
        assertThat(interlockedWithRobot).containsExactly(station1);
    }

    @Test
    @DisplayName("Should remove relationship edges accurately")
    void shouldRemoveEdges() {
        graph.addEdge(RelationshipEdge.of(station1, line, RelationshipType.PART_OF));
        boolean removed = graph.removeEdge(station1, line, RelationshipType.PART_OF);

        assertThat(removed).isTrue();
        assertThat(graph.getChildren(line)).isEmpty();
    }

    @Test
    @DisplayName("Should remove node and cleanly purge all incoming and outgoing edges")
    void shouldRemoveNodeAndPurgeAllEdges() {
        // station1 FEEDS station2, robotArm PART_OF station1, station1 INTERLOCKED_WITH line
        graph.addEdge(RelationshipEdge.of(station1, station2, RelationshipType.FEEDS));
        graph.addEdge(RelationshipEdge.of(robotArm, station1, RelationshipType.PART_OF));
        graph.addEdge(RelationshipEdge.of(station1, line, RelationshipType.INTERLOCKED_WITH));

        boolean modified = graph.removeNode(station1);
        assertThat(modified).isTrue();

        assertThat(graph.getOutgoingEdges(station1)).isEmpty();
        assertThat(graph.getIncomingEdges(station1)).isEmpty();
        assertThat(graph.getConnectedTargets(robotArm, RelationshipType.PART_OF)).isEmpty();
        assertThat(graph.getConnectedSources(station2, RelationshipType.FEEDS)).isEmpty();
    }
}
