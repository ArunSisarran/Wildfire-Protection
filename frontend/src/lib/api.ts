// API client for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.detail || 'An error occurred',
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async health(): Promise<ApiResponse<{ status: string }>> {
    return this.get('/health');
  }

  async hello(name: string = 'world'): Promise<ApiResponse<{ message: string }>> {
    return this.get(`/api/hello?name=${encodeURIComponent(name)}`);
  }

  // LLM Chat endpoints
  async chat(data: {
    message: string;
    session_id?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
    };
  }): Promise<ApiResponse<{
    response: string;
    session_id: string;
    location_used: {
      latitude: number;
      longitude: number;
      name: string;
    };
    fire_risk_data?: unknown;
    sources: string[];
  }>> {
    return this.post('/api/llm/chat', data);
  }

  async getChatHistory(sessionId: string): Promise<ApiResponse<{
    session_id: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
  }>> {
    return this.get(`/api/llm/sessions/${sessionId}/history`);
  }

  async clearChatSession(sessionId: string): Promise<ApiResponse<{
    message: string;
  }>> {
    return this.request(`/api/llm/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async getDefaultLocation(): Promise<ApiResponse<{
    location: {
      latitude: number;
      longitude: number;
      name: string;
    };
    fire_risk_assessment: unknown;
  }>> {
    return this.get('/api/llm/location/default');
  }

  async getLocationRiskAssessment(location: {
    latitude: number;
    longitude: number;
    name?: string;
  }): Promise<ApiResponse<{
    location: {
      latitude: number;
      longitude: number;
      name?: string;
    };
    fire_risk_assessment: unknown;
    timestamp: string;
  }>> {
    return this.post('/api/llm/location/risk-assessment', location);
  }
}

export const apiClient = new ApiClient();
