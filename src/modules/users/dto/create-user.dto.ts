import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { EntityType, ActionType, RoleName } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateAddressDto } from 'src/shared/address/dto/create-address.dto';

class PermissionDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsArray()
  @IsEnum(ActionType, { each: true })
  actionType: ActionType[];
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(RoleName)
  roleName?: RoleName;

  @IsOptional()
  @IsUUID()
  roleId?: string | null;

  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: CreateAddressDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}

// import {
//   IsEmail,
//   IsNotEmpty,
//   IsOptional,
//   IsString,
//   MinLength,
//   IsUUID,
//   IsBoolean,
//   IsArray,
//   ValidateNested,
//   IsEnum,
// } from 'class-validator';
// import { EntityType, ActionType, RoleName } from '@prisma/client';
// import { Type } from 'class-transformer';

// class PermissionDto {
//   @IsEnum(EntityType)
//   entityType: EntityType;

//   @IsArray()
//   @IsEnum(ActionType, { each: true })
//   actionType: ActionType[];
// }

// export class CreateUserDto {
//   @IsEmail()
//   email: string;

//   @IsString()
//   @MinLength(6)
//   password: string;

//   @IsString()
//   @IsNotEmpty()
//   fullName: string;

//   @IsOptional()
//   @IsString()
//   phone?: string;

//   @IsOptional()
//   @IsEnum(RoleName)
//   roleName?: RoleName;

//   @IsOptional()
//   @IsUUID()
//   roleId?: string;

//   @IsOptional()
//   @IsUUID()
//   tenantId?: string;

//   @IsOptional()
//   @IsUUID()
//   warehouseId?: string | null;

//   @IsOptional()
//   @IsBoolean()
//   isOwner?: boolean = false;

//   @IsOptional()
//   @ValidateNested({ each: true })
//   @Type(() => PermissionDto)
//   permissions?: PermissionDto[];
// }

// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   Delete,
//   Query,
//   Patch,
//   UseGuards,
//   HttpStatus,
//   Put,
//   UseInterceptors,
// } from '@nestjs/common';
// import { UsersService } from './users.service';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { SessionGuard } from '../../modules/auth/guards/session.guard';
// import { APIResponse } from '../../common/utils/api-response.util';
// import { UpdateUserStatusDto } from './dto/update-user-status.dto';
// import { Permissions } from '../../common/decorators/permission.decorator';
// import { PermissionGuard } from '../../common/guards/permission.guard';
// import { EntityType, ActionType, RoleName } from '@prisma/client';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';
// import { CurrentUser } from 'src/common/decorators/current-user.decorator';
// import {
//   Cacheable,
//   InvalidateCache,
// } from '../../common/decorators/cache.decorator';
// import {
//   CacheInterceptor,
//   InvalidateCacheInterceptor,
// } from '../../common/interceptors/cache.interceptor';

// @Controller('users')
// @UseGuards(SessionGuard, PermissionGuard)
// export class UsersController {
//   constructor(private readonly usersService: UsersService) {}

//   @Post()
//   @UseInterceptors(InvalidateCacheInterceptor)
//   @InvalidateCache('users:*')
//   @Permissions(EntityType.USER, ActionType.CREATE)
//   async create(@Body() dto: CreateUserDto, @CurrentUser() authUser: AuthUser) {
//     const user = await this.usersService.createUser(dto, authUser);
//     return APIResponse.success(
//       { user },
//       'User created successfully',
//       HttpStatus.CREATED,
//     );
//   }

//   @Get()
//   @UseInterceptors(CacheInterceptor)
//   @Cacheable((req) => `users:page:${req.query.page || 1}`, 60)
//   @Permissions(EntityType.USER, ActionType.READ)
//   async findAll(@Query() query: Record<string, any>) {
//     const { data, total, page, limit, hasNext, hasPrev } =
//       await this.usersService.findAll(query);

//     return APIResponse.success(
//       { users: data, total, page, limit, hasNext, hasPrev },
//       'Fetched users successfully',
//       HttpStatus.OK,
//     );
//   }

//   @Get(':id')
//   @UseInterceptors(CacheInterceptor)
//   @Cacheable((req) => `users:${req.params.id}`, 60)
//   @Permissions(EntityType.USER, ActionType.READ)
//   async findOne(@Param('id') id: string) {
//     const user = await this.usersService.findById(id);
//     return APIResponse.success({ user }, 'User retrieved successfully');
//   }

//   @Put(':id')
//   @UseInterceptors(InvalidateCacheInterceptor)
//   @InvalidateCache('users:*', (req) => `users:${req.params.id}`)
//   @Permissions(EntityType.USER, ActionType.UPDATE)
//   async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
//     const updatedUser = await this.usersService.update(id, dto);
//     return APIResponse.success({ updatedUser }, 'User updated successfully');
//   }

//   @Patch(':id/status')
//   @UseInterceptors(InvalidateCacheInterceptor)
//   @InvalidateCache((req) => `users:${req.params.id}`, 'users:*')
//   @Permissions(EntityType.USER, ActionType.UPDATE)
//   async updateStatus(
//     @Param('id') id: string,
//     @Body() dto: UpdateUserStatusDto,
//   ) {
//     const user = await this.usersService.updateStatus(id, dto.status);
//     return APIResponse.success({ user }, 'User status updated successfully');
//   }

