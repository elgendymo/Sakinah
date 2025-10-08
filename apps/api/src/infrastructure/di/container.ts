import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDatabaseClient } from '../database/types';
import { getDatabase } from '../database/factory';
import {
  IContentRepository,
  IPlanRepository,
  IHabitRepository,
  ICheckinRepository,
  IJournalRepository,
  IPrayerTimesRepository,
  IIntentionRepository
} from '@/domain/repositories';
import { IOnboardingRepository } from '@/domain/repositories/IOnboardingRepository';
import { IDhikrRepository } from '@/domain/repositories/IDhikrRepository';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { ContentRepositoryAdapter } from '../repos/ContentRepositoryAdapter';
import { PlanRepository } from '../repos/PlanRepository';
import { HabitRepositoryAdapter } from '../repos/HabitRepositoryAdapter';
import { CheckinRepositoryAdapter } from '../repos/CheckinRepositoryAdapter';
import { JournalRepositoryAdapter } from '../repos/JournalRepositoryAdapter';
import { PrayerTimesRepositoryAdapter } from '../repos/PrayerTimesRepositoryAdapter';
import { IntentionRepositoryAdapter } from '../repos/IntentionRepositoryAdapter';
import { DhikrRepositoryAdapter } from '../repos/DhikrRepositoryAdapter';
import { OnboardingRepositoryAdapter } from '../repos/OnboardingRepositoryAdapter';
import { SurveyRepositoryAdapter } from '../repos/SurveyRepositoryAdapter';
import { IAiProvider } from '@/domain/providers/IAiProvider';
import { getAIProvider } from '../ai/factory';
import { SuggestPlanUseCase } from '@/application/usecases/SuggestPlanUseCase';
import { LogCheckinUseCase } from '@/application/usecases/LogCheckinUseCase';
import { ToggleHabitUseCase } from '@/application/usecases/ToggleHabitUseCase';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';
import { GetPrayerTimesUseCase } from '@/application/usecases/GetPrayerTimesUseCase';
import { GetPrayerTimesRangeUseCase } from '@/application/usecases/GetPrayerTimesRangeUseCase';
import {
  CreateIntentionUseCase,
  UpdateIntentionUseCase,
  GetIntentionsUseCase,
  CompleteIntentionUseCase,
  DeleteIntentionUseCase,
  ArchiveIntentionUseCase,
  GetIntentionStatsUseCase
} from '@/application/usecases/intentions';
import {
  CreateDhikrSessionUseCase,
  IncrementDhikrCountUseCase,
  GetDhikrSessionsUseCase,
  CompleteDhikrSessionUseCase,
  GetDhikrStatsUseCase,
  GetDhikrTypesUseCase
} from '@/application/usecases/dhikr';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { SubmitPhase1UseCase } from '@/application/usecases/SubmitPhase1UseCase';
import { SubmitPhase2UseCase } from '@/application/usecases/SubmitPhase2UseCase';
import { SubmitReflectionUseCase } from '@/application/usecases/SubmitReflectionUseCase';
import { GenerateResultsUseCase } from '@/application/usecases/GenerateResultsUseCase';
import { CreateHabitsFromSurveyUseCase } from '@/application/usecases/CreateHabitsFromSurveyUseCase';
import { ISurveyAiProvider } from '@/domain/providers/ISurveyAiProvider';
import { getSurveyAIProvider } from '../ai/surveyFactory';
// Cache service imports removed - not used in this file
import { CqrsModule } from '@/infrastructure/cqrs/CqrsModule';
import { IEventStore, IEventProjectionStore } from '@/domain/events/EventStore';
import { IEventBus } from '@/domain/events/IEventBus';
import { SQLiteEventStore } from '../events/SQLiteEventStore';
import { EventProjectionManager } from '../events/EventProjectionManager';
import { EventSourcedEventBus } from '../events/EventSourcedEventBus';
import { HabitAnalyticsProjection } from '../events/projections/HabitAnalyticsProjection';

