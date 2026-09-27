package com.company.warehouse.wes.business.resource.composer.archetype;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.EntityBasicInfo;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceSafetyTier;
import com.company.warehouse.wes.business.resource.composer.model.ServiceType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Standard platform entity archetype for hosting virtual OPC UA Servers (digital twin, simulator).
 * Automatically discovered by {@link EntityArchetypeRegistry} on startup.
 */
@Component
public class OpcUaServerEntityArchetype implements EntityArchetype {

    public static final String ARCHETYPE_CODE = "OPC_UA_SERVER";

    @Override
    public String getArchetypeCode() {
        return ARCHETYPE_CODE;
    }

    @Override
    public String getArchetypeName() {
        return "Standard OPC UA Server (Virtual PLC / Digital Twin)";
    }

    @Override
    public String getCategory() {
        return "SOFTWARE";
    }

    @Override
    public String getResourceType() {
        return "OPC_UA_SERVER";
    }

    @Override
    public String getCommunicationProtocol() {
        return "OPC_UA";
    }

    @Override
    public EntityBasicInfo getDefaultBasicInfo() {
        return EntityBasicInfo.builder()
                .templateCode(ARCHETYPE_CODE)
                .templateName(getArchetypeName())
                .category(getCategory())
                .resourceType(getResourceType())
                .communicationProtocol(getCommunicationProtocol())
                .application("VIRTUAL_SIMULATOR")
                .defaultProtocol("opc.tcp")
                .defaultHost("0.0.0.0")
                .defaultPort(4840)
                .documentationUrl("/docs/library/OPC_UA/OPC_UA_LIBRARY.html")
                .description("Standard platform archetype for hosting in-memory virtual OPC UA servers and digital twin simulation.")
                .active(true)
                .build();
    }

    @Override
    public List<PropertyDefinition> getPropertyDefinitions() {
        List<PropertyDefinition> props = new ArrayList<>();

        props.add(PropertyDefinition.builder()
                .name("bindAddress")
                .label("Bind IP Address")
                .baseType(PropertyBaseType.STRING)
                .required(true)
                .defaultValue("0.0.0.0")
                .description("Network interface to bind listening socket (0.0.0.0 for all interfaces)")
                .build());

        props.add(PropertyDefinition.builder()
                .name("bindPort")
                .label("TCP Port")
                .baseType(PropertyBaseType.NUMBER)
                .required(true)
                .defaultValue(4840)
                .description("TCP port for incoming client connections (standard is 4840)")
                .build());

        props.add(PropertyDefinition.builder()
                .name("endpointPath")
                .label("Endpoint Path")
                .baseType(PropertyBaseType.STRING)
                .required(true)
                .defaultValue("/wcs/opcua")
                .description("URL endpoint path suffix, e.g. /wcs/opcua")
                .build());

        props.add(PropertyDefinition.builder()
                .name("namespaceUri")
                .label("Namespace URI")
                .baseType(PropertyBaseType.STRING)
                .required(true)
                .defaultValue("urn:company:warehouse:wcs")
                .description("Root namespace URI registered for hosted variable nodes")
                .build());

        props.add(PropertyDefinition.builder()
                .name("securityPolicy")
                .label("Supported Security")
                .baseType(PropertyBaseType.ENUM)
                .required(true)
                .options(List.of("NONE", "BASIC256_SHA256", "AES128_SHA256_RSAOAEP"))
                .defaultValue("NONE")
                .description("Minimum transport security policy accepted by server")
                .build());

        props.add(PropertyDefinition.builder()
                .name("allowAnonymous")
                .label("Allow Anonymous Access")
                .baseType(PropertyBaseType.BOOLEAN)
                .required(true)
                .defaultValue(true)
                .description("Permits test and simulation clients to connect without credentials")
                .build());

        props.add(PropertyDefinition.builder()
                .name("autoStart")
                .label("Auto-Start on Boot")
                .baseType(PropertyBaseType.BOOLEAN)
                .required(true)
                .defaultValue(true)
                .description("Launches the OPC UA server automatically when WCS boots")
                .build());

        props.add(PropertyDefinition.builder()
                .name("maxConnections")
                .label("Max Connections")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(100)
                .description("Maximum concurrent client connections allowed")
                .build());

        return props;
    }

    @Override
    public Map<String, Object> getDefaultProperties() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("bindAddress", "0.0.0.0");
        defaults.put("bindPort", 4840);
        defaults.put("endpointPath", "/wcs/opcua");
        defaults.put("namespaceUri", "urn:company:warehouse:wcs");
        defaults.put("securityPolicy", "NONE");
        defaults.put("allowAnonymous", true);
        defaults.put("autoStart", true);
        defaults.put("maxConnections", 100);
        return defaults;
    }

    @Override
    public List<ServiceDefinition> getServiceDefinitions() {
        List<ServiceDefinition> services = new ArrayList<>();

        services.add(ServiceDefinition.builder()
                .name("START_SERVER")
                .type(ServiceType.EXECUTION)
                .safetyTier(ServiceSafetyTier.OPERATIONAL)
                .description("Binds the listening socket and begins serving address space in WCS.")
                .pathTemplate("/api/v1/wcs/opcua/config/servers")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("STOP_SERVER")
                .type(ServiceType.EXECUTION)
                .safetyTier(ServiceSafetyTier.SAFETY_CRITICAL)
                .description("Terminates client connections and shuts down listening socket.")
                .pathTemplate("/api/v1/wcs/opcua/config/servers")
                .httpMethod("DELETE")
                .build());

        services.add(ServiceDefinition.builder()
                .name("REGISTER_NODE")
                .type(ServiceType.EXECUTION)
                .safetyTier(ServiceSafetyTier.OPERATIONAL)
                .description("Dynamically registers a variable node into the virtual address space.")
                .pathTemplate("/api/v1/wcs/opcua/config/tag-mappings")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("UPDATE_NODE_VALUE")
                .type(ServiceType.EXECUTION)
                .safetyTier(ServiceSafetyTier.OPERATIONAL)
                .description("Sets a variable node value and pushes notification to subscribers.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/write-single")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("GET_SERVER_STATUS")
                .type(ServiceType.DIAGNOSTIC)
                .safetyTier(ServiceSafetyTier.READ_ONLY)
                .description("Reports active client count, uptime, and bound endpoint.")
                .pathTemplate("/api/v1/wcs/opcua/config/servers")
                .httpMethod("GET")
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
                .supportedCommands(List.of("START", "STOP", "REGISTER_NODE", "UPDATE_NODE", "STATUS"))
                .build();
    }
}
