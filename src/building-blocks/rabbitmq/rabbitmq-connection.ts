import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import asyncRetry from 'async-retry';
import configs from '../configs/configs';
import { RuntimeHealthService } from '../health/runtime-health.service';
import {
  rabbitmqConnectionStateGauge,
  rabbitmqConsumerChannelStateGauge,
  rabbitmqPublisherChannelStateGauge
} from '../monitoring/rabbitmq.metrics';

export class RabbitmqOptions {
  host: string;
  port: number;
  password: string;
  username: string;

  constructor(partial?: Partial<RabbitmqOptions>) {
    Object.assign(this, partial);
  }
}

export interface IRabbitmqConnection {
  createConnection(options?: RabbitmqOptions): Promise<amqp.Connection>;
  getPublisherChannel(): Promise<amqp.ConfirmChannel>;
  getConsumerChannel(channelName: string): Promise<amqp.Channel>;
  closeChanel(): Promise<void>;
  closeConnection(): Promise<void>;
}

@Injectable()
export class RabbitmqConnection implements OnModuleInit, OnModuleDestroy, IRabbitmqConnection {
  private connection: amqp.Connection | null = null;
  private publisherChannel: amqp.ConfirmChannel | null = null;
  private readonly consumerChannels = new Map<string, amqp.Channel>();
  private connectionPromise: Promise<amqp.Connection> | null = null;
  private isShuttingDown = false;

  constructor(
    @Inject(RabbitmqOptions) private readonly options?: RabbitmqOptions,
    private readonly runtimeHealthService?: RuntimeHealthService
  ) {}

  onModuleInit(): void {
    this.isShuttingDown = false;
    this.markRabbitmqState('degraded', {
      message: 'Waiting for initial RabbitMQ connection'
    });
    void this.createConnection(this.options);
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeConnection();
  }

  async createConnection(options?: RabbitmqOptions): Promise<amqp.Connection> {
    return await this.ensureConnection(options);
  }

  async getPublisherChannel(): Promise<amqp.ConfirmChannel> {
    const activeConnection = await this.ensureConnection(this.options);

    if (this.publisherChannel) {
      return this.publisherChannel;
    }

    const channel = await asyncRetry(
      async () => await activeConnection.createConfirmChannel(),
      this.retryOptions()
    );

    this.publisherChannel = channel;
    rabbitmqPublisherChannelStateGauge.set(1);
    this.attachPublisherChannelHandlers(channel);

    return channel;
  }

  async getConsumerChannel(channelName: string): Promise<amqp.Channel> {
    const activeConnection = await this.ensureConnection(this.options);
    const existingChannel = this.consumerChannels.get(channelName);

    if (existingChannel) {
      return existingChannel;
    }

    const channel = await asyncRetry(
      async () => await activeConnection.createChannel(),
      this.retryOptions()
    );

    this.consumerChannels.set(channelName, channel);
    rabbitmqConsumerChannelStateGauge.labels(channelName).set(1);
    this.attachConsumerChannelHandlers(channelName, channel);

    return channel;
  }

  async closeChanel(): Promise<void> {
    await this.closeAllChannels(true);
  }

  async closeConnection(): Promise<void> {
    this.isShuttingDown = true;
    await this.closeAllChannels(true);

    if (!this.connection) {
      rabbitmqConnectionStateGauge.set(0);
      return;
    }

    const connection = this.connection;
    this.connection = null;

    try {
      await connection.close();
      Logger.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      if (!this.isExpectedCloseError(error)) {
        Logger.error('RabbitMQ connection close failed', error as Error);
      }
    } finally {
      rabbitmqConnectionStateGauge.set(0);
      this.markRabbitmqState('degraded', {
        message: 'RabbitMQ connection closed'
      });
    }
  }

