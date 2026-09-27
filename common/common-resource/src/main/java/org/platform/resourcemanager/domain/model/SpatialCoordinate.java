package org.platform.resourcemanager.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Continuous 3D spatial coordinate representation with orientation (yaw) and zoning.
 */
public record SpatialCoordinate(
        double x,
        double y,
        double z,
        double yaw,
        String zoneId,
        String floorId
) implements Serializable {

    public SpatialCoordinate {
        zoneId = (zoneId == null || zoneId.isBlank()) ? "DEFAULT_ZONE" : zoneId.trim();
        floorId = (floorId == null || floorId.isBlank()) ? "DEFAULT_FLOOR" : floorId.trim();
    }

    public static SpatialCoordinate origin() {
        return new SpatialCoordinate(0.0, 0.0, 0.0, 0.0, "DEFAULT_ZONE", "DEFAULT_FLOOR");
    }

    public static SpatialCoordinate of(double x, double y, double z) {
        return new SpatialCoordinate(x, y, z, 0.0, "DEFAULT_ZONE", "DEFAULT_FLOOR");
    }

    public static SpatialCoordinate of(double x, double y, double z, double yaw, String zoneId) {
        return new SpatialCoordinate(x, y, z, yaw, zoneId, "DEFAULT_FLOOR");
    }

    public static SpatialCoordinate of(double x, double y, double z, double yaw, String zoneId, String floorId) {
        return new SpatialCoordinate(x, y, z, yaw, zoneId, floorId);
    }

    public double distanceTo(SpatialCoordinate other) {
        Objects.requireNonNull(other, "Target coordinate must not be null");
        double dx = this.x - other.x;
        double dy = this.y - other.y;
        double dz = this.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
