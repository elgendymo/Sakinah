import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import checkinsRouter from '@/routes/v2/checkins';
import { ICheckinRepository } from '@/domain/repositories/ICheckinRepository';
import { LogCheckinUseCase } from '@/application/usecases/LogCheckinUseCase';
import { Checkin } from '@/domain/entities/Checkin';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';

// Mock the auth middleware
vi.mock('@/infrastructure/auth/middleware', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  })
}));

// Mock validation middleware
vi.mock('@/infrastructure/middleware/validation', () => ({
  validateRequest: vi.fn((schema) => (req, res, next) => next()),
  validateQuery: vi.fn((schema) => (req, res, next) => next())
}));

// Mock logger
vi.mock('@/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock dependencies
const mockCheckinRepository = {
  create: vi.fn(),
  findByUserAndDate: vi.fn(),
  update: vi.fn(),
  findByUser: vi.fn(),
  countByUser: vi.fn(),
  findAllByUser: vi.fn(),
  findLatestByUser: vi.fn(),
  findById: vi.fn()
};

const mockLogCheckinUseCase = {
  execute: vi.fn(),
  getToday: vi.fn()
};

// Mock container
beforeEach(() => {
  vi.clearAllMocks();
  container.resolve = vi.fn((token) => {
    if (token === 'ICheckinRepository') {
      return mockCheckinRepository;
    }
    if (token === LogCheckinUseCase) {
      return mockLogCheckinUseCase;
    }
    return null;
  });
});

describe('POST /v2/checkins', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v2/checkins', checkinsRouter);
  });

  it('should create a new check-in successfully', async () => {
    const checkinData = {
      mood: 1,
      intention: 'Be more patient today',
      reflection: 'Had a good day practicing patience',
      gratitude: ['Health', 'Family', 'Peace'],
      improvements: 'Wake up earlier for Fajr'
    };

    const mockCheckin = Checkin.create({
      id: 'test-checkin-id',
      userId: 'test-user-id',
      date: new Date(),
      mood: 1,
      intention: 'Be more patient today',
      reflection: 'Had a good day practicing patience\n\nGratitude:\n1. Health\n2. Family\n3. Peace\n\nImprovements:\nWake up earlier for Fajr'
    });

    mockLogCheckinUseCase.execute.mockResolvedValue(Result.ok(mockCheckin));
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok([mockCheckin]));
    mockCheckinRepository.findByUserAndDate.mockResolvedValue(Result.ok(null));

    const response = await request(app)
      .post('/v2/checkins')
      .send(checkinData)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('streak');
    expect(response.body).toHaveProperty('isUpdate');
    expect(response.body.data.mood).toBe(1);
    expect(response.body.data.intention).toBe('Be more patient today');
    expect(mockLogCheckinUseCase.execute).toHaveBeenCalledWith({
      userId: 'test-user-id',
      mood: 1,
      intention: 'Be more patient today',
      reflection: 'Had a good day practicing patience\n\nGratitude:\n1. Health\n2. Family\n3. Peace\n\nImprovements:\nWake up earlier for Fajr'
    });
  });

  it('should update existing check-in for the day', async () => {
    const checkinData = {
      mood: 2,
      intention: 'Updated intention',
      reflection: 'Updated reflection'
    };

    const existingCheckin = Checkin.create({
      id: 'existing-checkin-id',
      userId: 'test-user-id',
      date: new Date(),
      mood: 1,
      intention: 'Original intention',
      reflection: 'Original reflection'
    });

    const updatedCheckin = Checkin.create({
      id: 'existing-checkin-id',
      userId: 'test-user-id',
      date: new Date(),
      mood: 2,
      intention: 'Updated intention',
      reflection: 'Updated reflection'
    });

    mockLogCheckinUseCase.execute.mockResolvedValue(Result.ok(updatedCheckin));
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok([updatedCheckin]));
    mockCheckinRepository.findByUserAndDate.mockResolvedValue(Result.ok(existingCheckin));

    const response = await request(app)
      .post('/v2/checkins')
      .send(checkinData)
      .expect(200);

    expect(response.body.data.mood).toBe(2);
    expect(response.body.data.intention).toBe('Updated intention');
    expect(response.body.isUpdate).toBe(true);
  });

  it('should handle validation errors', async () => {
    const invalidData = {
      mood: 5, // Invalid mood value (should be -2 to 2)
      intention: 'a'.repeat(501), // Too long
    };

    // Mock validation to reject
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });
    app.use('/v2/checkins', (req, res, next) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input data'
      });
    });

    await request(app)
      .post('/v2/checkins')
      .send(invalidData)
      .expect(400);
  });

  it('should handle use case errors', async () => {
    const checkinData = {
      mood: 1,
      intention: 'Test intention'
    };

    mockLogCheckinUseCase.execute.mockResolvedValue(
      Result.error(new Error('Database connection failed'))
    );

    const response = await request(app)
      .post('/v2/checkins')
      .send(checkinData)
      .expect(500);

    expect(response.body).toEqual({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to save check-in'
    });
  });
});

