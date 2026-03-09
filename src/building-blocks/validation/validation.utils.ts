import { BadRequestException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { ValidationError, ValidatorOptions, validateSync } from 'class-validator';

export const DEFAULT_VALIDATOR_OPTIONS: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  skipMissingProperties: false
};

export const flattenValidationErrors = (errors: ValidationError[]): string[] => {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children));
    }
  }

  return messages;
};

export const buildValidationException = (errors: ValidationError[]): BadRequestException => {
  const messages = flattenValidationErrors(errors);
  const message = messages.length > 0 ? messages.join(', ') : 'Validation failed';

  return new BadRequestException(message);
};

export const validateModel = <T>(
  model: ClassConstructor<T>,
  payload: unknown,
  options?: ValidatorOptions
): T => {
  const instance = plainToInstance(model, payload, {
    enableImplicitConversion: false
  });

  const errors = validateSync(instance as object, {
    ...DEFAULT_VALIDATOR_OPTIONS,
    ...options
  });

  if (errors.length > 0) {
    throw buildValidationException(errors);
  }

  return instance;
};
