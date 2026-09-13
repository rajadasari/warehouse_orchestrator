export interface ApiIntegrationMappingItem {
  id: string;
  mappingCode: string;
  name: string;
  description?: string;
  operationType: string; // 'PRE_ANNOUNCE' | 'CREATE_ORDER' | 'RESERVE_ORDER' | 'OUTBOUND_RELEASE' | 'CUSTOM'
  targetResourceId: string;
  httpMethod: string; // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpointUrl: string;
  headersTemplate: string | Record<string, any>;
  payloadTemplate: string | Record<string, any>;
  conditionRules: string | any[];
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldDictionaryItem {
  field: string;
  description: string;
}

export interface SchemaDictionary {
  pallet: FieldDictionaryItem[];
  resource: FieldDictionaryItem[];
  auth?: FieldDictionaryItem[];
  item: FieldDictionaryItem[];
  functions: FieldDictionaryItem[];
  [key: string]: FieldDictionaryItem[] | undefined;
}

export interface PreviewPayloadRequest {
  resourceId?: string;
  endpointUrl?: string;
  payloadTemplate: string;
  testContext?: Record<string, any>;
  palletLpn?: string;
}

export interface PreviewPayloadResponse {
  success: boolean;
  resolvedUrl?: string;
  resolvedPayload: string;
  sampleContext: Record<string, any>;
}

export interface TestRunRequest {
  resourceId?: string;
  httpMethod: string;
  endpointUrl: string;
  headersTemplate: string;
  payloadTemplate: string;
  testContext?: Record<string, any>;
  palletLpn?: string;
}

export interface TestRunResponse {
  success: boolean;
  targetUrl: string;
  requestPayload: string;
  statusCode: number;
  responsePayload: string;
  error?: string;
}

const BASE_URL = '/api/v1/wes/mappings';

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

export const dynamicMappingService = {
  getMappings: async (resourceId?: string, operationType?: string): Promise<ApiIntegrationMappingItem[]> => {
    const params = new URLSearchParams();
    if (resourceId) params.append('resourceId', resourceId);
    if (operationType) params.append('operationType', operationType);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}${query}`);
    return handleResponse<ApiIntegrationMappingItem[]>(res);
  },

  getMappingById: async (id: string): Promise<ApiIntegrationMappingItem> => {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`);
    return handleResponse<ApiIntegrationMappingItem>(res);
  },

  createMapping: async (payload: Partial<ApiIntegrationMappingItem>): Promise<ApiIntegrationMappingItem> => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<ApiIntegrationMappingItem>(res);
  },

  updateMapping: async (id: string, payload: Partial<ApiIntegrationMappingItem>): Promise<ApiIntegrationMappingItem> => {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<ApiIntegrationMappingItem>(res);
  },

  deleteMapping: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(res);
  },

  getFieldDictionary: async (): Promise<SchemaDictionary> => {
    const res = await fetch(`${BASE_URL}/dictionary`);
    return handleResponse<SchemaDictionary>(res);
  },

  previewPayload: async (request: PreviewPayloadRequest): Promise<PreviewPayloadResponse> => {
    const res = await fetch(`${BASE_URL}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return handleResponse<PreviewPayloadResponse>(res);
  },

  testRun: async (request: TestRunRequest): Promise<TestRunResponse> => {
    const res = await fetch(`${BASE_URL}/test-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return handleResponse<TestRunResponse>(res);
  }
};
