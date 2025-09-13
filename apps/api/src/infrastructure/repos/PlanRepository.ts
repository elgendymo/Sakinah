import { Plan } from '@sakinah/types';
import { supabase } from '../db/supabase';

export class PlanRepository {
  async createPlan(data: Omit<Plan, 'id' | 'createdAt'>): Promise<Plan> {
    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        user_id: data.userId,
        kind: data.kind,
        target: data.target,
        micro_habits: data.microHabits,
        dua_ids: data.duaIds,
        content_ids: data.contentIds,
        status: data.status,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToModel(plan);
  }

  async getActivePlans(userId: string): Promise<Plan[]> {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return plans.map(this.mapToModel);
  }

  async archivePlan(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  private mapToModel(row: any): Plan {
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      target: row.target,
      microHabits: row.micro_habits,
      duaIds: row.dua_ids,
      contentIds: row.content_ids,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}