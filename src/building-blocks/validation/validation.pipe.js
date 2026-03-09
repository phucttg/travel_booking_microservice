"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const validation_utils_1 = require("./validation.utils");
const createGlobalValidationPipe = () => new common_1.ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validateCustomDecorators: true,
    stopAtFirstError: false,
    transformOptions: {
        enableImplicitConversion: false
    },
    exceptionFactory: (errors) => (0, validation_utils_1.buildValidationException)(errors)
});
exports.createGlobalValidationPipe = createGlobalValidationPipe;
//# sourceMappingURL=validation.pipe.js.map