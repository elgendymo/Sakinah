import { ApiService } from './ApiService';
import { InterceptorChain } from './interceptors';
import { TransformBuilder } from './transformers';
import { createCacheService } from '../cache/CacheService';

/**
 * Create the default API service instance for Sakinah
 */
function createApiService(): ApiService {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/';

  // Create cache service
  const cacheService = createCacheService();

  // No versioning - use direct endpoints with latest functionality

  // Create transformers
  const transformBuilder = TransformBuilder.createDefault();
  const requestTransformer = transformBuilder.buildRequestTransformer();
  const responseTransformer = transformBuilder.buildResponseTransformer();

  // Get auth token function (integrate with Supabase)
  const getAuthToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') {
      // Server-side: get from cookies or headers
      return null;
    }

    // Client-side: get from Supabase
    try {
      const { createBrowserClient } = await import('../../supabase-browser');
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  };

  // Create interceptor chain
  const interceptorChain = InterceptorChain.createDefault(
    getAuthToken,
    cacheService,
    process.env.NODE_ENV === 'development' ? console.log : undefined
  );

  // Create API service
  const apiService = new ApiService({
    baseUrl,
    defaultTimeout: 30000,
    defaultRetries: 3,
    cacheService,
    requestInterceptors: interceptorChain.getRequestInterceptors(),
    responseInterceptors: interceptorChain.getResponseInterceptors(),
    requestTransformer,
    responseTransformer
  });

  return apiService;
}

// Create singleton instance
export const apiService = createApiService();

/**
 * Type-safe API client methods
 */
