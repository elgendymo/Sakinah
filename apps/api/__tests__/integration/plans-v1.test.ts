import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/server';
import { PlanRepository } from '../../src/infrastructure/repos/PlanRepository';
import { Plan } from '../../src/domain/entities/Plan';
import { MicroHabit } from '../../src/domain/entities/MicroHabit';
import { UserId } from '../../src/domain/value-objects/UserId';
import { PlanId } from '../../src/domain/value-objects/PlanId';
import { Result } from '../../src/shared/result';
import { container } from 'tsyringe';

// Mock the PlanRepository
vi.mock('../../src/infrastructure/repos/PlanRepository');

// Mock authentication middleware
vi.mock('../../src/infrastructure/auth/middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

describe('Plans V1 API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;
  let mockPlanRepo: any;

  beforeAll(async () => {
    // Configure test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_BACKEND = 'sqlite';
    process.env.AI_PROVIDER = 'rules';

    app = await createApp();

    // Mock authentication
    authToken = 'test-jwt-token';
    userId = 'test-user-id';

    // Setup mock repository
    mockPlanRepo = {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn()
    };

    // Register mock in container
    container.register('IPlanRepository', { useValue: mockPlanRepo });

    // Mock the constructor to return our mock
    vi.mocked(PlanRepository).mockImplementation(() => mockPlanRepo);
  });

  afterAll(async () => {
    vi.clearAllMocks();
    container.clearInstances();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/plans', () => {
    it('should return all plans for user with metadata', async () => {
      const mockPlans = [
        Plan.create({
          id: 'plan-1',
          userId,
          kind: 'takhliyah',
          target: 'Overcome anger',
          microHabits: [
            MicroHabit.create('Deep breathing', 'daily', 'Control anger')
          ],
          status: 'active'
        }),
        Plan.create({
          id: 'plan-2',
          userId,
          kind: 'tahliyah',
          target: 'Increase gratitude',
          microHabits: [
            MicroHabit.create('Gratitude journal', 'daily', 'Practice gratitude')
          ],
          status: 'archived'
        })
      ];

      mockPlanRepo.findByUserId.mockResolvedValue(Result.ok(mockPlans));

      const response = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        plans: expect.any(Array),
        metadata: {
          total: 2,
          activeCount: 1,
          archivedCount: 1,
          byKind: {
            takhliyah: 1,
            tahliyah: 1
          }
        }
      });

      expect(response.body.plans).toHaveLength(2);
      expect(mockPlanRepo.findByUserId).toHaveBeenCalledWith(new UserId(userId));
    });

    it('should filter plans by status', async () => {
      const mockPlans = [
        Plan.create({
          userId,
          kind: 'takhliyah',
          target: 'Test target',
          microHabits: [],
          status: 'active'
        })
      ];

      mockPlanRepo.findByUserId.mockResolvedValue(Result.ok(mockPlans));

      const response = await request(app)
        .get('/api/v1/plans?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plans).toHaveLength(1);
      expect(response.body.plans[0].status).toBe('active');
    });

    it('should filter plans by kind', async () => {
      const mockPlans = [
        Plan.create({
          userId,
          kind: 'takhliyah',
          target: 'Test target',
          microHabits: [],
          status: 'active'
        })
      ];

      mockPlanRepo.findByUserId.mockResolvedValue(Result.ok(mockPlans));

      const response = await request(app)
        .get('/api/v1/plans?kind=takhliyah')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plans).toHaveLength(1);
      expect(response.body.plans[0].kind).toBe('takhliyah');
    });

    it('should handle repository errors', async () => {
      mockPlanRepo.findByUserId.mockResolvedValue(Result.error(new Error('Database error')));

      const response = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plans'
        }
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/plans?status=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters'
        }
      });
    });
  });

  describe('GET /api/v1/plans/active', () => {
    it('should return only active plans', async () => {
      const mockPlans = [
        Plan.create({
          userId,
          kind: 'takhliyah',
          target: 'Test target',
          microHabits: [],
          status: 'active'
        }),
        Plan.create({
          userId,
          kind: 'tahliyah',
          target: 'Test target 2',
          microHabits: [],
          status: 'archived'
        })
      ];

      mockPlanRepo.findByUserId.mockResolvedValue(Result.ok(mockPlans));

      const response = await request(app)
        .get('/api/v1/plans/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plans).toHaveLength(1);
      expect(response.body.plans[0].status).toBe('active');
      expect(response.body.metadata.total).toBe(1);
    });
  });

  describe('GET /api/v1/plans/:id', () => {
    it('should return plan by ID', async () => {
      const planId = 'plan-123';
      const mockPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'active'
      });

      mockPlanRepo.findById.mockResolvedValue(Result.ok(mockPlan));

      const response = await request(app)
        .get(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plan.id).toBe(planId);
      expect(mockPlanRepo.findById).toHaveBeenCalledWith(new PlanId(planId));
    });

    it('should return 404 for non-existent plan', async () => {
      const planId = 'non-existent';
      mockPlanRepo.findById.mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .get(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const planId = 'plan-123';
      const mockPlan = Plan.create({
        id: planId,
        userId: 'other-user',
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'active'
      });

      mockPlanRepo.findById.mockResolvedValue(Result.ok(mockPlan));

      const response = await request(app)
        .get(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this plan'
        }
      });
    });
  });

  describe('POST /api/v1/plans', () => {
    it('should create a new plan', async () => {
      const planData = {
        kind: 'takhliyah',
        target: 'Overcome pride',
        microHabits: [
          {
            title: 'Practice humility',
            schedule: 'daily',
            target: 'Develop humility'
          }
        ],
        duaIds: ['dua-1'],
        contentIds: ['content-1']
      };

      const createdPlan = Plan.create({
        id: 'plan-123',
        userId,
        ...planData,
        microHabits: planData.microHabits.map(h =>
          MicroHabit.create(h.title, h.schedule, h.target)
        )
      });

      mockPlanRepo.create.mockResolvedValue(Result.ok(createdPlan));

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(planData)
        .expect(201);

      expect(response.body.plan.kind).toBe(planData.kind);
      expect(response.body.plan.target).toBe(planData.target);
      expect(response.body.events).toContain('plan_created');
      expect(mockPlanRepo.create).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        kind: 'invalid',
        // missing target and microHabits
      };

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid plan data'
        }
      });
    });

    it('should handle repository errors during creation', async () => {
      const planData = {
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [{
          title: 'Test habit',
          schedule: 'daily',
          target: 'Test target'
        }]
      };

      mockPlanRepo.create.mockResolvedValue(Result.error(new Error('Database error')));

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(planData)
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create plan'
        }
      });
    });
  });

  describe('PATCH /api/v1/plans/:id/status', () => {
    it('should update plan status', async () => {
      const planId = 'plan-123';
      const mockPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'active'
      });

      const updatedPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'archived'
      });

      mockPlanRepo.findById.mockResolvedValue(Result.ok(mockPlan));
      mockPlanRepo.updateStatus.mockResolvedValue(Result.ok(updatedPlan));

      const response = await request(app)
        .patch(`/api/v1/plans/${planId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'archived' })
        .expect(200);

      expect(response.body.plan.status).toBe('archived');
      expect(response.body.events).toContain('plan_archived');
      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(new PlanId(planId), 'archived');
    });

    it('should validate status values', async () => {
      const planId = 'plan-123';

      const response = await request(app)
        .patch(`/api/v1/plans/${planId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status data'
        }
      });
    });
  });

  describe('POST /api/v1/plans/:id/activate', () => {
    it('should activate a plan', async () => {
      const planId = 'plan-123';
      const mockPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'archived'
      });

      const activatedPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'active'
      });

      mockPlanRepo.findById.mockResolvedValue(Result.ok(mockPlan));
      mockPlanRepo.updateStatus.mockResolvedValue(Result.ok(activatedPlan));

      const response = await request(app)
        .post(`/api/v1/plans/${planId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plan.status).toBe('active');
      expect(response.body.events).toContain('plan_activated');
      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(new PlanId(planId), 'active');
    });
  });

  describe('POST /api/v1/plans/:id/deactivate', () => {
    it('should deactivate a plan', async () => {
      const planId = 'plan-123';
      const mockPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'active'
      });

      const deactivatedPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'archived'
      });

      mockPlanRepo.findById.mockResolvedValue(Result.ok(mockPlan));
      mockPlanRepo.updateStatus.mockResolvedValue(Result.ok(deactivatedPlan));

      const response = await request(app)
        .post(`/api/v1/plans/${planId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plan.status).toBe('archived');
      expect(response.body.events).toContain('plan_deactivated');
      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(new PlanId(planId), 'archived');
    });
  });

  describe('DELETE /api/v1/plans/:id', () => {
    it('should soft delete a plan by archiving it', async () => {
      const planId = 'plan-123';
      const mockPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'active'
      });

      const archivedPlan = Plan.create({
        id: planId,
        userId,
        kind: 'takhliyah',
        target: 'Test target',
        microHabits: [],
        status: 'archived'
      });

      mockPlanRepo.findById.mockResolvedValue(Result.ok(mockPlan));
      mockPlanRepo.updateStatus.mockResolvedValue(Result.ok(archivedPlan));

      const response = await request(app)
        .delete(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(new PlanId(planId), 'archived');
    });

    it('should return 404 for non-existent plan during deletion', async () => {
      const planId = 'non-existent';
      mockPlanRepo.findById.mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .delete(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
    });
  });
});