import { MethodDefinition } from '../features/resources/types/resourceEnums';

export type IndustrialPropertyType =
  | 'STRING'
  | 'INTEGER'
  | 'LONG'
  | 'DOUBLE'
  | 'BOOLEAN'
  | 'DATETIME'
  | 'SECRET'
  | 'ENUM'
  | 'LOCATION'
  | 'MAP'
  | 'ARRAY'
  | 'BYTE_ARRAY';

export interface PropertySchemaItem {
  key: string;
  label: string;
  type: IndustrialPropertyType | string;
  required?: boolean;
  defaultValue?: unknown;
  unit?: string;
  options?: string[];
  description?: string;
  isBaseProperty?: boolean;
  tags?: string[];
  logToTelemetry?: boolean;
}

export interface ResourceTemplateItem {
  id?: string;
  templateCode: string;
  templateName: string;
  description?: string;
  documentationUrl?: string;
  category: 'PHYSICAL' | 'SOFTWARE' | 'VIRTUAL' | 'LOGICAL' | string;
  resourceType: string;
  communicationProtocol: string;
  communicationMethod?: string;
  application?: string;
  defaultProtocol?: string;
  defaultHost?: string;
  defaultPort?: number;
  propertySchema: PropertySchemaItem[];
  defaultProperties: Record<string, unknown>;
  supportedCommands?: string[];
  methodsSchema?: MethodDefinition[];
  active: boolean;
  systemTemplate?: boolean;
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

export interface TemplatePackageItem {
  schemaVersion?: string;
  environment?: string;
  exportedBy?: string;
  exportedAt?: string;
  templates: ResourceTemplateItem[];
}

export async function exportTemplatePackageApi(templateCode?: string): Promise<TemplatePackageItem> {
  const path = templateCode ? `${BASE_URL}/${encodeURIComponent(templateCode)}/export` : `${BASE_URL}/export-all`;
  const res = await fetch(path);
  return handleResponse<TemplatePackageItem>(res);
}

export async function importTemplatePackageApi(pkg: TemplatePackageItem, overwrite = true): Promise<ResourceTemplateItem[]> {
  const res = await fetch(`${BASE_URL}/import?overwrite=${overwrite}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pkg)
  });
  return handleResponse<ResourceTemplateItem[]>(res);
}
