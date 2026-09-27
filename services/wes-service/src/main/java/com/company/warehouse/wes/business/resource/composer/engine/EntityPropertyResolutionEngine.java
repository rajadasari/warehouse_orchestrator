package com.company.warehouse.wes.business.resource.composer.engine;

import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Industrial hierarchical property resolution engine.
 * Resolves effective property values across the archetype inheritance chain:
 * 1. Base Archetype Defaults
 * 2. Database Template Defaults
 * 3. Instance Template Property Overrides
 * 4. Instance Custom Properties
 * 5. Direct Instance Coordinates (host, port, protocol)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntityPropertyResolutionEngine {

    private final EntityArchetypeRegistry archetypeRegistry;

    /**
     * Resolves effective properties for an entity instance given its template context and overrides.
     */
    public Map<String, Object> resolve(
            String templateCode,
            Map<String, Object> dbTemplateDefaults,
            Map<String, Object> instanceTemplateProps,
            Map<String, Object> instanceCustomProps,
            String host,
            int port,
            String protocol,
            String application,
            String description,
            String documentationUrl) {

        Map<String, Object> effective = new HashMap<>();

        // Tier 1: Base Archetype Defaults (from Code Registry)
        if (templateCode != null && !templateCode.trim().isEmpty()) {
            archetypeRegistry.getTemplate(templateCode)
                    .ifPresent(tpl -> {
                        effective.putAll(tpl.getDefaultProperties());
                        if (tpl.getBasicInfo() != null) {
                            effective.put("defaultHost", tpl.getBasicInfo().getDefaultHost());
                            effective.put("defaultPort", tpl.getBasicInfo().getDefaultPort());
                            effective.put("defaultProtocol", tpl.getBasicInfo().getDefaultProtocol());
                        }
                    });
        }

        // Tier 2: Database Template Defaults (Overlay if present)
        if (dbTemplateDefaults != null && !dbTemplateDefaults.isEmpty()) {
            effective.putAll(dbTemplateDefaults);
        }

        // Tier 3: Instance Template Property Overrides
        if (instanceTemplateProps != null && !instanceTemplateProps.isEmpty()) {
            effective.putAll(instanceTemplateProps);
        }

        // Tier 4: Instance Custom Properties
        if (instanceCustomProps != null && !instanceCustomProps.isEmpty()) {
            effective.putAll(instanceCustomProps);
        }

        // Tier 5: Direct Instance Coordinates & System Fields
        if (protocol != null && !protocol.trim().isEmpty()) {
            effective.put("protocol", protocol.trim().toLowerCase());
        }
        if (host != null && !host.trim().isEmpty()) {
            effective.put("host", host.trim());
            effective.put("ip", host.trim());
        }
        if (port > 0) {
            effective.put("port", port);
        }
        if (application != null && !application.trim().isEmpty()) {
            effective.put("application", application.trim());
        }
        if (description != null) {
            effective.put("description", description.trim());
        }
        if (documentationUrl != null) {
            effective.put("documentationUrl", documentationUrl.trim());
        }

        return effective;
    }
}
