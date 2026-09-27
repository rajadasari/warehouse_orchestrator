package org.platform.resourcemanager.domain.model;

/**
 * Standard 5-level industrial resource classification hierarchy.
 */
public enum StandardResourceClass implements ResourceType {
    ASSET("ASSET", "General physical or operational asset"),
    EQUIPMENT("EQUIPMENT", "Standalone manufacturing or logistics equipment"),
    MODULE("MODULE", "Functional sub-assembly or process module"),
    DEVICE("DEVICE", "Sensor, actuator, or field instrument"),
    SOFTWARE("SOFTWARE", "Cyber service, PLC routine, or algorithmic agent");

    private final String code;
    private final String description;

    StandardResourceClass(String code, String description) {
        this.code = code;
        this.description = description;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public String description() {
        return description;
    }

    public static ResourceType fromString(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Resource class code must not be null or blank");
        }
        for (StandardResourceClass standard : values()) {
            if (standard.code.equalsIgnoreCase(code.trim())) {
                return standard;
            }
        }
        return ResourceType.custom(code.trim().toUpperCase(), "Custom Classification: " + code.trim());
    }
}
