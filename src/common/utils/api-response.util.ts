export type APIResponseStatus = 'success' | 'error';

export class APIResponse<T = any> {
  status: APIResponseStatus;
  message: string;
  data: T | null;

  private constructor(
    status: APIResponseStatus,
    message: string,
    data: T | null,
  ) {
    this.status = status;
    this.message = message;
    this.data = data;
  }

  static success<T = any>(data: T, message = 'Success'): APIResponse<T> {
    return new APIResponse('success', message, data);
  }

  static error<T = any>(
    message = 'Something went wrong',
    data?: T,
  ): APIResponse<T> {
    return new APIResponse('error', message, data === undefined ? null : data);
  }
}
