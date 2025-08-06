import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    private readonly errorCode?: string,
    private readonly meta?: Record<string, any>,
  ) {
    super(
      {
        statusCode: status,
        message,
        errorCode,
        meta,
      },
      status,
    );
  }
}
