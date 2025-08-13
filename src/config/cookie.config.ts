import type { CookieOptions as ExpressCookieOptions } from 'express';
import type { CookieOptions as SessionCookieOptions } from 'express-session';

const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

const maxAgeMs = Number(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000;

export const sessionCookieConfig: SessionCookieOptions = {
  ...cookieConfig,
  maxAge: maxAgeMs,
};

export const clearCookieConfig: ExpressCookieOptions = {
  ...cookieConfig,
};
