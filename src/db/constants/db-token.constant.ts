export const DATABASE_TOKEN = {
  PRISMA: 'DATABASE_PRISMA',
  REDIS: 'DATABASE_REDIS',
} as const;

export type DatabaseToken =
  (typeof DATABASE_TOKEN)[keyof typeof DATABASE_TOKEN];
