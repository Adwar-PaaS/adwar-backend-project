import * as bcrypt from 'bcrypt';

export const comparePasswords = async (
  raw: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(raw, hash);

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, 10);
