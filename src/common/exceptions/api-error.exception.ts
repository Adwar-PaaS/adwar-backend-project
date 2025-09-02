import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorMeta {
  [key: string]: any;
}

export class ApiError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
    public readonly meta?: ApiErrorMeta,
  ) {
    super({ statusCode: status, message, errorCode, meta }, status);
  }
}
