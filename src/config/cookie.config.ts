import type { CookieOptions as ExpressCookieOptions } from 'express';
import type { CookieOptions as SessionCookieOptions } from 'express-session';

const isProd = process.env.NODE_ENV === 'production';

const cookieConfig: Pick<
  ExpressCookieOptions,
  'httpOnly' | 'secure' | 'sameSite' | 'path'
> = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
};

const maxAgeMs = Number(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000;

export const sessionCookieConfig: SessionCookieOptions = {
  ...cookieConfig,
  maxAge: maxAgeMs,
};

export const clearCookieConfig: ExpressCookieOptions = {
  ...cookieConfig,
};
