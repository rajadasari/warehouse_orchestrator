package org.platform.resourcemanager.domain.topology;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * High-performance in-memory directed graph representing equipment topology,
 * material routing flows, and safety interlocks.
 */
public class OperationalGraph {

    private final Map<ResourceId, Set<RelationshipEdge>> outgoingEdges = new ConcurrentHashMap<>();
    private final Map<ResourceId, Set<RelationshipEdge>> incomingEdges = new ConcurrentHashMap<>();

    public void addEdge(RelationshipEdge edge) {
        Objects.requireNonNull(edge, "edge must not be null");
        outgoingEdges.computeIfAbsent(edge.sourceId(), k -> ConcurrentHashMap.newKeySet()).add(edge);
        incomingEdges.computeIfAbsent(edge.targetId(), k -> ConcurrentHashMap.newKeySet()).add(edge);
    }

    public boolean removeEdge(ResourceId sourceId, ResourceId targetId, RelationshipType type) {
        Objects.requireNonNull(sourceId, "sourceId must not be null");
        Objects.requireNonNull(targetId, "targetId must not be null");

        Set<RelationshipEdge> out = outgoingEdges.get(sourceId);
        boolean removed = false;
        if (out != null) {
            removed = out.removeIf(e -> e.targetId().equals(targetId) && (type == null || e.type() == type));
            if (out.isEmpty()) outgoingEdges.remove(sourceId);
        }
        Set<RelationshipEdge> in = incomingEdges.get(targetId);
        if (in != null) {
            in.removeIf(e -> e.sourceId().equals(sourceId) && (type == null || e.type() == type));
            if (in.isEmpty()) incomingEdges.remove(targetId);
        }
        return removed;
    }

    public synchronized boolean removeNode(ResourceId nodeId) {
        if (nodeId == null) return false;
        boolean modified = false;

        Set<RelationshipEdge> out = outgoingEdges.remove(nodeId);
        if (out != null && !out.isEmpty()) {
            for (RelationshipEdge edge : out) {
                Set<RelationshipEdge> in = incomingEdges.get(edge.targetId());
                if (in != null) {
                    in.remove(edge);
                    if (in.isEmpty()) {
                        incomingEdges.remove(edge.targetId());
                    }
                }
            }
            modified = true;
        }

        Set<RelationshipEdge> in = incomingEdges.remove(nodeId);
        if (in != null && !in.isEmpty()) {
            for (RelationshipEdge edge : in) {
                Set<RelationshipEdge> o = outgoingEdges.get(edge.sourceId());
                if (o != null) {
                    o.remove(edge);
                    if (o.isEmpty()) {
                        outgoingEdges.remove(edge.sourceId());
                    }
                }
            }
            modified = true;
        }

        return modified;
    }

    public Set<RelationshipEdge> getOutgoingEdges(ResourceId sourceId) {
        Set<RelationshipEdge> edges = outgoingEdges.get(sourceId);
        return edges != null ? Collections.unmodifiableSet(edges) : Set.of();
    }

    public Set<RelationshipEdge> getIncomingEdges(ResourceId targetId) {
        Set<RelationshipEdge> edges = incomingEdges.get(targetId);
        return edges != null ? Collections.unmodifiableSet(edges) : Set.of();
    }

    public Set<ResourceId> getConnectedTargets(ResourceId sourceId, RelationshipType type) {
        return getOutgoingEdges(sourceId).stream()
                .filter(e -> type == null || e.type() == type)
                .map(RelationshipEdge::targetId)
                .collect(Collectors.toUnmodifiableSet());
    }

    public Set<ResourceId> getConnectedSources(ResourceId targetId, RelationshipType type) {
        return getIncomingEdges(targetId).stream()
                .filter(e -> type == null || e.type() == type)
                .map(RelationshipEdge::sourceId)
                .collect(Collectors.toUnmodifiableSet());
    }

    public Set<ResourceId> getChildren(ResourceId parentId) {
        // Source is child, target is parent (child PART_OF parent)
        return getConnectedSources(parentId, RelationshipType.PART_OF);
    }

    public Optional<ResourceId> getParent(ResourceId childId) {
        return getConnectedTargets(childId, RelationshipType.PART_OF).stream().findFirst();
    }

    public Set<ResourceId> findInterlockedResources(ResourceId originId) {
        Objects.requireNonNull(originId, "originId must not be null");
        Set<ResourceId> visited = new HashSet<>();
        Queue<ResourceId> queue = new ArrayDeque<>();
        queue.add(originId);
        visited.add(originId);

        while (!queue.isEmpty()) {
            ResourceId current = queue.poll();
            Set<ResourceId> neighbors = new HashSet<>();
            neighbors.addAll(getConnectedTargets(current, RelationshipType.INTERLOCKED_WITH));
            neighbors.addAll(getConnectedSources(current, RelationshipType.INTERLOCKED_WITH));

            for (ResourceId neighbor : neighbors) {
                if (visited.add(neighbor)) {
                    queue.add(neighbor);
                }
            }
        }
        visited.remove(originId);
        return Collections.unmodifiableSet(visited);
    }

    public Set<ResourceId> findDownstreamLine(ResourceId originId) {
        Objects.requireNonNull(originId, "originId must not be null");
        Set<ResourceId> downstream = new LinkedHashSet<>();
        Queue<ResourceId> queue = new ArrayDeque<>();
        queue.add(originId);

        while (!queue.isEmpty()) {
            ResourceId current = queue.poll();
            for (ResourceId next : getConnectedTargets(current, RelationshipType.FEEDS)) {
                if (downstream.add(next)) {
                    queue.add(next);
                }
            }
        }
        return Collections.unmodifiableSet(downstream);
    }

    public void clear() {
        outgoingEdges.clear();
        incomingEdges.clear();
    }
}
