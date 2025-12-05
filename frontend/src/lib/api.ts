const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private getTokenCallback: (() => string | null) | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // App.tsx에서 호출하여 토큰 getter 주입
  setTokenProvider(callback: () => string | null) {
    this.getTokenCallback = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // 1. react-oidc-context에서 ID 토큰 가져오기 시도
    let token: string | null = null;
    if (this.getTokenCallback) {
      token = this.getTokenCallback();
    }

    // 2. Fallback: localStorage (LOCAL 사용자)
    if (!token) {
      token = localStorage.getItem('token');
    }

    const headers: HeadersInit = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Backend returns error in different formats
        // Priority: errorData.message > errorData.data?.message > errorData.error?.message
        const errorMessage =
          errorData.message ||
          errorData.data?.message ||
          errorData.error?.message ||
          `HTTP error! status: ${response.status}`;
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.response = errorData;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
