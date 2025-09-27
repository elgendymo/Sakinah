import 'reflect-metadata';

// Global test setup
beforeEach(() => {
  // Clear all module cache for clean state between tests
  vi.clearAllMocks();
});

// Environment setup
process.env.NODE_ENV = 'test';
process.env.DB_BACKEND = 'sqlite';
process.env.AI_PROVIDER = 'rules';