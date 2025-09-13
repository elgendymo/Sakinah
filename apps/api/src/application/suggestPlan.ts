import { Result } from '@/shared/result';
import { Plan, PlanKind } from '@sakinah/types';
import { getAIProvider } from '@/infrastructure/ai/factory';
import { PlanRepository } from '@/infrastructure/repos/PlanRepository';
import { ContentRepository } from '@/infrastructure/repos/ContentRepository';
import { HabitRepository } from '@/infrastructure/repos/HabitRepository';

interface SuggestPlanInput {
  userId: string;
  mode: PlanKind;
  input: string;
}

export async function suggestPlan(input: SuggestPlanInput): Promise<Result<Plan>> {
  try {
    const ai = getAIProvider();
    const planRepo = new PlanRepository();
    const contentRepo = new ContentRepository();
    const habitRepo = new HabitRepository();

    // Get AI suggestion
    const suggestion = await ai.suggest({
      mode: input.mode,
      text: input.input,
    });

    // Fetch related content
    const contentIds = [];
    const duaIds = [];

    if (suggestion.tags.length > 0) {
      const content = await contentRepo.getContent({ tags: suggestion.tags });

      for (const item of content) {
        if (item.type === 'dua') {
          duaIds.push(item.id);
        } else {
          contentIds.push(item.id);
        }
      }
    }

    // Create the plan
    const plan = await planRepo.createPlan({
      userId: input.userId,
      kind: input.mode,
      target: input.input,
      microHabits: suggestion.microHabits,
      duaIds: duaIds.length > 0 ? duaIds : undefined,
      contentIds: contentIds.length > 0 ? contentIds : undefined,
      status: 'active',
    });

    // Create habits from micro-habits
    for (const microHabit of suggestion.microHabits) {
      await habitRepo.createHabit({
        userId: input.userId,
        planId: plan.id,
        title: microHabit.title,
        schedule: { freq: 'daily' },
      });
    }

    return Result.ok(plan);
  } catch (error) {
    return Result.error(error as Error);
  }
}