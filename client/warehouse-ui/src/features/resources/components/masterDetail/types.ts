export type PropertyGroupType = 'INHERITED' | 'CUSTOM';

export interface UnifiedPropertyItem {
  id: string;
  key: string;
  label: string;
  description?: string;
  type: string;
  required?: boolean;
  configuredValue: unknown;
  liveValue: unknown;
  unit?: string;
  group: PropertyGroupType;
  logToTelemetry?: boolean;
  updateCycle?: string;
  lastUpdated: Date | null;
  isChanged: boolean;
  isSecret?: boolean;
  options?: string[];
}

export type ResourceCategoryTab = 'ALL' | 'SOFTWARE' | 'PLC' | 'DEVICES' | 'HARDWARE';
