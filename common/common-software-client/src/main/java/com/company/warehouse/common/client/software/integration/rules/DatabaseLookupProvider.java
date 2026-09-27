package com.company.warehouse.common.client.software.integration.rules;

import java.util.Map;

/**
 * Service SPI allowing the common integration rule engine to query host service databases
 * (e.g. ItemMaster, Pallet, Location, Resource tags) without coupling to JPA entities.
 */
public interface DatabaseLookupProvider {

    /**
     * Checks whether the given target (e.g. "SKU_EXISTS", "LOCATION_EXISTS", "TAG_EXISTS")
     * is satisfied by the key value.
     */
    boolean exists(String lookupTarget, Object key, Map<String, Object> context);

    /**
     * Optional hook to fetch lookup record attributes (e.g. unit weight, capacity) into the evaluation context.
     */
    default Map<String, Object> fetchAttributes(String lookupTarget, Object key) {
        return Map.of();
    }
}
