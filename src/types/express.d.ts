import 'express-session';
import { AuthUser } from '../modules/auth/interfaces/auth-user.interface';

declare module 'express-session' {
  interface SessionData {
    user?: AuthUser;
  }
}
