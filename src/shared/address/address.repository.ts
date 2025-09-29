import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';

import { Address, AddressType } from '@prisma/client';

@Injectable()
export class AddressRepository extends BaseRepository<Address> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, 'address', ['label', 'city', 'country']);
  }

  attachToUser(
    userId: string,
    addressId: string,
    meta: { type?: string; isPrimary?: boolean; isDefault?: boolean },
  ) {
    return this.prisma.userAddress.create({
      data: {
        userId,
        addressId,
        type: meta.type as AddressType,
        isPrimary: meta.isPrimary ?? false,
        isDefault: meta.isDefault ?? false,
      },
    });
  }

  updateAttachToUser(
    userId: string,
    addressId: string,
    meta: { type?: string; isPrimary?: boolean; isDefault?: boolean },
  ) {
    return this.prisma.userAddress.updateMany({
      where: { userId, addressId },
      data: {
        type: meta.type as AddressType,
        isPrimary: meta.isPrimary ?? false,
        isDefault: meta.isDefault ?? false,
      },
    });
  }
}

// import { Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { UsersRepository } from './users.repository';
// import { hashPassword } from '../../common/utils/crypto.util';
// import { AddressService } from 'src/shared/address/address.service';
// import { Status } from '@prisma/client';

// @Injectable()
// export class UsersService {
//   constructor(
//     private readonly usersRepo: UsersRepository,
//     private readonly addressService: AddressService,
//   ) {}

//   async create(dto: CreateUserDto) {
//     dto.password = await hashPassword(dto.password);
//     const user = await this.usersRepo.createUser(dto);

//     if (dto.addresses?.length) {
//       await this.addressService.createUserAddresses(user.id, dto.addresses);
//     }

//     return this.usersRepo.findOne({ id: user.id });
//   }

//   findAll(query: Record<string, any>) {
//     return this.usersRepo.findAll(query);
//   }

