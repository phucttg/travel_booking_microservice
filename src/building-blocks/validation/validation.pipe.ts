import { ValidationPipe } from '@nestjs/common';
import { buildValidationException } from './validation.utils';

export const createGlobalValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validateCustomDecorators: true,
    stopAtFirstError: false,
    transformOptions: {
      enableImplicitConversion: false
    },
    exceptionFactory: (errors) => buildValidationException(errors)
  });
