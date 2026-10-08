package com.company.warehouse.wes.business.resource.composer.archetype;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.EntityBasicInfo;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Concrete entity archetype for Generic / Universal Digital Twins.
 * Lightweight digital twin blueprint supporting in-memory Java & Python execution (< 1µs).
 * Automatically discovered by {@link EntityArchetypeRegistry}.
 */
@Component
public class GeneralDigitalTwinEntityArchetype implements EntityArchetype {

    public static final String ARCHETYPE_CODE = "GENERIC_DIGITAL_TWIN";

    @Override
    public String getArchetypeCode() {
        return ARCHETYPE_CODE;
    }

    @Override
    public String getArchetypeName() {
        return "Generic Digital Twin Archetype";
    }

    @Override
    public String getCategory() {
        return "GENERAL";
    }

    @Override
    public String getResourceType() {
        return "DIGITAL_TWIN";
    }

    @Override
    public String getCommunicationProtocol() {
        return "INTERNAL";
    }

    @Override
    public EntityBasicInfo getDefaultBasicInfo() {
        return EntityBasicInfo.builder()
                .templateCode(ARCHETYPE_CODE)
                .templateName(getArchetypeName())
                .category(getCategory())
                .resourceType(getResourceType())
                .communicationProtocol(getCommunicationProtocol())
                .application("WES_CORE")
                .defaultProtocol("internal")
                .defaultHost("localhost")
                .defaultPort(0)
                .documentationUrl("/docs/archetypes/generic-digital-twin.html")
                .description("Lightweight universal digital twin with state monitoring and high-speed in-memory Java and Python service execution.")
                .active(true)
                .build();
    }

    @Override
    public List<PropertyDefinition> getPropertyDefinitions() {
        List<PropertyDefinition> props = new ArrayList<>();

        props.add(PropertyDefinition.builder()
                .name("operational_state")
                .label("Operational State")
                .baseType(PropertyBaseType.ENUM)
                .required(true)
                .options(List.of("IDLE", "RUNNING", "PAUSED", "FAULTED", "MAINTENANCE"))
                .defaultValue("IDLE")
                .description("Lifecycle state of the digital twin")
                .build());

        props.add(PropertyDefinition.builder()
                .name("health_status")
                .label("Health Status")
                .baseType(PropertyBaseType.ENUM)
                .required(true)
                .options(List.of("HEALTHY", "WARNING", "CRITICAL", "UNKNOWN"))
                .defaultValue("HEALTHY")
                .description("System health metric evaluated from diagnostics")
                .build());

        props.add(PropertyDefinition.builder()
                .name("heartbeat_interval_sec")
                .label("Heartbeat Interval (sec)")
                .baseType(PropertyBaseType.NUMBER)
                .required(true)
                .defaultValue(10)
                .description("Watchdog evaluation interval in seconds")
                .build());

        props.add(PropertyDefinition.builder()
                .name("last_heartbeat")
                .label("Last Heartbeat Timestamp")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(0)
                .description("Epoch timestamp (ms) of the most recent health beacon")
                .build());

        return props;
    }

    @Override
    public Map<String, Object> getDefaultProperties() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("operational_state", "IDLE");
        defaults.put("health_status", "HEALTHY");
        defaults.put("heartbeat_interval_sec", 10);
        defaults.put("last_heartbeat", 0L);
        return defaults;
    }

    @Override
    public List<ServiceDefinition> getServiceDefinitions() {
        List<ServiceDefinition> services = new ArrayList<>();

        // Service 1: CALCULATE_HEALTH (In-Memory Java / Python Logic)
        services.add(ServiceDefinition.builder()
                .name("CALCULATE_HEALTH")
                .displayName("Evaluate Twin Health")
                .category("DIAGNOSTIC")
                .description("In-memory algorithm computing health status from heartbeat and runtime parameters.")
                .language("JAVA")
                .javaCode("// In-Memory Health Evaluation (< 1µs)\n" +
                        "long lastBeat = ((Number) properties.getOrDefault(\"last_heartbeat\", 0L)).longValue();\n" +
                        "int interval = ((Number) properties.getOrDefault(\"heartbeat_interval_sec\", 10)).intValue();\n" +
                        "long now = System.currentTimeMillis();\n" +
                        "if (lastBeat > 0 && (now - lastBeat) > (interval * 2000L)) {\n" +
                        "    properties.put(\"health_status\", \"WARNING\");\n" +
                        "    return \"WARNING\";\n" +
                        "}\n" +
                        "properties.put(\"health_status\", \"HEALTHY\");\n" +
                        "return \"HEALTHY\";")
                .outputType("STRING")
                .storeResultToProperty("health_status")
                .build());

        // Service 2: RESET_STATE
        services.add(ServiceDefinition.builder()
                .name("RESET_STATE")
                .displayName("Reset Operational State")
                .category("CONTROL")
                .description("Resets operational_state to IDLE and clears transient faults.")
                .language("JAVA")
                .javaCode("// In-Memory State Reset\n" +
                        "properties.put(\"operational_state\", \"IDLE\");\n" +
                        "properties.put(\"health_status\", \"HEALTHY\");\n" +
                        "properties.put(\"last_heartbeat\", System.currentTimeMillis());\n" +
                        "return \"RESET_OK\";")
                .outputType("STRING")
                .storeResultToProperty("operational_state")
                .build());

        return services;
    }

    @Override
    public ComposedEntityTemplate toTemplate() {
        return ComposedEntityTemplate.builder()
                .basicInfo(getDefaultBasicInfo())
                .propertyDefinitions(getPropertyDefinitions())
                .defaultProperties(getDefaultProperties())
                .serviceDefinitions(getServiceDefinitions())
                .supportedCommands(List.of("CALCULATE_HEALTH", "RESET_STATE"))
                .build();
    }
}
