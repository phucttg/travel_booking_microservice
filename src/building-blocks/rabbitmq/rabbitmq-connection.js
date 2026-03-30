"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitmqConnection = exports.RabbitmqOptions = void 0;
const common_1 = require("@nestjs/common");
const amqp = __importStar(require("amqplib"));
const async_retry_1 = __importDefault(require("async-retry"));
const configs_1 = __importDefault(require("../configs/configs"));
const runtime_health_service_1 = require("../health/runtime-health.service");
const rabbitmq_metrics_1 = require("../monitoring/rabbitmq.metrics");
class RabbitmqOptions {
    host;
    port;
    password;
    username;
    constructor(partial) {
        Object.assign(this, partial);
    }
}
exports.RabbitmqOptions = RabbitmqOptions;
let RabbitmqConnection = class RabbitmqConnection {
    options;
    runtimeHealthService;
    connection = null;
    publisherChannel = null;
    consumerChannels = new Map();
    connectionPromise = null;
    isShuttingDown = false;
    constructor(options, runtimeHealthService) {
        this.options = options;
        this.runtimeHealthService = runtimeHealthService;
    }
    onModuleInit() {
        this.isShuttingDown = false;
        this.markRabbitmqState('degraded', {
            message: 'Waiting for initial RabbitMQ connection'
        });
        void this.createConnection(this.options);
    }
    async onModuleDestroy() {
        await this.closeConnection();
    }
    async createConnection(options) {
        return await this.ensureConnection(options);
    }
    async getPublisherChannel() {
        const activeConnection = await this.ensureConnection(this.options);
        if (this.publisherChannel) {
            return this.publisherChannel;
        }
        const channel = await (0, async_retry_1.default)(async () => await activeConnection.createConfirmChannel(), this.retryOptions());
        this.publisherChannel = channel;
        rabbitmq_metrics_1.rabbitmqPublisherChannelStateGauge.set(1);
        this.attachPublisherChannelHandlers(channel);
        return channel;
    }
    async getConsumerChannel(channelName) {
        const activeConnection = await this.ensureConnection(this.options);
        const existingChannel = this.consumerChannels.get(channelName);
        if (existingChannel) {
            return existingChannel;
        }
        const channel = await (0, async_retry_1.default)(async () => await activeConnection.createChannel(), this.retryOptions());
        this.consumerChannels.set(channelName, channel);
        rabbitmq_metrics_1.rabbitmqConsumerChannelStateGauge.labels(channelName).set(1);
        this.attachConsumerChannelHandlers(channelName, channel);
        return channel;
    }
    async closeChanel() {
        await this.closeAllChannels(true);
    }
    async closeConnection() {
        this.isShuttingDown = true;
        await this.closeAllChannels(true);
        if (!this.connection) {
            rabbitmq_metrics_1.rabbitmqConnectionStateGauge.set(0);
            return;
        }
        const connection = this.connection;
        this.connection = null;
        try {
            await connection.close();
            common_1.Logger.log('RabbitMQ connection closed gracefully');
        }
        catch (error) {
            if (!this.isExpectedCloseError(error)) {
                common_1.Logger.error('RabbitMQ connection close failed', error);
            }
        }
        finally {
            rabbitmq_metrics_1.rabbitmqConnectionStateGauge.set(0);
            this.markRabbitmqState('degraded', {
                message: 'RabbitMQ connection closed'
            });
        }
    }
    async ensureConnection(options) {
        if (this.connection) {
            return this.connection;
        }
        if (this.connectionPromise) {
            return await this.connectionPromise;
        }
        this.connectionPromise = this.connectWithRetry(options);
        try {
            return await this.connectionPromise;
        }
        finally {
            this.connectionPromise = null;
        }
    }
    async connectWithRetry(options) {
        try {
            const connection = await (0, async_retry_1.default)(async () => await this.openConnection(options), this.retryOptions());
            this.connection = connection;
            rabbitmq_metrics_1.rabbitmqConnectionStateGauge.set(1);
            this.markRabbitmqState('up', {
                host: options?.host ?? configs_1.default.rabbitmq.host,
                port: options?.port ?? configs_1.default.rabbitmq.port
            });
            return connection;
        }
        catch (error) {
            rabbitmq_metrics_1.rabbitmqConnectionStateGauge.set(0);
            this.markRabbitmqState('degraded', {
                message: 'RabbitMQ connection unavailable',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async openConnection(options) {
        const host = options?.host ?? configs_1.default.rabbitmq.host;
        const port = options?.port ?? configs_1.default.rabbitmq.port;
        const connection = await amqp.connect(`amqp://${host}:${port}`, {
            username: options?.username ?? configs_1.default.rabbitmq.username,
            password: options?.password ?? configs_1.default.rabbitmq.password
        });
        this.attachConnectionHandlers(connection);
        return connection;
    }
    attachConnectionHandlers(connection) {
        connection.on('error', (error) => {
            if (this.isShuttingDown) {
                common_1.Logger.warn(`RabbitMQ connection error observed during shutdown: ${error}`);
                return;
            }
            common_1.Logger.error(`RabbitMQ connection error: ${error}`);
            this.markRabbitmqState('degraded', {
                message: 'RabbitMQ connection error',
                error: error instanceof Error ? error.message : String(error)
            });
        });
        connection.on('close', () => {
            this.connection = null;
            this.publisherChannel = null;
            rabbitmq_metrics_1.rabbitmqConnectionStateGauge.set(0);
            rabbitmq_metrics_1.rabbitmqPublisherChannelStateGauge.set(0);
            for (const channelName of this.consumerChannels.keys()) {
                rabbitmq_metrics_1.rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
            }
            this.consumerChannels.clear();
            this.markRabbitmqState('degraded', {
                message: 'RabbitMQ connection closed'
            });
            if (!this.isShuttingDown) {
                void this.createConnection(this.options).catch((error) => {
                    common_1.Logger.error('Background RabbitMQ reconnect failed', error);
                });
            }
        });
    }
    attachPublisherChannelHandlers(channel) {
        channel.on('error', (error) => {
            if (this.isShuttingDown) {
                common_1.Logger.warn(`RabbitMQ publisher channel error observed during shutdown: ${error}`);
                return;
            }
            if (this.publisherChannel === channel) {
                this.publisherChannel = null;
            }
            rabbitmq_metrics_1.rabbitmqPublisherChannelStateGauge.set(0);
            this.markRabbitmqState('degraded', {
                message: 'RabbitMQ publisher channel error',
                error: error instanceof Error ? error.message : String(error)
            });
        });
        channel.on('close', () => {
            if (this.publisherChannel === channel) {
                this.publisherChannel = null;
            }
            rabbitmq_metrics_1.rabbitmqPublisherChannelStateGauge.set(0);
            this.markRabbitmqState('degraded', {
                message: 'RabbitMQ publisher channel closed'
            });
        });
    }
    attachConsumerChannelHandlers(channelName, channel) {
        channel.on('error', (error) => {
            if (this.isShuttingDown) {
                common_1.Logger.warn(`RabbitMQ consumer channel "${channelName}" error observed during shutdown: ${error}`);
                return;
            }
            if (this.consumerChannels.get(channelName) === channel) {
                this.consumerChannels.delete(channelName);
            }
            rabbitmq_metrics_1.rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
            this.markRabbitmqState('degraded', {
                message: `RabbitMQ consumer channel "${channelName}" error`,
                error: error instanceof Error ? error.message : String(error)
            });
        });
        channel.on('close', () => {
            if (this.consumerChannels.get(channelName) === channel) {
                this.consumerChannels.delete(channelName);
            }
            rabbitmq_metrics_1.rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
            this.markRabbitmqState('degraded', {
                message: `RabbitMQ consumer channel "${channelName}" closed`
            });
        });
    }
    async closeAllChannels(shutdownMode) {
        const publisherChannel = this.publisherChannel;
        this.publisherChannel = null;
        if (publisherChannel) {
            try {
                await publisherChannel.close();
            }
            catch (error) {
                if (!shutdownMode || !this.isExpectedCloseError(error)) {
                    common_1.Logger.error('RabbitMQ publisher channel close failed', error);
                }
            }
        }
        rabbitmq_metrics_1.rabbitmqPublisherChannelStateGauge.set(0);
        for (const [channelName, consumerChannel] of this.consumerChannels.entries()) {
            try {
                await consumerChannel.close();
            }
            catch (error) {
                if (!shutdownMode || !this.isExpectedCloseError(error)) {
                    common_1.Logger.error(`RabbitMQ consumer channel "${channelName}" close failed`, error);
                }
            }
            finally {
                rabbitmq_metrics_1.rabbitmqConsumerChannelStateGauge.labels(channelName).set(0);
            }
        }
        this.consumerChannels.clear();
    }
    retryOptions() {
        return {
            retries: configs_1.default.retry.count,
            factor: configs_1.default.retry.factor,
            minTimeout: configs_1.default.retry.minTimeout,
            maxTimeout: configs_1.default.retry.maxTimeout
        };
    }
    isExpectedCloseError(error) {
        const message = error instanceof Error ? error.message : String(error ?? '');
        const normalizedMessage = message.toLowerCase();
        return (normalizedMessage.includes('closed') ||
            normalizedMessage.includes('closing') ||
            normalizedMessage.includes('unexpected close'));
    }
    markRabbitmqState(state, details) {
        this.runtimeHealthService?.setComponentStatus('rabbitmq', state, details);
    }
};
exports.RabbitmqConnection = RabbitmqConnection;
exports.RabbitmqConnection = RabbitmqConnection = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(RabbitmqOptions)),
    __metadata("design:paramtypes", [RabbitmqOptions,
        runtime_health_service_1.RuntimeHealthService])
], RabbitmqConnection);
//# sourceMappingURL=rabbitmq-connection.js.map