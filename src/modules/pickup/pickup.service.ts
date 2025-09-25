import { BadRequestException, Injectable, HttpStatus } from '@nestjs/common';
import { PickUpRepository } from './pickup.repository';
import {
  EntityType,
  NotificationCategory,
  PickUp,
  PickUpStatus,
  RoleName,
} from '@prisma/client';
import { NotificationService } from 'src/shared/notification/notification.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { OrderRepository } from '../order/order.repository';
import { UpdatePickupAndOrdersStatusDto } from './dto/update-pickup-and-orders-status.dto';
import { AddressService } from 'src/shared/address/address.service';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { TenantService } from '../tenant/tenant.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class PickUpService {
  constructor(
    private readonly pickupRepo: PickUpRepository,
    private readonly orderRepo: OrderRepository,
    private readonly notificationService: NotificationService,
    private readonly addressService: AddressService,
    private readonly tenantService: TenantService,
  ) {}

  private mapNotificationsForPickups(
    notifications: any[],
    pickupIds: string[],
  ) {
    return notifications
      .filter(
        (n) =>
          n.notification.relatedType === EntityType.PICKUP &&
          n.notification.relatedId &&
          pickupIds.includes(n.notification.relatedId) &&
          n.notification.category === NotificationCategory.ACTION,
      )
      .map((n) => ({
        notificationId: n.id,
        pickupId: n.notification.relatedId,
        title: n.notification.title,
        message: n.notification.message,
        readAt: n.readAt,
        createdAt: n.notification.createdAt,
      }));
  }

  private async updatePickupAndOrdersStatus(
    pickupId: string,
    pickupStatus: PickUpStatus,
    orderStatus: string,
  ) {
    await this.pickupRepo.update(pickupId, { status: pickupStatus });
    const orders = await this.orderRepo.findMany({ pickupId });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length) {
      await this.orderRepo.updateMany(orderIds, { status: orderStatus });
    }
    return orders;
  }

  async createPickup(dto: CreatePickupDto) {
    if (!dto.orderIds?.length) {
      throw new BadRequestException('orderIds is required and cannot be empty');
    }

    const existingOrders = await this.orderRepo.findMany({
      id: { in: dto.orderIds },
      pickupId: { not: null },
    });

    if (existingOrders.length > 0) {
      throw new ApiError(
        'Some orders are already assigned to a pickup',
        HttpStatus.BAD_REQUEST,
      );
    }

    let addressId: string | undefined;
    if (dto.address) {
      const address = await this.addressService.create(dto.address);
      addressId = address.id;
    }

    const pickup = await this.pickupRepo.create({
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      driverId: dto.driverId,
      branchId: dto.branchId,
      addressId,
      notes: dto.notes,
    });

    await this.orderRepo.updateMany(dto.orderIds, { pickupId: pickup.id });

    return this.pickupRepo.findOne({ id: pickup.id });
  }

  async updatePickup(pickupId: string, dto: UpdatePickupDto, user: AuthUser) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) throw new BadRequestException('Pickup not found');

    const isCustomer = user.role?.name === RoleName.CUSTOMER;
    if (isCustomer && pickup.status !== PickUpStatus.CREATED) {
      throw new BadRequestException(
        `You can only update pickups in CREATED status. Current status: ${pickup.status}`,
      );
    }

    if (dto.orderIds?.length) {
      const existingOrders = await this.orderRepo.findMany({
        id: { in: dto.orderIds },
        pickupId: { not: pickupId },
      });

      if (existingOrders.length > 0) {
        throw new ApiError(
          `Some orders are already assigned to another pickup: ${existingOrders.map((o) => o.id).join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const currentOrders = await this.orderRepo.findMany({ pickupId });
      const currentOrderIds = currentOrders.map((o) => o.id);

      if (currentOrderIds.length) {
        await this.orderRepo.updateMany(currentOrderIds, { pickupId: null });
      }

      await this.orderRepo.updateMany(dto.orderIds, { pickupId });
    }

    const { orderIds, ...rest } = dto;
    return this.pickupRepo.update(pickupId, rest);
  }

  async updatePickupStatusAndOrders(
    pickupId: string,
    dto: UpdatePickupAndOrdersStatusDto,
    user: AuthUser,
  ) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) throw new BadRequestException('Pickup not found');

    await this.updatePickupAndOrdersStatus(
      pickupId,
      dto.pickupStatus,
      dto.orderStatus,
    );

    if (user.tenant?.id) {
      const opsUsers = await this.tenantService.getAllOperationsUsers(
        user.tenant.id,
      );
      const recipientIds = opsUsers.map((u) => u.id);

      await this.notificationService.notifyUsers(
        user.id,
        recipientIds,
        `Pickup is waiting for your action`,
        `Pickup ${pickup.pickupNumber} has been marked as ${dto.pickupStatus}. Please take the necessary actions.`,
        pickupId,
      );
    }

    return this.pickupRepo.findOne({ id: pickupId });
  }

  async opsRespondOnPickupRequest(
    pickupId: string,
    dto: UpdatePickupAndOrdersStatusDto,
    user: AuthUser,
  ) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) throw new BadRequestException('Pickup not found');

    const orders = await this.updatePickupAndOrdersStatus(
      pickupId,
      dto.pickupStatus,
      dto.orderStatus,
    );

    for (const order of orders) {
      if (order.customerId) {
        await this.notificationService.notifyUsers(
          user.id,
          [order.customerId],
          `Your pickup request has been processed`,
          `Pickup ${pickup.pickupNumber} has been updated to ${dto.pickupStatus}. Your order status is now ${dto.orderStatus}.`,
          pickupId,
        );
      }
    }

    return this.pickupRepo.findOne({ id: pickupId });
  }

  async getPickupNotificationsForOPS(user: AuthUser) {
    if (!user.tenant?.id)
      throw new BadRequestException('User tenant not found');
    if (user.role?.name !== RoleName.OPERATION)
      throw new BadRequestException('Only operation users can access this');

    const pickups = await this.pickupRepo.findMany({
      status: PickUpStatus.PENDING,
      orders: {
        some: {
          customer: {
            memberships: {
              some: { tenantId: user.tenant.id },
            },
          },
        },
      },
    });

    if (!pickups.length) return [];

    const pickupIds = pickups.map((p) => p.id).filter(Boolean);
    const notifications = await this.notificationService.listForUser(user.id);

    return this.mapNotificationsForPickups(notifications, pickupIds);
  }

  async getCustomerPickupNotifications(user: AuthUser) {
    if (user.role?.name !== RoleName.CUSTOMER)
      throw new BadRequestException('Only customers can access this');

    const pickups = await this.pickupRepo.findMany({
      orders: { some: { customerId: user.id } },
      NOT: { status: PickUpStatus.CREATED },
    });
    if (!pickups.length) return [];

    const pickupIds = pickups.map((p) => p.id).filter(Boolean);
    const notifications = await this.notificationService.listForUser(user.id);

    return this.mapNotificationsForPickups(notifications, pickupIds);
  }

  async findAll(query: Record<string, any>) {
    return this.pickupRepo.findAll(query);
  }

  async getPickupOrders(pickupId: string) {
    return this.orderRepo.findMany({ pickupId });
  }

  async getPickupsOfBranch(branchId: string, query: Record<string, any> = {}) {
    return this.pickupRepo.findAll(query, { branchId });
  }

  async getPickupsOfTenant(tenantId: string, query: Record<string, any> = {}) {
    return this.pickupRepo.findAll(query, {
      orders: {
        some: {
          customer: {
            memberships: {
              some: { tenantId },
            },
          },
        },
      },
      NOT: { status: PickUpStatus.CREATED },
    });
  }

  async getPickupsOfCustomer(
    customerId: string,
    query: Record<string, any> = {},
  ) {
    return this.pickupRepo.findAll(query, { orders: { some: { customerId } } });
  }

  async findOne(id: string): Promise<PickUp | null> {
    return this.pickupRepo.findOne({ id });
  }

  async deletePickup(pickupId: string) {
    return this.pickupRepo.delete(pickupId);
  }
}

// Got it  — you want **users who were offline** to still get the **last notifications** once they come back online via WebSocket.

// Right now your flow delivers notifications only in real time:

// ```ts
// this.ws.emitToUser(r.recipientId, 'notification', notification);
// ```

// If the user was disconnected at that moment → they miss it.
// The fix is to hook into your **WebsocketGateway connection event** and, when a user connects, **load their undelivered notifications from DB** and push them immediately.

// Here’s how you can extend your code:

// ---

// ### 1. Add a helper in `NotificationService` to fetch undelivered notifications

// ```ts
// async getUndeliveredForUser(userId: string) {
//   return this.prisma.notificationRecipient.findMany({
//     where: {
//       recipientId: userId,
//       deliveredAt: null, // undelivered
//     },
//     include: { notification: true },
//     orderBy: { createdAt: 'asc' },
//   });
// }
// ```

// ---

// ### 2. Update `deliver()` so **notifications are only marked delivered if actually sent**

// Right now you bulk-mark as delivered regardless of socket presence.
// Instead:

// ```ts
// async deliver(
//   notification: Notification & { recipients?: { id: string; recipientId: string }[] },
//   options: DeliverOptions = {},
// ) {
//   const channels = notification.channels as NotificationChannel[];

//   if (notification.recipients?.length) {
//     const deliveredIds: string[] = [];

//     if (options.emitSocket !== false) {
//       for (const r of notification.recipients) {
//         const sent = this.ws.emitToUser(r.recipientId, 'notification', notification);
//         if (sent) {
//           deliveredIds.push(r.id);
//         }
//       }
//     }

//     if (deliveredIds.length) {
//       await this.prisma.notificationRecipient.updateMany({
//         where: { id: { in: deliveredIds } },
//         data: { deliveredAt: new Date() },
//       });
//     }
//   }

//   // Future channels...
// }
// ```

// > `emitToUser` should return `true/false` depending on whether sockets were available (see step 3).

// ---

// ### 3. Modify `WebsocketService.emitToUser` to return success

// ```ts
// emitToUser(userId: string, event: string, data: any): boolean {
//   const userSockets = this.userClients.get(userId);
//   if (!userSockets || userSockets.size === 0) return false;

//   for (const socketId of userSockets) {
//     const client = this.clients.get(socketId);
//     if (client) client.emit(event, data);
//   }
//   return true;
// }
// ```

// ---

// ### 4. Push missed notifications on reconnect in `WebsocketGateway.handleConnection`

// ```ts
// async handleConnection(client: SocketWithUser) {
//   this.wsService.registerClient(client);

//   const user = client.data.user;
//   if (!user?.id) return;

//   // Send undelivered notifications
//   const undelivered = await this.prisma.notificationRecipient.findMany({
//     where: { recipientId: user.id, deliveredAt: null },
//     include: { notification: true },
//     orderBy: { createdAt: 'asc' },
//   });

//   if (undelivered.length) {
//     for (const n of undelivered) {
//       client.emit('notification', n.notification);

//       // mark as delivered
//       await this.prisma.notificationRecipient.update({
//         where: { id: n.id },
//         data: { deliveredAt: new Date() },
//       });
//     }
//   }
// }
// ```

// ---

// * If user online → gets notification instantly.
// * If offline → notification is stored in DB with `deliveredAt = null`.
// * On reconnect → all missed notifications are sent and marked delivered.

// ---

// Do you want me to also **optimize the reconnect logic** so that if a user has multiple sockets (tabs/devices), we only send missed notifications **once per user**, not per socket?

// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
//   ConflictException,
//   Logger,
//   HttpStatus,
// } from '@nestjs/common';
// import {
//   EntityType,
//   NotificationCategory,
//   NotificationChannel,
//   PickUp,
//   PickUpStatus,
//   PriorityStatus,
//   RoleName,
//   OrderStatus,
// } from '@prisma/client';
// import { PickUpRepository } from './pickup.repository';
// import { OrderRepository } from '../order/order.repository';
// import { NotificationService } from 'src/shared/notification/notification.service';
// import { AddressService } from 'src/shared/address/address.service';
// import { TenantService } from '../tenant/tenant.service';
// import { ApiError } from '../../common/exceptions/api-error.exception';
// import { CreatePickupDto } from './dto/create-pickup.dto';
// import { UpdatePickupDto } from './dto/update-pickup.dto';
// import { UpdatePickupAndOrdersStatusDto } from './dto/update-pickup-and-orders-status.dto';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';

// @Injectable()
// export class PickUpService {
//   private readonly logger = new Logger(PickUpService.name);

//   constructor(
//     private readonly pickupRepo: PickUpRepository,
//     private readonly orderRepo: OrderRepository,
//     private readonly notificationService: NotificationService,
//     private readonly addressService: AddressService,
//     private readonly tenantService: TenantService,
//   ) {}

//   private async sendNotificationToUsers(
//     senderId: string,
//     recipientIds: string[],
//     title: string,
//     message: string,
//     relatedId: string,
//     options?: Partial<{
//       relatedType: EntityType;
//       category: NotificationCategory;
//       priority: PriorityStatus;
//       channels: NotificationChannel[];
//     }>,
//   ) {
//     if (!recipientIds.length) return;

//     await this.notificationService.create({
//       senderId,
//       recipientIds,
//       title,
//       message,
//       relatedId,
//       relatedType: options?.relatedType ?? EntityType.PICKUP,
//       category: options?.category ?? NotificationCategory.ACTION,
//       priority: options?.priority ?? PriorityStatus.HIGH,
//       channels: options?.channels ?? [NotificationChannel.IN_APP],
//     });
//   }

//   private mapNotificationsForPickups(
//     notifications: {
//       id: string;
//       readAt: Date | null;
//       notification: {
//         relatedType: EntityType | null;
//         relatedId: string | null;
//         category: NotificationCategory;
//         title: string;
//         message: string;
//         createdAt: Date;
//       };
//     }[],
//     pickupIds: string[],
//   ) {
//     return notifications
//       .filter(
//         (n) =>
//           n.notification.relatedType === EntityType.PICKUP &&
//           n.notification.relatedId &&
//           pickupIds.includes(n.notification.relatedId) &&
//           n.notification.category === NotificationCategory.ACTION,
//       )
//       .map((n) => ({
//         notificationId: n.id,
//         pickupId: n.notification.relatedId!,
//         title: n.notification.title,
//         message: n.notification.message,
//         readAt: n.readAt,
//         createdAt: n.notification.createdAt,
//       }));
//   }

//   private async updatePickupAndOrdersStatus(
//     pickupId: string,
//     pickupStatus: PickUpStatus,
//     orderStatus: OrderStatus,
//   ) {
//     return this.pickupRepo.transaction(async (tx) => {
//       const pickup = await tx.pickUp.update({
//         where: { id: pickupId },
//         data: { status: pickupStatus },
//       });

//       const orders = await tx.order.findMany({ where: { pickupId } });
//       const orderIds = orders.map((o) => o.id);

//       if (orderIds.length) {
//         await tx.order.updateMany({
//           where: { id: { in: orderIds } },
//           data: { status: orderStatus },
//         });
//       }

//       return orders;
//     });
//   }

//   async createPickup(dto: CreatePickupDto) {
//     if (!dto.orderIds?.length) {
//       throw new BadRequestException('orderIds is required and cannot be empty');
//     }

//     const existingOrders = await this.orderRepo.findMany({
//       id: { in: dto.orderIds },
//       pickupId: { not: null },
//     });

//     if (existingOrders.length > 0) {
//       throw new ConflictException(
//         `Orders already assigned to a pickup: ${existingOrders
//           .map((o) => o.id)
//           .join(', ')}`,
//       );
//     }

//     let addressId: string | undefined;
//     if (dto.address) {
//       const address = await this.addressService.create(dto.address);
//       addressId = address.id;
//     }

//     const pickup = await this.pickupRepo.create({
//       scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
//       driverId: dto.driverId,
//       branchId: dto.branchId,
//       addressId,
//       notes: dto.notes,
//     });

//     await this.orderRepo.updateMany(dto.orderIds, { pickupId: pickup.id });

//     this.logger.log(
//       `Pickup ${pickup.id} created with ${dto.orderIds.length} orders`,
//     );
//     return this.pickupRepo.findOne({ id: pickup.id });
//   }

//   async updatePickup(pickupId: string, dto: UpdatePickupDto) {
//     const pickup = await this.pickupRepo.findOne({ id: pickupId });
//     if (!pickup) throw new NotFoundException('Pickup not found');

//     if (pickup.status !== PickUpStatus.CREATED) {
//       throw new BadRequestException(
//         `You can only update pickups in CREATED status. Current status: ${pickup.status}`,
//       );
//     }

//     if (dto.orderIds?.length) {
//       const existingOrders = await this.orderRepo.findMany({
//         id: { in: dto.orderIds },
//         pickupId: { not: pickupId },
//       });

//       if (existingOrders.length > 0) {
//         throw new ConflictException(
//           `Some orders already assigned to another pickup: ${existingOrders
//             .map((o) => o.id)
//             .join(', ')}`,
//         );
//       }

//       const currentOrders = await this.orderRepo.findMany({ pickupId });
//       const currentOrderIds = currentOrders.map((o) => o.id);

//       if (currentOrderIds.length) {
//         await this.orderRepo.updateMany(currentOrderIds, { pickupId: null });
//       }

//       await this.orderRepo.updateMany(dto.orderIds, { pickupId });
//     }

//     const { orderIds, ...rest } = dto;
//     return this.pickupRepo.update(pickupId, rest);
//   }

//   async updatePickupStatusAndOrders(
//     pickupId: string,
//     dto: UpdatePickupAndOrdersStatusDto,
//     user: AuthUser,
//   ) {
//     const pickup = await this.pickupRepo.findOne({ id: pickupId });
//     if (!pickup) throw new NotFoundException('Pickup not found');

//     await this.updatePickupAndOrdersStatus(
//       pickupId,
//       dto.pickupStatus,
//       dto.orderStatus,
//     );

//     if (user.tenant?.id) {
//       const operationUsers = await this.tenantService.getAllOperationsUsers(
//         user.tenant.id,
//       );
//       const recipientIds = operationUsers.map((u) => u.id);

//       await this.sendNotificationToUsers(
//         user.id,
//         recipientIds,
//         `Pickup is waiting for your action`,
//         `Pickup ${pickup.pickupNumber} has been marked as ${dto.pickupStatus}. Please take the necessary actions.`,
//         pickupId,
//       );
//     }

//     return this.pickupRepo.findOne({ id: pickupId });
//   }

//   async opsRespondOnPickupRequest(
//     pickupId: string,
//     dto: UpdatePickupAndOrdersStatusDto,
//     user: AuthUser,
//   ) {
//     const pickup = await this.pickupRepo.findOne({ id: pickupId });
//     if (!pickup) throw new NotFoundException('Pickup not found');

//     const orders = await this.updatePickupAndOrdersStatus(
//       pickupId,
//       dto.pickupStatus,
//       dto.orderStatus,
//     );

//     for (const order of orders) {
//       if (order.customerId) {
//         await this.sendNotificationToUsers(
//           user.id,
//           [order.customerId],
//           `Your pickup request has been processed`,
//           `Pickup ${pickup.pickupNumber} updated to ${dto.pickupStatus}. Order status is now ${dto.orderStatus}.`,
//           pickupId,
//         );
//       }
//     }

//     return this.pickupRepo.findOne({ id: pickupId });
//   }

//   async getPickupNotificationsForOPS(user: AuthUser) {
//     if (!user.tenant?.id) {
//       throw new BadRequestException('User tenant not found');
//     }
//     if (user.role?.name !== RoleName.OPERATION) {
//       throw new BadRequestException('Only operation users can access this');
//     }

//     const pickups = await this.pickupRepo.findMany({
//       status: PickUpStatus.PENDING,
//       orders: {
//         some: {
//           customer: {
//             memberships: { some: { tenantId: user.tenant.id } },
//           },
//         },
//       },
//     });

//     if (!pickups.length) return [];

//     const pickupIds = pickups.map((p) => p.id);
//     const notifications = await this.notificationService.listForUser(user.id);

//     return this.mapNotificationsForPickups(notifications, pickupIds);
//   }

//   async getCustomerPickupNotifications(user: AuthUser) {
//     if (user.role?.name !== RoleName.CUSTOMER) {
//       throw new BadRequestException('Only customers can access this');
//     }

//     const pickups = await this.pickupRepo.findMany({
//       orders: { some: { customerId: user.id } },
//       NOT: { status: PickUpStatus.CREATED },
//     });

//     if (!pickups.length) return [];

//     const pickupIds = pickups.map((p) => p.id);
//     const notifications = await this.notificationService.listForUser(user.id);

//     return this.mapNotificationsForPickups(notifications, pickupIds);
//   }

//   async findAll(query: Record<string, any>) {
//     return this.pickupRepo.findAll(query);
//   }

//   async getPickupOrders(pickupId: string) {
//     return this.orderRepo.findMany({ pickupId });
//   }

//   async getPickupsOfBranch(branchId: string, query: Record<string, any> = {}) {
//     return this.pickupRepo.findAll(query, { branchId });
//   }

//   async getPickupsOfTenant(tenantId: string, query: Record<string, any> = {}) {
//     return this.pickupRepo.findAll(query, {
//       orders: {
//         some: { customer: { memberships: { some: { tenantId } } } },
//       },
//       NOT: { status: PickUpStatus.CREATED },
//     });
//   }

//   async getPickupsOfCustomer(
//     customerId: string,
//     query: Record<string, any> = {},
//   ) {
//     return this.pickupRepo.findAll(query, { orders: { some: { customerId } } });
//   }

//   async findOne(id: string): Promise<PickUp | null> {
//     return this.pickupRepo.findOne({ id });
//   }

//   async deletePickup(pickupId: string) {
//     return this.pickupRepo.delete(pickupId);
//   }
// }
