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
 * Standard platform entity archetype for industrial OPC UA client resources (PLCs, AGVs, machine controllers).
 * Automatically discovered by {@link EntityArchetypeRegistry} on startup.
 */
@Component
public class OpcUaClientEntityArchetype implements EntityArchetype {

    public static final String ARCHETYPE_CODE = "OPC_UA_CLIENT";

    @Override
    public String getArchetypeCode() {
        return ARCHETYPE_CODE;
    }

    @Override
    public String getArchetypeName() {
        return "Standard OPC UA Client (Industrial PLC / Gateway)";
    }

    @Override
    public String getCategory() {
        return "PHYSICAL";
    }

    @Override
    public String getResourceType() {
        return "PLC";
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
                .application("INDUSTRIAL_GATEWAY")
                .defaultProtocol("opc.tcp")
                .defaultHost("127.0.0.1")
                .defaultPort(4840)
                .documentationUrl("/docs/library/OPC_UA/OPC_UA_LIBRARY.html")
                .description("Standard platform archetype for industrial PLCs, robots, and equipment controllers over OPC UA.")
                .active(true)
                .build();
    }

    @Override
    public List<PropertyDefinition> getPropertyDefinitions() {
        List<PropertyDefinition> props = new ArrayList<>();

        props.add(PropertyDefinition.builder()
                .name("endpointUrl")
                .label("PLC Endpoint URL")
                .baseType(PropertyBaseType.STRING)
                .required(true)
                .defaultValue("opc.tcp://127.0.0.1:4840")
                .description("Network socket address of target PLC, e.g. opc.tcp://192.168.1.100:4840")
                .build());

        props.add(PropertyDefinition.builder()
                .name("authType")
                .label("Authentication Type")
                .baseType(PropertyBaseType.ENUM)
                .required(true)
                .options(List.of("ANONYMOUS", "USERNAME_PASSWORD", "X509_CERTIFICATE", "JWT_TOKEN"))
                .defaultValue("ANONYMOUS")
                .description("OPC UA User Identity Token Authentication Type")
                .build());

        props.add(PropertyDefinition.builder()
                .name("securityPolicy")
                .label("Security Policy")
                .baseType(PropertyBaseType.ENUM)
                .required(true)
                .options(List.of("NONE", "BASIC256_SHA256", "AES128_SHA256_RSAOAEP"))
                .defaultValue("NONE")
                .description("IEC 62443 transport layer encryption policy")
                .build());

        props.add(PropertyDefinition.builder()
                .name("username")
                .label("Username")
                .baseType(PropertyBaseType.STRING)
                .required(false)
                .defaultValue("")
                .description("User account configured in PLC security settings (active if authType is USERNAME_PASSWORD)")
                .build());

        props.add(PropertyDefinition.builder()
                .name("password")
                .label("Password")
                .baseType(PropertyBaseType.SECRET)
                .required(false)
                .defaultValue("")
                .description("PLC user password")
                .build());

        props.add(PropertyDefinition.builder()
                .name("keystorePath")
                .label("Keystore Path")
                .baseType(PropertyBaseType.STRING)
                .required(false)
                .defaultValue("")
                .description("Path to client PKCS12 / JKS keystore file on the gateway")
                .build());

        props.add(PropertyDefinition.builder()
                .name("keystorePassword")
                .label("Keystore Password")
                .baseType(PropertyBaseType.SECRET)
                .required(false)
                .defaultValue("")
                .description("Decryption password for client certificate keystore")
                .build());

        props.add(PropertyDefinition.builder()
                .name("certificateAlias")
                .label("Certificate Alias")
                .baseType(PropertyBaseType.STRING)
                .required(false)
                .defaultValue("")
                .description("Key alias for client certificate in keystore")
                .build());

        props.add(PropertyDefinition.builder()
                .name("jwtToken")
                .label("JWT Token")
                .baseType(PropertyBaseType.SECRET)
                .required(false)
                .defaultValue("")
                .description("Bearer token for industrial identity providers / SSO gateways")
                .build());

        props.add(PropertyDefinition.builder()
                .name("requestTimeoutMs")
                .label("Request Timeout (ms)")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(5000)
                .unit("ms")
                .description("RPC timeout for synchronous read/write calls in milliseconds")
                .build());

        props.add(PropertyDefinition.builder()
                .name("sessionTimeoutMs")
                .label("Session Timeout (ms)")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(60000)
                .unit("ms")
                .description("Session keepalive watchdog timeout in milliseconds")
                .build());

        props.add(PropertyDefinition.builder()
                .name("reconnectIntervalMs")
                .label("Reconnect Interval (ms)")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(3000)
                .unit("ms")
                .description("Backoff delay before auto-reconnect attempt on disconnect")
                .build());

        props.add(PropertyDefinition.builder()
                .name("keepaliveFailuresAllowed")
                .label("Keepalive Failures Allowed")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(4)
                .description("Consecutive missed heartbeats before marking fault")
                .build());

        props.add(PropertyDefinition.builder()
                .name("defaultNamespaceIndex")
                .label("Default Namespace Index")
                .baseType(PropertyBaseType.NUMBER)
                .required(false)
                .defaultValue(2)
                .description("Default namespace index for user PLC tags (typically 2)")
                .build());

        return props;
    }

