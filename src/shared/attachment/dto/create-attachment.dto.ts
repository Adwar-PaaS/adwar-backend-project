import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { AttachmentType, RelatedType } from '@prisma/client';

export class CreateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsEnum(AttachmentType)
  type: AttachmentType;

  @IsString()
  relatedId: string;

  @IsEnum(RelatedType)
  relatedType: RelatedType;

  @IsOptional()
  metadata?: Record<string, any>;
}
