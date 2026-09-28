export type ResourceCategory = 'PHYSICAL' | 'SOFTWARE' | 'VIRTUAL' | 'LOGICAL' | string;

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
  parametersSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  pathTemplate?: string;
  httpMethod?: string;
  type?: string;
  safetyTier?: string;
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
}
