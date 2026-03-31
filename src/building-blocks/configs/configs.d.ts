declare const _default: {
    env: any;
    serviceName: any;
    port: any;
    rabbitmq: {
        host: any;
        port: any;
        username: any;
        password: any;
        exchange: any;
        useEnvelope: any;
        publishConfirmTimeoutMs: any;
    };
    postgres: {
        host: any;
        port: any;
        username: any;
        password: any;
        database: any;
        synchronize: any;
        autoLoadEntities: any;
        entities: any;
        migrations: any;
        logging: any;
        migrationsRun: any;
        ssl: any;
        sslRejectUnauthorized: any;
    };
    jwt: {
        secret: any;
        accessExpirationMinutes: any;
        refreshExpirationDays: any;
        remoteIntrospectionEnabled: any;
    };
    identity: {
        serviceBaseUrl: any;
    };
    rateLimit: {
        enabled: any;
        mode: any;
        redisUrl: any;
        failOpen: any;
        headerEnabled: any;
        trustProxy: any;
    };
    internalAuth: {
        secret: any;
        maxClockSkewSeconds: any;
        allowedServiceNames: string[];
    };
    retry: {
        count: any;
        factor: any;
        minTimeout: any;
        maxTimeout: any;
    };
    outbox: {
        pollIntervalMs: any;
        maxAttempts: any;
        retryBaseMs: any;
    };
    opentelemetry: {
        serviceName: any;
        serviceVersion: any;
        collectorUrl: any;
    };
};
export default _default;
