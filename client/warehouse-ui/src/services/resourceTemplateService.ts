export interface PropertySchemaItem {
  key: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ENUM' | 'ARRAY';
  required?: boolean;
  defaultValue?: unknown;
  unit?: string;
  options?: string[];
  description?: string;
}

export interface ResourceTemplateItem {
  id?: string;
  templateCode: string;
  templateName: string;
  category: 'HARDWARE' | 'DEVICE' | 'SOFTWARE';
  resourceType: string;
  communicationProtocol: string;
  propertySchema: PropertySchemaItem[];
  defaultProperties: Record<string, unknown>;
  supportedCommands: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const BASE_URL = '/api/v1/wes/resource-templates';

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

export async function fetchResourceTemplatesApi(category?: string): Promise<ResourceTemplateItem[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`${BASE_URL}${query}`);
  return handleResponse<ResourceTemplateItem[]>(res);
}

export async function fetchResourceTemplateByCodeApi(templateCode: string): Promise<ResourceTemplateItem> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(templateCode)}`);
  return handleResponse<ResourceTemplateItem>(res);
}

export async function createResourceTemplateApi(payload: ResourceTemplateItem): Promise<ResourceTemplateItem> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ResourceTemplateItem>(res);
}

export async function updateResourceTemplateApi(templateCode: string, payload: ResourceTemplateItem): Promise<ResourceTemplateItem> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(templateCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ResourceTemplateItem>(res);
}

export async function deleteResourceTemplateApi(templateCode: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(templateCode)}`, {
    method: 'DELETE'
  });
  return handleResponse<void>(res);
}
