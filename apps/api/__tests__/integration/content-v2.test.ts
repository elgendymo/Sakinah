import { ContentRepositoryAdapter } from '../../src/infrastructure/repos/ContentRepositoryAdapter';
import { ContentFilter } from '../../src/domain/repositories/IContentRepository';
import { ContentSnippet, ContentType } from '@sakinah/types';
import { IDatabaseClient, DatabaseResult } from '../../src/infrastructure/database/types';

// Mock database client
const mockDatabaseClient = {
  getAllContentSnippets: vi.fn(),
  getContentSnippetsByTags: vi.fn(),
  getContentSnippetById: vi.fn(),
  // Add other required methods as stubs
  getPlanById: vi.fn(),
  getActivePlanByUserId: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  getAllPlans: vi.fn(),
  getPlansByUserId: vi.fn(),
  getHabitById: vi.fn(),
  getHabitsByUserId: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  getAllHabits: vi.fn(),
  getHabitCompletionById: vi.fn(),
  getHabitCompletionsByHabitId: vi.fn(),
  createHabitCompletion: vi.fn(),
  updateHabitCompletion: vi.fn(),
  deleteHabitCompletion: vi.fn(),
  getAllHabitCompletions: vi.fn(),
  getJournalEntryById: vi.fn(),
  getJournalEntriesByUserId: vi.fn(),
  createJournalEntry: vi.fn(),
  updateJournalEntry: vi.fn(),
  deleteJournalEntry: vi.fn(),
  getAllJournalEntries: vi.fn(),
  searchJournalEntries: vi.fn(),
  getCheckinById: vi.fn(),
  getCheckinsByUserId: vi.fn(),
  createCheckin: vi.fn(),
  updateCheckin: vi.fn(),
  deleteCheckin: vi.fn(),
  getAllCheckins: vi.fn()
};

// Mock the Cacheable decorator
vi.mock('../../src/infrastructure/cache/decorators/Cacheable', () => ({
  Cacheable: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor
}));

describe('ContentRepositoryAdapter Integration Tests', () => {
  let contentRepository: ContentRepositoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    contentRepository = new ContentRepositoryAdapter(mockDatabaseClient);
  });

  const createMockContentSnippet = (
    id: string,
    type: ContentType,
    tags: string[] = []
  ): ContentSnippet => ({
    id,
    type,
    text: `Sample ${type} content`,
    ref: `Reference for ${type}`,
    tags,
    createdAt: '2024-01-01T00:00:00Z'
  });

  describe('findWithFilter', () => {
    it('should use getContentSnippetsByTags when tags are provided', async () => {
      const mockContent = [
        createMockContentSnippet('1', 'ayah', ['patience', 'trust']),
        createMockContentSnippet('2', 'hadith', ['patience', 'character'])
      ];

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getContentSnippetsByTags.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        tags: ['patience'],
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(mockContent);
      expect(mockDatabaseClient.getContentSnippetsByTags).toHaveBeenCalledWith(['patience']);
      expect(mockDatabaseClient.getAllContentSnippets).not.toHaveBeenCalled();
    });

    it('should use getAllContentSnippets when no tags are provided', async () => {
      const mockContent = [
        createMockContentSnippet('1', 'ayah', ['patience']),
        createMockContentSnippet('2', 'hadith', ['gratitude']),
        createMockContentSnippet('3', 'dua', ['trust'])
      ];

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        type: 'hadith',
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].type).toBe('hadith');
      expect(mockDatabaseClient.getAllContentSnippets).toHaveBeenCalled();
      expect(mockDatabaseClient.getContentSnippetsByTags).not.toHaveBeenCalled();
    });

    it('should filter by type when specified', async () => {
      const mockContent = [
        createMockContentSnippet('1', 'ayah', ['patience']),
        createMockContentSnippet('2', 'hadith', ['patience']),
        createMockContentSnippet('3', 'dua', ['patience'])
      ];

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getContentSnippetsByTags.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        tags: ['patience'],
        type: 'ayah',
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].type).toBe('ayah');
    });

    it('should apply pagination correctly', async () => {
      const mockContent = Array.from({ length: 30 }, (_, i) =>
        createMockContentSnippet(`content-${i}`, 'ayah', ['patience'])
      );

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        limit: 10,
        offset: 5
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(10);
      // Check that we got items from offset 5 to 15
      expect(result.value![0].id).toBe('content-5');
      expect(result.value![9].id).toBe('content-14');
    });

    it('should enforce maximum limit of 100', async () => {
      const mockContent = Array.from({ length: 150 }, (_, i) =>
        createMockContentSnippet(`content-${i}`, 'ayah', ['patience'])
      );

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        limit: 120, // Above maximum
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(100); // Should be capped at 100
    });

    it('should default to limit 20 and offset 0', async () => {
      const mockContent = Array.from({ length: 30 }, (_, i) =>
        createMockContentSnippet(`content-${i}`, 'ayah', ['patience'])
      );

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {}; // No limit or offset specified

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(20); // Default limit
      expect(result.value![0].id).toBe('content-0'); // From offset 0
    });

    it('should handle database errors gracefully', async () => {
      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: null,
        error: { message: 'Database connection failed', code: 'DB_ERROR' }
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Database connection failed');
    });

    it('should handle exceptions from database client', async () => {
      mockDatabaseClient.getAllContentSnippets.mockRejectedValue(
        new Error('Connection timeout')
      );

      const filter: ContentFilter = {
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Connection timeout');
    });

    it('should handle empty results gracefully', async () => {
      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: [],
        error: null
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        type: 'note',
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should handle null data from database', async () => {
      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: null,
        error: null
      };

      mockDatabaseClient.getAllContentSnippets.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        limit: 20,
        offset: 0
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should combine all filters correctly', async () => {
      const mockContent = [
        createMockContentSnippet('1', 'ayah', ['patience', 'trust']),
        createMockContentSnippet('2', 'hadith', ['patience', 'trust']),
        createMockContentSnippet('3', 'dua', ['patience', 'gratitude']),
        createMockContentSnippet('4', 'ayah', ['patience', 'gratitude']),
        createMockContentSnippet('5', 'ayah', ['patience', 'trust'])
      ];

      const mockResult: DatabaseResult<ContentSnippet[]> = {
        data: mockContent,
        error: null
      };

      mockDatabaseClient.getContentSnippetsByTags.mockResolvedValue(mockResult);

      const filter: ContentFilter = {
        tags: ['patience', 'trust'],
        type: 'ayah',
        limit: 2,
        offset: 1
      };

      const result = await contentRepository.findWithFilter(filter);

      expect(result.ok).toBe(true);
      // Should get ayah content with patience and trust tags, with offset 1, limit 2
      // We expect 2 ayah items after type filtering, and after offset 1, limit 2 we get 1 item
      expect(result.value).toHaveLength(1);
      expect(result.value![0].type).toBe('ayah');
      expect(result.value![0].tags).toContain('patience');
    });
  });
});