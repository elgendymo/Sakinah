import { injectable } from 'tsyringe';
import { Command, CommandBus, CommandHandler } from '@/application/cqrs/commands/base/Command';
import { logger } from '@/shared/logger';

@injectable()
export class CommandBusImpl implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();

  register<TCommand extends Command, TResult = void>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Command handler for ${commandType} is already registered`);
    }

    this.handlers.set(commandType, handler);
  }

  async dispatch<TCommand extends Command, TResult = void>(command: TCommand): Promise<TResult> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      throw new Error(`No handler registered for command type: ${command.type}`);
    }

    try {
      // Log command execution for audit trail
      logger.info(`Executing command: ${command.type}`, {
        commandType: command.type,
        userId: command.userId,
        aggregateId: command.aggregateId,
        correlationId: command.correlationId,
        timestamp: command.timestamp
      });

      const result = await handler.handle(command);

      // Log successful execution
      logger.info(`Command executed successfully: ${command.type}`, {
        correlationId: command.correlationId
      });

      return result;
    } catch (error) {
      // Log failed execution
      logger.error(`Command execution failed: ${command.type}`, {
        correlationId: command.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  // Get all registered command types (useful for debugging)
  getRegisteredCommandTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Check if a command type is registered
  isCommandRegistered(commandType: string): boolean {
    return this.handlers.has(commandType);
  }
}