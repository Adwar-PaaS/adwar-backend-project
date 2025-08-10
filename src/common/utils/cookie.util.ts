import { Response } from 'express';
import { COOKIE_OPTIONS, COOKIE_NAMES } from './constants.util';

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  sessionId: string,
) => {
  res.cookie(COOKIE_NAMES.ACCESS, accessToken, COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.REFRESH, refreshToken, COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.SESSION, sessionId, COOKIE_OPTIONS);
};

export const clearAuthCookies = (res: Response) => {
  Object.values(COOKIE_NAMES).forEach((name) => res.clearCookie(name));
};
