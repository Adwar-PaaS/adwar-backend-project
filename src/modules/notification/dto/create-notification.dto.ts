// import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
// import { EntityType, NotificationCategory, NotificationChannel, NotificationPriority } from '@prisma/client';

// export class CreateNotificationDto {
//   @IsOptional()
//   @IsUUID()
//   senderId?: string;

//   @IsOptional()
//   @IsUUID()
//   recipientId?: string;

//   @IsString()
//   @MaxLength(120)
//   title: string;

//   @IsString()
//   @MaxLength(2000)
//   message: string;

//   @IsOptional()
//   @IsUUID()
//   relatedId?: string;

//   @IsOptional()
//   @IsEnum(EntityType)
//   relatedType?: EntityType;

//   @IsOptional()
//   @IsEnum(NotificationCategory)
//   category?: NotificationCategory;

//   @IsOptional()
//   @IsArray()
//   @IsEnum(NotificationChannel, { each: true })
//   channels?: NotificationChannel[];

//   @IsOptional()
//   @IsEnum(NotificationPriority)
//   priority?: NotificationPriority;

//   @IsOptional()
//   @IsBoolean()
//   broadcast?: boolean;
// }


