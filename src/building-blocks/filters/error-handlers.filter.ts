import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { Response } from 'express';
import { ProblemDocument } from 'http-problem-details';
import { ValidationError } from 'joi';
import ApplicationException from '../types/exeptions/application.exception';
import { serializeObject } from '../utils/serilization';

@Catch()
export class ErrorHandlersFilter implements ExceptionFilter {
  private getHttpStatus(err: any): number | undefined {
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

    if (err?.name === ForbiddenException.name) {
      return HttpStatus.FORBIDDEN;
    }

    if (err?.name === UnauthorizedException.name) {
      return HttpStatus.UNAUTHORIZED;
    }

    if (err?.name === NotFoundException.name) {
      return HttpStatus.NOT_FOUND;
    }

    if (err?.name === BadRequestException.name) {
      return HttpStatus.BAD_REQUEST;
    }

    if (err?.name === ConflictException.name) {
      return HttpStatus.CONFLICT;
    }

    return undefined;
  }

  private getErrorMessage(err: any): string {
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

  private isJoiValidationError(err: unknown): boolean {
    return (
      err instanceof ValidationError ||
      (typeof err === 'object' &&
        err !== null &&
        ('isJoi' in err || 'name' in err) &&
        ((err as { isJoi?: boolean }).isJoi === true ||
          (err as { name?: string }).name === ValidationError.name))
    );
  }

  public catch(err: any, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (err instanceof ApplicationException) {
      const problem = new ProblemDocument({
        type: ApplicationException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: err.statusCode
      });

      response.status(HttpStatus.BAD_REQUEST).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    if (err instanceof BadRequestException) {
      const problem = new ProblemDocument({
        type: BadRequestException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: err.getStatus()
      });

      response.status(HttpStatus.BAD_REQUEST).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    if (err instanceof UnauthorizedException) {
      const problem = new ProblemDocument({
        type: UnauthorizedException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: err.getStatus()
      });
      response.status(HttpStatus.UNAUTHORIZED).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    if (err instanceof ForbiddenException) {
      const problem = new ProblemDocument({
        type: ForbiddenException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: err.getStatus()
      });

      response.status(HttpStatus.FORBIDDEN).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    if (err instanceof NotFoundException) {
      const problem = new ProblemDocument({
        type: NotFoundException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: err.getStatus()
      });

      response.status(HttpStatus.NOT_FOUND).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    if (err instanceof ConflictException) {
      const problem = new ProblemDocument({
        type: ConflictException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: err.getStatus()
      });

      response.status(HttpStatus.CONFLICT).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    const httpStatus = this.getHttpStatus(err);
    if (httpStatus !== undefined) {
      const problem = new ProblemDocument({
        type: err?.name || HttpException.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: httpStatus
      });

      response.status(httpStatus).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    if (this.isJoiValidationError(err)) {
      const problem = new ProblemDocument({
        type: ValidationError.name,
        title: this.getErrorMessage(err),
        detail: err.stack,
        status: HttpStatus.BAD_REQUEST
      });

      response.status(HttpStatus.BAD_REQUEST).json(problem);

      Logger.error(serializeObject(problem));

      return;
    }

    const problem = new ProblemDocument({
      type: 'INTERNAL_SERVER_ERROR',
      title: this.getErrorMessage(err),
      detail: err.stack,
      status: err.statusCode || 500
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(problem);

    Logger.error(serializeObject(problem));

    return;
  }
}
