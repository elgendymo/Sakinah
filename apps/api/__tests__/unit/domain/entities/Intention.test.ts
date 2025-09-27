import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Intention } from '@/domain/entities/Intention';
import {
  IntentionCreatedEvent,
  IntentionUpdatedEvent,
  IntentionCompletedEvent,
  IntentionArchivedEvent
} from '@/domain/events/IntentionEvents';

// Test UUIDs - generate valid UUIDs for testing
const testIds = {
  user1: uuidv4(),
  intention1: uuidv4()
};

describe('Intention', () => {
  describe('create', () => {
    it('should create a new intention with default values', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Read Quran for 15 minutes'
      });

      expect(intention.text).toBe('Read Quran for 15 minutes');
      expect(intention.description).toBeNull();
      expect(intention.priority).toBe('medium');
      expect(intention.status).toBe('active');
      expect(intention.targetDate).toBeNull();
      expect(intention.completedAt).toBeNull();
      expect(intention.reminder.enabled).toBe(false);
      expect(intention.tags).toEqual([]);
    });

    it('should create intention with custom values', () => {
      const targetDate = new Date('2024-01-15');
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Pray Tahajjud tonight',
        description: 'Wake up early for night prayer',
        priority: 'high',
        targetDate,
        reminder: {
          enabled: true,
          time: '03:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        tags: ['prayer', 'tahajjud', 'night']
      });

      expect(intention.description).toBe('Wake up early for night prayer');
      expect(intention.priority).toBe('high');
      expect(intention.targetDate).toEqual(targetDate);
      expect(intention.reminder.enabled).toBe(true);
      expect(intention.reminder.time).toBe('03:00');
      expect(intention.reminder.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
      expect(intention.tags).toEqual(['prayer', 'tahajjud', 'night']);
    });

    it('should emit IntentionCreatedEvent for new intentions', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Make dua for parents'
      });

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionCreatedEvent);
    });

    it('should not emit event when recreating existing intention', () => {
      const intention = Intention.create({
        id: testIds.intention1,
        userId: testIds.user1,
        text: 'Complete dhikr'
      });

      expect(intention.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('updateText', () => {
    it('should update text and emit event', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Original text'
      });
      intention.clearDomainEvents();

      intention.updateText('Updated text');

      expect(intention.text).toBe('Updated text');

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionUpdatedEvent);

      const updateEvent = events[0] as IntentionUpdatedEvent;
      expect(updateEvent.changes.text.old).toBe('Original text');
      expect(updateEvent.changes.text.new).toBe('Updated text');
    });

    it('should throw error for empty text', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Valid text'
      });

      expect(() => intention.updateText('')).toThrow('Intention text cannot be empty');
      expect(() => intention.updateText('   ')).toThrow('Intention text cannot be empty');
    });
  });

  describe('updatePriority', () => {
    it('should update priority and emit event', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention',
        priority: 'low'
      });
      intention.clearDomainEvents();

      intention.updatePriority('high');

      expect(intention.priority).toBe('high');

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionUpdatedEvent);

      const updateEvent = events[0] as IntentionUpdatedEvent;
      expect(updateEvent.changes.priority.old).toBe('low');
      expect(updateEvent.changes.priority.new).toBe('high');
    });
  });

  describe('updateTargetDate', () => {
    it('should update target date and emit event', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention'
      });
      intention.clearDomainEvents();

      const newDate = new Date('2024-01-20');
      intention.updateTargetDate(newDate);

      expect(intention.targetDate).toEqual(newDate);

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionUpdatedEvent);
    });

    it('should allow setting target date to null', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention',
        targetDate: new Date('2024-01-15')
      });
      intention.clearDomainEvents();

      intention.updateTargetDate(null);

      expect(intention.targetDate).toBeNull();
    });
  });

  describe('updateReminder', () => {
    it('should update reminder settings and emit event', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention'
      });
      intention.clearDomainEvents();

      const newReminder = {
        enabled: true,
        time: '08:00',
        daysOfWeek: [1, 2, 3, 4, 5]
      };

      intention.updateReminder(newReminder);

      expect(intention.reminder).toEqual(newReminder);

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionUpdatedEvent);
    });
  });

  describe('tag management', () => {
    it('should add tags and emit events', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention'
      });
      intention.clearDomainEvents();

      intention.addTag('prayer');
      intention.addTag('Morning');

      expect(intention.tags).toEqual(['prayer', 'morning']);

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events.every(e => e instanceof IntentionUpdatedEvent)).toBe(true);
    });

    it('should not add duplicate tags', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention',
        tags: ['existing']
      });
      intention.clearDomainEvents();

      intention.addTag('existing');
      intention.addTag('EXISTING');

      expect(intention.tags).toEqual(['existing']);
      expect(intention.getDomainEvents()).toHaveLength(0);
    });

    it('should remove tags and emit events', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention',
        tags: ['prayer', 'morning', 'worship']
      });
      intention.clearDomainEvents();

      intention.removeTag('morning');

      expect(intention.tags).toEqual(['prayer', 'worship']);

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionUpdatedEvent);
    });

    it('should handle removing non-existent tags gracefully', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Test intention',
        tags: ['prayer']
      });
      intention.clearDomainEvents();

      intention.removeTag('nonexistent');

      expect(intention.tags).toEqual(['prayer']);
      expect(intention.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('markCompleted', () => {
    it('should mark active intention as completed', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Complete morning prayers'
      });
      intention.clearDomainEvents();

      intention.markCompleted();

      expect(intention.status).toBe('completed');
      expect(intention.completedAt).toBeInstanceOf(Date);

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionCompletedEvent);

      const completedEvent = events[0] as IntentionCompletedEvent;
      expect(completedEvent.text).toBe('Complete morning prayers');
    });

    it('should throw error when completing already completed intention', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Already completed',
        status: 'completed',
        completedAt: new Date()
      });

      expect(() => intention.markCompleted()).toThrow('Intention is already completed');
    });

    it('should throw error when completing archived intention', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Archived intention',
        status: 'archived'
      });

      expect(() => intention.markCompleted()).toThrow('Cannot complete an archived intention');
    });
  });

  describe('markActive', () => {
    it('should reactivate completed intention', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Reactivate this',
        status: 'completed',
        completedAt: new Date()
      });
      intention.clearDomainEvents();

      intention.markActive();

      expect(intention.status).toBe('active');
      expect(intention.completedAt).toBeNull();

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionUpdatedEvent);
    });

    it('should throw error when reactivating archived intention', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Archived intention',
        status: 'archived'
      });

      expect(() => intention.markActive()).toThrow('Cannot reactivate an archived intention');
    });
  });

  describe('archive', () => {
    it('should archive intention and emit event', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Archive this intention'
      });
      intention.clearDomainEvents();

      intention.archive();

      expect(intention.status).toBe('archived');

      const events = intention.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentionArchivedEvent);

      const archivedEvent = events[0] as IntentionArchivedEvent;
      expect(archivedEvent.text).toBe('Archive this intention');
    });
  });

  describe('isOverdue', () => {
    it('should return true for overdue active intentions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Overdue intention',
        targetDate: pastDate
      });

      expect(intention.isOverdue()).toBe(true);
    });

    it('should return false for future target dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Future intention',
        targetDate: futureDate
      });

      expect(intention.isOverdue()).toBe(false);
    });

    it('should return false for intentions without target date', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'No target date'
      });

      expect(intention.isOverdue()).toBe(false);
    });

    it('should return false for completed intentions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Completed but past due',
        targetDate: pastDate,
        status: 'completed'
      });

      expect(intention.isOverdue()).toBe(false);
    });
  });

  describe('getDaysUntilTarget', () => {
    it('should return correct days until target', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Week away',
        targetDate: futureDate
      });

      expect(intention.getDaysUntilTarget()).toBe(7);
    });

    it('should return negative days for overdue intentions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Overdue',
        targetDate: pastDate
      });

      expect(intention.getDaysUntilTarget()).toBe(-3);
    });

    it('should return null for intentions without target date', () => {
      const intention = Intention.create({
        userId: testIds.user1,
        text: 'No target'
      });

      expect(intention.getDaysUntilTarget()).toBeNull();
    });

    it('should return null for non-active intentions', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Completed intention',
        targetDate: futureDate,
        status: 'completed'
      });

      expect(intention.getDaysUntilTarget()).toBeNull();
    });
  });

  describe('toDTO', () => {
    it('should serialize intention to DTO format', () => {
      const targetDate = new Date('2024-01-15T00:00:00.000Z');
      const createdAt = new Date('2024-01-01T10:00:00.000Z');

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Complete evening prayers',
        description: 'Maghrib and Isha prayers with sunnah',
        priority: 'high',
        targetDate,
        reminder: {
          enabled: true,
          time: '18:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        tags: ['prayer', 'evening'],
        createdAt
      });

      const dto = intention.toDTO();

      expect(dto).toMatchObject({
        userId: testIds.user1,
        text: 'Complete evening prayers',
        description: 'Maghrib and Isha prayers with sunnah',
        priority: 'high',
        status: 'active',
        targetDate: '2024-01-15T00:00:00.000Z',
        completedAt: null,
        reminder: {
          enabled: true,
          time: '18:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        tags: ['prayer', 'evening'],
        isOverdue: false,
        createdAt: '2024-01-01T10:00:00.000Z'
      });

      expect(dto.daysUntilTarget).toBeTypeOf('number');
    });

    it('should include overdue status in DTO', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const intention = Intention.create({
        userId: testIds.user1,
        text: 'Overdue intention',
        targetDate: pastDate
      });

      const dto = intention.toDTO();

      expect(dto.isOverdue).toBe(true);
      expect(dto.daysUntilTarget).toBe(-2);
    });
  });
});