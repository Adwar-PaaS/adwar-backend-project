import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    let message = 'Something went wrong';
    let errorDetails: any = null;

    if (typeof errorResponse === 'string') {
      message = errorResponse;
    } else if (
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse
    ) {
      const extracted = (errorResponse as any).message;
      message = Array.isArray(extracted) ? extracted.join(', ') : extracted;
      errorDetails = errorResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = exception.stack;
    }

    this.logger.error(
      `Exception on ${request.method} ${request.url}`,
      typeof exception === 'object' && exception !== null
        ? JSON.stringify(exception, Object.getOwnPropertyNames(exception), 2)
        : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && {
        error: errorDetails,
      }),
    });
  }
}
