"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToDate = exports.ToNumber = exports.ToInteger = exports.OptionalTrimmedText = exports.TrimmedText = exports.OptionalUppercaseText = exports.UppercaseText = exports.OptionalSanitizedText = exports.SanitizedText = void 0;
const class_transformer_1 = require("class-transformer");
const sanitizeTextValue = (value) => value.normalize('NFKC').trim();
const SanitizedText = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    return sanitizeTextValue(value);
});
exports.SanitizedText = SanitizedText;
const OptionalSanitizedText = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    const sanitized = sanitizeTextValue(value);
    return sanitized === '' ? undefined : sanitized;
});
exports.OptionalSanitizedText = OptionalSanitizedText;
const UppercaseText = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    return sanitizeTextValue(value).toUpperCase();
});
exports.UppercaseText = UppercaseText;
const OptionalUppercaseText = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    const sanitized = sanitizeTextValue(value).toUpperCase();
    return sanitized === '' ? undefined : sanitized;
});
exports.OptionalUppercaseText = OptionalUppercaseText;
const TrimmedText = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    return value.trim();
});
exports.TrimmedText = TrimmedText;
const OptionalTrimmedText = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
});
exports.OptionalTrimmedText = OptionalTrimmedText;
const ToInteger = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (value === undefined || value === null || value === '') {
        return value;
    }
    if (typeof value === 'number') {
        return Math.trunc(value);
    }
    return Number.parseInt(String(value), 10);
});
exports.ToInteger = ToInteger;
const ToNumber = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (value === undefined || value === null || value === '') {
        return value;
    }
    if (typeof value === 'number') {
        return value;
    }
    return Number(value);
});
exports.ToNumber = ToNumber;
const ToDate = () => (0, class_transformer_1.Transform)(({ value }) => {
    if (value === undefined || value === null || value === '') {
        return value;
    }
    if (value instanceof Date) {
        return value;
    }
    return new Date(String(value));
});
exports.ToDate = ToDate;
//# sourceMappingURL=validation.decorators.js.map