//   @Delete(':id')
//   @UseInterceptors(InvalidateCacheInterceptor)
//   @InvalidateCache((req) => `users:${req.params.id}`, 'users:*')
//   @Permissions(EntityType.USER, ActionType.DELETE)
//   async delete(@Param('id') id: string) {
//     await this.usersService.delete(id);
//     return APIResponse.success(
//       null,
//       'User deleted successfully',
//       HttpStatus.NO_CONTENT,
//     );
//   }
// }

// import { Injectable, BadRequestException } from '@nestjs/common';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { Prisma, User, RoleName, Status } from '@prisma/client';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { checkEmailUnique } from '../../common/utils/check-email.util';
// import { sanitizeUser } from '../../common/utils/sanitize-user.util';

// const userInclude = {
//   role: true,
//   memberships: {
//     include: {
//       tenant: true,
//       warehouse: true,
//       permissions: true,
//     },
//   },
// } satisfies Prisma.UserInclude;

// type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

// @Injectable()
// export class UsersRepository extends BaseRepository<User> {
//   constructor(protected readonly prisma: PrismaService) {
//     super(prisma, prisma.user, ['email', 'fullName', 'role']);
//   }

//   private getUserInclude() {
//     return userInclude;
//   }

//   async createUser(data: CreateUserDto): Promise<UserWithRelations> {
//     await checkEmailUnique(this.prisma, 'user', data.email);

//     let roleId = data.roleId;

//     if (!roleId && data.roleName) {
//       const role = await this.prisma.role.create({
//         data: {
//           name: data.roleName,
//           tenantId: data.tenantId ?? null,
//         },
//       });
//       roleId = role.id;
//     }

//     if (!roleId) {
//       throw new BadRequestException('A role is required to create a user');
//     }

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         fullName: data.fullName,
//         phone: data.phone,
//         role: { connect: { id: roleId } },
//         memberships: data.tenantId
//           ? {
//               create: {
//                 tenantId: data.tenantId,
//                 isOwner: data.isOwner ?? false,
//                 ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
//                 permissions: data.permissions
//                   ? {
//                       create: data.permissions.map((p) => ({
//                         entityType: p.entityType,
//                         actionType: p.actionType,
//                       })),
//                     }
//                   : undefined,
//               },
//             }
//           : undefined,
//       },
//       include: this.getUserInclude(),
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async updateUser(
//     id: string,
//     data: UpdateUserDto,
//   ): Promise<UserWithRelations> {
//     if (data.email) {
//       await checkEmailUnique(this.prisma, 'user', data.email, id);
//     }
//     return this.prisma.user.update({
//       where: { id },
//       data,
//       include: this.getUserInclude(),
//     });
//   }

//   async findById(id: string): Promise<UserWithRelations | null> {
//     return this.prisma.user.findUnique({
//       where: { id },
//       include: this.getUserInclude(),
//     });
//   }

//   async getByEmail(email: string): Promise<UserWithRelations | null> {
//     return this.prisma.user.findUnique({
//       where: { email },
//       include: this.getUserInclude(),
//     });
//   }

//   async getRoleByName(name: RoleName) {
//     return this.prisma.role.findFirst({ where: { name } });
//   }

//   async updateStatus(id: string, status: Status): Promise<UserWithRelations> {
//     return this.prisma.user.update({
//       where: { id },
//       data: { status },
//       include: this.getUserInclude(),
//     });
//   }
// }

// import { Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { UsersRepository } from './users.repository';
// import { hashPassword } from '../../common/utils/crypto.util';
// import { Status } from '@prisma/client';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';
// import { RoleName } from '@prisma/client';

// @Injectable()
// export class UsersService {
//   constructor(private readonly usersRepo: UsersRepository) {}

//   async createUser(dto: CreateUserDto, authUser?: AuthUser) {
//     dto.password = await hashPassword(dto.password);

//     if (authUser?.role.name === 'SUPER_ADMIN') {
//       dto.isOwner = true;
//     }

//     if (!dto.roleName) {
//       dto.roleName = RoleName.CUSTOMER;
//     }

//     if (dto.roleName === RoleName.ADMIN) {
//       dto.isOwner = true;
//     }

//     return this.usersRepo.createUser(dto);
//   }

//   findAll(query: Record<string, any>) {
//     return this.usersRepo.findAll(query);
//   }

//   findById(id: string) {
//     return this.usersRepo.findById(id);
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     if (dto.password) {
//       dto.password = await hashPassword(dto.password);
//     }
//     return this.usersRepo.updateUser(id, dto);
//   }

//   findByEmail(email: string) {
//     return this.usersRepo.getByEmail(email);
//   }

//   async updateStatus(id: string, status: Status) {
//     return this.usersRepo.updateStatus(id, status);
//   }

//   async delete(id: string): Promise<void> {
//     return this.usersRepo.delete(id);
//   }
// }
