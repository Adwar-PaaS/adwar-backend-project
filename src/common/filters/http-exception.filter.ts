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
import { APIResponse } from '../utils/api-response.util';

interface ExtractedError {
  status: number;
  message: string;
  errorCode?: string;
  meta?: Record<string, any>;
  details?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isDev = process.env.NODE_ENV !== 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, message, errorCode, meta, details } =
      this.extractErrorInfo(exception);

    this.logger.error(
      `[${req.method}] ${req.url} → ${status} :: ${message}`,
      this.isDev ? details || '' : '',
    );

    const response = APIResponse.error(
      message,
      status,
      { errorCode, details: this.isDev ? details : undefined },
      meta,
    );

    res.status(status).json({
      ...response,
      path: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  private extractErrorInfo(exception: unknown): ExtractedError {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string | undefined;
    let meta: Record<string, any> | undefined;
    let details: any = undefined;

    if (exception instanceof ApiError) {
      status = exception.getStatus();
      message = exception.message;
      errorCode = exception.errorCode;
      meta = exception.meta;
      details = this.isDev ? exception.stack : undefined;
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
      details = this.isDev ? exception.stack : undefined;
      return { status, message, errorCode, meta, details };
    }

    message = String(exception);
    details = exception;
    return { status, message, errorCode, meta, details };
  }
}
