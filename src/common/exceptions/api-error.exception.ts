import { HttpException, HttpStatus } from '@nestjs/common';

interface ApiErrorMeta {
  [key: string]: any;
}

export class ApiError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    errorCode?: string,
    meta?: ApiErrorMeta,
  ) {
    super({ statusCode: status, message, errorCode, meta }, status);
  }
}
