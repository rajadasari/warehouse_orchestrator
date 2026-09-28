export interface SystemSnippetDto {
  id: string;
  name: string;
  category: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface SnippetSimulationRequest {
  resourceId?: string;
  methodId?: string;
  resourceProperties?: Record<string, unknown>;
  inputParameters?: Record<string, unknown>;
}

export interface SnippetSimulationResponse {
  success: boolean;
  snippetId: string;
  statusCode: number;
  message: string;
  data: Record<string, unknown>;
  timestamp: string;
  executionDurationMs: number;
}

const API_BASE = '/api/v1/snippets';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const snippetService = {
  async getSnippets(category?: string): Promise<SystemSnippetDto[]> {
    const url = category ? `${API_BASE}?category=${encodeURIComponent(category)}` : API_BASE;
    const res = await fetch(url);
    return handleResponse<SystemSnippetDto[]>(res);
  },

  async getSnippet(snippetId: string): Promise<SystemSnippetDto> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(snippetId)}`);
    return handleResponse<SystemSnippetDto>(res);
  },

  async simulateSnippet(snippetId: string, req: SnippetSimulationRequest): Promise<SnippetSimulationResponse> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(snippetId)}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse<SnippetSimulationResponse>(res);
  }
};
