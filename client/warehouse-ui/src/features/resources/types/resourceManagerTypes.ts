import { MethodDefinition } from './resourceEnums';

export type PropertyType =
  | 'STRING'
  | 'INTEGER'
  | 'LONG'
  | 'DOUBLE'
  | 'BOOLEAN'
  | 'DATETIME'
  | 'SECRET'
  | 'ENUM'
  | 'ARRAY'
  | 'MAP'
  | 'BYTE_ARRAY'
  | 'LOCATION';

export interface PropertyDefinition {
  key: string;
  label: string;
  type: PropertyType;
  required?: boolean;
  defaultValue?: unknown;
  unit?: string;
  options?: string[];
  description?: string;
  useForAuth?: boolean;
}

export interface ResourceShapeItem {
  shapeCode: string;
  shapeName: string;
  description?: string;
  defaultProperties?: Record<string, unknown>;
  properties: PropertyDefinition[];
  methods: MethodDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

export type PredicateType = 'NUMERIC_LT' | 'NUMERIC_LTE' | 'NUMERIC_GT' | 'NUMERIC_GTE' | 'NUMERIC_EQ' | 'REGEX_MATCH' | 'EXACT_MATCH';

export interface RuleSubscriptionItem {
  subscriptionId: string;
  targetResourceId?: string;
  propertyName: string;
  predicateType: PredicateType;
  thresholdOrPattern: string;
  actionType: 'STATE_TRIGGER' | 'METHOD_INVOCATION' | 'ALERT_EVENT';
  actionTarget: string;
  active: boolean;
  createdAt?: string;
}

export type DataCollectionType =
  | 'ON_CHANGE'
  | 'PERIODIC_POLL'
  | 'DEADBAND_ABSOLUTE'
  | 'DEADBAND_PERCENT'
  | 'SAMPLE_WINDOW'
  | 'HYBRID_HEARTBEAT';

export interface PropertyTelemetryPolicyItem {
  propertyName: string;
  enabled: boolean;
  collectionType: DataCollectionType;
  intervalMs?: number;
  deadbandThreshold?: number;
  heartbeatSeconds?: number;
}

export interface TelemetryDataPointItem {
  resourceId: string;
  metricName: string;
  value: number;
  collectionType: DataCollectionType;
  timestamp: string;
  tags?: Record<string, string>;
}
