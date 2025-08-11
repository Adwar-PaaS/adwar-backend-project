import { PrismaService } from '../../db/prisma/prisma.service';
import { ApiError } from '../exceptions/api-error.exception';
import { HttpStatus } from '@nestjs/common';

export async function checkEmailUnique(
  prisma: PrismaService,
  model: keyof PrismaService,
  email: string,
  excludeId?: string,
) {
  const existing = await (prisma[model] as any).findUnique({
    where: { email },
  });

  if (existing && existing.id !== excludeId) {
    throw new ApiError(
      `${model.toString()} with this email already exists`,
      HttpStatus.CONFLICT,
      'EMAIL_ALREADY_EXISTS',
      { email },
    );
  }
}
