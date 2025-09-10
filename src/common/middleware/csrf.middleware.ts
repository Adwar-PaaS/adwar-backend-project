import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { csrfCookieConfig } from '../../config/cookie.config';

export interface CsrfRequest extends Request {
  csrfToken?: string;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  use(req: CsrfRequest, res: Response, next: NextFunction) {
    try {
      let csrfToken = req.cookies['XSRF-TOKEN'];

      if (!csrfToken || !this.isValidTokenFormat(csrfToken)) {
        csrfToken = this.generateCsrfToken();
        this.logger.debug('Generated new CSRF token');
      }

      res.cookie('XSRF-TOKEN', csrfToken, {
        ...csrfCookieConfig,
      });

      req.csrfToken = csrfToken;
      next();
    } catch (error) {
      this.logger.error('Error in CSRF middleware', error);
      next(error);
    }
  }

  private generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private isValidTokenFormat(token: string): boolean {
    return /^[a-f0-9]{64}$/i.test(token);
  }
}
