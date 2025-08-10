import { CookieOptions } from 'express';

export const COOKIE_NAMES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  SESSION: 'session_id',
} as const;

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const ACCESS_TOKEN_EXPIRES = '15m';
export const SESSION_PREFIX = 'sess:';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
