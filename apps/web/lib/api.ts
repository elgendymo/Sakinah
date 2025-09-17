import { apiClient } from './net/apiFetch.client';

// Re-export the enhanced API client for backward compatibility
export { apiClient };

/**
 * Legacy API interface for backward compatibility
 * Uses the new enhanced API client under the hood
 */
interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  token?: string;
}

export async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  return apiClient.request<T>(endpoint, {
    method,
    body,
    authToken: token
  });
}

export const api = {
  // Tazkiyah
  suggestPlan: (mode: 'takhliyah' | 'tahliyah', input: string, token: string) =>
    apiCall('/tazkiyah/suggest', {
      method: 'POST',
      body: { mode, input },
      token,
    }),

  // Plans
  getActivePlans: (token: string) =>
    apiCall('/plans/active', { token }),

  createPlan: (plan: any, token: string) =>
    apiCall('/plans', {
      method: 'POST',
      body: { plan },
      token,
    }),

  // Habits
  toggleHabit: (habitId: string, completed: boolean, token: string) =>
    apiCall(`/habits/${habitId}/toggle`, {
      method: 'POST',
      body: { completed },
      token,
    }),

  // Check-ins
  createCheckin: (data: any, token: string) =>
    apiCall('/checkins', {
      method: 'POST',
      body: data,
      token,
    }),

  // Content
  getContent: (params?: { tags?: string; type?: string }) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/content${query ? `?${query}` : ''}`);
  },

  // Journal
  getJournalEntries: (token: string, search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiCall(`/journals${query}`, { token });
  },

  createJournalEntry: (data: { content: string; tags?: string[] }, token: string) =>
    apiCall('/journals', {
      method: 'POST',
      body: data,
      token,
    }),

  deleteJournalEntry: (id: string, token: string) =>
    apiCall(`/journals/${id}`, {
      method: 'DELETE',
      token,
    }),
};