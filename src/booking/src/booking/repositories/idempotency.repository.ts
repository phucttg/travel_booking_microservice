import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IdempotencyRecord } from '@/booking/entities/idempotency-record.entity';

export interface IIdempotencyRepository {
  findByScopeAndKey(scope: string, idempotencyKey: string): Promise<IdempotencyRecord>;
  saveRecord(record: IdempotencyRecord): Promise<IdempotencyRecord>;
}

export class IdempotencyRepository implements IIdempotencyRepository {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepository: Repository<IdempotencyRecord>
  ) {}

  async findByScopeAndKey(scope: string, idempotencyKey: string): Promise<IdempotencyRecord> {
    return await this.idempotencyRepository.findOne({
      where: { scope, idempotencyKey }
    });
  }

  async saveRecord(record: IdempotencyRecord): Promise<IdempotencyRecord> {
    return await this.idempotencyRepository.save(record);
  }
}
