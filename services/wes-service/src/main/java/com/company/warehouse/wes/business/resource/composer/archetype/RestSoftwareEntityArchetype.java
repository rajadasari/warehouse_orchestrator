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

import org.springframework.stereotype.Component;

/**
 * Concrete entity archetype for Generic HTTP/REST software interfaces.
 * Automatically discovered by EntityArchetypeRegistry.
 */
@Component
public class RestSoftwareEntityArchetype implements EntityArchetype {

    public static final String ARCHETYPE_CODE = "REST_API_GENERIC";

    @Override
    public String getArchetypeCode() {
        return ARCHETYPE_CODE;
    }

    @Override
    public String getArchetypeName() {
        return "Generic HTTP/REST Software Archetype";
    }

    @Override
    public String getCategory() {
        return "SOFTWARE";
    }

    @Override
    public String getResourceType() {
        return "REST_GENERIC";
    }

    @Override
    public String getCommunicationProtocol() {
        return "REST";
    }

    @Override
    public EntityBasicInfo getDefaultBasicInfo() {
        return EntityBasicInfo.builder()
                .templateCode(ARCHETYPE_CODE)
                .templateName(getArchetypeName())
                .category(getCategory())
                .resourceType(getResourceType())
                .communicationProtocol(getCommunicationProtocol())
                .application("GENERIC_REST_APP")
                .defaultProtocol("http")
                .defaultHost("127.0.0.1")
                .defaultPort(8080)
                .documentationUrl("/docs/apps/generic-rest.html")
                .description("Configurable HTTP/REST interface supporting OAuth2, API Key, Basic Auth, and dynamic endpoint dispatch.")
                .active(true)
                .build();
    }

    @Override
    public List<PropertyDefinition> getPropertyDefinitions() {
        List<PropertyDefinition> props = new ArrayList<>();

        props.add(PropertyDefinition.builder()
                .name("host")
                .label("Host / IP Address")
                .baseType(PropertyBaseType.STRING)
                .required(true)
                .defaultValue("127.0.0.1")
                .description("Target hostname, domain, or IPv4 address")
                .build());

        props.add(PropertyDefinition.builder()
                .name("port")
                .label("Default HTTP Port")
                .baseType(PropertyBaseType.NUMBER)
                .required(true)
                .defaultValue(8080)
                .description("Network listening port")
                .build());

        props.add(PropertyDefinition.builder()
                .name("protocol")
                .label("HTTP Protocol")
                .baseType(PropertyBaseType.ENUM)
                .required(true)
                .options(List.of("http", "https"))
                .defaultValue("http")
                .description("Transport protocol scheme")
                .build());

        props.add(PropertyDefinition.builder()
                .name("basePath")
                .label("API Base Path")
                .baseType(PropertyBaseType.STRING)
                .defaultValue("")
                .description("Context prefix path, e.g. /api/v1")
                .build());

        props.add(PropertyDefinition.builder()
                .name("timeoutMs")
                .label("Timeout (ms)")
                .baseType(PropertyBaseType.NUMBER)
                .defaultValue(5000)
                .unit("ms")
                .description("HTTP socket connect & read timeout in milliseconds")
                .build());

        props.add(PropertyDefinition.builder()
                .name("authType")
                .label("Authentication Strategy")
                .baseType(PropertyBaseType.ENUM)
                .options(List.of("NONE", "API_KEY", "BASIC_AUTH", "OAUTH2_BEARER"))
                .defaultValue("NONE")
                .description("Authentication mechanism required by remote service")
                .build());

        props.add(PropertyDefinition.builder()
                .name("clientId")
                .label("Client Identifier")
                .baseType(PropertyBaseType.STRING)
                .description("OAuth2 client_id or Basic Auth username")
                .build());

        props.add(PropertyDefinition.builder()
                .name("clientSecret")
                .label("Client Secret / Key")
                .baseType(PropertyBaseType.SECRET)
                .description("OAuth2 client_secret, API key token, or Basic Auth password")
                .build());

        props.add(PropertyDefinition.builder()
                .name("tokenEndpoint")
                .label("OAuth2 Token Endpoint")
                .baseType(PropertyBaseType.STRING)
                .description("Full URL or relative path to fetch OAuth2 tokens")
                .build());

        return props;
    }

    @Override
    public Map<String, Object> getDefaultProperties() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("host", "127.0.0.1");
        defaults.put("port", 8080);
        defaults.put("protocol", "http");
        defaults.put("basePath", "");
        defaults.put("timeoutMs", 5000);
        defaults.put("authType", "NONE");
        return defaults;
    }

    @Override
    public List<ServiceDefinition> getServiceDefinitions() {
        List<ServiceDefinition> services = new ArrayList<>();

        services.add(ServiceDefinition.builder()
                .name("AUTHENTICATE")
                .displayName("Authenticate & Fetch Token")
                .category("API")
                .description("Acquires and validates access credentials or tokens from the target server.")
                .httpMethod("POST")
                .pathTemplate("/oauth/token")
                .build());

        services.add(ServiceDefinition.builder()
                .name("HEALTH_CHECK")
                .displayName("Health Probe")
                .category("API")
                .description("Tests connectivity and responsiveness of target software endpoint.")
                .httpMethod("GET")
                .pathTemplate("/actuator/health")
                .build());

        services.add(ServiceDefinition.builder()
                .name("DISPATCH_API")
                .displayName("Dispatch API Request")
                .category("API")
                .description("Dispatches structured payload to a specific API path with dynamic parameter bindings.")
                .httpMethod("POST")
                .pathTemplate("/api/v1/dispatch")
                .build());

        services.add(ServiceDefinition.builder()
                .name("QUERY_DATA")
                .displayName("Query Remote Data")
                .category("API")
                .description("Queries remote system state or master data.")
                .httpMethod("GET")
                .pathTemplate("/api/v1/query")
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
                .supportedCommands(List.of("PING", "SYNC", "EXECUTE"))
                .build();
    }
}
