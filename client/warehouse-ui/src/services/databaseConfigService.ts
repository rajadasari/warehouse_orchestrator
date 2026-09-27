export interface CurrentDatabaseConfig {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  currentSchema: string;
  sslMode: string;
  maxPoolSize: number;
  minIdle: number;
  jdbcUrl: string;
  isConnected: boolean;
  responseTimeMs: number;
  serverVersion: string;
  driverVersion: string;
}

export interface TestConnectionRequest {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password?: string;
  currentSchema?: string;
  sslMode?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  responseTimeMs: number;
  serverVersion?: string;
  currentDatabase?: string;
  currentUser?: string;
  platformTableCount?: number;
  existingSchemas?: string[];
  message: string;
  errorDetails?: string;
}

export interface UpdateDatabaseConfigRequest {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password?: string;
  currentSchema?: string;
  sslMode?: string;
  maxPoolSize?: number;
  minIdle?: number;
}

export interface UpdateDatabaseConfigResponse {
  success: boolean;
  message: string;
  targetConfigFile?: string;
  requiresRestart: boolean;
}

const BASE_URL = '/api/v1/wes/config/database';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.error) errorMsg = errJson.error;
    } catch {
      // status text fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const databaseConfigService = {
  async getCurrentConfig(): Promise<CurrentDatabaseConfig> {
    const res = await fetch(BASE_URL);
    return handleResponse<CurrentDatabaseConfig>(res);
  },

  async testConnection(req: TestConnectionRequest): Promise<TestConnectionResponse> {
    const payload = {
      ...req,
      password: (req.password && req.password.trim().length > 0) ? req.password : 'warehouse_test123'
    };

    const res = await fetch(`${BASE_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await handleResponse<TestConnectionResponse>(res);

    // If localhost was refused on Windows, automatically fallback to IPv6 [::1]
    if (!data.success && (req.host === 'localhost' || req.host === '127.0.0.1')) {
      try {
        const retryRes = await fetch(`${BASE_URL}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, host: '[::1]' })
        });
        const retryData = await handleResponse<TestConnectionResponse>(retryRes);
        if (retryData.success) {
          return {
            ...retryData,
            message: `${retryData.message} (Auto-resolved to IPv6 [::1])`
          };
        }
      } catch {
        // Return original data if retry fails
      }
    }

    return data;
  },

  async updateConfig(req: UpdateDatabaseConfigRequest): Promise<UpdateDatabaseConfigResponse> {
    const payload = {
      ...req,
      password: (req.password && req.password.trim().length > 0) ? req.password : 'warehouse_test123'
    };

    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await handleResponse<UpdateDatabaseConfigResponse>(res);

    if (!data.success && (req.host === 'localhost' || req.host === '127.0.0.1')) {
      try {
        const retryRes = await fetch(BASE_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, host: '[::1]' })
        });
        const retryData = await handleResponse<UpdateDatabaseConfigResponse>(retryRes);
        if (retryData.success) {
          return retryData;
        }
      } catch {
        // Return original data
      }
    }

    return data;
  }
};
