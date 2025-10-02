import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { hashPassword } from '../../common/utils/crypto.util';
import { AddressService } from 'src/shared/address/address.service';
import { Status } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly addressService: AddressService,
  ) {}

  async create(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);
    const user = await this.usersRepo.createUser(dto);

    if (dto.addresses?.length) {
      const addressesWithUserId = dto.addresses.map((addr) => ({
        ...addr,
        userId: user.id,
      }));
      await this.addressService.createMany(addressesWithUserId);
    }

    return this.usersRepo.findOne({ id: user.id });
  }

  findAll(query: Record<string, any>) {
    return this.usersRepo.findAll(query);
  }

  findById(id: string) {
    return this.usersRepo.findOne({ id });
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.password) {
      dto.password = await hashPassword(dto.password);
    }

    const { addresses, ...cleanDto } = dto;

    const user = await this.usersRepo.updateUser(id, cleanDto);

    if (addresses && addresses.length) {
      const updates = addresses.filter((a) => a.id);
      const creates = addresses
        .filter((a) => !a.id)
        .map((a) => ({ ...a, userId: id }));

      if (updates.length) {
        await this.addressService.updateMany(updates);
      }
      if (creates.length) {
        await this.addressService.createMany(creates);
      }
    }

    return this.usersRepo.findOne({ id: user.id });
  }

  async createUserViaSuperAdminWithRole(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);

    return this.usersRepo.createUserViaSuperAdminWithRole(dto);
  }

  async createTenantUser(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);
    const user = await this.usersRepo.createTenantUser(dto);

    if (dto.addresses?.length) {
      const addressesWithUserId = dto.addresses.map((addr) => ({
        ...addr,
        userId: user.id,
      }));
      await this.addressService.createMany(addressesWithUserId);
    }

    return this.usersRepo.findOne({ id: user.id });
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ email });
  }

  async updateStatus(id: string, status: Status) {
    return this.usersRepo.update(id, status);
  }
}

// ### Backend Solution Using Redis (No Schema Changes Required)

// To persist column orders in the backend without adding any database fields or tables (no `columnOrder` JSON, no `UserPreference` model), we'll use your existing **RedisService**. This stores orders as JSON in Redis keys (e.g., `user:{userId}:table:users:columnOrder`), with a TTL for auto-expiry (e.g., 30 days).

// This approach:
// - **Scales easily**: Per-user/per-table keys—no schema/DB overhead. For other tables (e.g., 'orders'), just change the key—no code changes needed.
// - **Effort**: Very low (~1-2 hours: repo/service methods + endpoints + tests). Uses your free Redis (no extra cost).
// - **Pros**: Backend-persisted, cross-device consistent (as long as Redis is shared), fast (in-memory), queryable via Redis commands if needed. TTL prevents bloat.
// - **Cons**: If Redis restarts without persistence enabled, data is lost (fallback to defaults in UI). Not as "permanent" as DB, but reliable for prefs.

// No migrations, no Prisma changes. Integrates with your auth (`req.user.id`).

// #### Step 1: Repository Updates
// Extend `UsersRepository` with Redis-based methods for the 'users' table. (Your `RedisService` is already injected.)

// Update `users.repository.ts`:

// ```typescript
// import { Injectable, BadRequestException, Logger } from '@nestjs/common';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { Prisma, User, RoleName } from '@prisma/client';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { RedisService } from 'src/db/redis/redis.service';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { sanitizeUser } from '../../common/utils/sanitize-user.util';
// import { userSelector } from '../../common/selectors/user.selector';

// export type SafeUser = Omit<User, 'password'>;
// export type UserWithRelations = Prisma.UserGetPayload<{
//   select: typeof userSelector;
// }>;

// const TABLE_NAME = 'users';  // Hardcode for this repo; change for others
// const REDIS_PREFIX = `user:`;
// const REDIS_COLUMN_KEY = `:table:${TABLE_NAME}:columnOrder`;
// const TTL_SECONDS = 2592000;  // 30 days

// @Injectable()
// export class UsersRepository extends BaseRepository<
//   User,
//   SafeUser,
//   Prisma.UserDelegate
// > {
//   private readonly logger = new Logger(UsersRepository.name);

//   constructor(
//     protected readonly prisma: PrismaService,
//     protected readonly redis: RedisService,
//   ) {
//     super(
//       prisma,
//       prisma.user,
//       ['email', 'firstName', 'lastName', 'role.name'],
//       userSelector,
//       true,
//       sanitizeUser,
//     );
//   }

//   // Save column order to Redis for the 'users' table
//   async saveColumnOrder(userId: string, order: string[]): Promise<void> {
//     try {
//       const key = `${REDIS_PREFIX}${userId}${REDIS_COLUMN_KEY}`;
//       await this.redis.set(key, JSON.stringify(order), 'EX', TTL_SECONDS);
//       this.logger.debug(`Saved column order for user ${userId} in Redis`);
//     } catch (error) {
//       this.logger.error(`Failed to save column order for user ${userId}: ${(error as Error).message}`);
//       throw new BadRequestException('Failed to save column order');
//     }
//   }

