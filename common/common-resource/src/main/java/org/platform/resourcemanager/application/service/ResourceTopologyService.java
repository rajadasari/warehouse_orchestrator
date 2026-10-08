package org.platform.resourcemanager.application.service;

import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.topology.OperationalGraph;
import org.platform.resourcemanager.domain.topology.RelationshipEdge;
import org.platform.resourcemanager.domain.topology.RelationshipType;

import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Application service for inspecting and modifying equipment topology graphs.
 */
public class ResourceTopologyService {

    private final OperationalGraph graph;

    public ResourceTopologyService(OperationalGraph graph) {
        this.graph = Objects.requireNonNull(graph, "graph must not be null");
    }

    public void link(ResourceId sourceId, ResourceId targetId, RelationshipType type) {
        graph.addEdge(RelationshipEdge.of(sourceId, targetId, type));
    }

    public boolean unlink(ResourceId sourceId, ResourceId targetId, RelationshipType type) {
        return graph.removeEdge(sourceId, targetId, type);
    }

    public boolean removeNode(ResourceId nodeId) {
        return graph.removeNode(nodeId);
    }

    public void establishContainment(ResourceId childId, ResourceId parentId) {
        link(childId, parentId, RelationshipType.PART_OF);
    }

    public Set<ResourceId> getChildResources(ResourceId parentId) {
        return graph.getChildren(parentId);
    }

    public Optional<ResourceId> getParentResource(ResourceId childId) {
        return graph.getParent(childId);
    }

    public void establishSafetyInterlock(ResourceId resA, ResourceId resB) {
        link(resA, resB, RelationshipType.INTERLOCKED_WITH);
        link(resB, resA, RelationshipType.INTERLOCKED_WITH);
    }

    public Set<ResourceId> getSafetyInterlockedResources(ResourceId originId) {
        return graph.findInterlockedResources(originId);
    }

    public Set<ResourceId> getDownstreamProductionLine(ResourceId startId) {
        return graph.findDownstreamLine(startId);
    }
}
