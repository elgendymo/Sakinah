import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IPlanRepository } from '@/domain/repositories';
import { Plan } from '@/domain/entities/Plan';
import { UserId } from '@/domain/value-objects/UserId';
import { PlanId } from '@/domain/value-objects/PlanId';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { IDatabaseClient } from '../database/types';

@injectable()
export class PlanRepository implements IPlanRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  // Legacy methods for backward compatibility
  async getActivePlans(userId: string) {
    const result = await this.findByUserId(new UserId(userId));
    if (result.ok) {
      return result.value.filter(p => p.status === 'active').map(p => p.toDTO());
    }
    throw new Error('Failed to get plans');
  }

  async createPlan(data: any) {
    const plan = Plan.create({
      userId: data.userId,
      kind: data.kind,
      target: data.target,
      microHabits: data.microHabits.map((h: any) => MicroHabit.create(h.title, h.schedule, h.target)),
      duaIds: data.duaIds,
      contentIds: data.contentIds
    });

    const result = await this.create(plan);
    if (result.ok) {
      return result.value.toDTO();
    }
    throw new Error('Failed to create plan');
  }

  async archivePlan(id: string) {
    const result = await this.updateStatus(new PlanId(id), 'archived');
    if (!result.ok) {
      throw new Error('Failed to archive plan');
    }
  }

  async create(plan: Plan): Promise<Result<Plan>> {
    try {
      const result = await this.db.createPlan({
        userId: plan.userId.toString(),
        kind: plan.kind,
        target: plan.target,
        microHabits: plan.microHabits.map(h => h.toDTO()),
        duaIds: plan.duaIds.length > 0 ? plan.duaIds : undefined,
        contentIds: plan.contentIds.length > 0 ? plan.contentIds : undefined,
      });

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const createdPlan = Plan.create({
        id: result.data!.id,
        userId: result.data!.userId,
        kind: result.data!.kind,
        target: result.data!.target,
        microHabits: result.data!.microHabits.map(h =>
          MicroHabit.create(h.title, h.schedule, h.target)
        ),
        duaIds: result.data!.duaIds,
        contentIds: result.data!.contentIds,
        status: result.data!.status,
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(createdPlan);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findById(id: PlanId): Promise<Result<Plan | null>> {
    try {
      const result = await this.db.getPlanById(id.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const plan = Plan.create({
        id: result.data.id,
        userId: result.data.userId,
        kind: result.data.kind,
        target: result.data.target,
        microHabits: result.data.microHabits.map(h =>
          MicroHabit.create(h.title, h.schedule, h.target)
        ),
        duaIds: result.data.duaIds,
        contentIds: result.data.contentIds,
        status: result.data.status,
        createdAt: new Date(result.data.createdAt)
      });

      return Result.ok(plan);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findByUserId(userId: UserId): Promise<Result<Plan[]>> {
    try {
      const result = await this.db.getPlansByUserId(userId.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const plans = (result.data || []).map(p =>
        Plan.create({
          id: p.id,
          userId: p.userId,
          kind: p.kind,
          target: p.target,
          microHabits: p.microHabits.map(h =>
            MicroHabit.create(h.title, h.schedule, h.target)
          ),
          duaIds: p.duaIds,
          contentIds: p.contentIds,
          status: p.status,
          createdAt: new Date(p.createdAt)
        })
      );

      return Result.ok(plans);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async updateStatus(id: PlanId, status: 'active' | 'archived'): Promise<Result<Plan>> {
    try {
      const result = await this.db.updatePlanStatus(id.toString(), status);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const plan = Plan.create({
        id: result.data!.id,
        userId: result.data!.userId,
        kind: result.data!.kind,
        target: result.data!.target,
        microHabits: result.data!.microHabits.map(h =>
          MicroHabit.create(h.title, h.schedule, h.target)
        ),
        duaIds: result.data!.duaIds,
        contentIds: result.data!.contentIds,
        status: result.data!.status,
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(plan);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}