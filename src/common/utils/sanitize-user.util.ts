import { IUser } from '../../modules/users/interfaces/user.interface';

export function sanitizeUser<T extends IUser>(user: T): Omit<T, 'password'> {
  const { password, ...safeUser } = user;
  return safeUser;
}

export function sanitizeUsers<T extends IUser>(
  users: T[],
): Omit<T, 'password'>[] {
  return users.map(sanitizeUser);
}
