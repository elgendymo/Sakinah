import { container } from 'tsyringe';
import { Result } from '@/shared/result';
import { Plan, PlanKind } from '@sakinah/types';
import { SuggestPlanUseCase } from './usecases/SuggestPlanUseCase';

interface SuggestPlanInput {
  userId: string;
  mode: PlanKind;
  input: string;
}

// Legacy adapter function for backward compatibility
export async function suggestPlan(input: SuggestPlanInput): Promise<Result<Plan>> {
  const useCase = container.resolve(SuggestPlanUseCase);
  const result = await useCase.execute(input);

  if (!result.ok) {
    return result as Result<Plan>;
  }

  // Convert domain entity to DTO for backward compatibility
  return Result.ok(result.value.toDTO() as Plan);
}