export const api = {
  // Tazkiyah
  async suggestPlan(mode: 'takhliyah' | 'tahliyah', input: string, context?: {
    struggles?: string[];
    goals?: string[];
    preferences?: {
      difficultyLevel?: 'easy' | 'moderate' | 'challenging';
      timeCommitment?: 'low' | 'medium' | 'high';
      focusAreas?: string[];
    };
  }) {
    const response = await apiService.post('ai/suggest-plan', {
      mode,
      input,
      context
    });
    return response.data;
  },

  // Plans
  async getActivePlans() {
    const response = await apiService.get('plans/active', {
      cacheTTL: 600000, // 10 minutes - dashboard data
      skipCache: false
    });
    return response.data;
  },

  async createPlan(plan: {
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: Array<{
      title: string;
      schedule: string;
      target?: number;
    }>;
    duaIds?: string[];
    contentIds?: string[];
  }) {
    const response = await apiService.post('plans', plan);
    return response.data;
  },

  async getPlan(id: string) {
    const response = await apiService.get(`plans/${id}`);
    return response.data;
  },

  async activatePlan(id: string) {
    const response = await apiService.post(`plans/${id}/activate`, {});
    return response.data;
  },

  async deactivatePlan(id: string) {
    const response = await apiService.post(`plans/${id}/deactivate`, {});
    return response.data;
  },

  async deletePlan(id: string) {
    const response = await apiService.delete(`plans/${id}`);
    return response.data;
  },

  // Habits
  async getHabits(params?: { includeStats?: boolean; includeHistory?: boolean }) {
    const cacheTTL = params?.includeStats || params?.includeHistory ? 300000 : 600000; // 5 or 10 minutes
    const response = await apiService.get('habits', {
      params,
      cacheTTL,
      skipCache: false
    });
    return response.data;
  },

  async getHabit(id: string) {
    const response = await apiService.get(`habits/${id}`);
    return response.data;
  },

  async createHabit(habit: any) {
    const response = await apiService.post('habits', habit);
    return response.data;
  },

  async updateHabit(id: string, updates: any) {
    const response = await apiService.patch(`habits/${id}`, updates);
    return response.data;
  },

  async deleteHabit(id: string) {
    const response = await apiService.delete(`habits/${id}`);
    return response.data;
  },

  async completeHabit(habitId: string) {
    const response = await apiService.post(`habits/${habitId}/complete`);

    // Invalidate habits cache after completion
    await apiService.invalidateCache({
      tags: ['habits', 'dashboard'],
      pattern: /habits.*analytics/
    });

    return response.data;
  },

  async incompleteHabit(habitId: string) {
    const response = await apiService.post(`habits/${habitId}/incomplete`);

    // Invalidate habits cache after incompletion
    await apiService.invalidateCache({
      tags: ['habits', 'dashboard'],
      pattern: /habits.*analytics/
    });

    return response.data;
  },

  async getHabitAnalytics(habitId: string) {
    const response = await apiService.get(`habits/${habitId}/analytics`);
    return response.data;
  },

  // Check-ins
  async getCheckins(params?: { limit?: number; offset?: number }) {
    const response = await apiService.get('checkins', { params });
    return response.data;
  },

  async getCheckin(id: string) {
    const response = await apiService.get(`checkins/${id}`);
    return response.data;
  },

  async createCheckin(data: any) {
    const response = await apiService.post('checkins', data);
    return response.data;
  },

  async updateCheckin(id: string, updates: any) {
    const response = await apiService.patch(`checkins/${id}`, updates);
    return response.data;
  },

  // Content
  async getContent(params?: { tags?: string; type?: string; limit?: number; offset?: number }) {
    const response = await apiService.get('content', { params });
    return response.data;
  },

  async getContentById(id: string) {
    const response = await apiService.get(`content/${id}`);
    return response.data;
  },

  // Journal - Using v2 endpoints for enhanced functionality
  async getJournalEntries(params?: {
    search?: string;
    tags?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'content';
    sortOrder?: 'asc' | 'desc';
  }) {
    // Shorter cache for search results, longer for basic lists
    const cacheTTL = params?.search ? 180000 : 600000; // 3 or 10 minutes
    const response = await apiService.get('journal', {
      params,
      cacheTTL,
      skipCache: !!params?.search // Skip cache for search queries
    });
    return response.data;
  },

  async getJournalEntry(id: string) {
    const response = await apiService.get(`journal/${id}`);
    return response.data;
  },

  async createJournalEntry(data: { content: string; tags?: string[] }) {
    const response = await apiService.post('journal', data);

    // Invalidate journal cache after creation
    await apiService.invalidateCache({
      tags: ['journal']
    });

    return response.data;
  },

  async updateJournalEntry(id: string, data: { content?: string; tags?: string[] }) {
    const response = await apiService.put(`journal/${id}`, data);

    // Invalidate journal cache after update
    await apiService.invalidateCache({
      tags: ['journal'],
      pattern: new RegExp(`journal.*${id}`)
    });

    return response.data;
  },

  async deleteJournalEntry(id: string) {
    const response = await apiService.delete(`journal/${id}`);

    // Invalidate journal cache after deletion
    await apiService.invalidateCache({
      tags: ['journal'],
      pattern: new RegExp(`journal.*${id}`)
    });

    return response.data;
  },

  async searchJournalEntries(params: {
    q: string;
    tags?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiService.get('journal/search', {
      params
    });
    return response.data;
  },

  // Prayer Times
  async getPrayerTimes(params: { latitude: number; longitude: number; date?: string }) {
    const response = await apiService.get('prayer-times', {
      params,
      cacheTTL: 86400000, // 24 hours - prayer times don't change often
      skipCache: false
    });
    return response.data;
  },

  // Intentions
  async getIntentions(params?: { date?: string; limit?: number }) {
    const response = await apiService.get('intentions', { params });
    return response.data;
  },

  async getIntention(id: string) {
    const response = await apiService.get(`intentions/${id}`);
    return response.data;
  },

  async createIntention(data: { intention: string; date?: string }) {
    const response = await apiService.post('intentions', data);
    return response.data;
  },

  async updateIntention(id: string, updates: { intention?: string; completed?: boolean }) {
    const response = await apiService.patch(`intentions/${id}`, updates);
    return response.data;
  },

  async deleteIntention(id: string) {
    const response = await apiService.delete(`intentions/${id}`);
    return response.data;
  },

  // Dhikr
  async getDhikr(params?: { type?: string; date?: string }) {
    const response = await apiService.get('dhikr', { params });
    return response.data;
  },

  async incrementDhikr(type: string, count: number = 1) {
    const response = await apiService.post('dhikr/increment', { type, count });
    return response.data;
  },

  async getDhikrStats(params?: { period?: 'daily' | 'weekly' | 'monthly' }) {
    const response = await apiService.get('dhikr/stats', { params });
    return response.data;
  },

  // User Preferences
  async getUserPreferences() {
    const response = await apiService.get('users/preferences', {
      cacheTTL: 3600000, // 1 hour - user preferences don't change often
      skipCache: false
    });
    return response.data;
  },

  async updateUserPreferences(preferences: {
    language?: string;
    location?: { latitude: number; longitude: number };
    prayerCalculationMethod?: string;
    theme?: 'light' | 'dark' | 'auto';
  }) {
    const response = await apiService.patch('users/preferences', preferences);

    // Invalidate dependent caches when preferences change
    await apiService.invalidateCache({
      tags: ['user-preferences', 'dashboard'],
      dependencies: ['user-location', 'user-timezone'],
      pattern: /prayer-times/
    });

    return response.data;
  },

  // Onboarding
  async getOnboardingProgress() {
    const response = await apiService.get('onboarding/progress');
    return response.data;
  },

  async updateOnboardingStep(step: string, data: any) {
    const response = await apiService.post(`onboarding/step/${step}`, data);
    return response.data;
  },

  async completeOnboarding() {
    const response = await apiService.post('onboarding/complete');
    return response.data;
  },

  // Sync (for offline support)
  async syncData(data: {
    lastSyncTime: string;
    changes: any[];
  }) {
    const response = await apiService.post('sync', data);
    return response.data;
  },

  async getSyncStatus() {
    const response = await apiService.get('sync/status');
    return response.data;
  },

  // Cache Management Utilities
  async warmCache() {
    await apiService.warmDashboardCache();
  },

  async invalidateAllCache() {
    return await apiService.invalidateCache({
      pattern: /.*/
    });
  },

  async getCacheMetrics() {
    return apiService.getCacheMetrics();
  },

  async invalidateCacheByTags(tags: string[]) {
    return await apiService.invalidateCache({ tags });
  }
};

// Export types
export type { ApiService, ApiRequestConfig, ApiResponse, ApiError } from './ApiService';
export type { RequestInterceptor, ResponseInterceptor } from './interceptors';
export type { RequestTransformer, ResponseTransformer } from './transformers';
export type { CacheService, CacheStrategy } from '../cache/CacheService';