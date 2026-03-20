"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlersFilter = void 0;
const common_1 = require("@nestjs/common");
const http_problem_details_1 = require("http-problem-details");
const joi_1 = require("joi");
const application_exception_1 = __importDefault(require("../types/exeptions/application.exception"));
const serilization_1 = require("../utils/serilization");
let ErrorHandlersFilter = class ErrorHandlersFilter {
    getExtraFields(err) {
        const response = err?.getResponse?.() || err?.response;
        if (typeof response !== 'object' || response === null || Array.isArray(response)) {
            return {};
        }
        const { message, statusCode, error, ...rest } = response;
        return rest;
    }
    logProblem(problem) {
        const serializedProblem = (0, serilization_1.serializeObject)(problem);
        const status = Number(problem.status);
        if (Number.isInteger(status) && status >= common_1.HttpStatus.BAD_REQUEST && status < 500) {
            common_1.Logger.warn(serializedProblem);
            return;
        }
        common_1.Logger.error(serializedProblem);
    }
    getHttpStatus(err) {
        if (typeof err?.getStatus === 'function') {
            const status = Number(err.getStatus());
            if (Number.isInteger(status) && status >= 100 && status <= 599) {
                return status;
            }
        }
        const status = Number(err?.status);
        if (Number.isInteger(status) && status >= 100 && status <= 599) {
            return status;
        }
        const statusCode = Number(err?.statusCode);
        if (Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
            return statusCode;
        }
        const response = err?.getResponse?.() || err?.response;
        const responseStatusCode = Number(response?.statusCode);
        if (Number.isInteger(responseStatusCode) && responseStatusCode >= 100 && responseStatusCode <= 599) {
            return responseStatusCode;
        }
        if (err?.name === common_1.ForbiddenException.name) {
            return common_1.HttpStatus.FORBIDDEN;
        }
        if (err?.name === common_1.UnauthorizedException.name) {
            return common_1.HttpStatus.UNAUTHORIZED;
        }
        if (err?.name === common_1.NotFoundException.name) {
            return common_1.HttpStatus.NOT_FOUND;
        }
        if (err?.name === common_1.BadRequestException.name) {
            return common_1.HttpStatus.BAD_REQUEST;
        }
        if (err?.name === common_1.ConflictException.name) {
            return common_1.HttpStatus.CONFLICT;
        }
        return undefined;
    }
    getErrorMessage(err) {
        if (typeof err?.message === 'string') {
            return err.message;
        }
        const response = err?.getResponse?.();
        if (typeof response === 'string') {
            return response;
        }
        if (Array.isArray(response?.message)) {
            return response.message.join(', ');
        }
        if (typeof response?.message === 'string') {
            return response.message;
        }
        return 'Unexpected error';
    }
    isJoiValidationError(err) {
        return (err instanceof joi_1.ValidationError ||
            (typeof err === 'object' &&
                err !== null &&
                ('isJoi' in err || 'name' in err) &&
                (err.isJoi === true ||
                    err.name === joi_1.ValidationError.name)));
    }
    catch(err, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (err instanceof application_exception_1.default) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: application_exception_1.default.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: err.statusCode
            });
            response.status(common_1.HttpStatus.BAD_REQUEST).json(problem);
            this.logProblem(problem);
            return;
        }
        if (err instanceof common_1.BadRequestException) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: common_1.BadRequestException.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: err.getStatus()
            });
            Object.assign(problem, this.getExtraFields(err));
            response.status(common_1.HttpStatus.BAD_REQUEST).json(problem);
            this.logProblem(problem);
            return;
        }
        if (err instanceof common_1.UnauthorizedException) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: common_1.UnauthorizedException.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: err.getStatus()
            });
            Object.assign(problem, this.getExtraFields(err));
            response.status(common_1.HttpStatus.UNAUTHORIZED).json(problem);
            this.logProblem(problem);
            return;
        }
        if (err instanceof common_1.ForbiddenException) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: common_1.ForbiddenException.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: err.getStatus()
            });
            Object.assign(problem, this.getExtraFields(err));
            response.status(common_1.HttpStatus.FORBIDDEN).json(problem);
            this.logProblem(problem);
            return;
        }
        if (err instanceof common_1.NotFoundException) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: common_1.NotFoundException.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: err.getStatus()
            });
            Object.assign(problem, this.getExtraFields(err));
            response.status(common_1.HttpStatus.NOT_FOUND).json(problem);
            this.logProblem(problem);
            return;
        }
        if (err instanceof common_1.ConflictException) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: common_1.ConflictException.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: err.getStatus()
            });
            Object.assign(problem, this.getExtraFields(err));
            response.status(common_1.HttpStatus.CONFLICT).json(problem);
            this.logProblem(problem);
            return;
        }
        const httpStatus = this.getHttpStatus(err);
        if (httpStatus !== undefined) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: err?.name || common_1.HttpException.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: httpStatus
            });
            Object.assign(problem, this.getExtraFields(err));
            response.status(httpStatus).json(problem);
            this.logProblem(problem);
            return;
        }
        if (this.isJoiValidationError(err)) {
            const problem = new http_problem_details_1.ProblemDocument({
                type: joi_1.ValidationError.name,
                title: this.getErrorMessage(err),
                detail: err.stack,
                status: common_1.HttpStatus.BAD_REQUEST
            });
            response.status(common_1.HttpStatus.BAD_REQUEST).json(problem);
            this.logProblem(problem);
            return;
        }
        const problem = new http_problem_details_1.ProblemDocument({
            type: 'INTERNAL_SERVER_ERROR',
            title: this.getErrorMessage(err),
            detail: err.stack,
            status: err.statusCode || 500
        });
        response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json(problem);
        this.logProblem(problem);
        return;
    }
};
exports.ErrorHandlersFilter = ErrorHandlersFilter;
exports.ErrorHandlersFilter = ErrorHandlersFilter = __decorate([
    (0, common_1.Catch)()
], ErrorHandlersFilter);
//# sourceMappingURL=error-handlers.filter.js.map