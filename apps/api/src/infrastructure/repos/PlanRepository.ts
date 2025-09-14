import { Plan } from '@sakinah/types';
import { getDatabase } from '../database';

export class PlanRepository {
  private db = getDatabase();

  async createPlan(data: Omit<Plan, 'id' | 'createdAt'>): Promise<Plan> {
    const result = await this.db.createPlan({
      userId: data.userId,
      kind: data.kind,
      target: data.target,
      microHabits: data.microHabits,
      duaIds: data.duaIds,
      contentIds: data.contentIds,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data!;
  }

  async getActivePlans(userId: string): Promise<Plan[]> {
    const result = await this.db.getPlansByUserId(userId);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const plans = result.data || [];
    return plans.filter(plan => plan.status === 'active');
  }

  async getAllUserPlans(userId: string): Promise<Plan[]> {
    const result = await this.db.getPlansByUserId(userId);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data || [];
  }

  async getPlanById(id: string, userId: string): Promise<Plan | null> {
    const result = await this.db.getPlanById(id);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const plan = result.data;
    if (plan && plan.userId !== userId) {
      return null;
    }

    return plan;
  }

  async archivePlan(id: string, userId: string): Promise<void> {
    // First verify the plan belongs to the user
    const plan = await this.getPlanById(id, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    const result = await this.db.updatePlanStatus(id, 'archived');

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async activatePlan(id: string, userId: string): Promise<void> {
    // First verify the plan belongs to the user
    const plan = await this.getPlanById(id, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    const result = await this.db.updatePlanStatus(id, 'active');

    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}