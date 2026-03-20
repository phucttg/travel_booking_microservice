import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class ErrorHandlersFilter implements ExceptionFilter {
    private getExtraFields;
    private logProblem;
    private getHttpStatus;
    private getErrorMessage;
    private isJoiValidationError;
    catch(err: any, host: ArgumentsHost): any;
}
