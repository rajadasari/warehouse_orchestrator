export type ProtocolType = 
  | 'OPC_UA'
  | 'MODBUS_TCP'
  | 'SIEMENS_S7'
  | 'MQTT_SPARKPLUG'
  | 'REST_HTTP'
  | (string & {});

export interface ProtocolDefinition {
  id: ProtocolType;
  name: string;
  category: 'INDUSTRIAL_PLC' | 'FIELDBUS' | 'IOT_MESSAGING' | 'SOFTWARE_API';
  description: string;
  isAvailable: boolean;
  defaultPort: number;
  defaultScheme: string;
}

export const PROTOCOL_CATALOG: ProtocolDefinition[] = [
  {
    id: 'OPC_UA',
    name: 'OPC UA (IEC 62541)',
    category: 'INDUSTRIAL_PLC',
    description: 'Standard open industrial automation protocol with native encryption and session watchdog.',
    isAvailable: true,
    defaultPort: 4840,
    defaultScheme: 'opc.tcp'
  },
  {
    id: 'MODBUS_TCP',
    name: 'Modbus TCP',
    category: 'FIELDBUS',
    description: 'Universal industrial fieldbus for legacy PLCs, power meters, sensors, and remote IO racks.',
    isAvailable: false,
    defaultPort: 502,
    defaultScheme: 'modbus.tcp'
  },
  {
    id: 'SIEMENS_S7',
    name: 'Siemens S7 Protocol',
    category: 'INDUSTRIAL_PLC',
    description: 'Direct ISO-on-TCP (RFC1006) protocol for Siemens S7-300, S7-400, S7-1200, and S7-1500 controllers.',
    isAvailable: false,
    defaultPort: 102,
    defaultScheme: 's7'
  },
  {
    id: 'MQTT_SPARKPLUG',
    name: 'MQTT Sparkplug B',
    category: 'IOT_MESSAGING',
    description: 'Lightweight publish/subscribe edge protocol with stateful node birth and death certificates.',
    isAvailable: false,
    defaultPort: 1883,
    defaultScheme: 'mqtt'
  },
  {
    id: 'REST_HTTP',
    name: 'REST / HTTP Gateway',
    category: 'SOFTWARE_API',
    description: 'Direct JSON HTTP webhook and API dispatcher for modern smart devices and microservices.',
    isAvailable: true,
    defaultPort: 8080,
    defaultScheme: 'http'
  }
];

export type DeviceChannelStatus = 'ONLINE' | 'STANDBY' | 'FAULT' | 'DISCONNECTED';

export interface NetworkDeviceChannel {
  id: string;
  channelCode?: string;
  name: string;
  deviceType: string;
  protocol: ProtocolType;
  endpointUrl: string;
  status: DeviceChannelStatus;
  securityPolicy: string;
  authType: string;
  tagsCount: number;
  latencyMs: number;
  lastActive: string;
  reconnectIntervalMs: number;
  sessionTimeoutMs: number;
  config: Record<string, unknown>;
}

export type AcquisitionMethod = 'SUBSCRIPTION' | 'POLLED_READ' | 'HISTORICAL_ACCESS' | 'PUBSUB_BROKER';

export interface DeviceTag {
  id: string;
  name: string;
  nodeId: string;
  folder: string;
  dataType: 'Boolean' | 'Int16' | 'Int32' | 'Float' | 'Double' | 'String';
  quality: 'GOOD (0x00000000)' | 'BAD (0x80000000)' | 'BAD (0x80050000 - Bad_CommunicationFailure)' | 'UNCERTAIN' | (string & {});
  value: unknown;
  timestamp: string;
  subscribed: boolean;
  writable: boolean;
  isMonitored?: boolean;
  acquisitionMethod?: AcquisitionMethod;
  samplingIntervalMs?: number;
  publishingIntervalMs?: number;
  deadbandValue?: number;
  isLoggingEnabled?: boolean;
}

export interface SessionDiagnosticsData {
  channelId: string;
  channelName: string;
  status: DeviceChannelStatus;
  uptime: string;
  tcpSocketOpen: boolean;
  tlsCertificateExchanged: boolean;
  secureChannelCreated: boolean;
  sessionActivated: boolean;
  avgLatencyMs: number;
  missedKeepalives: number;
  maxMissedAllowed: number;
  monitoredItemsCount: number;
  bytesIn: string;
  bytesOut: string;
  publishingIntervalMs: number;
}

// --- Functional Support Types ---

export type RuleTopology =
  | 'SINGLE_READ_SINGLE_WRITE'
  | 'SINGLE_READ_MULTI_WRITE'
  | 'MULTI_READ_MULTI_WRITE'
  | 'MULTI_READ_SINGLE_WRITE';

export type ComparisonOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'REGEX_MATCH';

export type ThresholdDataType = 'STRING' | 'BOOLEAN' | 'INTEGER' | 'LONG' | 'DOUBLE' | 'FLOAT';

export interface FunctionalRuleCondition {
  id?: string;
  sourceNodeId: string;
  operator: ComparisonOperator;
  thresholdValue: string;
  thresholdDataType: ThresholdDataType;
}

export interface FunctionalRuleAction {
  id?: string;
  targetNodeId: string;
  writeValue: string;
  writeDataType: ThresholdDataType;
}

export interface FunctionalRule {
  id: string;
  channelId: string;
  ruleName: string;
  topology: RuleTopology;
  isReactive: boolean;
  executionMode?: 'CONTINUOUS' | 'ONE_SHOT';
  isEnabled: boolean;
  description?: string;
  lastExecutedAt?: string;
  lastExecutionStatus?: string;
  createdAt?: string;
  conditions: FunctionalRuleCondition[];
  actions: FunctionalRuleAction[];
}

export interface ConditionEvalResult {
  sourceNodeId: string;
  actualValue: unknown;
  operator: string;
  threshold: unknown;
  passed: boolean;
}

export interface FunctionalRuleExecutionResult {
  ruleId: string;
  allConditionsPassed: boolean;
  executed: boolean;
  durationMs: number;
  errorMessage?: string;
  conditionResults: ConditionEvalResult[];
  writeResults: Record<string, boolean>;
}
