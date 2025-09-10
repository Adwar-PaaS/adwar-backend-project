import type { CookieOptions as ExpressCookieOptions } from 'express';
import type { CookieOptions as SessionCookieOptions } from 'express-session';

const isProd = process.env.NODE_ENV === 'production';

const baseCookieConfig: Pick<
  ExpressCookieOptions,
  'httpOnly' | 'secure' | 'sameSite' | 'path'
> = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'strict',
  path: '/',
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

const maxAgeMs = Number(process.env.SESSION_MAX_AGE) || ONE_WEEK_MS;

export const sessionCookieConfig: SessionCookieOptions = {
  ...baseCookieConfig,
  maxAge: maxAgeMs,
};

export const clearCookieConfig: ExpressCookieOptions = {
  ...baseCookieConfig,
  expires: new Date(0),
};

export const csrfCookieConfig: ExpressCookieOptions = {
  ...baseCookieConfig,
  httpOnly: false,
  maxAge: ONE_DAY_MS,
};