    @Override
    public Map<String, Object> getDefaultProperties() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("endpointUrl", "opc.tcp://127.0.0.1:4840");
        defaults.put("authType", "ANONYMOUS");
        defaults.put("securityPolicy", "NONE");
        defaults.put("requestTimeoutMs", 5000);
        defaults.put("sessionTimeoutMs", 60000);
        defaults.put("reconnectIntervalMs", 3000);
        defaults.put("keepaliveFailuresAllowed", 4);
        defaults.put("defaultNamespaceIndex", 2);
        return defaults;
    }

    @Override
    public List<ServiceDefinition> getServiceDefinitions() {
        List<ServiceDefinition> services = new ArrayList<>();

        services.add(ServiceDefinition.builder()
                .name("DISCOVER_TAGS")
                .type(ServiceType.DIAGNOSTIC)
                .safetyTier(ServiceSafetyTier.READ_ONLY)
                .description("Browses PLC address space folders and returns tag hierarchy.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/browse")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("READ_TAG")
                .type(ServiceType.QUERY)
                .safetyTier(ServiceSafetyTier.READ_ONLY)
                .description("Reads single tag value, StatusCode, and timestamps from the PLC.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/read-single")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("WRITE_TAG")
                .type(ServiceType.EXECUTION)
                .safetyTier(ServiceSafetyTier.OPERATIONAL)
                .description("Writes typed setpoint or command value to a PLC tag.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/write-single")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("READ_BATCH")
                .type(ServiceType.QUERY)
                .safetyTier(ServiceSafetyTier.READ_ONLY)
                .description("Reads multiple tags in a single network round-trip.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/read-batch")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("WRITE_BATCH")
                .type(ServiceType.EXECUTION)
                .safetyTier(ServiceSafetyTier.OPERATIONAL)
                .description("Writes multiple tags simultaneously.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/write-batch")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("SUBSCRIBE_TAG")
                .type(ServiceType.QUERY)
                .safetyTier(ServiceSafetyTier.OPERATIONAL)
                .description("Establishes 250ms event-driven push telemetry subscription.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/read-group/{groupKey}")
                .httpMethod("POST")
                .build());

        services.add(ServiceDefinition.builder()
                .name("TEST_CONNECTION")
                .type(ServiceType.DIAGNOSTIC)
                .safetyTier(ServiceSafetyTier.READ_ONLY)
                .description("Pings PLC endpoint, verifies TLS handshake, and reports latency.")
                .pathTemplate("/api/v1/wcs/opcua/runtime/{code}/browse")
                .httpMethod("POST")
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
                .supportedCommands(List.of("CONNECT", "DISCONNECT", "BROWSE", "READ", "WRITE", "SUBSCRIBE"))
                .build();
    }
}
