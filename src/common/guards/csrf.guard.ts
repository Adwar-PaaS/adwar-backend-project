import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { CSRF_EXEMPT_KEY } from '../decorators/csrf-exempt.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isExempt = this.reflector.getAllAndOverride<boolean>(
      CSRF_EXEMPT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isExempt) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (this.safeMethods.includes(request.method)) return true;

    this.validateCsrfToken(request);
    return true;
  }

  private validateCsrfToken(request: Request): void {
    const csrfCookie = request.cookies['XSRF-TOKEN'];
    const csrfHeader = request.headers['x-csrf-token'] as string;

    if (!csrfCookie)
      throw new ForbiddenException('CSRF token missing in cookie');
    if (!csrfHeader)
      throw new ForbiddenException('CSRF token missing in header');

    if (
      !this.isValidTokenFormat(csrfCookie) ||
      !this.isValidTokenFormat(csrfHeader)
    ) {
      throw new ForbiddenException('Invalid CSRF token format');
    }

    if (!this.timingSafeEqual(csrfCookie, csrfHeader)) {
      throw new ForbiddenException('CSRF token mismatch');
    }
  }

  private isValidTokenFormat(token: string): boolean {
    return /^[a-f0-9]{64}$/i.test(token);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
