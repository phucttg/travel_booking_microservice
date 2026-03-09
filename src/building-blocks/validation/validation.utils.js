"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModel = exports.buildValidationException = exports.flattenValidationErrors = exports.DEFAULT_VALIDATOR_OPTIONS = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.DEFAULT_VALIDATOR_OPTIONS = {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false
};
const flattenValidationErrors = (errors) => {
    const messages = [];
    for (const error of errors) {
        if (error.constraints) {
            messages.push(...Object.values(error.constraints));
        }
        if (error.children?.length) {
            messages.push(...(0, exports.flattenValidationErrors)(error.children));
        }
    }
    return messages;
};
exports.flattenValidationErrors = flattenValidationErrors;
const buildValidationException = (errors) => {
    const messages = (0, exports.flattenValidationErrors)(errors);
    const message = messages.length > 0 ? messages.join(', ') : 'Validation failed';
    return new common_1.BadRequestException(message);
};
exports.buildValidationException = buildValidationException;
const validateModel = (model, payload, options) => {
    const instance = (0, class_transformer_1.plainToInstance)(model, payload, {
        enableImplicitConversion: false
    });
    const errors = (0, class_validator_1.validateSync)(instance, {
        ...exports.DEFAULT_VALIDATOR_OPTIONS,
        ...options
    });
    if (errors.length > 0) {
        throw (0, exports.buildValidationException)(errors);
    }
    return instance;
};
exports.validateModel = validateModel;
//# sourceMappingURL=validation.utils.js.map