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

// Common result wrapper for unified error handling
export interface DatabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// Database row types (snake_case from database)
export interface UserRow {
  id: string;
  handle: string | null;
  created_at: string;
}

export interface ProfileRow {
  user_id: string;
  display_name: string;
  timezone: string;
  created_at: string;
}

export interface ContentSnippetRow {
  id: string;
  type: 'ayah' | 'hadith' | 'dua' | 'note';
  text: string;
  ref: string;
  tags: string[];
  created_at: string;
}

export interface PlanRow {
  id: string;
  user_id: string;
  kind: 'takhliyah' | 'tahliyah';
  target: string;
  micro_habits: any;
  dua_ids: string[] | null;
  content_ids: string[] | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface HabitRow {
  id: string;
  user_id: string;
  plan_id: string;
  title: string;
  schedule: any;
  streak_count: number;
  last_completed_on: string | null;
  created_at: string;
}

export interface HabitCompletionRow {
  id: string;
  habit_id: string;
  user_id: string;
  completed_on: string;
}

export interface CheckinRow {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  intention: string | null;
  reflection: string | null;
  created_at: string;
}

export interface JournalRow {
  id: string;
  user_id: string;
  content: string;
  tags: string[] | null;
  created_at: string;
}

export interface IntentionRow {
  id: string;
  user_id: string;
  text: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'archived';
  target_date: string | null;
  completed_at: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  reminder_days_of_week: number[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PrayerTimesRow {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  timezone: string | null;
  calculation_method: string;
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  qiyam: string | null;
  hijri_date: string | null;
  valid_until: string;
  created_at: string;
}

// Domain type for PrayerTimes
export interface PrayerTimesData {
  id: string;
  userId: string;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    timezone?: string;
  };
  calculationMethod: string;
  date: string;
  prayerTimes: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    qiyam?: string;
  };
  hijriDate?: string;
  validUntil: string;
  createdAt: string;
}

// Domain type for Intentions
export interface IntentionData {
  id: string;
  userId: string;
  text: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'archived';
  targetDate: string | null;
  completedAt: string | null;
  reminder: {
    enabled: boolean;
    time?: string;
    daysOfWeek?: number[];
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Database row type for User Preferences
export interface UserPreferencesRow {
  user_id: string;
  language: 'en' | 'ar' | 'ur';
  location: string | null; // JSON string
  prayer_calculation_method: 'ISNA' | 'MWL' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran' | 'Jafari';
  notification_settings: string; // JSON string
  privacy_settings: string; // JSON string
  display_settings: string; // JSON string
  updated_at: string;
  created_at: string;
}

// Database row types for Dhikr
export interface DhikrSessionRow {
  id: string;
  user_id: string;
  dhikr_type: string;
  dhikr_text: string;
  count: number;
  target_count: number | null;
  date: string;
  session_start: string;
  session_end: string | null;
  notes: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface DhikrTypeRow {
  id: string;
  name: string;
  display_name: string;
  arabic_text: string | null;
  transliteration: string | null;
  translation: string | null;
  description: string | null;
  recommended_count: number | null;
  tags: string;
  is_active: number;
  created_at: string;
}

export interface DhikrStatsRow {
  id: string;
  user_id: string;
  dhikr_type: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  total_count: number;
  session_count: number;
  average_session_duration: number | null;
  created_at: string;
  updated_at: string;
}

// Domain type for User Preferences
export interface UserPreferencesData {
  userId: string;
  language: 'en' | 'ar' | 'ur';
  location?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  prayerCalculationMethod: 'ISNA' | 'MWL' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran' | 'Jafari';
  notificationSettings: {
    fajrReminder?: boolean;
    dailyReminder?: boolean;
    habitStreak?: boolean;
    prayerTimes?: boolean;
    reminderTime?: string;
  };
  privacySettings: {
    dataSharing?: boolean;
    analytics?: boolean;
    publicProfile?: boolean;
  };
  displaySettings: {
    theme?: 'light' | 'dark' | 'auto';
    fontSize?: 'small' | 'medium' | 'large';
    showArabicWithTranslation?: boolean;
  };
  updatedAt: string;
  createdAt: string;
}

// Domain types for Dhikr
export interface DhikrSessionData {
  id: string;
  userId: string;
  dhikrType: string;
  dhikrText: string;
  count: number;
  targetCount: number | null;
  date: string;
  sessionStart: string;
  sessionEnd: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DhikrTypeData {
  id: string;
  name: string;
  displayName: string;
  arabicText: string | null;
  transliteration: string | null;
  translation: string | null;
  description: string | null;
  recommendedCount: number | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
}

export interface DhikrStatsData {
  id: string;
  userId: string;
  dhikrType: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  totalCount: number;
  sessionCount: number;
  averageSessionDuration: number | null;
  createdAt: string;
  updatedAt: string;
}

// Database row type for Onboarding
export interface OnboardingRow {
  id: string;
  user_id: string;
  current_step: string;
  completed_steps: string; // JSON array
  profile_completion_percentage: number;
  data_collected: string; // JSON object
  language_selected: string | null;
  location_set: number; // BOOLEAN as INTEGER
  prayer_calculation_method_set: number; // BOOLEAN as INTEGER
  notifications_configured: number; // BOOLEAN as INTEGER
  privacy_preferences_set: number; // BOOLEAN as INTEGER
  display_preferences_set: number; // BOOLEAN as INTEGER
  is_completed: number; // BOOLEAN as INTEGER
  skipped_steps: string; // JSON array
  completion_date: string | null;
  started_at: string;
  updated_at: string;
}

// Domain type for Onboarding
export interface OnboardingData {
  id: string;
  userId: string;
  currentStep: string;
  completedSteps: string[];
  profileCompletionPercentage: number;
  dataCollected: Record<string, any>;
  languageSelected: string | null;
  locationSet: boolean;
  prayerCalculationMethodSet: boolean;
  notificationsConfigured: boolean;
  privacyPreferencesSet: boolean;
  displayPreferencesSet: boolean;
  isCompleted: boolean;
  skippedSteps: string[];
  completionDate: string | null;
  startedAt: string;
  updatedAt: string;
}

// Unified interface for all database operations
export interface IDatabaseClient {
  // User operations
  getUserById(id: string): Promise<DatabaseResult<User | null>>;
  createUser(data: { id?: string; handle?: string }): Promise<DatabaseResult<User>>;

  // Profile operations
  getProfileByUserId(userId: string): Promise<DatabaseResult<Profile | null>>;
  createProfile(data: {
    userId: string;
    displayName: string;
    timezone?: string;
  }): Promise<DatabaseResult<Profile>>;
  updateProfile(
    userId: string,
    updates: { displayName?: string; timezone?: string }
  ): Promise<DatabaseResult<Profile>>;

  // Content operations
  getContentSnippetById(id: string): Promise<DatabaseResult<ContentSnippet | null>>;
  getContentSnippetsByTags(tags: string[]): Promise<DatabaseResult<ContentSnippet[]>>;
  getAllContentSnippets(): Promise<DatabaseResult<ContentSnippet[]>>;

  // Plan operations
  createPlan(data: {
    userId: string;
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: any;
    duaIds?: string[];
    contentIds?: string[];
  }): Promise<DatabaseResult<Plan>>;
  getPlansByUserId(userId: string): Promise<DatabaseResult<Plan[]>>;
  getPlanById(id: string): Promise<DatabaseResult<Plan | null>>;
  updatePlanStatus(id: string, status: 'active' | 'archived'): Promise<DatabaseResult<Plan>>;

  // Habit operations
  createHabit(data: {
    userId: string;
    planId: string;
    title: string;
    schedule: any;
  }): Promise<DatabaseResult<Habit>>;
  getHabitsByUserId(userId: string): Promise<DatabaseResult<Habit[]>>;
  getHabitById(id: string): Promise<DatabaseResult<Habit | null>>;
  updateHabitStreak(
    id: string,
    streakCount: number,
    lastCompletedOn?: string
  ): Promise<DatabaseResult<Habit>>;

  // Habit completion operations
  createHabitCompletion(data: {
    habitId: string;
    userId: string;
    completedOn: string;
  }): Promise<DatabaseResult<HabitCompletion>>;
  getHabitCompletionsByHabit(habitId: string): Promise<DatabaseResult<HabitCompletion[]>>;
  getHabitCompletionByDate(
    habitId: string,
    userId: string,
    completedOn: string
  ): Promise<DatabaseResult<HabitCompletion | null>>;
  deleteHabitCompletion(id: string): Promise<DatabaseResult<void>>;

  // Checkin operations
  createCheckin(data: {
    userId: string;
    date: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<DatabaseResult<Checkin>>;
  getCheckinByDate(userId: string, date: string): Promise<DatabaseResult<Checkin | null>>;
  updateCheckin(
    id: string,
    userId: string,
    updates: {
      mood?: number;
      intention?: string;
      reflection?: string;
    }
  ): Promise<DatabaseResult<Checkin>>;
  getCheckinsByUser(
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
  countCheckinsByUser(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
    }
  ): Promise<DatabaseResult<number>>;

  // Journal operations
  createJournalEntry(data: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<DatabaseResult<JournalEntry>>;
  getJournalsByUserId(
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
  getJournalById(id: string): Promise<DatabaseResult<JournalEntry | null>>;
  updateJournal(
    id: string,
    userId: string,
    updates: { content?: string; tags?: string[] }
  ): Promise<DatabaseResult<JournalEntry>>;
  deleteJournal(id: string, userId: string): Promise<DatabaseResult<void>>;

  // Intention operations
  createIntention(data: {
    userId: string;
    text: string;
    description?: string | null;
    priority?: 'low' | 'medium' | 'high';
    status?: 'active' | 'completed' | 'archived';
    targetDate?: string | null;
    completedAt?: string | null;
    reminderEnabled?: boolean;
    reminderTime?: string | null;
    reminderDaysOfWeek?: number[] | null;
    tags?: string[];
  }): Promise<DatabaseResult<IntentionData>>;
  getIntentionsByUserId(
    userId: string,
    filters?: {
      status?: 'active' | 'completed' | 'archived';
      priority?: 'low' | 'medium' | 'high';
      tags?: string[];
      search?: string;
      targetDateFrom?: string;
      targetDateTo?: string;
      overdueOnly?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<DatabaseResult<IntentionData[]>>;
  getIntentionById(id: string): Promise<DatabaseResult<IntentionData | null>>;
  updateIntention(
    id: string,
    userId: string,
    updates: {
      text?: string;
      description?: string | null;
      priority?: 'low' | 'medium' | 'high';
      status?: 'active' | 'completed' | 'archived';
      targetDate?: string | null;
      completedAt?: string | null;
      reminderEnabled?: boolean;
      reminderTime?: string | null;
      reminderDaysOfWeek?: number[] | null;
      tags?: string[];
    }
  ): Promise<DatabaseResult<IntentionData>>;
  deleteIntention(id: string, userId: string): Promise<DatabaseResult<void>>;
  countIntentionsByUser(
    userId: string,
    filters?: {
      status?: 'active' | 'completed' | 'archived';
      priority?: 'low' | 'medium' | 'high';
      tags?: string[];
      targetDateFrom?: string;
      targetDateTo?: string;
      overdueOnly?: boolean;
    }
  ): Promise<DatabaseResult<number>>;
  getIntentionsByTags(userId: string, tags: string[]): Promise<DatabaseResult<IntentionData[]>>;
  getOverdueIntentions(userId: string): Promise<DatabaseResult<IntentionData[]>>;
  getIntentionsDueSoon(userId: string, daysAhead?: number): Promise<DatabaseResult<IntentionData[]>>;

  // Prayer times operations
  createPrayerTimes(data: {
    userId: string;
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    timezone?: string;
    calculationMethod: string;
    date: string; // YYYY-MM-DD
    fajr: string; // ISO datetime
    sunrise: string; // ISO datetime
    dhuhr: string; // ISO datetime
    asr: string; // ISO datetime
    maghrib: string; // ISO datetime
    isha: string; // ISO datetime
    qiyam?: string; // ISO datetime
    hijriDate?: string;
    validUntil: string; // ISO datetime
  }): Promise<DatabaseResult<PrayerTimesData>>;
  getPrayerTimesById(id: string): Promise<DatabaseResult<PrayerTimesData | null>>;
  getPrayerTimesByUserAndDate(userId: string, date: string): Promise<DatabaseResult<PrayerTimesData | null>>;
  getPrayerTimesByLocationAndDate(
    latitude: number,
    longitude: number,
    calculationMethod: string,
    date: string
  ): Promise<DatabaseResult<PrayerTimesData | null>>;
  getPrayerTimesByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<PrayerTimesData[]>>;
  deletePrayerTimes(id: string): Promise<DatabaseResult<void>>;
  deleteExpiredPrayerTimes(): Promise<DatabaseResult<number>>;

  // Dhikr operations
  createDhikrSession(data: {
    userId: string;
    dhikrType: string;
    dhikrText: string;
    count?: number;
    targetCount?: number;
    date: string; // YYYY-MM-DD
    sessionStart?: string; // ISO datetime
    sessionEnd?: string; // ISO datetime
    notes?: string;
    tags?: string[];
  }): Promise<DatabaseResult<DhikrSessionData>>;
  getDhikrSessionById(id: string): Promise<DatabaseResult<DhikrSessionData | null>>;
  getDhikrSessionsByUser(
    userId: string,
    filters?: {
      dhikrType?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<DatabaseResult<DhikrSessionData[]>>;
  updateDhikrSession(
    id: string,
    userId: string,
    updates: {
      count?: number;
      targetCount?: number;
      sessionEnd?: string;
      notes?: string;
      tags?: string[];
    }
  ): Promise<DatabaseResult<DhikrSessionData>>;
  incrementDhikrCount(
    id: string,
    userId: string,
    increment?: number
  ): Promise<DatabaseResult<DhikrSessionData>>;
  deleteDhikrSession(id: string, userId: string): Promise<DatabaseResult<void>>;
  getDhikrSessionsByDate(
    userId: string,
    date: string
  ): Promise<DatabaseResult<DhikrSessionData[]>>;
  countDhikrSessionsByUser(
    userId: string,
    filters?: {
      dhikrType?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<DatabaseResult<number>>;

  // Dhikr types operations
  createDhikrType(data: {
    name: string;
    displayName: string;
    arabicText?: string;
    transliteration?: string;
    translation?: string;
    description?: string;
    recommendedCount?: number;
    tags?: string[];
    isActive?: boolean;
  }): Promise<DatabaseResult<DhikrTypeData>>;
  getDhikrTypes(filters?: {
    isActive?: boolean;
    tags?: string[];
    search?: string;
  }): Promise<DatabaseResult<DhikrTypeData[]>>;
  getDhikrTypeById(id: string): Promise<DatabaseResult<DhikrTypeData | null>>;
  getDhikrTypeByName(name: string): Promise<DatabaseResult<DhikrTypeData | null>>;
  updateDhikrType(
    id: string,
    updates: {
      displayName?: string;
      arabicText?: string;
      transliteration?: string;
      translation?: string;
      description?: string;
      recommendedCount?: number;
      tags?: string[];
      isActive?: boolean;
    }
  ): Promise<DatabaseResult<DhikrTypeData>>;
  deleteDhikrType(id: string): Promise<DatabaseResult<void>>;

  // Dhikr statistics operations
  createOrUpdateDhikrStats(data: {
    userId: string;
    dhikrType: string;
    periodType: 'daily' | 'weekly' | 'monthly';
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
    totalCount: number;
    sessionCount: number;
    averageSessionDuration?: number;
  }): Promise<DatabaseResult<DhikrStatsData>>;
  getDhikrStatsByUser(
    userId: string,
    filters?: {
      dhikrType?: string;
      periodType?: 'daily' | 'weekly' | 'monthly';
      periodStart?: string;
      periodEnd?: string;
    }
  ): Promise<DatabaseResult<DhikrStatsData[]>>;
  aggregateDhikrStats(
    userId: string,
    periodType: 'daily' | 'weekly' | 'monthly',
    periodStart: string,
    periodEnd: string
  ): Promise<DatabaseResult<void>>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<DatabaseResult<UserPreferencesData | null>>;
  createUserPreferences(data: UserPreferencesData): Promise<DatabaseResult<UserPreferencesData>>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferencesData>): Promise<DatabaseResult<UserPreferencesData>>;
  upsertUserPreferences(data: UserPreferencesData): Promise<DatabaseResult<UserPreferencesData>>;
  deleteUserPreferences(userId: string): Promise<DatabaseResult<void>>;

  // Onboarding operations
  createOnboarding(data: {
    userId: string;
    currentStep?: string;
    completedSteps?: string[];
    profileCompletionPercentage?: number;
    dataCollected?: Record<string, any>;
    languageSelected?: string | null;
    locationSet?: boolean;
    prayerCalculationMethodSet?: boolean;
    notificationsConfigured?: boolean;
    privacyPreferencesSet?: boolean;
    displayPreferencesSet?: boolean;
    isCompleted?: boolean;
    skippedSteps?: string[];
  }): Promise<DatabaseResult<OnboardingData>>;
  getOnboardingByUserId(userId: string): Promise<DatabaseResult<OnboardingData | null>>;
  updateOnboarding(
    userId: string,
    updates: {
      currentStep?: string;
      completedSteps?: string[];
      profileCompletionPercentage?: number;
      dataCollected?: Record<string, any>;
      languageSelected?: string | null;
      locationSet?: boolean;
      prayerCalculationMethodSet?: boolean;
      notificationsConfigured?: boolean;
      privacyPreferencesSet?: boolean;
      displayPreferencesSet?: boolean;
      isCompleted?: boolean;
      skippedSteps?: string[];
      completionDate?: string | null;
    }
  ): Promise<DatabaseResult<OnboardingData>>;
  upsertOnboarding(data: OnboardingData): Promise<DatabaseResult<OnboardingData>>;
  deleteOnboarding(userId: string): Promise<DatabaseResult<void>>;

  // Health & cleanup
  healthCheck(): Promise<{
    status: 'ok' | 'error';
    database: 'sqlite' | 'supabase';
    message?: string;
  }>;
  close(): Promise<void>;
}