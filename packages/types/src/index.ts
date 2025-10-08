import { z } from 'zod';

// User & Auth Types
export const UserSchema = z.object({
  id: z.string().uuid(),
  handle: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const ProfileSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  timezone: z.string(),
  createdAt: z.string().datetime(),
});

// Content Types
export const ContentTypeEnum = z.enum(['ayah', 'hadith', 'dua', 'note']);

export const ContentSnippetSchema = z.object({
  id: z.string().uuid(),
  type: ContentTypeEnum,
  text: z.string(),
  ref: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

// Plan Types
export const PlanKindEnum = z.enum(['takhliyah', 'tahliyah']);
export const PlanStatusEnum = z.enum(['active', 'archived']);

export const MicroHabitSchema = z.object({
  title: z.string(),
  schedule: z.string(),
  target: z.number().min(1),
});

export const PlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: PlanKindEnum,
  target: z.string(),
  microHabits: z.array(MicroHabitSchema),
  duaIds: z.array(z.string().uuid()).optional(),
  contentIds: z.array(z.string().uuid()).optional(),
  status: PlanStatusEnum,
  createdAt: z.string().datetime(),
});

// Habit Types
export const HabitScheduleSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'custom']),
  days: z.array(z.number().min(0).max(6)).optional(),
});

export const HabitSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  title: z.string(),
  schedule: HabitScheduleSchema,
  streakCount: z.number().min(0),
  lastCompletedOn: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const HabitCompletionSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  userId: z.string().uuid(),
  completedOn: z.string(),
});

// Check-in Types
export const CheckinSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string(),
  mood: z.number().min(-2).max(2).optional(),
  intention: z.string().optional(),
  reflection: z.string().optional(),
  createdAt: z.string().datetime(),
});

// Journal Types
export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
});

// API Request/Response DTOs
export const CreatePlanInputSchema = z.object({
  mode: PlanKindEnum,
  input: z.string().min(1).max(500),
});

export const SuggestPlanResponseSchema = z.object({
  plan: PlanSchema,
  suggestions: z.array(ContentSnippetSchema),
});

export const CreateCheckinInputSchema = z.object({
  mood: z.number().min(-2).max(2).optional(),
  intention: z.string().max(500).optional(),
  reflection: z.string().max(1000).optional(),
});

export const ToggleHabitInputSchema = z.object({
  completed: z.boolean(),
});

export const AIExplainInputSchema = z.object({
  struggle: z.string().min(1).max(500),
});

export const AIExplainResponseSchema = z.object({
  guidance: z.string(),
  refs: z.array(z.string()).optional(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type ContentSnippet = z.infer<typeof ContentSnippetSchema>;
export type ContentType = z.infer<typeof ContentTypeEnum>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanKind = z.infer<typeof PlanKindEnum>;
export type PlanStatus = z.infer<typeof PlanStatusEnum>;
export type MicroHabit = z.infer<typeof MicroHabitSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type HabitSchedule = z.infer<typeof HabitScheduleSchema>;
export type HabitCompletion = z.infer<typeof HabitCompletionSchema>;
export type Checkin = z.infer<typeof CheckinSchema>;
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;
export type SuggestPlanResponse = z.infer<typeof SuggestPlanResponseSchema>;
export type CreateCheckinInput = z.infer<typeof CreateCheckinInputSchema>;
export type ToggleHabitInput = z.infer<typeof ToggleHabitInputSchema>;
export type AIExplainInput = z.infer<typeof AIExplainInputSchema>;
export type AIExplainResponse = z.infer<typeof AIExplainResponseSchema>;

// Survey Types - Tazkiyah Onboarding System
export const GenderEnum = z.enum(['male', 'female']);
export const LikertScoreEnum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
export const DiseaseEnum = z.enum([
  'envy', 'arrogance', 'selfDeception', 'lust',
  'anger', 'malice', 'backbiting', 'suspicion',
  'loveOfDunya', 'laziness', 'despair'
]);

// Authentication with survey fields
export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  gender: GenderEnum,
});

// Survey Response Types
export const QuestionResponseSchema = z.object({
  questionId: z.string(),
  score: LikertScoreEnum,
  note: z.string().optional(),
});

export const SurveyResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  phaseNumber: z.number().min(1).max(3),
  questionId: z.string(),
  score: LikertScoreEnum,
  note: z.string().optional(),
  completedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

// Survey Phase Request Types
export const Phase1RequestSchema = z.object({
  envyScore: LikertScoreEnum,
  envyNote: z.string().optional(),
  arroganceScore: LikertScoreEnum,
  arroganceNote: z.string().optional(),
  selfDeceptionScore: LikertScoreEnum,
  selfDeceptionNote: z.string().optional(),
  lustScore: LikertScoreEnum,
  lustNote: z.string().optional(),
});

export const Phase2RequestSchema = z.object({
  angerScore: LikertScoreEnum,
  angerNote: z.string().optional(),
  maliceScore: LikertScoreEnum,
  maliceNote: z.string().optional(),
  backbitingScore: LikertScoreEnum,
  backbitingNote: z.string().optional(),
  suspicionScore: LikertScoreEnum,
  suspicionNote: z.string().optional(),
  loveOfDunyaScore: LikertScoreEnum,
  loveOfDunyaNote: z.string().optional(),
  lazinessScore: LikertScoreEnum,
  lazinessNote: z.string().optional(),
  despairScore: LikertScoreEnum,
  despairNote: z.string().optional(),
});

export const ReflectionRequestSchema = z.object({
  strongestStruggle: z.string().min(10).max(500),
  dailyHabit: z.string().min(10).max(500),
});

// Survey Results Types
export const PersonalizedHabitSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  frequency: z.enum(['daily', 'weekly', 'bi-weekly']),
  targetDisease: DiseaseEnum,
  difficultyLevel: z.enum(['easy', 'moderate', 'challenging']),
  estimatedDuration: z.string(),
  islamicContent: z.array(ContentSnippetSchema),
});

