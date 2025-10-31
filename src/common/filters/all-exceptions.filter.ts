import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name, { timestamp: true });

    catch(exception: unknown, host: ArgumentsHost): void {
        const httpContext = host.switchToHttp();
        const response = httpContext.getResponse<Response>();
        const request = httpContext.getRequest<Request & { user?: unknown }>();

        const status =
            exception instanceof HttpException
                ? (exception.getStatus() as HttpStatus)
                : HttpStatus.INTERNAL_SERVER_ERROR;
        const errorResponse = exception instanceof HttpException ? exception.getResponse() : undefined;

        const outerMessage = exception instanceof Error ? exception.message : 'Unexpected error';
        const innerMessage = this.extractMessage(errorResponse) ?? outerMessage;
        const stack = exception instanceof Error ? exception.stack : undefined;
        const timestamp = new Date().toISOString();

        this.logger.error(innerMessage, stack);

        const errorBody = this.buildErrorBody(status, timestamp, request.url, innerMessage, errorResponse);

        response.status(status).json(errorBody);
    }

    private extractMessage(errorResponse: unknown): string | undefined {
        if (!errorResponse) {
            return undefined;
        }
        if (typeof errorResponse === 'string') {
            return errorResponse;
        }
        if (Array.isArray(errorResponse)) {
            return errorResponse.join(', ');
        }
        if (typeof errorResponse === 'object' && 'message' in errorResponse) {
            const value = (errorResponse as Record<string, unknown>).message;
            if (typeof value === 'string') {
                return value;
            }
            if (Array.isArray(value)) {
                return value.join(', ');
            }
        }
        return undefined;
    }

    private extractCause(exception: unknown): unknown {
        if (exception instanceof Error && exception.cause) {
            return exception.cause;
        }
        return undefined;
    }

    private buildErrorBody(
        status: HttpStatus,
        timestamp: string,
        path: string,
        message: string,
        errorResponse: unknown,
    ) {
        const body: Record<string, unknown> = {
            statusCode: status,
            timestamp,
            path,
            message,
        };
        if (status === HttpStatus.UNPROCESSABLE_ENTITY && this.isValidationErrorResponse(errorResponse)) {
            body.data = errorResponse?.data ?? errorResponse ?? [];
        }

        return body;
    }

    private isValidationErrorResponse(errorResponse: unknown): errorResponse is Record<string, unknown> {
        if (!errorResponse || typeof errorResponse !== 'object') {
            return false;
        }

        if ('error' in errorResponse && 'data' in errorResponse && 'statusCode' in errorResponse) {
            return true;
        }

        if ('data' in errorResponse && (errorResponse as Record<string, unknown>).data) {
            return true;
        }

        return false;
    }

    private getCorrelationId(request: Request): string | undefined {
        const header = request.headers['x-correlation-id'] ?? request.headers['x-request-id'];
        if (Array.isArray(header)) {
            return header[0];
        }
        return header;
    }
}
