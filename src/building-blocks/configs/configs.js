"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const joi_1 = __importDefault(require("joi"));
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), `.env.${nodeEnv}`) });
dotenv_1.default.config({ override: true });
const envVarsSchema = joi_1.default.object()
    .keys({
    NODE_ENV: joi_1.default.string().required(),
    SERVICE_NAME: joi_1.default.string(),
    PORT: joi_1.default.number().default(3000),
    JWT_SECRET: joi_1.default.string().trim().min(16).required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: joi_1.default.number()
        .default(5)
        .description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: joi_1.default.number()
        .integer()
        .min(1)
        .default(1)
        .description('days after which refresh tokens expire'),
    JWT_REMOTE_INTROSPECTION_ENABLED: joi_1.default.boolean()
        .default(true)
        .description('Whether authenticated requests should validate token revocation against identity'),
    IDENTITY_SERVICE_BASE_URL: joi_1.default.string()
        .uri({ scheme: ['http', 'https'] })
        .default('http://localhost:3333')
        .description('Identity service base URL for access-token introspection'),
    RATE_LIMIT_ENABLED: joi_1.default.boolean().default(true).description('Enable app-level rate limiting'),
    RATE_LIMIT_MODE: joi_1.default.string()
        .valid('shadow', 'enforce')
        .default('shadow')
        .description('Rate limiting enforcement mode'),
    RATE_LIMIT_REDIS_URL: joi_1.default.string()
        .default('redis://localhost:6379')
        .description('Redis URL for rate limiting counters'),
    RATE_LIMIT_FAIL_OPEN: joi_1.default.boolean()
        .default(true)
        .description('Allow requests when limiter backend is degraded'),
    RATE_LIMIT_HEADER_ENABLED: joi_1.default.boolean()
        .default(true)
        .description('Write rate limit headers to responses'),
    RATE_LIMIT_TRUST_PROXY: joi_1.default.boolean()
        .default(true)
        .description('Enable trust proxy for correct client IP extraction'),
    RATE_LIMIT_INTERNAL_ALLOWED_SERVICES: joi_1.default.string()
        .default('identity,flight,booking,payment,passenger,frontend')
        .description('Comma-separated internal caller names that can be trusted'),
    RATE_LIMIT_INTERNAL_MAX_CLOCK_SKEW_SECONDS: joi_1.default.number()
        .integer()
        .min(1)
        .default(60)
        .description('Allowed internal-call timestamp clock skew in seconds'),
    INTERNAL_SERVICE_AUTH_SECRET: joi_1.default.string()
        .allow('')
        .default('local-dev-internal-secret')
        .description('Shared secret for signed service-to-service internal calls'),
    POSTGRES_HOST: joi_1.default.string().default('localhost').description('Postgres host'),
    POSTGRES_PORT: joi_1.default.number().default(5432).description('Postgres host'),
    POSTGRES_USERNAME: joi_1.default.string().default('postgres').description('Postgres username'),
    POSTGRES_PASSWORD: joi_1.default.string().default('postgres').description('Postgres password'),
    POSTGRES_Database: joi_1.default.string()
        .default('default_database')
        .description('Postgres database name'),
    POSTGRES_SYNCHRONIZE: joi_1.default.boolean()
        .default(false)
        .description('Synchronize if true it dosent use migrations'),
    POSTGRES_AUTO_LOAD_ENTITIES: joi_1.default.boolean()
        .default(true)
        .description('For loading all entities automatically'),
    POSTGRES_ENTITIES: joi_1.default.string().description('Postgres entities'),
    POSTGRES_MIGRATIONS: joi_1.default.string().description('Postgres migrations'),
    POSTGRES_LOGGING: joi_1.default.boolean().default(false).description('Postgres logging'),
    POSTGRES_MIGRATIONS_RUN: joi_1.default.boolean()
        .default(false)
        .description('Run migrations after running project'),
    POSTGRES_SSL: joi_1.default.boolean().default(false).description('Use SSL for Postgres connection'),
    POSTGRES_SSL_REJECT_UNAUTHORIZED: joi_1.default.boolean()
        .default(true)
        .description('Reject unauthorized SSL certificates'),
    RABBITMQ_Host: joi_1.default.string().default('localhost').description('Rabbitmq host'),
    RABBITMQ_PORT: joi_1.default.number().default(5672).description('Rabbitmq port'),
    RABBITMQ_USERNAME: joi_1.default.string().default('guest').description('Rabbitmq username'),
    RABBITMQ_PASSWORD: joi_1.default.string().default('guest').description('Rabbitmq password'),
    RABBITMQ_EXCHANGE: joi_1.default.string().description('Rabbitmq exchange'),
    RABBITMQ_USE_MESSAGE_ENVELOPE: joi_1.default.boolean()
        .default(false)
        .description('Publish events using the shared message envelope'),
    RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS: joi_1.default.number()
        .default(5000)
        .description('Maximum time to wait for RabbitMQ publisher confirms'),
    RETRY_COUNT: joi_1.default.number().default(3).description('Number of retries'),
    RETRY_FACTOR: joi_1.default.number().default(2).description('Exponential backoff factor'),
    RETRY_MIN_TIMEOUT: joi_1.default.number()
        .default(1000)
        .description('Minimum time before retrying (1 second)'),
    RETRY_MAX_TIMEOUT: joi_1.default.number()
        .default(60000)
        .description('Maximum time before retrying (60 seconds)'),
    OUTBOX_POLL_INTERVAL_MS: joi_1.default.number()
        .default(5000)
        .description('Polling interval for service outbox dispatchers'),
    OUTBOX_MAX_ATTEMPTS: joi_1.default.number()
        .default(20)
        .description('Maximum retry attempts before an outbox message is considered stalled'),
    OUTBOX_RETRY_BASE_MS: joi_1.default.number()
        .default(5000)
        .description('Base retry delay for outbox failures'),
    OPEN_TELEMETRY_COLLECTOR_URL: joi_1.default.string()
        .default('http://localhost:4317')
        .description('Collector URL'),
    OPEN_TELEMETRY_SERVICE_VERSION: joi_1.default.string().default("1.0.0").description('Service Version'),
    OPEN_TELEMETRY_SERVICE_NAME: joi_1.default.string()
        .default('default_service_name')
        .description('Service Name')
})
    .unknown();
