import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ResourceItem, resourceService } from '../../../../services/resourceService';
import { 
  ResourceTemplateItem, 
  fetchResourceTemplateByCodeApi,
  PropertySchemaItem 
} from '../../../../services/resourceTemplateService';
import { UnifiedPropertyItem } from './types';

function inferPropertyType(val: unknown, key: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('apikey')) {
    return 'SECRET';
  }
  if (typeof val === 'boolean') return 'BOOLEAN';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'INTEGER' : 'DOUBLE';
  }
  if (Array.isArray(val)) return 'ARRAY';
  if (val !== null && typeof val === 'object') return 'MAP';
  return 'STRING';
}

export function useResourceLiveProperties(
  resource: ResourceItem | null,
  onResourceUpdated?: (updated: ResourceItem) => void
) {
  const [template, setTemplate] = useState<ResourceTemplateItem | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState<boolean>(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Values map: key -> current value
  const [propertyValues, setPropertyValues] = useState<Record<string, unknown>>({});
  // Timestamp map: key -> Date
  const [lastUpdatedMap, setLastUpdatedMap] = useState<Record<string, Date>>({});
  // Changed indicator map: key -> boolean
  const [changedMap, setChangedMap] = useState<Record<string, boolean>>({});

  const previousValuesRef = useRef<Record<string, unknown>>({});
  const changeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fetch template whenever resource changes
  useEffect(() => {
    let isCancelled = false;
    if (resource?.templateCode) {
      setIsLoadingTemplate(true);
      fetchResourceTemplateByCodeApi(resource.templateCode)
        .then(tpl => {
          if (!isCancelled) setTemplate(tpl);
        })
        .catch(() => {
          if (!isCancelled) setTemplate(null);
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingTemplate(false);
        });
    } else {
      setTemplate(null);
      setIsLoadingTemplate(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [resource?.resourceId, resource?.templateCode]);

  // Extract real property values from resource and template
  useEffect(() => {
    if (!resource) {
      setPropertyValues({});
      setLastUpdatedMap({});
      setChangedMap({});
      previousValuesRef.current = {};
      return;
    }

    const currentValues: Record<string, unknown> = {};
    const now = new Date();

    // 1. Inherited properties from schema & template defaults
    const schema = template?.propertySchema || [];
    schema.forEach(p => {
      const val = resource.templateProperties?.[p.key] ?? 
                  resource.effectiveProperties?.[p.key] ?? 
                  template?.defaultProperties?.[p.key] ?? 
                  p.defaultValue;
      currentValues[p.key] = val;
    });

    if (resource.templateProperties) {
      Object.entries(resource.templateProperties).forEach(([k, v]) => {
        if (currentValues[k] === undefined) {
          currentValues[k] = v;
        }
      });
    }

    if (resource.effectiveProperties) {
      Object.entries(resource.effectiveProperties).forEach(([k, v]) => {
        if (currentValues[k] === undefined) {
          currentValues[k] = v;
        }
      });
    }

    // 2. Custom properties
    if (resource.customProperties) {
      Object.entries(resource.customProperties).forEach(([k, v]) => {
        currentValues[k] = v;
      });
    }

    // Detect actual value changes compared to previous real state
    const previous = previousValuesRef.current;
    const hasPrevious = Object.keys(previous).length > 0;

    if (hasPrevious) {
      Object.entries(currentValues).forEach(([k, newVal]) => {
        const prevVal = previous[k];
        if (prevVal !== undefined && prevVal !== newVal) {
          setChangedMap(prev => ({ ...prev, [k]: true }));
          setLastUpdatedMap(prev => ({ ...prev, [k]: now }));

          if (changeTimersRef.current[k]) {
            clearTimeout(changeTimersRef.current[k]);
          }
          changeTimersRef.current[k] = setTimeout(() => {
            setChangedMap(prev => ({ ...prev, [k]: false }));
            delete changeTimersRef.current[k];
          }, 1200);
        }
      });
    } else {
      // First load: set initial timestamps
      const initialTimestamps: Record<string, Date> = {};
      Object.keys(currentValues).forEach(k => {
        initialTimestamps[k] = resource.updatedAt ? new Date(resource.updatedAt) : now;
      });
      setLastUpdatedMap(initialTimestamps);
    }

    previousValuesRef.current = currentValues;
    setPropertyValues(currentValues);
  }, [resource, template]);

  // Clean up any pending change highlight timers on unmount
  useEffect(() => {
    return () => {
      Object.values(changeTimersRef.current).forEach(clearTimeout);
      changeTimersRef.current = {};
    };
  }, []);

  // Manual Refresh Handler: reads fresh data from backend
  const handleManualRefresh = useCallback(async () => {
    if (!resource) return;
    setIsManualRefreshing(true);
    try {
      const fresh = await resourceService.getResourceById(resource.resourceId);
      if (fresh) {
        onResourceUpdated?.(fresh);
      }
    } catch (err) {
      console.error('Failed to manually refresh resource properties:', err);
    } finally {
      setIsManualRefreshing(false);
    }
  }, [resource, onResourceUpdated]);

  // Build unified Inherited Properties list
  const inheritedProperties: UnifiedPropertyItem[] = useMemo(() => {
    if (!resource) return [];
    const result: UnifiedPropertyItem[] = [];
    const processedKeys = new Set<string>();

    const schemaMap = new Map<string, PropertySchemaItem>();
    (template?.propertySchema || []).forEach(p => schemaMap.set(p.key, p));

    // 1. Process schema items
    schemaMap.forEach((schemaItem, key) => {
      processedKeys.add(key);
      const blueprintVal = template?.defaultProperties?.[key] ?? schemaItem.defaultValue;
      const configuredVal = resource.templateProperties?.[key] ?? 
                            resource.effectiveProperties?.[key] ?? 
                            blueprintVal;
      const live = propertyValues[key] ?? configuredVal;
      const typeStr = String(schemaItem.type).toUpperCase();

      result.push({
        id: `inherited-${key}`,
        key,
        label: schemaItem.label || key,
        description: schemaItem.description,
        type: typeStr,
        required: schemaItem.required,
        configuredValue: blueprintVal,
        liveValue: live,
        unit: schemaItem.unit,
        group: 'INHERITED',
        logToTelemetry: Boolean(schemaItem.logToTelemetry),
        lastUpdated: lastUpdatedMap[key] || (resource.updatedAt ? new Date(resource.updatedAt) : null),
        isChanged: Boolean(changedMap[key]),
        isSecret: typeStr === 'SECRET',
        options: schemaItem.options
      });
    });

    // 2. Extra inherited properties
    const extraTemplateProps = {
      ...(template?.defaultProperties || {}),
      ...(resource.templateProperties || {}),
      ...(resource.effectiveProperties || {})
    };

    Object.entries(extraTemplateProps).forEach(([key, val]) => {
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        const typeStr = inferPropertyType(val, key);
        const live = propertyValues[key] ?? val;

        result.push({
          id: `inherited-${key}`,
          key,
          label: key,
          type: typeStr,
          configuredValue: template?.defaultProperties?.[key] ?? val,
          liveValue: live,
          group: 'INHERITED',
          logToTelemetry: false,
          lastUpdated: lastUpdatedMap[key] || (resource.updatedAt ? new Date(resource.updatedAt) : null),
          isChanged: Boolean(changedMap[key]),
          isSecret: typeStr === 'SECRET'
        });
      }
    });

    return result;
  }, [resource, template, propertyValues, lastUpdatedMap, changedMap]);

  // Build unified Custom Properties list
  const customProperties: UnifiedPropertyItem[] = useMemo(() => {
    if (!resource?.customProperties) return [];
    return Object.entries(resource.customProperties).map(([key, val]) => {
      const typeStr = inferPropertyType(val, key);
      const live = propertyValues[key] ?? val;

      return {
        id: `custom-${key}`,
        key,
        label: key,
        type: typeStr,
        configuredValue: val,
        liveValue: live,
        group: 'CUSTOM',
        logToTelemetry: false,
        lastUpdated: lastUpdatedMap[key] || (resource.updatedAt ? new Date(resource.updatedAt) : null),
        isChanged: Boolean(changedMap[key]),
        isSecret: typeStr === 'SECRET'
      };
    });
  }, [resource?.customProperties, resource?.updatedAt, propertyValues, lastUpdatedMap, changedMap]);

  // Filter properties by search query
  const filteredInherited = useMemo(() => {
    if (!searchQuery.trim()) return inheritedProperties;
    const q = searchQuery.toLowerCase().trim();
    return inheritedProperties.filter(p => 
      p.key.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      String(p.liveValue ?? '').toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [inheritedProperties, searchQuery]);

  const filteredCustom = useMemo(() => {
    if (!searchQuery.trim()) return customProperties;
    const q = searchQuery.toLowerCase().trim();
    return customProperties.filter(p => 
      p.key.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      String(p.liveValue ?? '').toLowerCase().includes(q)
    );
  }, [customProperties, searchQuery]);

  return {
    template,
    isLoadingTemplate,
    isManualRefreshing,
    searchQuery,
    setSearchQuery,
    inheritedProperties: filteredInherited,
    totalInheritedCount: inheritedProperties.length,
    customProperties: filteredCustom,
    totalCustomCount: customProperties.length,
    handleManualRefresh
  };
}
