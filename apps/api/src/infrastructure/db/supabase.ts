import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('Supabase configuration missing');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          handle: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          handle?: string | null;
          created_at?: string;
        };
        Update: {
          handle?: string | null;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
          timezone?: string;
        };
      };
      content_snippets: {
        Row: {
          id: string;
          type: 'ayah' | 'hadith' | 'dua' | 'note';
          text: string;
          ref: string;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'ayah' | 'hadith' | 'dua' | 'note';
          text: string;
          ref: string;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          text?: string;
          ref?: string;
          tags?: string[];
        };
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          kind: 'takhliyah' | 'tahliyah';
          target: string;
          micro_habits: any;
          dua_ids: string[] | null;
          content_ids: string[] | null;
          status: 'active' | 'archived';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: 'takhliyah' | 'tahliyah';
          target: string;
          micro_habits: any;
          dua_ids?: string[] | null;
          content_ids?: string[] | null;
          status?: 'active' | 'archived';
          created_at?: string;
        };
        Update: {
          micro_habits?: any;
          dua_ids?: string[] | null;
          content_ids?: string[] | null;
          status?: 'active' | 'archived';
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          title: string;
          schedule: any;
          streak_count: number;
          last_completed_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          title: string;
          schedule: any;
          streak_count?: number;
          last_completed_on?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          schedule?: any;
          streak_count?: number;
          last_completed_on?: string | null;
        };
      };
      habit_completions: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          completed_on: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          completed_on: string;
        };
        Update: {};
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          mood: number | null;
          intention: string | null;
          reflection: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          mood?: number | null;
          intention?: string | null;
          reflection?: string | null;
          created_at?: string;
        };
        Update: {
          mood?: number | null;
          intention?: string | null;
          reflection?: string | null;
        };
      };
      journals: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          tags?: string[] | null;
        };
      };
    };
  };
};