const { value: envVars, error } = envVarsSchema
    .prefs({ errors: { label: 'key' } })
    .validate(process.env);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
const nodeEnvironment = String(envVars.NODE_ENV || '').toLowerCase();
const requiresStrongInternalSecret = envVars.RATE_LIMIT_ENABLED && ['production', 'staging'].includes(nodeEnvironment);
if (requiresStrongInternalSecret &&
    (!envVars.INTERNAL_SERVICE_AUTH_SECRET ||
        envVars.INTERNAL_SERVICE_AUTH_SECRET === 'local-dev-internal-secret')) {
    throw new Error('Config validation error: INTERNAL_SERVICE_AUTH_SECRET must be configured with a non-default value in production-like environments');
}
const internalAllowedServiceNames = String(envVars.RATE_LIMIT_INTERNAL_ALLOWED_SERVICES || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => Boolean(value));
exports.default = {
    env: envVars.NODE_ENV,
    serviceName: envVars.SERVICE_NAME,
    port: envVars.PORT,
    rabbitmq: {
        host: envVars.RABBITMQ_Host,
        port: envVars.RABBITMQ_PORT,
        username: envVars.RABBITMQ_USERNAME,
        password: envVars.RABBITMQ_PASSWORD,
        exchange: envVars.RABBITMQ_EXCHANGE,
        useEnvelope: envVars.RABBITMQ_USE_MESSAGE_ENVELOPE,
        publishConfirmTimeoutMs: envVars.RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS
    },
    postgres: {
        host: envVars.POSTGRES_HOST,
        port: envVars.POSTGRES_PORT,
        username: envVars.POSTGRES_USERNAME,
        password: envVars.POSTGRES_PASSWORD,
        database: envVars.POSTGRES_Database,
        synchronize: envVars.POSTGRES_SYNCHRONIZE,
        autoLoadEntities: envVars.POSTGRES_AUTO_LOAD_ENTITIES,
        entities: envVars.POSTGRES_ENTITIES,
        migrations: envVars.POSTGRES_MIGRATIONS,
        logging: envVars.POSTGRES_LOGGING,
        migrationsRun: envVars.POSTGRES_MIGRATIONS_RUN,
        ssl: envVars.POSTGRES_SSL,
        sslRejectUnauthorized: envVars.POSTGRES_SSL_REJECT_UNAUTHORIZED
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        remoteIntrospectionEnabled: envVars.JWT_REMOTE_INTROSPECTION_ENABLED
    },
    identity: {
        serviceBaseUrl: envVars.IDENTITY_SERVICE_BASE_URL
    },
    rateLimit: {
        enabled: envVars.RATE_LIMIT_ENABLED,
        mode: envVars.RATE_LIMIT_MODE,
        redisUrl: envVars.RATE_LIMIT_REDIS_URL,
        failOpen: envVars.RATE_LIMIT_FAIL_OPEN,
        headerEnabled: envVars.RATE_LIMIT_HEADER_ENABLED,
        trustProxy: envVars.RATE_LIMIT_TRUST_PROXY
    },
    internalAuth: {
        secret: envVars.INTERNAL_SERVICE_AUTH_SECRET,
        maxClockSkewSeconds: envVars.RATE_LIMIT_INTERNAL_MAX_CLOCK_SKEW_SECONDS,
        allowedServiceNames: internalAllowedServiceNames
    },
    retry: {
        count: envVars.RETRY_COUNT,
        factor: envVars.RETRY_FACTOR,
        minTimeout: envVars.RETRY_MIN_TIMEOUT,
        maxTimeout: envVars.RETRY_MAX_TIMEOUT
    },
    outbox: {
        pollIntervalMs: envVars.OUTBOX_POLL_INTERVAL_MS,
        maxAttempts: envVars.OUTBOX_MAX_ATTEMPTS,
        retryBaseMs: envVars.OUTBOX_RETRY_BASE_MS
    },
    opentelemetry: {
        serviceName: envVars.OPEN_TELEMETRY_SERVICE_NAME,
        serviceVersion: envVars.OPEN_TELEMETRY_SERVICE_VERSION,
        collectorUrl: envVars.OPEN_TELEMETRY_COLLECTOR_URL
    }
};
//# sourceMappingURL=configs.js.map