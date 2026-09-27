package com.company.warehouse.wes.business.resource.composer.validation;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.EntityBasicInfo;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Validates Entity Template composition integrity, property types, and service contracts.
 */
@Component
public class EntityTemplateValidator {

    public EntityValidationResult validate(ComposedEntityTemplate template) {
        EntityValidationResult result = new EntityValidationResult();

        if (template == null) {
            result.addError("Template definition cannot be null");
            return result;
        }

        validateBasicInfo(template.getBasicInfo(), result);
        validateProperties(template.getPropertyDefinitions(), template.getDefaultProperties(), result);
        validateServices(template.getServiceDefinitions(), result);

        return result;
    }

    private void validateBasicInfo(EntityBasicInfo info, EntityValidationResult result) {
        if (info == null) {
            result.addError("Template basic information is required");
            return;
        }

        if (info.getTemplateCode() == null || info.getTemplateCode().trim().isEmpty()) {
            result.addError("Template code is required");
        } else if (!info.getTemplateCode().matches("^[A-Za-z0-9_.-]+$")) {
            result.addError("Template code must contain only alphanumeric characters, underscores, hyphens, and dots");
        }

        if (info.getTemplateName() == null || info.getTemplateName().trim().isEmpty()) {
            result.addError("Template name is required");
        }

        if (info.getCategory() == null || info.getCategory().trim().isEmpty()) {
            result.addError("Category is required (PHYSICAL, SOFTWARE, VIRTUAL, LOGICAL)");
        }
    }

    private void validateProperties(List<PropertyDefinition> properties, Map<String, Object> defaultProperties, EntityValidationResult result) {
        if (properties == null || properties.isEmpty()) {
            return;
        }

        Set<String> seenKeys = new HashSet<>();
        for (PropertyDefinition prop : properties) {
            String name = prop.getName();
            if (name == null || name.trim().isEmpty()) {
                result.addError("Property name cannot be empty");
                continue;
            }

            String cleanName = name.trim();
            if (!seenKeys.add(cleanName.toLowerCase())) {
                result.addError("Duplicate property name: '" + cleanName + "'");
            }

            if (prop.getBaseType() == PropertyBaseType.ENUM) {
                if (prop.getOptions() == null || prop.getOptions().isEmpty()) {
                    result.addError("Property '" + cleanName + "' of type ENUM must define at least one option");
                }
            }

            // Check default value type compatibility
            Object defaultVal = defaultProperties != null && defaultProperties.containsKey(cleanName)
                    ? defaultProperties.get(cleanName)
                    : prop.getDefaultValue();

            if (defaultVal != null && (!(defaultVal instanceof String s) || !s.trim().isEmpty())) {
                validateValueType(cleanName, defaultVal, prop.getBaseType(), prop.getOptions(), result);
            } else if (prop.isRequired()) {
                result.addWarning("Property '" + cleanName + "' is marked required but provides no default value in template");
            }
        }
    }

    private void validateValueType(String propName, Object value, PropertyBaseType expectedType, List<String> options, EntityValidationResult result) {
        if (expectedType == null) return;
        switch (expectedType) {
            case NUMBER, DOUBLE -> {
                if (!(value instanceof Number)) {
                    try {
                        Double.parseDouble(String.valueOf(value));
                    } catch (NumberFormatException e) {
                        result.addError("Property '" + propName + "' default value '" + value + "' is not a valid number");
                    }
                }
            }
            case INTEGER -> {
                if (!(value instanceof Number)) {
                    try {
                        Integer.parseInt(String.valueOf(value));
                    } catch (NumberFormatException e) {
                        result.addError("Property '" + propName + "' default value '" + value + "' is not a valid integer");
                    }
                }
            }
            case LONG -> {
                if (!(value instanceof Number)) {
                    try {
                        Long.parseLong(String.valueOf(value));
                    } catch (NumberFormatException e) {
                        result.addError("Property '" + propName + "' default value '" + value + "' is not a valid integer counter");
                    }
                }
            }
            case BOOLEAN -> {
                if (!(value instanceof Boolean)) {
                    String str = String.valueOf(value).toLowerCase();
                    if (!str.equals("true") && !str.equals("false")) {
                        result.addError("Property '" + propName + "' default value '" + value + "' is not a valid boolean");
                    }
                }
            }
            case ENUM -> {
                if (options != null && !options.isEmpty()) {
                    String str = String.valueOf(value);
                    if (!options.contains(str)) {
                        result.addError("Property '" + propName + "' default value '" + str + "' is not among valid options: " + options);
                    }
                }
            }
            default -> {}
        }
    }

    private void validateServices(List<ServiceDefinition> services, EntityValidationResult result) {
        if (services == null || services.isEmpty()) {
            return;
        }

        Set<String> seenServices = new HashSet<>();
        for (ServiceDefinition s : services) {
            String name = s.getName();
            if (name == null || name.trim().isEmpty()) {
                result.addError("Service name cannot be empty");
                continue;
            }

            String clean = name.trim().toUpperCase();
            if (!seenServices.add(clean)) {
                result.addError("Duplicate service name: '" + clean + "'");
            }

            if (s.getPathTemplate() != null && !s.getPathTemplate().trim().isEmpty()) {
                String path = s.getPathTemplate().trim();
                if (!path.startsWith("/") && !path.startsWith("http://") && !path.startsWith("https://")) {
                    result.addWarning("Service '" + clean + "' pathTemplate '" + path + "' should start with '/'");
                }
            }
        }
    }
}
