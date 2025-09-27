import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { Plan } from '@/domain/entities/Plan';
import { IPlanRepository, IContentRepository, IHabitRepository } from '@/domain/repositories';
import { IAiProvider } from '@/domain/providers/IAiProvider';
import { Habit } from '@/domain/entities/Habit';

interface SuggestPlanInput {
  userId: string;
  mode: 'takhliyah' | 'tahliyah';
  input: string;
}

@injectable()
export class SuggestPlanUseCase {
  constructor(
    @inject('IAiProvider') private aiProvider: IAiProvider,
    @inject('IPlanRepository') private planRepo: IPlanRepository,
    @inject('IContentRepository') private contentRepo: IContentRepository,
    @inject('IHabitRepository') private habitRepo: IHabitRepository
  ) {}

  async execute(input: SuggestPlanInput): Promise<Result<Plan>> {
    try {
      // Get AI suggestion
      const suggestion = await this.aiProvider.suggest({
        mode: input.mode,
        text: input.input,
      });

      // Fetch related content
      const contentIds: string[] = [];
      const duaIds: string[] = [];

      if (suggestion.tags.length > 0) {
        const contentResult = await this.contentRepo.findByTags(suggestion.tags);

        if (contentResult.ok && contentResult.value) {
          for (const item of contentResult.value) {
            if (item.type === 'dua') {
              duaIds.push(item.id);
            } else {
              contentIds.push(item.id);
            }
          }
        }
      }

      // Create the plan
      const plan = Plan.create({
        userId: input.userId,
        kind: input.mode,
        target: input.input,
        microHabits: suggestion.microHabits,
        duaIds: duaIds.length > 0 ? duaIds : undefined,
        contentIds: contentIds.length > 0 ? contentIds : undefined,
        status: 'active'
      });

      const planResult = await this.planRepo.create(plan);

      if (Result.isError(planResult)) {
        return planResult;
      }

      // Create habits from micro-habits
      for (const microHabit of suggestion.microHabits) {
        const habit = Habit.create({
          userId: input.userId,
          planId: planResult.value.id.toString(),
          title: microHabit.title,
          schedule: { freq: 'daily' }
        });

        await this.habitRepo.create(habit);
      }

      return planResult;
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}