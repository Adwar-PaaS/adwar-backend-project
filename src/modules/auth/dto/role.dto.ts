import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { RoleName } from '@prisma/client';

export class CreateRoleDto {
  @IsEnum(RoleName)
  name: RoleName;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
