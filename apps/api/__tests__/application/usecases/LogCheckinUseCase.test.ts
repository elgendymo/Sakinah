import { LogCheckinUseCase } from '../../../src/application/usecases/LogCheckinUseCase';
import { ICheckinRepository } from '../../../src/domain/repositories/ICheckinRepository';
import { Checkin } from '../../../src/domain/entities/Checkin';
import { UserId } from '../../../src/domain/value-objects/UserId';
import { Result } from '../../../src/shared/result';

describe('LogCheckinUseCase', () => {
  let useCase: LogCheckinUseCase;
  let mockRepository: jest.Mocked<ICheckinRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByUserAndDate: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      countByUser: jest.fn(),
      findAllByUser: jest.fn(),
      findLatestByUser: jest.fn()
    };

    useCase = new LogCheckinUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create a new check-in when none exists for today', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 1,
        intention: 'Be more patient',
        reflection: 'Had a good day'
      };

      const expectedCheckin = Checkin.create({
        id: 'new-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'Be more patient',
        reflection: 'Had a good day'
      });

      // Mock: no existing check-in for today
      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(null));

      // Mock: successful creation
      mockRepository.create.mockResolvedValue(Result.ok(expectedCheckin));

      const result = await useCase.execute(params);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(expectedCheckin);
      expect(mockRepository.findByUserAndDate).toHaveBeenCalledWith(
        expect.any(UserId),
        expect.any(Date)
      );
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.any(Checkin)
      );
    });

    it('should update existing check-in when one exists for today', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 2,
        intention: 'Updated intention',
        reflection: 'Updated reflection'
      };

      const existingCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'Original intention',
        reflection: 'Original reflection'
      });

      const updatedCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 2,
        intention: 'Updated intention',
        reflection: 'Updated reflection'
      });

      // Mock: existing check-in found
      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(existingCheckin));

      // Mock: successful update
      mockRepository.update.mockResolvedValue(Result.ok(updatedCheckin));

      const result = await useCase.execute(params);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(updatedCheckin);
      expect(mockRepository.findByUserAndDate).toHaveBeenCalledWith(
        expect.any(UserId),
        expect.any(Date)
      );
      expect(mockRepository.update).toHaveBeenCalledWith(existingCheckin);

      // Verify the existing check-in was modified
      expect(existingCheckin.mood).toBe(2);
      expect(existingCheckin.intention).toBe('Updated intention');
      expect(existingCheckin.reflection).toBe('Updated reflection');
    });

    it('should handle repository errors when finding existing check-in', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 1,
        intention: 'Test intention'
      };

      const error = new Error('Database connection failed');
      mockRepository.findByUserAndDate.mockResolvedValue(Result.error(error));

      const result = await useCase.execute(params);

      expect(result.ok).toBe(false);
      expect(result.error).toEqual(error);
    });

    it('should handle repository errors when creating new check-in', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 1,
        intention: 'Test intention'
      };

      const error = new Error('Failed to create check-in');

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(null));
      mockRepository.create.mockResolvedValue(Result.error(error));

      const result = await useCase.execute(params);

      expect(result.ok).toBe(false);
      expect(result.error).toEqual(error);
    });

    it('should handle repository errors when updating existing check-in', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 2,
        intention: 'Updated intention'
      };

      const existingCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'Original intention'
      });

      const error = new Error('Failed to update check-in');

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(existingCheckin));
      mockRepository.update.mockResolvedValue(Result.error(error));

      const result = await useCase.execute(params);

      expect(result.ok).toBe(false);
      expect(result.error).toEqual(error);
    });

    it('should set correct date to beginning of day', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 1
      };

      const expectedCheckin = Checkin.create({
        id: 'new-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1
      });

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(null));
      mockRepository.create.mockResolvedValue(Result.ok(expectedCheckin));

      await useCase.execute(params);

      // Verify that the date passed to findByUserAndDate has hours set to 0
      const calledDate = mockRepository.findByUserAndDate.mock.calls[0][1] as Date;
      expect(calledDate.getHours()).toBe(0);
      expect(calledDate.getMinutes()).toBe(0);
      expect(calledDate.getSeconds()).toBe(0);
      expect(calledDate.getMilliseconds()).toBe(0);
    });

    it('should handle partial updates correctly', async () => {
      const existingCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'Original intention',
        reflection: 'Original reflection'
      });

      const updatedCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 2,
        intention: 'Original intention',
        reflection: 'Original reflection'
      });

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(existingCheckin));
      mockRepository.update.mockResolvedValue(Result.ok(updatedCheckin));

      // Only update mood, leave intention and reflection undefined
      const result = await useCase.execute({
        userId: 'test-user-id',
        mood: 2
      });

      expect(result.ok).toBe(true);
      expect(existingCheckin.mood).toBe(2);
      expect(existingCheckin.intention).toBe('Original intention'); // Unchanged
      expect(existingCheckin.reflection).toBe('Original reflection'); // Unchanged
    });

    it('should handle undefined values correctly in updates', async () => {
      const existingCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'Original intention',
        reflection: 'Original reflection'
      });

      const updatedCheckin = Checkin.create({
        id: 'existing-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'New intention',
        reflection: 'New reflection'
      });

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(existingCheckin));
      mockRepository.update.mockResolvedValue(Result.ok(updatedCheckin));

      const result = await useCase.execute({
        userId: 'test-user-id',
        intention: 'New intention',
        reflection: 'New reflection'
        // mood is undefined - should not change existing mood
      });

      expect(result.ok).toBe(true);
      expect(existingCheckin.mood).toBe(1); // Unchanged
      expect(existingCheckin.intention).toBe('New intention');
      expect(existingCheckin.reflection).toBe('New reflection');
    });
  });

  describe('getToday', () => {
    it('should return today\'s check-in if it exists', async () => {
      const userId = 'test-user-id';
      const todayCheckin = Checkin.create({
        id: 'today-checkin-id',
        userId: 'test-user-id',
        date: new Date(),
        mood: 1,
        intention: 'Today\'s intention'
      });

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(todayCheckin));

      const result = await useCase.getToday(userId);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(todayCheckin);
      expect(mockRepository.findByUserAndDate).toHaveBeenCalledWith(
        expect.any(UserId),
        expect.any(Date)
      );

      // Verify date is set to beginning of today
      const calledDate = mockRepository.findByUserAndDate.mock.calls[0][1] as Date;
      expect(calledDate.getHours()).toBe(0);
      expect(calledDate.getMinutes()).toBe(0);
      expect(calledDate.getSeconds()).toBe(0);
      expect(calledDate.getMilliseconds()).toBe(0);
    });

    it('should return null if no check-in exists for today', async () => {
      const userId = 'test-user-id';

      mockRepository.findByUserAndDate.mockResolvedValue(Result.ok(null));

      const result = await useCase.getToday(userId);

      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle repository errors', async () => {
      const userId = 'test-user-id';
      const error = new Error('Database connection failed');

      mockRepository.findByUserAndDate.mockResolvedValue(Result.error(error));

      const result = await useCase.getToday(userId);

      expect(result.ok).toBe(false);
      expect(result.error).toEqual(error);
    });
  });

  describe('exception handling', () => {
    it('should catch and wrap unexpected exceptions in execute', async () => {
      const params = {
        userId: 'test-user-id',
        mood: 1
      };

      mockRepository.findByUserAndDate.mockRejectedValue(new Error('Unexpected error'));

      const result = await useCase.execute(params);

      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Unexpected error');
    });

    it('should catch and wrap unexpected exceptions in getToday', async () => {
      const userId = 'test-user-id';

      mockRepository.findByUserAndDate.mockRejectedValue(new Error('Unexpected error'));

      const result = await useCase.getToday(userId);

      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Unexpected error');
    });
  });
});