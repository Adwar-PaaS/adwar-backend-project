import 'express-session';
import { AuthUser } from '../modules/auth/interfaces/auth-user.interface';
import 'express-serve-static-core';

declare module 'express-session' {
  interface SessionData {
    user?: AuthUser;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}
