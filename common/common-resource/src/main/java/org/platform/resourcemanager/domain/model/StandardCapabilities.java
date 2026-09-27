package org.platform.resourcemanager.domain.model;

import java.util.Collections;
import java.util.Set;

/**
 * Standard baseline industrial capability constants conforming to IDTA and AAS capability models.
 */
public final class StandardCapabilities {

    public static final String DISPENSE = "DISPENSE";
    public static final String WELD = "WELD";
    public static final String PICK_AND_PLACE = "PICK_AND_PLACE";
    public static final String INSPECT = "INSPECT";
    public static final String MOVE = "MOVE";
    public static final String CHARGE = "CHARGE";
    public static final String COOL = "COOL";
    public static final String HEAT = "HEAT";
    public static final String MACHINE = "MACHINE";
    public static final String ASSEMBLE = "ASSEMBLE";
    public static final String PACKAGE = "PACKAGE";
    public static final String STORE = "STORE";
    public static final String TEST = "TEST";
    public static final String COMMUNICATE = "COMMUNICATE";

    private static final Set<String> ALL_BASELINE = Set.of(
            DISPENSE, WELD, PICK_AND_PLACE, INSPECT, MOVE,
            CHARGE, COOL, HEAT, MACHINE, ASSEMBLE,
            PACKAGE, STORE, TEST, COMMUNICATE
    );

    private StandardCapabilities() {
    }

    public static Set<String> allBaseline() {
        return Collections.unmodifiableSet(ALL_BASELINE);
    }

    public static boolean isBaseline(String capability) {
        if (capability == null) {
            return false;
        }
        return ALL_BASELINE.contains(capability.toUpperCase());
    }
}
