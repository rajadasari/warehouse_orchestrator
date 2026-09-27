/**
 * Frontend service for wes.api_integration_mapping CRUD operations.
 * Delegates to DynamicMappingController at /api/v1/wes/mappings.
 */

export interface ApiIntegrationMapping {
  id?: string;
  mappingCode: string;
  name: string;
  description?: string;
  operationType: string;
  targetResourceId: string;
  httpMethod: string;
  endpointUrl: string;
  headersTemplate: string;
  payloadTemplate: string;
  conditionRules: string;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
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
      // use status text
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

/** Fetch all mappings, optionally filtered by resourceId or operationType. */
export async function fetchMappingsApi(
  resourceId?: string,
  operationType?: string,
): Promise<ApiIntegrationMapping[]> {
  const params = new URLSearchParams();
  if (resourceId) params.set('resourceId', resourceId);
  if (operationType) params.set('operationType', operationType);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}${query}`);
  return handleResponse<ApiIntegrationMapping[]>(res);
}

/** Get a single mapping by UUID. */
export async function fetchMappingByIdApi(id: string): Promise<ApiIntegrationMapping> {
  const res = await fetch(`${BASE_URL}/${id}`);
  return handleResponse<ApiIntegrationMapping>(res);
}

/** Create a new mapping record. */
export async function createMappingApi(
  mapping: Omit<ApiIntegrationMapping, 'id' | 'version' | 'createdAt' | 'updatedAt'>,
): Promise<ApiIntegrationMapping> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  });
  return handleResponse<ApiIntegrationMapping>(res);
}

/** Update an existing mapping by UUID. */
export async function updateMappingApi(
  id: string,
  mapping: Partial<ApiIntegrationMapping>,
): Promise<ApiIntegrationMapping> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  });
  return handleResponse<ApiIntegrationMapping>(res);
}

/** Delete a mapping by UUID. */
export async function deleteMappingApi(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete mapping: HTTP ${res.status}`);
  }
}

/** Preview resolved payload (dry-run, no dispatch). */
export async function previewMappingApi(request: {
  resourceId: string;
  endpointUrl: string;
  payloadTemplate: string;
  testContext?: Record<string, unknown>;
}): Promise<{ resolvedUrl: string; resolvedPayload: string }> {
  const res = await fetch(`${BASE_URL}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(res);
}

/** Execute a test-run dispatch against target endpoint. */
export async function testRunMappingApi(request: {
  resourceId: string;
  httpMethod: string;
  endpointUrl: string;
  headersTemplate: string;
  payloadTemplate: string;
  testContext?: Record<string, unknown>;
}): Promise<{
  success: boolean;
  statusCode: number;
  targetUrl: string;
  requestPayload: string;
  responsePayload: string;
  error?: string;
}> {
  const res = await fetch(`${BASE_URL}/test-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(res);
}
