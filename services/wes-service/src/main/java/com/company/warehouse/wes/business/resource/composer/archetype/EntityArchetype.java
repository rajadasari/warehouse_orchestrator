package com.company.warehouse.wes.business.resource.composer.archetype;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.EntityBasicInfo;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;

import java.util.List;
import java.util.Map;

/**
 * Contract for factory-shipped archetype entity templates.
 */
public interface EntityArchetype {

    /**
     * Unique code identifying the archetype (e.g. REST_API_GENERIC).
     */
    String getArchetypeCode();

    /**
     * Display name for the archetype.
     */
    String getArchetypeName();

    /**
     * Category (SOFTWARE, HARDWARE, DEVICE).
     */
    String getCategory();

    /**
     * Concrete resource type (REST_GENERIC, WMS_REST, PLC_S7, etc.).
     */
    String getResourceType();

    /**
     * Communication protocol (REST, GRPC, PLC_S7, MODBUS_TCP, etc.).
     */
    String getCommunicationProtocol();

    /**
     * Default basic identity and default network coordinates.
     */
    EntityBasicInfo getDefaultBasicInfo();

    /**
     * Pre-defined Data Shape property schema definitions.
     */
    List<PropertyDefinition> getPropertyDefinitions();

    /**
     * Default values for the Data Shape properties.
     */
    Map<String, Object> getDefaultProperties();

    /**
     * Pre-defined service/method definitions.
     */
    List<ServiceDefinition> getServiceDefinitions();

    /**
     * Compiles this archetype into an immutable ComposedEntityTemplate.
     */
    ComposedEntityTemplate toTemplate();
}
