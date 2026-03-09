import { Transform } from 'class-transformer';

const sanitizeTextValue = (value: string): string => value.normalize('NFKC').trim();

export const SanitizedText = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return sanitizeTextValue(value);
  });

export const OptionalSanitizedText = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const sanitized = sanitizeTextValue(value);

    return sanitized === '' ? undefined : sanitized;
  });

export const UppercaseText = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return sanitizeTextValue(value).toUpperCase();
  });

export const OptionalUppercaseText = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const sanitized = sanitizeTextValue(value).toUpperCase();

    return sanitized === '' ? undefined : sanitized;
  });

export const TrimmedText = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim();
  });

export const OptionalTrimmedText = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    return trimmed === '' ? undefined : trimmed;
  });

export const ToInteger = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value;
    }

    if (typeof value === 'number') {
      return Math.trunc(value);
    }

    return Number.parseInt(String(value), 10);
  });

export const ToNumber = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value;
    }

    if (typeof value === 'number') {
      return value;
    }

    return Number(value);
  });

export const ToDate = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    return new Date(String(value));
  });
