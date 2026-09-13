export type RelationCategory = 'MATERIAL_FLOW' | 'INFORMATION_FLOW';

export type RelationType = 
  | 'TRANSFERS_TO' 
  | 'DATA_SOURCE_FOR' 
  | 'CONTROLS' 
  | 'ATTACHED_TO' 
  | 'SERVICED_BY';

export interface ResourceRelationshipItem {
  id: string;
  sourceResourceId: string;
  targetResourceId: string;
  relationCategory: RelationCategory;
  relationType: RelationType;
  properties: Record<string, unknown>;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRelationshipPayload {
  sourceResourceId: string;
  targetResourceId: string;
  relationCategory: RelationCategory;
  relationType: RelationType;
  properties?: Record<string, unknown>;
  active?: boolean;
}

const BASE_URL = '/api/v1/wes/resource-relationships';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.error) errorMsg = errJson.error;
    } catch {
      // fallback to status text
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export async function fetchResourceRelationshipsApi(category?: string): Promise<ResourceRelationshipItem[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`${BASE_URL}${query}`);
  return handleResponse<ResourceRelationshipItem[]>(res);
}

export async function fetchRelationshipsForResourceApi(resourceId: string): Promise<ResourceRelationshipItem[]> {
  const res = await fetch(`${BASE_URL}/resource/${encodeURIComponent(resourceId)}`);
  return handleResponse<ResourceRelationshipItem[]>(res);
}

export async function createResourceRelationshipApi(payload: CreateRelationshipPayload): Promise<ResourceRelationshipItem> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ResourceRelationshipItem>(res);
}

export async function deleteResourceRelationshipApi(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse<void>(res);
}

export async function fetchDownstreamTargetsApi(sourceResourceId: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/downstream/${encodeURIComponent(sourceResourceId)}`);
  return handleResponse<string[]>(res);
}

export async function fetchAssociatedDataSourcesApi(targetResourceId: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/data-sources/${encodeURIComponent(targetResourceId)}`);
  return handleResponse<string[]>(res);
}

export const resourceRelationshipService = {
  getRelationships: fetchResourceRelationshipsApi,
  getRelationshipsForResource: fetchRelationshipsForResourceApi,
  createRelationship: createResourceRelationshipApi,
  deleteRelationship: deleteResourceRelationshipApi,
  getDownstreamTargets: fetchDownstreamTargetsApi,
  getAssociatedDataSources: fetchAssociatedDataSourcesApi
};
