import { Result } from '@/shared/result';
import { Plan } from '../entities/Plan';
import { UserId } from '../value-objects/UserId';
import { PlanId } from '../value-objects/PlanId';

export interface IPlanRepository {
  create(plan: Plan): Promise<Result<Plan>>;
  findById(id: PlanId): Promise<Result<Plan | null>>;
  findByUserId(userId: UserId): Promise<Result<Plan[]>>;
  updateStatus(id: PlanId, status: 'active' | 'archived'): Promise<Result<Plan>>;
}