//   // Get column order from Redis for the 'users' table (returns null if not set)
//   async getColumnOrder(userId: string): Promise<string[] | null> {
//     try {
//       const key = `${REDIS_PREFIX}${userId}${REDIS_COLUMN_KEY}`;
//       const value = await this.redis.get(key);
//       if (!value) return null;
//       return JSON.parse(value) as string[];
//     } catch (error) {
//       this.logger.error(`Failed to get column order for user ${userId}: ${(error as Error).message}`);
//       return null;
//     }
//   }
// }
// ```

// - **Key Format**: Scalable (e.g., for 'orders': `:table:orders:columnOrder`).
// - **TTL**: Auto-cleans old prefs; adjust as needed.
// - **Error Handling**: Logs + throws for UI feedback.

// #### Step 2: Service Updates
// Delegate to the repo (unchanged from previous suggestions).

// Update `users.service.ts`:

// ```typescript
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

//   // ... existing methods unchanged ...

//   async saveColumnOrder(userId: string, order: string[]): Promise<void> {
//     return this.usersRepo.saveColumnOrder(userId, order);
//   }

//   async getColumnOrder(userId: string): Promise<string[] | null> {
//     return this.usersRepo.getColumnOrder(userId);
//   }
// }
// ```

// #### Step 3: DTO
// Same as before. Create `dto/column-order.dto.ts` if not exists:

// ```typescript
// import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

// export class ColumnOrderDto {
//   @IsArray()
//   @ArrayMinSize(1)
//   @ArrayMaxSize(20)  // Reasonable limit for columns
//   @IsString({ each: true })
//   order: string[];
// }
// ```

// #### Step 4: Controller Updates
// Add endpoints for `/column-order`. Use `Req` for `req.user.id` (from SessionGuard).

// Update `users.controller.ts`:

// ```typescript
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
//   Req,  // Ensure this is imported
// } from '@nestjs/common';
// import { UsersService } from './users.service';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { ColumnOrderDto } from './dto/column-order.dto';  // Import this
// import { SessionGuard } from '../../modules/auth/guards/session.guard';
// import { APIResponse } from '../../common/utils/api-response.util';
// import { UpdateUserStatusDto } from './dto/update-user-status.dto';
// import { Permissions } from '../../common/decorators/permission.decorator';
// import { PermissionGuard } from '../../common/guards/permission.guard';
// import { PaginationResult } from '../../common/utils/api-features.util';
// import { EntityType, ActionType } from '@prisma/client';
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
// import { mapUserView, mapUserViews, UserView } from './mappers/user.mapper';

// @Controller('users')
// @UseGuards(SessionGuard, PermissionGuard)
// export class UsersController {
//   constructor(private readonly usersService: UsersService) {}

//   // ... existing methods unchanged ...

//   @Post('column-order')
//   @UseInterceptors(InvalidateCacheInterceptor)
//   @InvalidateCache('users:column-order:*')  // Clears any related caches
//   @Permissions(EntityType.USER, ActionType.UPDATE)
//   async saveColumnOrder(
//     @Req() req: { user: { id: string } },
//     @Body() dto: ColumnOrderDto,
//   ): Promise<APIResponse<{ success: true }>> {
//     await this.usersService.saveColumnOrder(req.user.id, dto.order);
//     return APIResponse.success({ success: true }, 'Column order saved successfully', HttpStatus.OK);
//   }

//   @Get('column-order')
//   @UseInterceptors(CacheInterceptor)
//   @Cacheable((req) => `users:column-order:${(req as any).user?.id}`, 300)  // 5-min cache per user
//   @Permissions(EntityType.USER, ActionType.READ)
//   async getColumnOrder(
//     @Req() req: { user: { id: string } },
//   ): Promise<APIResponse<{ order: string[] | null }>> {
//     const order = await this.usersService.getColumnOrder(req.user.id);
//     return APIResponse.success({ order }, 'Column order retrieved successfully', HttpStatus.OK);
//   }
// }
// ```

// - **Caching**: Uses your existing decorators; key includes user ID for personalization.
// - **Permissions**: Reuse existing; add custom if needed.

// #### Step 5: Usage in UI/Frontend
// Same as DB version:
// - **Save**: On drag end, POST `/users/column-order` with `{ order: ["firstName", "email", ...] }`.
// - **Load**: On init, GET `/users/column-order`; if `order` null, use defaults.
// - **Error Fallback**: If API fails, fallback to LocalStorage or defaults in UI.

// #### Extending to Other Tables
// For 'orders':
// 1. In `OrdersRepository`: Copy `saveColumnOrder`/`getColumnOrder`, change `TABLE_NAME = 'orders'`.
// 2. Delegate in `OrdersService`.
// 3. Add `/orders/column-order` endpoints in `OrdersController`.
// No Redis/DB changes—keys auto-separate by table.

// #### Testing & Edge Cases
// - **Tests**: Mock `RedisService` in repo tests (e.g., Jest: `jest.spyOn(redis, 'set')`).
// - **Validation**: DTO limits array size; optionally whitelist keys in repo (e.g., check against defaults).
// - **Performance**: Redis ops are sub-ms; TTL keeps storage clean.
// - **Security**: Auth-guarded; keys are user-specific.
// - **Redis Config**: Ensure your `RedisService` supports `set`/`get` with TTL (standard).

// This is fully backend, zero schema impact, and leverages your free Redis for reliable persistence. If Redis isn't suitable (e.g., no persistence), we could use a simple JSON file writer, but Redis is optimal. Let me know for tweaks or other tables!
