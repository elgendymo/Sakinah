import { container } from 'tsyringe';
import { CommandBus } from '@/application/cqrs/commands/base/Command';
import { QueryBus } from '@/application/cqrs/queries/base/Query';
import { CommandBusImpl } from './CommandBusImpl';
import { QueryBusImpl, QueryCacheCleanupService } from './QueryBusImpl';
import { IEventBus } from '@/domain/events/IEventBus';
import { EventBusImpl } from '../events/EventBusImpl';
import { ICacheService } from '@/domain/services/ICacheService';
import { CacheFactory } from '../cache/factory';

// Command Handlers
import {
  CreateHabitCommandHandler,
  CompleteHabitCommandHandler,
  UncompleteHabitCommandHandler,
  ResetHabitStreakCommandHandler,
  BulkCompleteHabitsCommandHandler,
  DeleteHabitCommandHandler
} from '@/application/cqrs/commands/habit/HabitCommandHandlers';

// Query Handlers
import {
  GetHabitByIdQueryHandler,
  GetHabitsByUserQueryHandler,
  GetTodaysHabitsQueryHandler,
  GetHabitStatisticsQueryHandler,
  SearchHabitsQueryHandler
} from '@/application/cqrs/queries/habit/HabitQueryHandlers';

export class CqrsModule {
  static async register(): Promise<void> {
    // Register cache service (with Redis fallback to memory)
    const cacheService = await CacheFactory.getInstance();
    container.registerInstance<ICacheService>('ICacheService', cacheService);

    // Register buses
    container.registerSingleton<CommandBus>('CommandBus', CommandBusImpl);
    container.registerSingleton<QueryBus>('QueryBus', QueryBusImpl);
    container.registerSingleton<IEventBus>('IEventBus', EventBusImpl);

    // Register command handlers
    container.registerSingleton('CreateHabitCommandHandler', CreateHabitCommandHandler);
    container.registerSingleton('CompleteHabitCommandHandler', CompleteHabitCommandHandler);
    container.registerSingleton('UncompleteHabitCommandHandler', UncompleteHabitCommandHandler);
    container.registerSingleton('ResetHabitStreakCommandHandler', ResetHabitStreakCommandHandler);
    container.registerSingleton('BulkCompleteHabitsCommandHandler', BulkCompleteHabitsCommandHandler);
    container.registerSingleton('DeleteHabitCommandHandler', DeleteHabitCommandHandler);

    // Register query handlers
    container.registerSingleton('GetHabitByIdQueryHandler', GetHabitByIdQueryHandler);
    container.registerSingleton('GetHabitsByUserQueryHandler', GetHabitsByUserQueryHandler);
    container.registerSingleton('GetTodaysHabitsQueryHandler', GetTodaysHabitsQueryHandler);
    container.registerSingleton('GetHabitStatisticsQueryHandler', GetHabitStatisticsQueryHandler);
    container.registerSingleton('SearchHabitsQueryHandler', SearchHabitsQueryHandler);

    // Register and configure command handlers with command bus
    const commandBus = container.resolve<CommandBusImpl>('CommandBus');

    commandBus.register('CreateHabitCommand', container.resolve<CreateHabitCommandHandler>('CreateHabitCommandHandler'));
    commandBus.register('CompleteHabitCommand', container.resolve<CompleteHabitCommandHandler>('CompleteHabitCommandHandler'));
    commandBus.register('UncompleteHabitCommand', container.resolve<UncompleteHabitCommandHandler>('UncompleteHabitCommandHandler'));
    commandBus.register('ResetHabitStreakCommand', container.resolve<ResetHabitStreakCommandHandler>('ResetHabitStreakCommandHandler'));
    commandBus.register('BulkCompleteHabitsCommand', container.resolve<BulkCompleteHabitsCommandHandler>('BulkCompleteHabitsCommandHandler'));
    commandBus.register('DeleteHabitCommand', container.resolve<DeleteHabitCommandHandler>('DeleteHabitCommandHandler'));

    // Register and configure query handlers with query bus
    const queryBus = container.resolve<QueryBusImpl>('QueryBus');

    queryBus.register('GetHabitByIdQuery', container.resolve<GetHabitByIdQueryHandler>('GetHabitByIdQueryHandler'));
    queryBus.register('GetHabitsByUserQuery', container.resolve<GetHabitsByUserQueryHandler>('GetHabitsByUserQueryHandler'));
    queryBus.register('GetTodaysHabitsQuery', container.resolve<GetTodaysHabitsQueryHandler>('GetTodaysHabitsQueryHandler'));
    queryBus.register('GetHabitStatisticsQuery', container.resolve<GetHabitStatisticsQueryHandler>('GetHabitStatisticsQueryHandler'));
    queryBus.register('SearchHabitsQuery', container.resolve<SearchHabitsQueryHandler>('SearchHabitsQueryHandler'));

    // Cache service is already initialized from factory above

    // Setup cache cleanup service
    const cacheCleanupService = new QueryCacheCleanupService(queryBus);
    container.registerInstance('QueryCacheCleanupService', cacheCleanupService);

    // Start cache cleanup
    cacheCleanupService.start();

    console.log('CQRS Module registered successfully with Redis caching');
  }

  static getRegisteredCommands(): string[] {
    const commandBus = container.resolve<CommandBusImpl>('CommandBus');
    return commandBus.getRegisteredCommandTypes();
  }

  static getRegisteredQueries(): string[] {
    const queryBus = container.resolve<QueryBusImpl>('QueryBus');
    return queryBus.getRegisteredQueryTypes();
  }

  static getCacheStats() {
    const queryBus = container.resolve<QueryBusImpl>('QueryBus');
    return queryBus.getCacheStats();
  }

  static async invalidateCache(pattern?: string): Promise<number> {
    const queryBus = container.resolve<QueryBusImpl>('QueryBus');
    return await queryBus.invalidateCache(pattern);
  }

  static async invalidateCacheForUser(userId: string): Promise<number> {
    const queryBus = container.resolve<QueryBusImpl>('QueryBus');
    return await queryBus.invalidateCacheForUser(userId);
  }
}