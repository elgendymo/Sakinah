/**
 * Base Command interface for CQRS pattern
 */
export interface Command {
  readonly type: string;
  readonly aggregateId?: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
}

/**
 * Base Command Handler interface
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Command Bus interface for dispatching commands
 */
export interface CommandBus {
  dispatch<TCommand extends Command, TResult = void>(command: TCommand): Promise<TResult>;
  register<TCommand extends Command, TResult = void>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void;
}

/**
 * Base abstract command class
 */
export abstract class BaseCommand implements Command {
  public readonly timestamp: Date;
  public readonly correlationId: string;

  constructor(
    public readonly type: string,
    public readonly userId: string,
    public readonly aggregateId?: string,
    correlationId?: string
  ) {
    this.timestamp = new Date();
    this.correlationId = correlationId || this.generateCorrelationId();
  }

  private generateCorrelationId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}