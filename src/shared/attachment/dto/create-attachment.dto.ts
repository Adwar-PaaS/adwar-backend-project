import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { AttachmentType, EntityType } from '@prisma/client';

export class CreateAttachmentDto {
  @IsNotEmpty() @IsString() filename: string;
  @IsNotEmpty() @IsString() originalName: string;
  @IsNotEmpty() @IsString() url: string;
  @IsNotEmpty() @IsString() mimeType: string;
  @IsNotEmpty() @IsNumber() fileSize: number;
  @IsOptional() @IsEnum(AttachmentType) type?: AttachmentType =
    AttachmentType.OTHER;
  @IsNotEmpty() @IsString() relatedId: string;
  @IsNotEmpty() @IsEnum(EntityType) relatedType: EntityType;
  @IsOptional() metadata?: Record<string, any>;
  @IsOptional() @IsString() uploadedBy?: string;
}
