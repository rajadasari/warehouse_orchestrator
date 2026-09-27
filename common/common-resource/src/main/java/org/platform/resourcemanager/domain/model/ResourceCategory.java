package org.platform.resourcemanager.domain.model;

/**
 * Universal ontological category of the resource.
 */
public enum ResourceCategory {
    PHYSICAL("Tangible shop floor equipment, tools, or mobile robots"),
    SOFTWARE("Digital service, software worker, or enterprise software connector"),
    CYBER("Digital service, software worker, or virtualized PLC controller"),
    VIRTUAL("Digital twin simulation or synchronized virtual replica"),
    LOGICAL("Logical allocation zone, workflow queue, or abstract station");

    private final String description;

    ResourceCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
