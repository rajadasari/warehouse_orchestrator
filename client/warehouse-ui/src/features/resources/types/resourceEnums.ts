export type ResourceCategory = 'GENERAL' | 'PHYSICAL' | 'OT_DEVICE' | 'SOFTWARE' | 'VIRTUAL' | 'LOGICAL' | string;

export type CommunicationMethod = 
  | 'OPC_UA'
  | 'PLC_S7'
  | 'MODBUS_TCP'
  | 'SERIAL'
  | 'MQTT/VDA5050'
  | 'REST'
  | 'INTERNAL'
  | string;

export type CommunicationProtocol = CommunicationMethod;

export type ResourceType = 
  | 'CONVEYOR'
  | 'AGV'
  | 'PLC'
  | 'ROBOT'
  | 'SCANNER'
  | 'BIN_LOCATION'
  | 'SOFTWARE_ADAPTER'
  | (string & {});

export type AuthenticationMethod = 
  | 'OAUTH2_BEARER' 
  | 'API_KEY' 
  | 'BASIC_AUTH' 
  | 'NONE';

export type ResourceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface MethodDefinition {
  name: string;
  displayName?: string;
  category?: string;
  description?: string;
  snippetCode?: string;
  javaCode?: string;
  pythonCode?: string;
  script?: string;
  language?: 'JAVA' | 'PYTHON' | 'JAVASCRIPT';
  storeResultToProperty?: string;
  inputs?: Array<{ name: string; type: string; defaultValue?: string; description?: string }>;
  outputType?: string;
  parametersSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  pathTemplate?: string;
  httpMethod?: string;
  type?: string;
  safetyTier?: string;
}

export interface MethodTraceLog {
  timestamp: string;
  phase: string;
  message: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
}

export interface MethodExecutionResult {
  success: boolean;
  methodName: string;
  resourceId: string;
  message: string;
  statusCode?: number;
  executionTimeMs?: number;
  data?: unknown;
  error?: string;
  traceLogs?: MethodTraceLog[];
  updatedProperties?: Record<string, unknown>;
}
