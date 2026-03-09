import { BadRequestException } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { ValidationError, ValidatorOptions } from 'class-validator';
export declare const DEFAULT_VALIDATOR_OPTIONS: ValidatorOptions;
export declare const flattenValidationErrors: (errors: ValidationError[]) => string[];
export declare const buildValidationException: (errors: ValidationError[]) => BadRequestException;
export declare const validateModel: <T>(model: ClassConstructor<T>, payload: unknown, options?: ValidatorOptions) => T;
