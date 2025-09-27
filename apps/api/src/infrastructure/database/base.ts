import {
  User,
  Profile,
  ContentSnippet,
  Plan,
  Habit,
  HabitCompletion,
  Checkin,
  JournalEntry,
} from '@sakinah/types';
import {
  IDatabaseClient,
  DatabaseResult,
  UserRow,
  ProfileRow,
  ContentSnippetRow,
  PlanRow,
  HabitRow,
  HabitCompletionRow,
  CheckinRow,
  JournalRow,
  DhikrSessionData,
  DhikrStatsData,
  DhikrTypeData,
  IntentionData,
  OnboardingData,
  PrayerTimesData,
  UserPreferencesData,
} from './types';

export abstract class BaseDatabaseClient implements IDatabaseClient {
  createIntention(data: { userId: string; text: string; description?: string | null; priority?: "low" | "medium" | "high"; status?: "active" | "completed" | "archived"; targetDate?: string | null; completedAt?: string | null; reminderEnabled?: boolean; reminderTime?: string | null; reminderDaysOfWeek?: number[] | null; tags?: string[]; }): Promise<DatabaseResult<IntentionData>> {
      throw new Error("Method not implemented.");
  }
  getIntentionsByUserId(userId: string, filters?: { status?: "active" | "completed" | "archived"; priority?: "low" | "medium" | "high"; tags?: string[]; search?: string; targetDateFrom?: string; targetDateTo?: string; overdueOnly?: boolean; limit?: number; offset?: number; sortBy?: string; sortOrder?: "ASC" | "DESC"; }): Promise<DatabaseResult<IntentionData[]>> {
      throw new Error("Method not implemented.");
  }
  getIntentionById(id: string): Promise<DatabaseResult<IntentionData | null>> {
      throw new Error("Method not implemented.");
  }
  updateIntention(id: string, userId: string, updates: { text?: string; description?: string | null; priority?: "low" | "medium" | "high"; status?: "active" | "completed" | "archived"; targetDate?: string | null; completedAt?: string | null; reminderEnabled?: boolean; reminderTime?: string | null; reminderDaysOfWeek?: number[] | null; tags?: string[]; }): Promise<DatabaseResult<IntentionData>> {
      throw new Error("Method not implemented.");
  }
  deleteIntention(id: string, userId: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  countIntentionsByUser(userId: string, filters?: { status?: "active" | "completed" | "archived"; priority?: "low" | "medium" | "high"; tags?: string[]; targetDateFrom?: string; targetDateTo?: string; overdueOnly?: boolean; }): Promise<DatabaseResult<number>> {
      throw new Error("Method not implemented.");
  }
  getIntentionsByTags(userId: string, tags: string[]): Promise<DatabaseResult<IntentionData[]>> {
      throw new Error("Method not implemented.");
  }
  getOverdueIntentions(userId: string): Promise<DatabaseResult<IntentionData[]>> {
      throw new Error("Method not implemented.");
  }
  getIntentionsDueSoon(userId: string, daysAhead?: number): Promise<DatabaseResult<IntentionData[]>> {
      throw new Error("Method not implemented.");
  }
  createPrayerTimes(data: { userId: string; latitude: number; longitude: number; city?: string; country?: string; timezone?: string; calculationMethod: string; date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; qiyam?: string; hijriDate?: string; validUntil: string; }): Promise<DatabaseResult<PrayerTimesData>> {
      throw new Error("Method not implemented.");
  }
  getPrayerTimesById(id: string): Promise<DatabaseResult<PrayerTimesData | null>> {
      throw new Error("Method not implemented.");
  }
  getPrayerTimesByUserAndDate(userId: string, date: string): Promise<DatabaseResult<PrayerTimesData | null>> {
      throw new Error("Method not implemented.");
  }
  getPrayerTimesByLocationAndDate(latitude: number, longitude: number, calculationMethod: string, date: string): Promise<DatabaseResult<PrayerTimesData | null>> {
      throw new Error("Method not implemented.");
  }
  getPrayerTimesByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<DatabaseResult<PrayerTimesData[]>> {
      throw new Error("Method not implemented.");
  }
  deletePrayerTimes(id: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  deleteExpiredPrayerTimes(): Promise<DatabaseResult<number>> {
      throw new Error("Method not implemented.");
  }
  createDhikrSession(data: { userId: string; dhikrType: string; dhikrText: string; count?: number; targetCount?: number; date: string; sessionStart?: string; sessionEnd?: string; notes?: string; tags?: string[]; }): Promise<DatabaseResult<DhikrSessionData>> {
      throw new Error("Method not implemented.");
  }
  getDhikrSessionById(id: string): Promise<DatabaseResult<DhikrSessionData | null>> {
      throw new Error("Method not implemented.");
  }
  getDhikrSessionsByUser(userId: string, filters?: { dhikrType?: string; date?: string; dateFrom?: string; dateTo?: string; tags?: string[]; limit?: number; offset?: number; sortBy?: string; sortOrder?: "ASC" | "DESC"; }): Promise<DatabaseResult<DhikrSessionData[]>> {
      throw new Error("Method not implemented.");
  }
  updateDhikrSession(id: string, userId: string, updates: { count?: number; targetCount?: number; sessionEnd?: string; notes?: string; tags?: string[]; }): Promise<DatabaseResult<DhikrSessionData>> {
      throw new Error("Method not implemented.");
  }
  incrementDhikrCount(id: string, userId: string, increment?: number): Promise<DatabaseResult<DhikrSessionData>> {
      throw new Error("Method not implemented.");
  }
  deleteDhikrSession(id: string, userId: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  getDhikrSessionsByDate(userId: string, date: string): Promise<DatabaseResult<DhikrSessionData[]>> {
      throw new Error("Method not implemented.");
  }
  countDhikrSessionsByUser(userId: string, filters?: { dhikrType?: string; dateFrom?: string; dateTo?: string; }): Promise<DatabaseResult<number>> {
      throw new Error("Method not implemented.");
  }
  createDhikrType(data: { name: string; displayName: string; arabicText?: string; transliteration?: string; translation?: string; description?: string; recommendedCount?: number; tags?: string[]; isActive?: boolean; }): Promise<DatabaseResult<DhikrTypeData>> {
      throw new Error("Method not implemented.");
  }
  getDhikrTypes(filters?: { isActive?: boolean; tags?: string[]; search?: string; }): Promise<DatabaseResult<DhikrTypeData[]>> {
      throw new Error("Method not implemented.");
  }
  getDhikrTypeById(id: string): Promise<DatabaseResult<DhikrTypeData | null>> {
      throw new Error("Method not implemented.");
  }
  getDhikrTypeByName(name: string): Promise<DatabaseResult<DhikrTypeData | null>> {
      throw new Error("Method not implemented.");
  }
  updateDhikrType(id: string, updates: { displayName?: string; arabicText?: string; transliteration?: string; translation?: string; description?: string; recommendedCount?: number; tags?: string[]; isActive?: boolean; }): Promise<DatabaseResult<DhikrTypeData>> {
      throw new Error("Method not implemented.");
  }
  deleteDhikrType(id: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  createOrUpdateDhikrStats(data: { userId: string; dhikrType: string; periodType: "daily" | "weekly" | "monthly"; periodStart: string; periodEnd: string; totalCount: number; sessionCount: number; averageSessionDuration?: number; }): Promise<DatabaseResult<DhikrStatsData>> {
      throw new Error("Method not implemented.");
  }
  getDhikrStatsByUser(userId: string, filters?: { dhikrType?: string; periodType?: "daily" | "weekly" | "monthly"; periodStart?: string; periodEnd?: string; }): Promise<DatabaseResult<DhikrStatsData[]>> {
      throw new Error("Method not implemented.");
  }
  aggregateDhikrStats(userId: string, periodType: "daily" | "weekly" | "monthly", periodStart: string, periodEnd: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  getUserPreferences(userId: string): Promise<DatabaseResult<UserPreferencesData | null>> {
      throw new Error("Method not implemented.");
  }
  createUserPreferences(data: UserPreferencesData): Promise<DatabaseResult<UserPreferencesData>> {
      throw new Error("Method not implemented.");
  }
  updateUserPreferences(userId: string, updates: Partial<UserPreferencesData>): Promise<DatabaseResult<UserPreferencesData>> {
      throw new Error("Method not implemented.");
  }
  upsertUserPreferences(data: UserPreferencesData): Promise<DatabaseResult<UserPreferencesData>> {
      throw new Error("Method not implemented.");
  }
  deleteUserPreferences(userId: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  createOnboarding(data: { userId: string; currentStep?: string; completedSteps?: string[]; profileCompletionPercentage?: number; dataCollected?: Record<string, any>; languageSelected?: string | null; locationSet?: boolean; prayerCalculationMethodSet?: boolean; notificationsConfigured?: boolean; privacyPreferencesSet?: boolean; displayPreferencesSet?: boolean; isCompleted?: boolean; skippedSteps?: string[]; }): Promise<DatabaseResult<OnboardingData>> {
      throw new Error("Method not implemented.");
  }
  getOnboardingByUserId(userId: string): Promise<DatabaseResult<OnboardingData | null>> {
      throw new Error("Method not implemented.");
  }
  updateOnboarding(userId: string, updates: { currentStep?: string; completedSteps?: string[]; profileCompletionPercentage?: number; dataCollected?: Record<string, any>; languageSelected?: string | null; locationSet?: boolean; prayerCalculationMethodSet?: boolean; notificationsConfigured?: boolean; privacyPreferencesSet?: boolean; displayPreferencesSet?: boolean; isCompleted?: boolean; skippedSteps?: string[]; completionDate?: string | null; }): Promise<DatabaseResult<OnboardingData>> {
      throw new Error("Method not implemented.");
  }
  upsertOnboarding(data: OnboardingData): Promise<DatabaseResult<OnboardingData>> {
      throw new Error("Method not implemented.");
  }
  deleteOnboarding(userId: string): Promise<DatabaseResult<void>> {
      throw new Error("Method not implemented.");
  }
  // Common result formatters
  protected formatResult<T>(data: T | null, error?: Error): DatabaseResult<T> {
    if (error) {
      return { data: null, error: { message: error.message } };
    }
    return { data, error: null };
  }

  protected formatSuccessResult<T>(data: T): DatabaseResult<T> {
    return { data, error: null };
  }

  protected formatErrorResult<T>(message: string): DatabaseResult<T> {
    return { data: null, error: { message } };
  }

  // Common data mappers (handles snake_case ↔ camelCase)
  protected mapUserRow(row: UserRow | null): User | null {
    if (!row) return null;
    return {
      id: row.id,
      handle: row.handle ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected mapProfileRow(row: ProfileRow | null): Profile | null {
    if (!row) return null;
    return {
      userId: row.user_id,
      displayName: row.display_name,
      timezone: row.timezone,
      createdAt: row.created_at,
    };
  }

  protected mapContentSnippetRow(row: ContentSnippetRow | null): ContentSnippet | null {
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      text: row.text,
      ref: row.ref,
      tags: row.tags,
      createdAt: row.created_at,
    };
  }

  protected mapPlanRow(row: PlanRow | null): Plan | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      target: row.target,
      microHabits: row.micro_habits,
      duaIds: row.dua_ids ?? undefined,
      contentIds: row.content_ids ?? undefined,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  protected mapHabitRow(row: HabitRow | null): Habit | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      title: row.title,
      schedule: row.schedule,
      streakCount: row.streak_count,
      lastCompletedOn: row.last_completed_on ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected mapHabitCompletionRow(row: HabitCompletionRow | null): HabitCompletion | null {
    if (!row) return null;
    return {
      id: row.id,
      habitId: row.habit_id,
      userId: row.user_id,
      completedOn: row.completed_on,
    };
  }

  protected mapCheckinRow(row: CheckinRow | null): Checkin | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      mood: row.mood ?? undefined,
      intention: row.intention ?? undefined,
      reflection: row.reflection ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected mapJournalRow(row: JournalRow | null): JournalEntry | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      tags: row.tags ?? undefined,
      createdAt: row.created_at,
    };
  }

  // Helper to generate UUIDs (for SQLite)
  protected generateId(): string {
    return crypto.randomUUID();
  }

  // Helper to get current timestamp
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // All methods declared as abstract - must be implemented by subclasses
  abstract getUserById(id: string): Promise<DatabaseResult<User | null>>;
  abstract createUser(data: { id?: string; handle?: string }): Promise<DatabaseResult<User>>;

  abstract getProfileByUserId(userId: string): Promise<DatabaseResult<Profile | null>>;
  abstract createProfile(data: {
    userId: string;
    displayName: string;
    timezone?: string;
  }): Promise<DatabaseResult<Profile>>;
  abstract updateProfile(
    userId: string,
    updates: { displayName?: string; timezone?: string }
  ): Promise<DatabaseResult<Profile>>;

  abstract getContentSnippetById(id: string): Promise<DatabaseResult<ContentSnippet | null>>;
  abstract getContentSnippetsByTags(tags: string[]): Promise<DatabaseResult<ContentSnippet[]>>;
  abstract getAllContentSnippets(): Promise<DatabaseResult<ContentSnippet[]>>;

  abstract createPlan(data: {
    userId: string;
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: any;
    duaIds?: string[];
    contentIds?: string[];
  }): Promise<DatabaseResult<Plan>>;
  abstract getPlansByUserId(userId: string): Promise<DatabaseResult<Plan[]>>;
  abstract getPlanById(id: string): Promise<DatabaseResult<Plan | null>>;
  abstract updatePlanStatus(id: string, status: 'active' | 'archived'): Promise<DatabaseResult<Plan>>;

  abstract createHabit(data: {
    userId: string;
    planId: string;
    title: string;
    schedule: any;
  }): Promise<DatabaseResult<Habit>>;
  abstract getHabitsByUserId(userId: string): Promise<DatabaseResult<Habit[]>>;
  abstract getHabitById(id: string): Promise<DatabaseResult<Habit | null>>;
  abstract updateHabitStreak(
    id: string,
    streakCount: number,
    lastCompletedOn?: string
  ): Promise<DatabaseResult<Habit>>;

  abstract createHabitCompletion(data: {
    habitId: string;
    userId: string;
    completedOn: string;
  }): Promise<DatabaseResult<HabitCompletion>>;
  abstract getHabitCompletionsByHabit(habitId: string): Promise<DatabaseResult<HabitCompletion[]>>;
  abstract getHabitCompletionByDate(
    habitId: string,
    userId: string,
    completedOn: string
  ): Promise<DatabaseResult<HabitCompletion | null>>;
  abstract deleteHabitCompletion(id: string): Promise<DatabaseResult<void>>;

  abstract createCheckin(data: {
    userId: string;
    date: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<DatabaseResult<Checkin>>;
  abstract getCheckinByDate(userId: string, date: string): Promise<DatabaseResult<Checkin | null>>;
  abstract updateCheckin(
    id: string,
    userId: string,
    updates: {
      mood?: number;
      intention?: string;
      reflection?: string;
    }
  ): Promise<DatabaseResult<Checkin>>;
  abstract getCheckinsByUser(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<DatabaseResult<Checkin[]>>;
  abstract countCheckinsByUser(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
    }
  ): Promise<DatabaseResult<number>>;

  abstract createJournalEntry(data: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<DatabaseResult<JournalEntry>>;
  abstract getJournalsByUserId(
    userId: string,
    filters?: {
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'content';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<DatabaseResult<{ entries: JournalEntry[]; pagination: any }>>;
  abstract getJournalById(id: string): Promise<DatabaseResult<JournalEntry | null>>;
  abstract updateJournal(
    id: string,
    userId: string,
    updates: { content?: string; tags?: string[] }
  ): Promise<DatabaseResult<JournalEntry>>;
  abstract deleteJournal(id: string, userId: string): Promise<DatabaseResult<void>>;

  abstract healthCheck(): Promise<{
    status: 'ok' | 'error';
    database: 'sqlite' | 'supabase';
    message?: string;
  }>;
  abstract close(): Promise<void>;
}