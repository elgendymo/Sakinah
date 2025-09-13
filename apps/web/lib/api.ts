const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

export async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
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
};