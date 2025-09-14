import { PrismaService } from '../../db/prisma/prisma.service';
import { ApiError } from '../exceptions/api-error.exception';
import { HttpStatus } from '@nestjs/common';

export async function checkUnique(
  prisma: PrismaService,
  model: keyof PrismaService,
  fields: Record<string, any>,
  excludeId?: string,
) {
  const existing = await (prisma[model] as any).findFirst({
    where: fields,
  });

  if (existing && existing.id !== excludeId) {
    const conflictFields = Object.keys(fields).join(', ');
    throw new ApiError(
      `${String(model)} with this ${conflictFields} already exists`,
      HttpStatus.CONFLICT,
      `DUPLICATE_${conflictFields.toUpperCase().replace(/, /g, '_')}`,
      fields,
    );
  }
}

// await checkUnique(this.prisma, 'tenant', 'slug', dto.slug, id);