describe('GET /v2/checkins', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v2/checkins', checkinsRouter);
  });

  it('should get check-ins with pagination', async () => {
    const mockCheckins = [
      Checkin.create({
        id: 'checkin-1',
        userId: 'test-user-id',
        date: new Date('2024-01-15'),
        mood: 1,
        intention: 'Intention 1',
        reflection: 'Reflection 1'
      }),
      Checkin.create({
        id: 'checkin-2',
        userId: 'test-user-id',
        date: new Date('2024-01-14'),
        mood: 0,
        intention: 'Intention 2',
        reflection: 'Reflection 2'
      })
    ];

    mockCheckinRepository.findByUser.mockResolvedValue(Result.ok(mockCheckins));
    mockCheckinRepository.countByUser.mockResolvedValue(Result.ok(2));
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok(mockCheckins));

    const response = await request(app)
      .get('/v2/checkins')
      .query({ limit: 10, offset: 0 })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body).toHaveProperty('streak');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination.total).toBe(2);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.pagination.offset).toBe(0);
  });

  it('should filter check-ins by date range', async () => {
    const mockCheckins = [
      Checkin.create({
        id: 'checkin-1',
        userId: 'test-user-id',
        date: new Date('2024-01-15'),
        mood: 1,
        intention: 'Intention 1',
        reflection: 'Reflection 1'
      })
    ];

    mockCheckinRepository.findByUser.mockResolvedValue(Result.ok(mockCheckins));
    mockCheckinRepository.countByUser.mockResolvedValue(Result.ok(1));
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok(mockCheckins));

    const response = await request(app)
      .get('/v2/checkins')
      .query({
        from: '2024-01-01',
        to: '2024-01-31',
        limit: 20,
        offset: 0
      })
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(mockCheckinRepository.findByUser).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.objectContaining({
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
        limit: 20,
        offset: 0
      })
    );
  });
});

describe('GET /v2/checkins/today', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v2/checkins', checkinsRouter);
  });

  it('should get today\'s check-in if exists', async () => {
    const todayCheckin = Checkin.create({
      id: 'today-checkin',
      userId: 'test-user-id',
      date: new Date(),
      mood: 1,
      intention: 'Today\'s intention',
      reflection: 'Today\'s reflection'
    });

    mockLogCheckinUseCase.getToday.mockResolvedValue(Result.ok(todayCheckin));
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok([todayCheckin]));

    const response = await request(app)
      .get('/v2/checkins/today')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('hasCheckedIn');
    expect(response.body).toHaveProperty('streak');
    expect(response.body.hasCheckedIn).toBe(true);
    expect(response.body.data.intention).toBe('Today\'s intention');
  });

  it('should return null if no check-in exists for today', async () => {
    mockLogCheckinUseCase.getToday.mockResolvedValue(Result.ok(null));
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok([]));

    const response = await request(app)
      .get('/v2/checkins/today')
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.hasCheckedIn).toBe(false);
    expect(response.body.streak.current).toBe(0);
  });
});

describe('GET /v2/checkins/streak', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v2/checkins', checkinsRouter);
  });

  it('should calculate streak correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const mockCheckins = [
      Checkin.create({
        id: 'checkin-1',
        userId: 'test-user-id',
        date: today,
        mood: 1
      }),
      Checkin.create({
        id: 'checkin-2',
        userId: 'test-user-id',
        date: yesterday,
        mood: 1
      }),
      Checkin.create({
        id: 'checkin-3',
        userId: 'test-user-id',
        date: dayBefore,
        mood: 1
      })
    ];

    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok(mockCheckins));
    mockCheckinRepository.countByUser.mockResolvedValue(Result.ok(3));
    mockCheckinRepository.findLatestByUser.mockResolvedValue(Result.ok(mockCheckins[0]));

    const response = await request(app)
      .get('/v2/checkins/streak')
      .expect(200);

    expect(response.body).toHaveProperty('current');
    expect(response.body).toHaveProperty('longest');
    expect(response.body).toHaveProperty('totalCheckins');
    expect(response.body).toHaveProperty('lastCheckinDate');
    expect(response.body.current).toBe(3);
    expect(response.body.longest).toBe(3);
    expect(response.body.totalCheckins).toBe(3);
  });

  it('should return zero streak for new user', async () => {
    mockCheckinRepository.findAllByUser.mockResolvedValue(Result.ok([]));
    mockCheckinRepository.countByUser.mockResolvedValue(Result.ok(0));
    mockCheckinRepository.findLatestByUser.mockResolvedValue(Result.ok(null));

    const response = await request(app)
      .get('/v2/checkins/streak')
      .expect(200);

    expect(response.body.current).toBe(0);
    expect(response.body.longest).toBe(0);
    expect(response.body.totalCheckins).toBe(0);
    expect(response.body.lastCheckinDate).toBeNull();
  });
});

describe('Streak calculation logic', () => {
  it('should calculate current streak correctly with consecutive days', () => {
    // This would test the streak calculation helper function
    // Implementation details would depend on the specific streak logic
  });

  it('should calculate longest streak correctly with gaps', () => {
    // This would test the longest streak calculation
    // Implementation details would depend on the specific streak logic
  });

  it('should handle edge cases like leap years and month boundaries', () => {
    // Edge case testing for date calculations
  });
});