//   findById(id: string) {
//     return this.usersRepo.findOne({ id });
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     if (dto.password) {
//       dto.password = await hashPassword(dto.password);
//     }

//     const { addresses, ...cleanDto } = dto;

//     const user = await this.usersRepo.updateUser(id, cleanDto);

//     if (addresses && addresses.length) {
//       if (addresses.some((a) => a.id)) {
//         await this.addressService.updateMany(addresses);
//       } else {
//         await this.addressService.createUserAddresses(user.id, addresses);
//       }
//     }

//     return this.usersRepo.findOne({ id: user.id });
//   }

//   async createUserViaSuperAdminWithRole(dto: CreateUserDto) {
//     dto.password = await hashPassword(dto.password);

//     return this.usersRepo.createUserViaSuperAdminWithRole(dto);
//   }

//   async createTenantUser(dto: CreateUserDto) {
//     dto.password = await hashPassword(dto.password);
//     const user = await this.usersRepo.createTenantUser(dto);

//     if (dto.addresses?.length) {
//       await this.addressService.createUserAddresses(user.id, dto.addresses);
//     }

//     return this.usersRepo.findOne({ id: user.id });
//   }

//   async delete(id: string): Promise<void> {
//     await this.usersRepo.delete(id);
//   }

//   findByEmail(email: string) {
//     return this.usersRepo.findOne({ email });
//   }

//   async updateStatus(id: string, status: Status) {
//     return this.usersRepo.updateStatus(id, status);
//   }
// }

// import {
//   Injectable,
//   BadRequestException,
//   NotFoundException,
// } from '@nestjs/common';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { Prisma, User, RoleName, Status, AddressType } from '@prisma/client';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { checkUnique } from '../../common/utils/check-unique.util';
// import { sanitizeUser } from '../../common/utils/sanitize-user.util';

// const userInclude = {
//   role: true,
//   memberships: {
//     include: {
//       tenant: true,
//       permissions: true,
//     },
//   },
//   addresses: {
//     include: {
//       address: true,
//     },
//   },
// } satisfies Prisma.UserInclude;

// type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

// @Injectable()
// export class UsersRepository extends BaseRepository<User> {
//   constructor(protected readonly prisma: PrismaService) {
//     super(prisma, 'user', ['email', 'firstName', 'lastName'], userInclude);
//   }

//   async createUser(data: CreateUserDto): Promise<UserWithRelations> {
//     await checkUnique(this.prisma, 'user', { email: data.email });

//     const role = await this.prisma.role.create({
//       data: {
//         name: data.roleName ?? RoleName.CUSTOMER,
//         tenantId: data.tenantId ?? null,
//       },
//     });

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         phone: data.phone,
//         role: { connect: { id: role.id } },
//       },
//       include: userInclude,
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async attachUserToTenant(data: {
//     userId: string;
//     tenantId: string;
//     branchId?: string | null;
//   }): Promise<UserWithRelations> {
//     await this.prisma.userTenant.upsert({
//       where: {
//         userId_tenantId: {
//           userId: data.userId,
//           tenantId: data.tenantId,
//         },
//       },
//       update: {
//         ...(data.branchId ? { branchId: data.branchId } : {}),
//       },
//       create: {
//         userId: data.userId,
//         tenantId: data.tenantId,
//         ...(data.branchId ? { branchId: data.branchId } : {}),
//       },
//     });

//     const user = await this.prisma.user.findUnique({
//       where: { id: data.userId },
//       include: userInclude,
//     });

//     if (!user) {
//       throw new NotFoundException(`User ${data.userId} not found`);
//     }

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async createUserViaSuperAdminWithRole(
//     data: CreateUserDto,
//   ): Promise<UserWithRelations> {
//     if (!data.tenantId) {
//       throw new BadRequestException('tenantId are required');
//     }

//     await checkUnique(this.prisma, 'user', { email: data.email });

//     if (data.roleName !== RoleName.CUSTOMER) {
//       const existingRole = await this.prisma.role.findFirst({
//         where: {
//           name: data.roleName,
//           tenantId: data.tenantId,
//           deletedAt: null,
//         },
//       });

//       if (existingRole) {
//         throw new BadRequestException(
//           `Role "${data.roleName}" already exists for this tenant.`,
//         );
//       }
//     }

//     const role = await this.prisma.role.create({
//       data: {
//         name: data.roleName,
//         tenantId: data.tenantId,
//       },
//     });

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         phone: data.phone,
//         role: { connect: { id: role.id } },
//         memberships: {
//           create: {
//             tenantId: data.tenantId,
//             ...(data.branchId ? { branchId: data.branchId } : {}),
//           },
//         },
//       },
//       include: userInclude,
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async createTenantUser(data: CreateUserDto): Promise<UserWithRelations> {
//     if (!data.roleId || !data.tenantId) {
//       throw new BadRequestException('roleId and tenantId are required');
//     }

//     await checkUnique(this.prisma, 'user', { email: data.email });

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         phone: data.phone,
//         roleId: data.roleId,
//         memberships: {
//           create: {
//             tenantId: data.tenantId,
//             ...(data.branchId ? { branchId: data.branchId } : {}),
//             permissions: data.permissions
//               ? {
//                   create: data.permissions.map((p) => ({
//                     entityType: p.entityType,
//                     allowed: p.allowed ?? [],
//                     denied: p.denied ?? [],
//                   })),
//                 }
//               : undefined,
//           },
//         },
//       },
//       include: userInclude,
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async updateUser(
//     id: string,
//     data: UpdateUserDto,
//   ): Promise<UserWithRelations> {
//     if (data.email) {
//       await checkUnique(this.prisma, 'user', { email: data.email }, id);
//     }

//     return this.prisma.$transaction(async (tx) => {
//       const { tenantId, branchId, ...userData } = data;

//       const updatedUser = await tx.user.update({
//         where: { id },
//         data: userData as any,
//         include: userInclude,
//       });

//       if (tenantId) {
//         await tx.userTenant.upsert({
//           where: { userId_tenantId: { userId: id, tenantId } },
//           update: {
//             ...(branchId ? { branchId } : {}),
//           },
//           create: {
//             userId: id,
//             tenantId,
//             ...(branchId ? { branchId } : {}),
//           },
//         });
//       }

//       return sanitizeUser(updatedUser) as UserWithRelations;
//     });
//   }

//   async findById(id: string): Promise<UserWithRelations | null> {
//     return this.prisma.user.findUnique({
//       where: { id },
//       include: userInclude,
//     });
//   }

//   async getByEmail(email: string): Promise<UserWithRelations | null> {
//     return this.prisma.user.findUnique({
//       where: { email },
//       include: userInclude,
//     });
//   }

//   async getRoleByName(name: RoleName) {
//     return this.prisma.role.findFirst({ where: { name } });
//   }

//   async updateStatus(id: string, status: Status): Promise<UserWithRelations> {
//     return this.prisma.user.update({
//       where: { id },
//       data: { status },
//       include: userInclude,
//     });
//   }
// }

// import { Injectable, NotFoundException } from '@nestjs/common';
// import { AddressRepository } from './address.repository';
// import { CreateAddressDto } from './dto/create-address.dto';
// import { UpdateAddressDto } from './dto/update-address.dto';
// import { Address, Prisma } from '@prisma/client';

// @Injectable()
// export class AddressService {
//   constructor(private readonly addressRepo: AddressRepository) {}

//   async create(dto: CreateAddressDto): Promise<Address> {
//     const { type, isPrimary, isDefault, ...addressData } = dto;

//     return this.addressRepo.create({
//       ...addressData,
//       latitude:
//         dto.latitude !== undefined
//           ? new Prisma.Decimal(dto.latitude)
//           : undefined,
//       longitude:
//         dto.longitude !== undefined
//           ? new Prisma.Decimal(dto.longitude)
//           : undefined,
//     });
//   }

//   async createUserAddresses(
//     userId: string,
//     dtos: CreateAddressDto[],
//   ): Promise<Address[]> {
//     if (!dtos.length) return [];

//     const addresses = await this.createMany(dtos);
//     await Promise.all(
//       addresses.map((addr, index) =>
//         this.addressRepo.attachToUser(userId, addr.id, {
//           type: dtos[index].type,
//           isPrimary: dtos[index].isPrimary,
//           isDefault: dtos[index].isDefault,
//         }),
//       ),
//     );
//     return addresses;
//   }

//   async createMany(dtos: CreateAddressDto[]): Promise<Address[]> {
//     if (!dtos.length) return [];

//     const mapped = dtos.map((dto) => {
//       const { type, isPrimary, isDefault, ...addressData } = dto;
//       return {
//         ...addressData,
//         latitude:
//           dto.latitude !== undefined
//             ? new Prisma.Decimal(dto.latitude)
//             : undefined,
//         longitude:
//           dto.longitude !== undefined
//             ? new Prisma.Decimal(dto.longitude)
//             : undefined,
//       };
//     });

//     return this.addressRepo.bulkInsert(mapped);
//   }

//   async updateMany(dtos: UpdateAddressDto[]): Promise<Address[]> {
//     if (!dtos.length) return [];

//     return Promise.all(dtos.map((dto) => this.update(dto.id!, dto)));
//   }

//   async update(id: string, dto: UpdateAddressDto): Promise<Address> {
//     return this.addressRepo.update(id, {
//       ...dto,
//       latitude:
//         dto.latitude !== undefined
//           ? new Prisma.Decimal(dto.latitude)
//           : undefined,
//       longitude:
//         dto.longitude !== undefined
//           ? new Prisma.Decimal(dto.longitude)
//           : undefined,
//     });
//   }

//   async findAll(query: Record<string, any>) {
//     return this.addressRepo.findAll(query);
//   }

//   async findOne(id: string): Promise<Address> {
//     const address = await this.addressRepo.findOne({ id });
//     if (!address) throw new NotFoundException('Address not found');
//     return address;
//   }

//   async delete(id: string): Promise<void> {
//     return this.addressRepo.delete(id);
//   }
// }

// import { Injectable } from '@nestjs/common';
// import { BaseRepository } from '../factory/base.repository';
// import { PrismaService } from 'src/db/prisma/prisma.service';
// import { Address, AddressType } from '@prisma/client';

// @Injectable()
// export class AddressRepository extends BaseRepository<Address> {
//   constructor(protected readonly prisma: PrismaService) {
//     super(prisma, 'address', ['label', 'city', 'country']);
//   }

//   attachToUser(
//     userId: string,
//     addressId: string,
//     meta: { type?: string; isPrimary?: boolean; isDefault?: boolean },
//   ) {
//     return this.prisma.userAddress.create({
//       data: {
//         userId,
//         addressId,
//         type: meta.type as AddressType,
//         isPrimary: meta.isPrimary ?? false,
//         isDefault: meta.isDefault ?? false,
//       },
//     });
//   }

//   detachFromUser(userId: string, addressId: string) {
//     return this.prisma.userAddress.deleteMany({
//       where: { userId, addressId },
//     });
//   }
// }
