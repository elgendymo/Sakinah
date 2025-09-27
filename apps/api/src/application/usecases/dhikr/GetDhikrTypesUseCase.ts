import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { IDhikrRepository, DhikrTypeFilters } from '@/domain/repositories/IDhikrRepository';
import { DhikrType } from '@/domain/entities/DhikrType';

export interface GetDhikrTypesRequest {
  isActive?: boolean;
  tags?: string[];
  search?: string;
}

@injectable()
export class GetDhikrTypesUseCase {
  constructor(
    @inject('IDhikrRepository') private readonly dhikrRepository: IDhikrRepository
  ) {}

  async execute(request: GetDhikrTypesRequest): Promise<Result<DhikrType[], Error>> {
    try {
      const filters: DhikrTypeFilters = {
        isActive: request.isActive !== undefined ? request.isActive : true, // Default to active only
        tags: request.tags,
        search: request.search
      };

      // Get dhikr types
      const typesResult = await this.dhikrRepository.getDhikrTypes(filters);
      if (Result.isError(typesResult)) {
        return Result.error(typesResult.error);
      }

      return Result.ok(typesResult.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}