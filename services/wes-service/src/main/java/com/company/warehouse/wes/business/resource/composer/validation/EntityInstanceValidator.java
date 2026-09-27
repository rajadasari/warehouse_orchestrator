package com.company.warehouse.wes.business.resource.composer.validation;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Validates concrete entity instance configurations against their parent template schema.
 */
@Component
public class EntityInstanceValidator {

    public EntityValidationResult validate(ComposedEntityInstance instance, ComposedEntityTemplate template) {
        EntityValidationResult result = new EntityValidationResult();

        if (instance == null) {
            result.addError("Entity instance cannot be null");
            return result;
        }

        if (instance.getResourceId() == null || instance.getResourceId().trim().isEmpty()) {
            result.addError("Resource ID is required");
        }

        if (instance.getName() == null || instance.getName().trim().isEmpty()) {
            result.addError("Resource name is required");
        }

        if (instance.getPort() <= 0 || instance.getPort() > 65535) {
            result.addError("Resource port must be between 1 and 65535");
        }

        if (instance.getHost() == null || instance.getHost().trim().isEmpty()) {
            result.addError("Resource host/IP is required");
        }

        if (template != null) {
            validateAgainstTemplate(instance, template, result);
        }

        return result;
    }

    private void validateAgainstTemplate(ComposedEntityInstance instance, ComposedEntityTemplate template, EntityValidationResult result) {
        Map<String, Object> effective = instance.getEffectiveProperties();

        for (PropertyDefinition prop : template.getPropertyDefinitions()) {
            String key = prop.getName();
            Object val = effective != null ? effective.get(key) : null;

            if (val == null) {
                if (prop.isRequired()) {
                    result.addError("Required property '" + key + "' has no value assigned");
                }
                continue;
            }

            if (prop.getBaseType() == PropertyBaseType.NUMBER) {
                if (!(val instanceof Number)) {
                    try {
                        Double.parseDouble(String.valueOf(val));
                    } catch (NumberFormatException e) {
                        result.addError("Property '" + key + "' value '" + val + "' is not a valid number");
                    }
                }
            } else if (prop.getBaseType() == PropertyBaseType.ENUM) {
                String str = String.valueOf(val);
                if (prop.getOptions() != null && !prop.getOptions().isEmpty() && !prop.getOptions().contains(str)) {
                    result.addError("Property '" + key + "' value '" + str + "' is not among valid options: " + prop.getOptions());
                }
            }
        }
    }
}
