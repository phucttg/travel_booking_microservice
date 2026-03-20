import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessedMessage } from '@/seat/entities/processed-message.entity';

export interface IProcessedMessageRepository {
  registerProcessedMessage(consumer: string, messageKey: string): Promise<boolean>;
}

export class ProcessedMessageRepository implements IProcessedMessageRepository {
  constructor(
    @InjectRepository(ProcessedMessage)
    private readonly processedMessageRepository: Repository<ProcessedMessage>
  ) {}

  async registerProcessedMessage(consumer: string, messageKey: string): Promise<boolean> {
    if (!messageKey) {
      return true;
    }

    const result = await this.processedMessageRepository
      .createQueryBuilder()
      .insert()
      .into(ProcessedMessage)
      .values({
        consumer,
        messageKey,
        createdAt: new Date()
      })
      .orIgnore()
      .execute();

    return (result.identifiers?.length || 0) > 0 || (result.raw?.length || 0) > 0;
  }
}
