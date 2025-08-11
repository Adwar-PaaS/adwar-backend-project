import { HttpStatus } from '@nestjs/common';
export class APIResponse<T = any> {
  readonly statusCode: HttpStatus;
  readonly message: string;
  readonly data: T | null;
  readonly meta?: Record<string, any>;

  private constructor(
    statusCode: HttpStatus,
    message: string,
    data: T | null,
    meta?: Record<string, any>,
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success<T = any>(
    data: T,
    message = 'Success',
    statusCode: HttpStatus = HttpStatus.OK,
    meta?: Record<string, any>,
  ): APIResponse<T> {
    return new APIResponse(statusCode, message, data, meta);
  }

  static error<T = any>(
    message = 'Something went wrong',
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    data?: T,
    meta?: Record<string, any>,
  ): APIResponse<T> {
    return new APIResponse(statusCode, message, data ?? null, meta);
  }

  static paginated<T = any>(
    data: T[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    message = 'Success',
    statusCode: HttpStatus = HttpStatus.OK,
  ): APIResponse<T[]> {
    return new APIResponse(statusCode, message, data, { pagination });
  }
}
