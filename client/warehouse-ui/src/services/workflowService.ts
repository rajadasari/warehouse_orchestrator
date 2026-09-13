export type WorkflowNodeType = 
  | 'TRIGGER' 
  | 'VALIDATION' 
  | 'API_MAPPER' 
  | 'ASYNC_GATE' 
  | 'STATE_MUTATION' 
  | 'MATH_OPERATION'
  | 'DECISION' 
  | 'TERMINATOR';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  position?: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowCanvasGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowDefinitionItem {
  id?: string;
  workflowCode: string;
  name: string;
  description?: string;
  category: string;
  canvasGraph: WorkflowCanvasGraph;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowInstanceItem {
  id: string;
  workflowCode: string;
  entityReference?: string;
  status: 'RUNNING' | 'WAITING_CALLBACK' | 'COMPLETED' | 'FAILED';
  currentNodeId?: string;
  correlationKey?: string;
  contextData: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionLogItem {
  id: string;
  instanceId: string;
  stepSequence: number;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  nodeLabel?: string;
  status: 'SUCCESS' | 'PAUSED_WAITING' | 'FAILED' | string;
  durationMs: number;
  inputData?: Record<string, unknown>;
  nodeConfig?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorDetails?: string;
  errorMessage?: string;
  executedAt: string;
}

export interface TriggerWorkflowRequest {
  workflowCode: string;
  entityReference?: string;
  initialContext: Record<string, unknown>;
}

const BASE_URL = '/api/v1/wes/workflows';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.error) errorMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const workflowService = {
  getAllDefinitions: async (): Promise<WorkflowDefinitionItem[]> => {
    const res = await fetch(`${BASE_URL}/definitions`);
    return handleResponse<WorkflowDefinitionItem[]>(res);
  },

  getDefinitionByCode: async (code: string): Promise<WorkflowDefinitionItem> => {
    const res = await fetch(`${BASE_URL}/definitions/${encodeURIComponent(code)}`);
    return handleResponse<WorkflowDefinitionItem>(res);
  },

  saveDefinition: async (definition: WorkflowDefinitionItem): Promise<WorkflowDefinitionItem> => {
    const res = await fetch(`${BASE_URL}/definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(definition)
    });
    return handleResponse<WorkflowDefinitionItem>(res);
  },

  deleteDefinition: async (code: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/definitions/${encodeURIComponent(code)}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(res);
  },

  triggerWorkflow: async (req: TriggerWorkflowRequest): Promise<WorkflowInstanceItem> => {
    const res = await fetch(`${BASE_URL}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse<WorkflowInstanceItem>(res);
  },

  resumeCallback: async (correlationKey: string, payload: Record<string, unknown>): Promise<WorkflowInstanceItem> => {
    const res = await fetch(`${BASE_URL}/callbacks/${encodeURIComponent(correlationKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<WorkflowInstanceItem>(res);
  },

  getInstances: async (workflowCode?: string): Promise<WorkflowInstanceItem[]> => {
    const query = workflowCode ? `?workflowCode=${encodeURIComponent(workflowCode)}` : '';
    const res = await fetch(`${BASE_URL}/instances${query}`);
    return handleResponse<WorkflowInstanceItem[]>(res);
  },

  getInstanceLogs: async (instanceId: string): Promise<WorkflowExecutionLogItem[]> => {
    const res = await fetch(`${BASE_URL}/instances/${encodeURIComponent(instanceId)}/logs`);
    return handleResponse<WorkflowExecutionLogItem[]>(res);
  }
};
