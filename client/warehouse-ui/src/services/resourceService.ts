export interface ResourceItem {
  id: string;
  resourceId: string;
  name: string;
  description?: string;
  application?: string;
  protocol?: string;
  host?: string;
  port?: number;
  documentationUrl?: string;
  type: string; // 'REST_GENERIC' | 'SOFTWARE' | etc.
  category?: string; // 'SOFTWARE'
  templateCode?: string;
  status: string; // 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  ip?: string;
  templateProperties?: Record<string, unknown>;
  customProperties: Record<string, unknown>;
  effectiveProperties?: Record<string, unknown>;
  methodsConfig?: Record<string, unknown>;
  effectiveMethods?: Array<Record<string, unknown>>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateResourcePayload {
  resourceId: string;
  name: string;
  description?: string;
  application?: string;
  protocol?: string;
  host?: string;
  port?: number;
  documentationUrl?: string;
  type: string;
  category?: string;
  templateCode?: string;
  status?: string;
  ip?: string;
  templateProperties?: Record<string, unknown>;
  customProperties?: Record<string, unknown>;
  methodsConfig?: Record<string, unknown>;
}

const BASE_URL = '/api/v1/wes/resources';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.error) errorMsg = errJson.error;
    } catch {
      // use status text
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export async function fetchResourcesApi(type?: string, status?: string): Promise<ResourceItem[]> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (status) params.append('status', status);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}${query}`);
  return handleResponse<ResourceItem[]>(res);
}

export async function fetchResourceByIdApi(resourceId: string): Promise<ResourceItem> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}`);
  return handleResponse<ResourceItem>(res);
}

export async function fetchResourceIpApi(resourceId: string): Promise<{ resourceId: string; ip: string }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}/ip`);
  return handleResponse<{ resourceId: string; ip: string }>(res);
}

export async function createResourceApi(payload: CreateResourcePayload): Promise<ResourceItem> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ResourceItem>(res);
}

export async function updateResourceApi(resourceId: string, payload: CreateResourcePayload): Promise<ResourceItem> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ResourceItem>(res);
}

export async function deleteResourceApi(resourceId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}`, {
    method: 'DELETE'
  });
  return handleResponse<void>(res);
}

export interface WmsAuthStatus {
  hasToken: boolean;
  isValid: boolean;
  tokenPreview?: string;
  expiresAt?: string;
  lastAcquiredAt?: string;
  targetBaseUrl?: string;
  authEndpoint?: string;
  headerFormat?: string;
  isSimulated?: boolean;
  lastError?: string;
  lastStatusCode?: number;
  resourceId?: string;
}

export interface TestAuthConnectionPayload {
  resourceId?: string;
  baseUrl?: string;
  tokenPath?: string;
  tokenField?: string;
  authMethod?: string;
  authPayload?: Record<string, unknown>;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

export async function testAuthConnectionApi(payload: TestAuthConnectionPayload): Promise<{
  success: boolean;
  token?: string;
  status?: WmsAuthStatus;
  message: string;
  error?: string;
}> {
  const res = await fetch('/api/v1/wes/wms/auth/test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<{ success: boolean; token?: string; status?: WmsAuthStatus; message: string; error?: string }>(res);
}

export async function testWmsAuthApi(resourceId?: string): Promise<{ success: boolean; token?: string; status?: WmsAuthStatus; message: string; error?: string }> {
  const url = resourceId 
    ? `/api/v1/wes/wms/auth/token?resourceId=${encodeURIComponent(resourceId)}` 
    : '/api/v1/wes/wms/auth/token';
  const res = await fetch(url, { method: 'POST' });
  return handleResponse<{ success: boolean; token?: string; status?: WmsAuthStatus; message: string; error?: string }>(res);
}

export async function authorizeResourceApi(resourceId: string): Promise<{ success: boolean; token?: string; status?: WmsAuthStatus; message?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}/authorize`, { method: 'POST' });
  return handleResponse<{ success: boolean; token?: string; status?: WmsAuthStatus; message?: string; error?: string }>(res);
}

export async function getResourceTokenStatusApi(resourceId: string): Promise<WmsAuthStatus> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}/token-status`);
  return handleResponse<WmsAuthStatus>(res);
}

export async function executeResourceMethodApi(
  resourceId: string,
  methodName: string,
  parameters?: Record<string, unknown>
): Promise<{
  success: boolean;
  methodName: string;
  resourceId: string;
  message: string;
  statusCode?: number;
  executionTimeMs?: number;
  data?: unknown;
  error?: string;
}> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(resourceId)}/methods/${encodeURIComponent(methodName)}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parameters || {})
  });
  return handleResponse(res);
}

export const resourceService = {
  getResources: fetchResourcesApi,
  getResourceById: fetchResourceByIdApi,
  getResourceIp: fetchResourceIpApi,
  createResource: createResourceApi,
  updateResource: updateResourceApi,
  deleteResource: deleteResourceApi,
  testWmsAuth: testWmsAuthApi,
  testAuthConnection: testAuthConnectionApi,
  authorizeResource: authorizeResourceApi,
  getResourceTokenStatus: getResourceTokenStatusApi,
  executeResourceMethod: executeResourceMethodApi
};


