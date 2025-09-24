import { api as serviceApi, apiService } from './services/api';

/**
 * Legacy API interface for backward compatibility
 * Uses the new unified API service
 */
interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  token?: string;
}

/**
 * Legacy apiCall function for backward compatibility
 */
export async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const response = await apiService.request<T>(endpoint, {
    method,
    body,
    authToken: token
  });

  return response.data;
}

/**
 * Legacy API client for backward compatibility
 * Maps to the new unified API service
 */
export const apiClient = {
  request: async <T>(endpoint: string, options: any = {}): Promise<T> => {
    const response = await apiService.request<T>(endpoint, {
      ...options,
      authToken: options.authToken
    });
    return response.data;
  },

  get: async <T>(endpoint: string, options?: any): Promise<T> => {
    const response = await apiService.get<T>(endpoint, options);
    return response.data;
  },

  post: async <T>(endpoint: string, data?: any, options?: any): Promise<T> => {
    const response = await apiService.post<T>(endpoint, data, options);
    return response.data;
  },

  put: async <T>(endpoint: string, data?: any, options?: any): Promise<T> => {
    const response = await apiService.put<T>(endpoint, data, options);
    return response.data;
  },

  delete: async <T>(endpoint: string, options?: any): Promise<T> => {
    const response = await apiService.delete<T>(endpoint, options);
    return response.data;
  },

  patch: async <T>(endpoint: string, data?: any, options?: any): Promise<T> => {
    const response = await apiService.patch<T>(endpoint, data, options);
    return response.data;
  }
};

/**
 * Legacy API methods for backward compatibility
 * These wrap the new unified API service
 */
export const api = {
  // Tazkiyah
  suggestPlan: async (mode: 'takhliyah' | 'tahliyah', input: string, token?: string) => {
    if (token) {
      const original = apiService.request.bind(apiService);
      apiService.request = async (endpoint: string, config?: any) =>
        original(endpoint, { ...config, authToken: token });
      const result = await serviceApi.suggestPlan(mode, input);
      apiService.request = original;
      return result;
    }
    return serviceApi.suggestPlan(mode, input);
  },

  // Plans
  getActivePlans: async (token?: string) => {
    if (token) {
      const response = await apiService.get('plans/active', { authToken: token });
      return response.data;
    }
    return serviceApi.getActivePlans();
  },

  createPlan: async (plan: any, token?: string) => {
    if (token) {
      const response = await apiService.post('plans', { plan }, { authToken: token });
      return response.data;
    }
    return serviceApi.createPlan(plan);
  },

  // Habits
  toggleHabit: async (habitId: string, completed: boolean, token?: string) => {
    const endpoint = completed ? `habits/${habitId}/complete` : `habits/${habitId}/incomplete`;
    const response = await apiService.post(endpoint, {}, { authToken: token });
    return response.data;
  },

  getHabitAnalytics: async (habitId: string, token?: string) => {
    const response = await apiService.get(`habits/${habitId}/analytics`, { authToken: token });
    return response.data;
  },

  // Check-ins - Using latest functionality
  createCheckin: async (data: {
    mood?: number;
    intention?: string;
    reflection?: string;
    gratitude?: string[];
    improvements?: string;
    date?: string;
  }, token?: string) => {
    const response = await apiService.post('checkins', data, { authToken: token });
    return response.data;
  },

  getTodayCheckin: async (token: string) => {
    const response = await apiService.get('checkins/today', { authToken: token });
    return response.data;
  },

  getCheckins: async (token: string, params?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiService.get('checkins', { params, authToken: token });
    return response.data;
  },

  getCheckinStreak: async (token: string) => {
    const response = await apiService.get('checkins/streak', { authToken: token });
    return response.data;
  },

  // Content
  getContent: async (params?: { tags?: string; type?: string }) => {
    return serviceApi.getContent(params);
  },

  // Journal - Using latest functionality
  getJournalEntries: async (token: string, params?: {
    search?: string;
    tags?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'content';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const response = await apiService.get('journal', { params, authToken: token });
    return response.data;
  },

  getJournalEntry: async (id: string, token: string) => {
    const response = await apiService.get(`journal/${id}`, { authToken: token });
    return response.data;
  },

  createJournalEntry: async (data: { content: string; tags?: string[] }, token: string) => {
    const response = await apiService.post('journal', data, { authToken: token });
    return response.data;
  },

  updateJournalEntry: async (id: string, data: { content?: string; tags?: string[] }, token: string) => {
    const response = await apiService.put(`journal/${id}`, data, { authToken: token });
    return response.data;
  },

  deleteJournalEntry: async (id: string, token: string) => {
    const response = await apiService.delete(`journal/${id}`, { authToken: token });
    return response.data;
  },

  searchJournalEntries: async (token: string, params: {
    q: string;
    tags?: string;
    page?: number;
    limit?: number;
  }) => {
    // Use the main getJournalEntries with search parameter
    return api.getJournalEntries(token, {
      search: params.q,
      tags: params.tags,
      page: params.page,
      limit: params.limit
    });
  },
};

// Export the API service for new code
export { apiService } from './services/api';