export const PracticeSchema = z.object({
  name: z.string(),
  type: z.enum(['dhikr', 'dua', 'reflection', 'behavioral', 'study']),
  description: z.string(),
  frequency: z.string(),
  islamicBasis: z.array(ContentSnippetSchema),
});

export const TazkiyahPhaseSchema = z.object({
  phaseNumber: z.number(),
  title: z.string(),
  description: z.string(),
  targetDiseases: z.array(DiseaseEnum),
  duration: z.string(),
  practices: z.array(PracticeSchema),
  checkpoints: z.array(z.string()),
});

export const PlanMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetDate: z.string().datetime(),
  completed: z.boolean().default(false),
});

export const TazkiyahPlanSchema = z.object({
  criticalDiseases: z.array(DiseaseEnum),
  planType: z.literal('takhliyah'),
  phases: z.array(TazkiyahPhaseSchema),
  expectedDuration: z.string(),
  milestones: z.array(PlanMilestoneSchema),
});

export const CategorizedDiseasesSchema = z.object({
  critical: z.array(DiseaseEnum),
  moderate: z.array(DiseaseEnum),
  strengths: z.array(DiseaseEnum),
});

export const ChartDataSchema = z.object({
  labels: z.array(z.string()),
  datasets: z.array(z.object({
    label: z.string(),
    data: z.array(z.number()),
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
  })),
});

export const ExportOptionSchema = z.object({
  format: z.enum(['pdf', 'json']),
  label: z.string(),
  available: z.boolean().default(true),
});

export const SurveyResultsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  diseaseScores: z.record(DiseaseEnum, LikertScoreEnum),
  categorizedDiseases: CategorizedDiseasesSchema,
  reflectionAnswers: z.object({
    strongestStruggle: z.string(),
    dailyHabit: z.string(),
  }),
  personalizedHabits: z.array(PersonalizedHabitSchema),
  tazkiyahPlan: TazkiyahPlanSchema,
  radarChartData: ChartDataSchema,
  exportOptions: z.array(ExportOptionSchema),
  generatedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Survey Progress Types
export const SurveyProgressSchema = z.object({
  userId: z.string().uuid(),
  currentPhase: z.number().min(0).max(4),
  phase1Completed: z.boolean().default(false),
  phase2Completed: z.boolean().default(false),
  reflectionCompleted: z.boolean().default(false),
  resultsGenerated: z.boolean().default(false),
  startedAt: z.string().datetime(),
  lastUpdated: z.string().datetime(),
});

// Preview Types (for reflection phase)
export const ReflectionPreviewSchema = z.object({
  personalizedHabits: z.array(z.string()),
  takhliyahFocus: z.array(z.string()),
  tahliyahFocus: z.array(z.string()),
});

// API Response Types
export const SurveyProgressResponseSchema = z.object({
  progress: SurveyProgressSchema,
  canAdvanceToPhase: z.number(),
});

export const Phase1ResponseSchema = z.object({
  saved: z.boolean(),
  progress: SurveyProgressSchema,
  nextPhaseAvailable: z.boolean(),
});

export const Phase2ResponseSchema = z.object({
  saved: z.boolean(),
  progress: SurveyProgressSchema,
  nextPhaseAvailable: z.boolean(),
});

export const ReflectionResponseSchema = z.object({
  saved: z.boolean(),
  preview: ReflectionPreviewSchema,
  progress: SurveyProgressSchema,
  resultsAvailable: z.boolean(),
});

// Type exports for Survey system
export type Gender = z.infer<typeof GenderEnum>;
export type LikertScore = z.infer<typeof LikertScoreEnum>;
export type Disease = z.infer<typeof DiseaseEnum>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;
export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;
export type Phase1Request = z.infer<typeof Phase1RequestSchema>;
export type Phase2Request = z.infer<typeof Phase2RequestSchema>;
export type ReflectionRequest = z.infer<typeof ReflectionRequestSchema>;
export type PersonalizedHabit = z.infer<typeof PersonalizedHabitSchema>;
export type Practice = z.infer<typeof PracticeSchema>;
export type TazkiyahPhase = z.infer<typeof TazkiyahPhaseSchema>;
export type PlanMilestone = z.infer<typeof PlanMilestoneSchema>;
export type TazkiyahPlan = z.infer<typeof TazkiyahPlanSchema>;
export type CategorizedDiseases = z.infer<typeof CategorizedDiseasesSchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
export type ExportOption = z.infer<typeof ExportOptionSchema>;
export type SurveyResults = z.infer<typeof SurveyResultsSchema>;
export type SurveyProgress = z.infer<typeof SurveyProgressSchema>;
export type ReflectionPreview = z.infer<typeof ReflectionPreviewSchema>;
export type SurveyProgressResponse = z.infer<typeof SurveyProgressResponseSchema>;
export type Phase1Response = z.infer<typeof Phase1ResponseSchema>;
export type Phase2Response = z.infer<typeof Phase2ResponseSchema>;
export type ReflectionResponse = z.infer<typeof ReflectionResponseSchema>;