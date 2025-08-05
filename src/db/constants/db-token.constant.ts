export const DATABASE_TOKEN = {
  PRISMA: 'PRISMA_DATABASE',
  REDIS: 'REDIS_DATABASE',
} as const;

export type DatabaseToken =
  (typeof DATABASE_TOKEN)[keyof typeof DATABASE_TOKEN];
