package org.platform.resourcemanager.domain.topology;

/**
 * Semantic relationship types connecting resources in the operational topology graph.
 */
public enum RelationshipType {
    PART_OF("Hierarchical structural containment or sub-assembly composition"),
    FEEDS("Material, product, or workpiece routing downstream"),
    CONSUMES("Consumes output, energy, or utilities from another resource"),
    CONTROLS("Master-slave or supervisory automation control relationship"),
    RUNS_ON("Cyber-physical hosting (e.g. software process runs on hardware compute IPC)"),
    INTERLOCKED_WITH("Safety interlock: failure or e-stop cascades across connected nodes");

    private final String description;

    RelationshipType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
