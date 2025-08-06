export class APIResponse<T = any> {
  statusCode: number;
  message: string;
  data: T | null;

  private constructor(statusCode: number, message: string, data: T | null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static success<T = any>(
    data: T,
    message = 'Success',
    statusCode = 200,
  ): APIResponse<T> {
    return new APIResponse(statusCode, message, data);
  }

  static error<T = any>(
    message = 'Something went wrong',
    statusCode = 400,
    data?: T,
  ): APIResponse<T> {
    return new APIResponse(
      statusCode,
      message,
      data === undefined ? null : data,
    );
  }
}
