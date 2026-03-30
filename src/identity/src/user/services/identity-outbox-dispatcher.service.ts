import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import configs from 'building-blocks/configs/configs';
import { RuntimeHealthService } from 'building-blocks/health/runtime-health.service';
import {
  outboxBacklogGauge,
  outboxDispatchFailureCounter,
  outboxOldestAgeGauge
} from 'building-blocks/monitoring/outbox.metrics';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { deserializeObject } from 'building-blocks/utils/serilization';
import { OutboxMessage } from '@/user/entities/outbox-message.entity';

@Injectable()
export class IdentityOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly runtimeHealthService: RuntimeHealthService,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  onModuleInit(): void {
    this.runtimeHealthService.setComponentStatus('outbox', 'up', {
      message: 'Identity outbox dispatcher started'
    });

    this.intervalRef = setInterval(() => {
      void this.dispatchPendingMessages();
    }, configs.outbox.pollIntervalMs);

    void this.dispatchPendingMessages();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async dispatchPendingMessages(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const repository = this.dataSource.getRepository(OutboxMessage);
      const pendingMessages = await repository.find({
        where: {
          deliveredAt: IsNull(),
          nextAttemptAt: LessThanOrEqual(new Date())
        },
        order: { createdAt: 'ASC' },
        take: 50
      });

      await this.updateMetrics(repository);

      for (const outboxMessage of pendingMessages) {
        try {
          await this.rabbitmqPublisher.publishMessage(
            deserializeObject<Record<string, unknown>>(outboxMessage.payload),
            {
              exchangeName: outboxMessage.exchangeName,
              useEnvelope: outboxMessage.useEnvelope,
              metadata: {
                messageId: outboxMessage.messageId,
                traceId: outboxMessage.traceId,
                idempotencyKey: outboxMessage.idempotencyKey,
                producer: outboxMessage.producer,
                occurredAt: outboxMessage.occurredAt.toISOString()
              }
            }
          );

          outboxMessage.deliveredAt = new Date();
          outboxMessage.updatedAt = new Date();
          outboxMessage.lastError = null;
          await repository.save(outboxMessage);
          this.runtimeHealthService.setComponentStatus('outbox', 'up');
        } catch (error) {
          outboxMessage.attempts += 1;
          outboxMessage.lastError = error instanceof Error ? error.message : String(error);
          outboxMessage.nextAttemptAt = new Date(
            Date.now() + configs.outbox.retryBaseMs * Math.min(outboxMessage.attempts, configs.outbox.maxAttempts)
          );
          outboxMessage.updatedAt = new Date();
          await repository.save(outboxMessage);
          outboxDispatchFailureCounter.labels(outboxMessage.exchangeName).inc();
          this.runtimeHealthService.setComponentStatus('outbox', 'degraded', {
            exchangeName: outboxMessage.exchangeName,
            attempts: outboxMessage.attempts,
            lastError: outboxMessage.lastError
          });
        }
      }

      await this.updateMetrics(repository);
    } catch (error) {
      Logger.error('Identity outbox dispatcher failed', error as Error);
      this.runtimeHealthService.setComponentStatus('outbox', 'degraded', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async updateMetrics(repository: Repository<OutboxMessage>): Promise<void> {
    const pendingCount = await repository.count({
      where: {
        deliveredAt: IsNull()
      }
    });
    const oldestPendingMessage = await repository.findOne({
      where: {
        deliveredAt: IsNull()
      },
      order: {
        createdAt: 'ASC'
      }
    });

    outboxBacklogGauge.set(pendingCount);
    outboxOldestAgeGauge.set(
      oldestPendingMessage ? (Date.now() - new Date(oldestPendingMessage.createdAt).getTime()) / 1000 : 0
    );
  }
}