export async function configureDependencies(): Promise<void> {
  // Infrastructure - Database
  container.register<IDatabaseClient>('IDatabaseClient', {
    useFactory: () => getDatabase()
  });
  container.register<IDatabaseClient>('DatabaseClient', {
    useFactory: () => getDatabase()
  });

  // Infrastructure - AI Provider
  container.register<IAiProvider>('IAiProvider', {
    useFactory: () => getAIProvider()
  });

  // Infrastructure - Survey AI Provider
  container.register<ISurveyAiProvider>('ISurveyAiProvider', {
    useFactory: () => getSurveyAIProvider()
  });

  // Infrastructure - Cache Service
  // TODO: Fix CacheService registration
  // container.register<ICacheService>('ICacheService', {
  //   useValue: CacheFactory.getInstance()
  // });

  // Repositories
  container.register<IContentRepository>('IContentRepository', ContentRepositoryAdapter);
  container.register<IPlanRepository>('IPlanRepository', PlanRepository);
  container.register<IHabitRepository>('IHabitRepository', HabitRepositoryAdapter);
  container.register<ICheckinRepository>('ICheckinRepository', CheckinRepositoryAdapter);
  container.register<IJournalRepository>('IJournalRepository', JournalRepositoryAdapter);
  container.register<IPrayerTimesRepository>('IPrayerTimesRepository', PrayerTimesRepositoryAdapter);
  container.register<IIntentionRepository>('IIntentionRepository', IntentionRepositoryAdapter);
  container.register<IDhikrRepository>('IDhikrRepository', DhikrRepositoryAdapter);
  container.register<IOnboardingRepository>('IOnboardingRepository', OnboardingRepositoryAdapter);
  container.register<ISurveyRepository>('ISurveyRepository', SurveyRepositoryAdapter);
  container.register('IUserPreferencesRepository', {
    useClass: (await import('../repos/UserPreferencesRepository')).UserPreferencesRepository
  });

  // Use Cases
  container.register<SuggestPlanUseCase>('SuggestPlanUseCase', SuggestPlanUseCase);
  container.register<LogCheckinUseCase>('LogCheckinUseCase', LogCheckinUseCase);
  container.register<ToggleHabitUseCase>('ToggleHabitUseCase', ToggleHabitUseCase);
  container.register<ManageJournalUseCase>('ManageJournalUseCase', ManageJournalUseCase);
  container.register<GetPrayerTimesUseCase>('GetPrayerTimesUseCase', GetPrayerTimesUseCase);
  container.register<GetPrayerTimesRangeUseCase>('GetPrayerTimesRangeUseCase', GetPrayerTimesRangeUseCase);

  // Intention Use Cases
  container.register<CreateIntentionUseCase>('CreateIntentionUseCase', CreateIntentionUseCase);
  container.register<UpdateIntentionUseCase>('UpdateIntentionUseCase', UpdateIntentionUseCase);
  container.register<GetIntentionsUseCase>('GetIntentionsUseCase', GetIntentionsUseCase);
  container.register<CompleteIntentionUseCase>('CompleteIntentionUseCase', CompleteIntentionUseCase);
  container.register<DeleteIntentionUseCase>('DeleteIntentionUseCase', DeleteIntentionUseCase);
  container.register<ArchiveIntentionUseCase>('ArchiveIntentionUseCase', ArchiveIntentionUseCase);
  container.register<GetIntentionStatsUseCase>('GetIntentionStatsUseCase', GetIntentionStatsUseCase);

  // Dhikr Use Cases
  container.register<CreateDhikrSessionUseCase>('CreateDhikrSessionUseCase', CreateDhikrSessionUseCase);
  container.register<IncrementDhikrCountUseCase>('IncrementDhikrCountUseCase', IncrementDhikrCountUseCase);
  container.register<GetDhikrSessionsUseCase>('GetDhikrSessionsUseCase', GetDhikrSessionsUseCase);
  container.register<CompleteDhikrSessionUseCase>('CompleteDhikrSessionUseCase', CompleteDhikrSessionUseCase);
  container.register<GetDhikrStatsUseCase>('GetDhikrStatsUseCase', GetDhikrStatsUseCase);
  container.register<GetDhikrTypesUseCase>('GetDhikrTypesUseCase', GetDhikrTypesUseCase);

  // Survey Use Cases
  container.register<ValidateSurveyProgressUseCase>('ValidateSurveyProgressUseCase', ValidateSurveyProgressUseCase);
  container.register<SubmitPhase1UseCase>('SubmitPhase1UseCase', SubmitPhase1UseCase);
  container.register<SubmitPhase2UseCase>('SubmitPhase2UseCase', SubmitPhase2UseCase);
  container.register<SubmitReflectionUseCase>('SubmitReflectionUseCase', SubmitReflectionUseCase);
  container.register<GenerateResultsUseCase>('GenerateResultsUseCase', GenerateResultsUseCase);
  container.register<CreateHabitsFromSurveyUseCase>('CreateHabitsFromSurveyUseCase', CreateHabitsFromSurveyUseCase);

  // Event Sourcing
  container.register<IEventStore>('IEventStore', SQLiteEventStore);
  container.register<IEventProjectionStore>('IEventProjectionStore', EventProjectionManager);
  container.register<IEventBus>('IEventBus', EventSourcedEventBus);
  container.register<EventSourcedEventBus>('EventSourcedEventBus', EventSourcedEventBus);

  // Event Projections
  container.register<HabitAnalyticsProjection>('HabitAnalyticsProjection', HabitAnalyticsProjection);

  // CQRS Module
  await CqrsModule.register();

  // Initialize Event Projections
  const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');
  const habitAnalyticsProjection = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');

  projectionManager.registerProjection(habitAnalyticsProjection);

  // Setup Islamic habit event handlers
  const eventBus = container.resolve<EventSourcedEventBus>('EventSourcedEventBus');
  eventBus.setupIslamicHabitHandlers();
}

export { container };