  private async ensureConnection(options?: RabbitmqOptions): Promise<amqp.Connection> {
    if (this.connection) {
      return this.connection;
    }

    if (this.connectionPromise) {
      return await this.connectionPromise;
    }

    this.connectionPromise = this.connectWithRetry(options);

    try {
      return await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async connectWithRetry(options?: RabbitmqOptions): Promise<amqp.Connection> {
    try {
      const connection = await asyncRetry(async () => await this.openConnection(options), this.retryOptions());
      this.connection = connection;
      rabbitmqConnectionStateGauge.set(1);
      this.markRabbitmqState('up', {
        host: options?.host ?? configs.rabbitmq.host,
        port: options?.port ?? configs.rabbitmq.port
      });

      return connection;
    } catch (error) {
      rabbitmqConnectionStateGauge.set(0);
      this.markRabbitmqState('degraded', {
        message: 'RabbitMQ connection unavailable',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async openConnection(options?: RabbitmqOptions): Promise<amqp.Connection> {
    const host = options?.host ?? configs.rabbitmq.host;
    const port = options?.port ?? configs.rabbitmq.port;
    const connection = await amqp.connect(`amqp://${host}:${port}`, {
      username: options?.username ?? configs.rabbitmq.username,
      password: options?.password ?? configs.rabbitmq.password
    });

    this.attachConnectionHandlers(connection);

    return connection;
  }

  private attachConnectionHandlers(connection: amqp.Connection): void {
    connection.on('error', (error) => {
      if (this.isShuttingDown) {
        Logger.warn(`RabbitMQ connection error observed during shutdown: ${error}`);
        return;
      }

      Logger.error(`RabbitMQ connection error: ${error}`);
      this.markRabbitmqState('degraded', {
        message: 'RabbitMQ connection error',
        error: error instanceof Error ? error.message : String(error)
      });
    });

    connection.on('close', () => {
      this.connection = null;
      this.publisherChannel = null;
      rabbitmqConnectionStateGauge.set(0);
      rabbitmqPublisherChannelStateGauge.set(0);

      for (const channelName of this.consumerChannels.keys()) {
        rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
      }

      this.consumerChannels.clear();
      this.markRabbitmqState('degraded', {
        message: 'RabbitMQ connection closed'
      });

      if (!this.isShuttingDown) {
        void this.createConnection(this.options).catch((error) => {
          Logger.error('Background RabbitMQ reconnect failed', error as Error);
        });
      }
    });
  }

  private attachPublisherChannelHandlers(channel: amqp.ConfirmChannel): void {
    channel.on('error', (error) => {
      if (this.isShuttingDown) {
        Logger.warn(`RabbitMQ publisher channel error observed during shutdown: ${error}`);
        return;
      }

      if (this.publisherChannel === channel) {
        this.publisherChannel = null;
      }

      rabbitmqPublisherChannelStateGauge.set(0);
      this.markRabbitmqState('degraded', {
        message: 'RabbitMQ publisher channel error',
        error: error instanceof Error ? error.message : String(error)
      });
    });

    channel.on('close', () => {
      if (this.publisherChannel === channel) {
        this.publisherChannel = null;
      }

      rabbitmqPublisherChannelStateGauge.set(0);
      this.markRabbitmqState('degraded', {
        message: 'RabbitMQ publisher channel closed'
      });
    });
  }

  private attachConsumerChannelHandlers(channelName: string, channel: amqp.Channel): void {
    channel.on('error', (error) => {
      if (this.isShuttingDown) {
        Logger.warn(`RabbitMQ consumer channel "${channelName}" error observed during shutdown: ${error}`);
        return;
      }

      if (this.consumerChannels.get(channelName) === channel) {
        this.consumerChannels.delete(channelName);
      }

      rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
      this.markRabbitmqState('degraded', {
        message: `RabbitMQ consumer channel "${channelName}" error`,
        error: error instanceof Error ? error.message : String(error)
      });
    });

    channel.on('close', () => {
      if (this.consumerChannels.get(channelName) === channel) {
        this.consumerChannels.delete(channelName);
      }

      rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
      this.markRabbitmqState('degraded', {
        message: `RabbitMQ consumer channel "${channelName}" closed`
      });
    });
  }

  private async closeAllChannels(shutdownMode: boolean): Promise<void> {
    const publisherChannel = this.publisherChannel;
    this.publisherChannel = null;

    if (publisherChannel) {
      try {
        await publisherChannel.close();
      } catch (error) {
        if (!shutdownMode || !this.isExpectedCloseError(error)) {
          Logger.error('RabbitMQ publisher channel close failed', error as Error);
        }
      }
    }

    rabbitmqPublisherChannelStateGauge.set(0);

    for (const [channelName, consumerChannel] of this.consumerChannels.entries()) {
      try {
        await consumerChannel.close();
      } catch (error) {
        if (!shutdownMode || !this.isExpectedCloseError(error)) {
          Logger.error(`RabbitMQ consumer channel "${channelName}" close failed`, error as Error);
        }
      } finally {
        rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
      }
    }

    this.consumerChannels.clear();
  }

  private retryOptions() {
    return {
      retries: configs.retry.count,
      factor: configs.retry.factor,
      minTimeout: configs.retry.minTimeout,
      maxTimeout: configs.retry.maxTimeout
    };
  }

  private isExpectedCloseError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const normalizedMessage = message.toLowerCase();

    return (
      normalizedMessage.includes('closed') ||
      normalizedMessage.includes('closing') ||
      normalizedMessage.includes('unexpected close')
    );
  }

  private markRabbitmqState(
    state: 'up' | 'degraded' | 'down',
    details?: Record<string, unknown>
  ): void {
    this.runtimeHealthService?.setComponentStatus('rabbitmq', state, details);
  }
}
