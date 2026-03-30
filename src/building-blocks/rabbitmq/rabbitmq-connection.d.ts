import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RuntimeHealthService } from '../health/runtime-health.service';
export declare class RabbitmqOptions {
    host: string;
    port: number;
    password: string;
    username: string;
    constructor(partial?: Partial<RabbitmqOptions>);
}
export interface IRabbitmqConnection {
    createConnection(options?: RabbitmqOptions): Promise<amqp.Connection>;
    getPublisherChannel(): Promise<amqp.ConfirmChannel>;
    getConsumerChannel(channelName: string): Promise<amqp.Channel>;
    closeChanel(): Promise<void>;
    closeConnection(): Promise<void>;
}
export declare class RabbitmqConnection implements OnModuleInit, OnModuleDestroy, IRabbitmqConnection {
    private readonly options?;
    private readonly runtimeHealthService?;
    private connection;
    private publisherChannel;
    private readonly consumerChannels;
    private connectionPromise;
    private isShuttingDown;
    constructor(options?: RabbitmqOptions, runtimeHealthService?: RuntimeHealthService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    createConnection(options?: RabbitmqOptions): Promise<amqp.Connection>;
    getPublisherChannel(): Promise<amqp.ConfirmChannel>;
    getConsumerChannel(channelName: string): Promise<amqp.Channel>;
    closeChanel(): Promise<void>;
    closeConnection(): Promise<void>;
    private ensureConnection;
    private connectWithRetry;
    private openConnection;
    private attachConnectionHandlers;
    private attachPublisherChannelHandlers;
    private attachConsumerChannelHandlers;
    private closeAllChannels;
    private retryOptions;
    private isExpectedCloseError;
    private markRabbitmqState;
}
