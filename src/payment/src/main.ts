import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import { PrometheusMetrics } from 'building-blocks/monitoring/prometheus.metrics';
import { ErrorHandlersFilter } from 'building-blocks/filters/error-handlers.filter';
import configs from 'building-blocks/configs/configs';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
import { OtelLogger } from 'building-blocks/openTelemetry/otel-logger';
import { createGlobalValidationPipe } from 'building-blocks/validation/validation.pipe';

async function bootstrap() {
  OpenTelemetryModule.start();
  const app = await NestFactory.create(AppModule);

  const logger = app.get(OtelLogger);
  app.useLogger(logger);

  app.enableShutdownHooks();

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI
  });

  const config = new DocumentBuilder()
    .setTitle(`${configs.serviceName}`)
    .setDescription(`${configs.serviceName} api description`)
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new ErrorHandlersFilter());

  app.use((req, res, next) => {
    if (req.originalUrl == '/' || req.originalUrl.includes('favicon.ico')) {
      return res.send(configs.serviceName);
    }
    return next();
  });

  PrometheusMetrics.registerMetricsEndpoint(app);

  const port = configs.port || 3377;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
