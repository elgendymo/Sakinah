import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../../src/server';
import { container } from '../../../src/infrastructure/di/container';
import { IPlanRepository } from '../../../src/domain/repositories';
import { Result } from '../../../src/shared/result';
import { Plan } from '../../../src/domain/entities/Plan';
import { UserId } from '../../../src/domain/value-objects/UserId';
import { PlanId } from '../../../src/domain/value-objects/PlanId';

// Mock the DI container
jest.mock('../../../src/infrastructure/di/container');
const mockContainer = container as jest.Mocked<typeof container>;

describe('Plans v2 Routes', () => {
  let app: Express;
  let mockPlanRepository: jest.Mocked<IPlanRepository>;
  const mockAuthToken = 'Bearer mock-jwt-token';
  const mockUserId = 'user123';
  const mockPlanId = 'plan123';

  const mockPlan = {
    id: new PlanId(mockPlanId),
    userId: new UserId(mockUserId),
    kind: 'takhliyah',
    target: 'anger',
    status: 'active',
    microHabits: [
      {
        id: 'habit1',
        title: 'Deep breathing when angry',
        schedule: 'As needed',
        target: 3
      }
    ],
    duaIds: ['dua1'],
    contentIds: ['content1'],
    createdAt: new Date(),
    updatedAt: new Date(),
    toDTO: () => ({
      id: mockPlanId,
      userId: mockUserId,
      kind: 'takhliyah',
      target: 'anger',
      status: 'active',
      microHabits: [
        {
          id: 'habit1',
          title: 'Deep breathing when angry',
          schedule: 'As needed',
          target: 3
        }
      ],
      duaIds: ['dua1'],
      contentIds: ['content1'],
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    })
  };

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the Plan Repository
    mockPlanRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn()
    } as any;

    mockContainer.resolve.mockImplementation((token: string) => {
      if (token === 'IPlanRepository') {
        return mockPlanRepository;
      }
      return {};
    });

    // Mock auth middleware to add userId to request
    jest.doMock('../../../src/infrastructure/auth/middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.userId = mockUserId;
        next();
      }
    }));
  });

  describe('GET /api/v2/plans', () => {
    beforeEach(() => {
      mockPlanRepository.findByUserId.mockResolvedValue(
        Result.ok([mockPlan as any])
      );
    });

    it('should return user plans successfully', async () => {
      const response = await request(app)
        .get('/api/v2/plans')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body).toMatchObject({
        plans: [
          expect.objectContaining({
            id: mockPlanId,
            kind: 'takhliyah',
            target: 'anger',
            status: 'active'
          })
        ],
        metadata: expect.objectContaining({
          total: 1,
          count: 1,
          activeCount: 1,
          archivedCount: 0,
          byKind: {
            takhliyah: 1,
            tahliyah: 0
          },
          pagination: expect.objectContaining({
            limit: 20,
            offset: 0,
            hasMore: false
          }),
          version: '2.0'
        })
      });

      expect(mockPlanRepository.findByUserId).toHaveBeenCalledWith(
        new UserId(mockUserId)
      );
    });

    it('should filter plans by status', async () => {
      const response = await request(app)
        .get('/api/v2/plans?status=active')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.plans).toHaveLength(1);
      expect(response.body.metadata.total).toBe(1);
    });

    it('should filter plans by kind', async () => {
      const response = await request(app)
        .get('/api/v2/plans?kind=takhliyah')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.plans).toHaveLength(1);
      expect(response.body.metadata.byKind.takhliyah).toBe(1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v2/plans?limit=10&offset=0')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.metadata.pagination).toMatchObject({
        limit: 10,
        offset: 0,
        hasMore: false
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/v2/plans?status=invalid')
        .set('Authorization', mockAuthToken)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters'
      });
    });

    it('should handle repository errors', async () => {
      mockPlanRepository.findByUserId.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const response = await request(app)
        .get('/api/v2/plans')
        .set('Authorization', mockAuthToken)
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch plans'
      });
    });
  });

  describe('GET /api/v2/plans/active', () => {
    beforeEach(() => {
      mockPlanRepository.findByUserId.mockResolvedValue(
        Result.ok([mockPlan as any])
      );
    });

    it('should return active plans only', async () => {
      const response = await request(app)
        .get('/api/v2/plans/active')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body).toMatchObject({
        plans: [
          expect.objectContaining({
            id: mockPlanId,
            status: 'active'
          })
        ],
        metadata: expect.objectContaining({
          total: 1,
          version: '2.0'
        })
      });
    });

    it('should filter out archived plans', async () => {
      const archivedPlan = {
        ...mockPlan,
        status: 'archived',
        toDTO: () => ({ ...mockPlan.toDTO(), status: 'archived' })
      };

      mockPlanRepository.findByUserId.mockResolvedValue(
        Result.ok([mockPlan as any, archivedPlan as any])
      );

      const response = await request(app)
        .get('/api/v2/plans/active')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.plans).toHaveLength(1);
      expect(response.body.plans[0].status).toBe('active');
    });
  });

  describe('GET /api/v2/plans/:id', () => {
    beforeEach(() => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(mockPlan as any)
      );
    });

    it('should return specific plan successfully', async () => {
      const response = await request(app)
        .get(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body).toMatchObject({
        plan: expect.objectContaining({
          id: mockPlanId,
          kind: 'takhliyah',
          target: 'anger'
        }),
        metadata: expect.objectContaining({
          version: '2.0'
        })
      });

      expect(mockPlanRepository.findById).toHaveBeenCalledWith(
        new PlanId(mockPlanId)
      );
    });

    it('should return 404 for non-existent plan', async () => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(null)
      );

      const response = await request(app)
        .get(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const otherUserPlan = {
        ...mockPlan,
        userId: new UserId('other-user'),
        toDTO: () => ({ ...mockPlan.toDTO(), userId: 'other-user' })
      };

      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(otherUserPlan as any)
      );

      const response = await request(app)
        .get(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to access this plan'
      });
    });
  });

  describe('POST /api/v2/plans', () => {
    const validPlanData = {
      kind: 'takhliyah',
      target: 'anger',
      microHabits: [
        {
          title: 'Deep breathing when angry',
          schedule: 'As needed',
          target: 3
        }
      ],
      duaIds: ['dua1'],
      contentIds: ['content1']
    };

    beforeEach(() => {
      mockPlanRepository.create.mockResolvedValue(
        Result.ok(mockPlan as any)
      );
    });

    it('should create plan successfully', async () => {
      const response = await request(app)
        .post('/api/v2/plans')
        .set('Authorization', mockAuthToken)
        .send(validPlanData)
        .expect(201);

      expect(response.body).toMatchObject({
        plan: expect.objectContaining({
          id: mockPlanId,
          kind: 'takhliyah',
          target: 'anger'
        }),
        events: ['plan_created'],
        metadata: expect.objectContaining({
          version: '2.0'
        })
      });

      expect(mockPlanRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'takhliyah',
          target: 'anger',
          status: 'active'
        })
      );
    });

    it('should return 400 for invalid plan data', async () => {
      const invalidData = {
        kind: 'invalid-kind',
        target: 'anger'
        // missing microHabits
      };

      const response = await request(app)
        .post('/api/v2/plans')
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid plan data'
      });
    });

    it('should handle repository creation errors', async () => {
      mockPlanRepository.create.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const response = await request(app)
        .post('/api/v2/plans')
        .set('Authorization', mockAuthToken)
        .send(validPlanData)
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Failed to create plan'
      });
    });

    it('should handle optional fields', async () => {
      const minimalData = {
        kind: 'takhliyah',
        target: 'anger',
        microHabits: [
          {
            title: 'Deep breathing',
            schedule: 'Daily'
          }
        ]
      };

      await request(app)
        .post('/api/v2/plans')
        .set('Authorization', mockAuthToken)
        .send(minimalData)
        .expect(201);

      expect(mockPlanRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duaIds: [],
          contentIds: []
        })
      );
    });
  });

  describe('POST /api/v2/plans/:id/activate', () => {
    beforeEach(() => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(mockPlan as any)
      );
      mockPlanRepository.updateStatus.mockResolvedValue(
        Result.ok({ ...mockPlan, status: 'active' } as any)
      );
    });

    it('should activate plan successfully', async () => {
      const response = await request(app)
        .post(`/api/v2/plans/${mockPlanId}/activate`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body).toMatchObject({
        plan: expect.objectContaining({
          id: mockPlanId
        }),
        events: ['plan_activated'],
        metadata: expect.objectContaining({
          version: '2.0'
        })
      });

      expect(mockPlanRepository.updateStatus).toHaveBeenCalledWith(
        new PlanId(mockPlanId),
        'active'
      );
    });

    it('should return 404 for non-existent plan', async () => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(null)
      );

      const response = await request(app)
        .post(`/api/v2/plans/${mockPlanId}/activate`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const otherUserPlan = {
        ...mockPlan,
        userId: new UserId('other-user')
      };

      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(otherUserPlan as any)
      );

      const response = await request(app)
        .post(`/api/v2/plans/${mockPlanId}/activate`)
        .set('Authorization', mockAuthToken)
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to modify this plan'
      });
    });
  });

  describe('POST /api/v2/plans/:id/deactivate', () => {
    beforeEach(() => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(mockPlan as any)
      );
      mockPlanRepository.updateStatus.mockResolvedValue(
        Result.ok({ ...mockPlan, status: 'archived' } as any)
      );
    });

    it('should deactivate plan successfully', async () => {
      const response = await request(app)
        .post(`/api/v2/plans/${mockPlanId}/deactivate`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body).toMatchObject({
        plan: expect.objectContaining({
          id: mockPlanId
        }),
        events: ['plan_deactivated'],
        metadata: expect.objectContaining({
          version: '2.0'
        })
      });

      expect(mockPlanRepository.updateStatus).toHaveBeenCalledWith(
        new PlanId(mockPlanId),
        'archived'
      );
    });
  });

  describe('DELETE /api/v2/plans/:id', () => {
    beforeEach(() => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(mockPlan as any)
      );
      mockPlanRepository.updateStatus.mockResolvedValue(
        Result.ok({ ...mockPlan, status: 'archived' } as any)
      );
    });

    it('should delete (archive) plan successfully', async () => {
      const response = await request(app)
        .delete(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(204);

      expect(response.body).toEqual({});

      expect(mockPlanRepository.updateStatus).toHaveBeenCalledWith(
        new PlanId(mockPlanId),
        'archived'
      );
    });

    it('should return 404 for non-existent plan', async () => {
      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(null)
      );

      const response = await request(app)
        .delete(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const otherUserPlan = {
        ...mockPlan,
        userId: new UserId('other-user')
      };

      mockPlanRepository.findById.mockResolvedValue(
        Result.ok(otherUserPlan as any)
      );

      const response = await request(app)
        .delete(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to delete this plan'
      });
    });

    it('should handle repository errors', async () => {
      mockPlanRepository.updateStatus.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const response = await request(app)
        .delete(`/api/v2/plans/${mockPlanId}`)
        .set('Authorization', mockAuthToken)
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete plan'
      });
    });
  });
});