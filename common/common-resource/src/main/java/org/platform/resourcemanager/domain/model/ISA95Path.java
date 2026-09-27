package org.platform.resourcemanager.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Standard ISA-95 / IEC 62264 6-tier equipment hierarchy model:
 * Enterprise / Site / Area / Line / WorkCell / Unit.
 */
public record ISA95Path(
        String enterprise,
        String site,
        String area,
        String line,
        String workCell,
        String unit
) implements Serializable {

    public ISA95Path {
        enterprise = sanitize(enterprise, "Enterprise");
        site = sanitize(site, "Site");
        area = sanitize(area, "Area");
        line = sanitize(line, "Line");
        workCell = sanitize(workCell, "WorkCell");
        unit = sanitize(unit, "Unit");
    }

    private static String sanitize(String value, String defaultVal) {
        return (value == null || value.isBlank()) ? defaultVal : value.trim();
    }

    public static ISA95Path parse(String path) {
        Objects.requireNonNull(path, "path must not be null");
        String trimmed = path.startsWith("/") ? path.substring(1) : path;
        String[] parts = trimmed.split("/");
        return new ISA95Path(
                parts.length > 0 ? parts[0] : "Enterprise",
                parts.length > 1 ? parts[1] : "Site",
                parts.length > 2 ? parts[2] : "Area",
                parts.length > 3 ? parts[3] : "Line",
                parts.length > 4 ? parts[4] : "WorkCell",
                parts.length > 5 ? parts[5] : "Unit"
        );
    }

    public String toPathString() {
        return String.join("/", "", enterprise, site, area, line, workCell, unit);
    }

    @Override
    public String toString() {
        return toPathString();
    }
}
