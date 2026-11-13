import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** Standard error shape for every error response: { code, message, requestId, fieldErrors? } */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  fieldErrors?: Record<string, string[]>;
}

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();
    const requestId = String(req.id ?? '');

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
      const payload: ApiErrorBody = {
        code: typeof body.code === 'string' ? body.code : (DEFAULT_CODES[status] ?? 'ERROR'),
        // Only our own messages reach users; never raw backend or SQL text.
        message: typeof body.message === 'string' ? body.message : exception.message,
        requestId,
      };
      if (body.fieldErrors) payload.fieldErrors = body.fieldErrors as Record<string, string[]>;
      res.status(status).json(payload);
      return;
    }

    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      requestId,
    } satisfies ApiErrorBody);
  }
}
