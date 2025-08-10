import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '../exceptions/api-error.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, message, errorCode, meta, details } =
      this.extractErrorInfo(exception);

    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(
        `[${req.method}] ${req.url} → ${status} :: ${message}`,
        details || '',
      );
    } else {
      this.logger.error(`[${req.method}] ${req.url} → ${status} :: ${message}`);
    }

    res.status(status).json({
      statusCode: status,
      message,
      errorCode,
      path: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && { details, meta }),
    });
  }

  private extractErrorInfo(exception: unknown) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string | undefined;
    let meta: Record<string, any> | undefined;
    let details: any = undefined;

    if (exception instanceof ApiError) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || message;
      errorCode = res.errorCode;
      meta = res.meta;
      details =
        process.env.NODE_ENV !== 'production' ? exception.stack : undefined;
      return { status, message, errorCode, meta, details };
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (typeof res === 'string') {
        message = res;
      } else {
        message = Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message || message;
        details = res;
      }
      return { status, message, errorCode, meta, details };
    }

    if (exception instanceof Error) {
      message = exception.message;
      details =
        process.env.NODE_ENV !== 'production' ? exception.stack : undefined;
      return { status, message, errorCode, meta, details };
    }

    message = String(exception);
    details = exception;
    return { status, message, errorCode, meta, details };
  }
}
