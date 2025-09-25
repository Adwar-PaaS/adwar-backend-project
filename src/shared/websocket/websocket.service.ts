import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import type { SocketWithUser } from './websocket.gateway';

@Injectable()
export class WebsocketService {
  private server: Server;
  private clients = new Map<string, SocketWithUser>();
  private userClients = new Map<string, Set<string>>();
  private readonly logger = new Logger(WebsocketService.name);

  setServer(server: Server) {
    this.server = server;
  }

  registerClient(client: SocketWithUser) {
    const user = client.data.user;
    if (!user) return;

    this.clients.set(client.id, client);

    let userSockets = this.userClients.get(user.id);
    if (!userSockets) {
      userSockets = new Set();
      this.userClients.set(user.id, userSockets);
    }
    userSockets.add(client.id);

    this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const user = client.data.user;
    if (user) {
      const userSockets = this.userClients.get(user.id);
      if (userSockets) {
        userSockets.delete(clientId);
        if (userSockets.size === 0) {
          this.userClients.delete(user.id);
        }
      }
    }

    this.clients.delete(clientId);
    this.logger.log(`Client disconnected: ${clientId}`);
  }

  emitToUser(userId: string, event: string, data: any) {
    const userSockets = this.userClients.get(userId);
    if (!userSockets) return;

    for (const socketId of userSockets) {
      const client = this.clients.get(socketId);
      if (client) {
        client.emit(event, data);
      }
    }
  }

  emitToAll(event: string, data: any) {
    this.server?.emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server?.to(room).emit(event, data);
  }

  joinRoom(client: SocketWithUser, room: string) {
    client.join(room);
  }

  leaveRoom(client: SocketWithUser, room: string) {
    client.leave(room);
  }
}

// import { Injectable } from '@nestjs/common';
// import { Server, Socket } from 'socket.io';
// import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

// @Injectable()
// export class WebsocketService {
//   private server: Server;
//   private clients: Map<string, Socket> = new Map();
//   private userClients: Map<string, Set<string>> = new Map();

//   setServer(server: Server) {
//     this.server = server;
//   }

//   registerClient(client: Socket) {
//     const user = client.data.user as AuthUser;
//     if (!user) return;

//     this.clients.set(client.id, client);

//     let userSockets = this.userClients.get(user.id);
//     if (!userSockets) {
//       userSockets = new Set();
//       this.userClients.set(user.id, userSockets);
//     }
//     userSockets.add(client.id);

//     console.log(`Client connected: ${client.id} (user: ${user.id})`);
//   }

//   removeClient(clientId: string) {
//     const client = this.clients.get(clientId);
//     if (!client) return;

//     const user = client.data.user as AuthUser;
//     const userSockets = this.userClients.get(user.id);
//     if (userSockets) {
//       userSockets.delete(clientId);
//       if (userSockets.size === 0) {
//         this.userClients.delete(user.id);
//       }
//     }

//     this.clients.delete(clientId);
//     console.log(`Client disconnected: ${clientId}`);
//   }

//   emitToUser(userId: string, event: string, data: any) {
//     const userSockets = this.userClients.get(userId);
//     if (userSockets) {
//       for (const socketId of userSockets) {
//         const client = this.clients.get(socketId);
//         if (client) client.emit(event, data);
//       }
//     }
//   }

//   emitToAll(event: string, data: any) {
//     if (this.server) this.server.emit(event, data);
//   }

//   emitToRoom(room: string, event: string, data: any) {
//     if (this.server) this.server.to(room).emit(event, data);
//   }

//   emitToTenant(tenantId: string, event: string, data: any) {
//     this.emitToRoom(`tenant:${tenantId}`, event, data);
//   }

//   joinRoom(client: Socket, room: string) {
//     client.join(room);
//   }

//   leaveRoom(client: Socket, room: string) {
//     client.leave(room);
//   }

//   //   joinTenantRoom(client: Socket) {
//   //     const user = client.data.user as AuthUser;
//   //     if (user.tenant?.id) {
//   //       this.joinRoom(client, `tenant:${user.tenant.id}`);
//   //       console.log(
//   //         `User ${user.id} joined tenant room: tenant:${user.tenant.id}`,
//   //       );
//   //     }
//   //   }

//   // Add more methods as needed, e.g., for warehouse rooms
//   //   joinWarehouseRoom(client: Socket, warehouseId: string) {
//   //     this.joinRoom(client, `warehouse:${warehouseId}`);
//   //   }
// }
