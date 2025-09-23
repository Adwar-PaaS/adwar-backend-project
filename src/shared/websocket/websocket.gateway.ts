import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebsocketService } from './websocket.service';
import { RedisService } from '../../db/redis/redis.service';
import { PrismaService } from '../../db/prisma/prisma.service';
import { mapPrismaUserToAuthUser } from '../../modules/auth/mappers/auth.mapper';
import { UnauthorizedException, Logger } from '@nestjs/common';
import * as cookie from 'cookie';
import * as cookieSignature from 'cookie-signature';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

export interface SocketWithUser extends Socket {
  data: {
    user?: AuthUser;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly wsService: WebsocketService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.wsService.setServer(server);
    server.use(this.getAuthMiddleware());
    this.logger.log('WebSocket server initialized with auth middleware');
  }

  private getAuthMiddleware() {
    return async (socket: SocketWithUser, next: (err?: any) => void) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) throw new UnauthorizedException('No cookie provided');

        const parsed = cookie.parse(cookies);
        const sessionName =
          this.config.get<string>('SESSION_COOKIE_NAME') || 'session_id';
        const signedSession = parsed[sessionName];
        if (!signedSession)
          throw new UnauthorizedException('No session cookie');

        if (!signedSession.startsWith('s:')) {
          throw new UnauthorizedException('Invalid session format');
        }

        const secret = this.config.get<string>('SESSION_SECRET');
        if (!secret) {
          throw new UnauthorizedException('SESSION_SECRET is not configured');
        }

        const unsigned = cookieSignature.unsign(signedSession.slice(2), secret);
        if (!unsigned) {
          throw new UnauthorizedException('Invalid session signature');
        }

        const redis = this.redisService.getConnection();
        const sessionKey = `sess:${unsigned}`;
        const sessionData = await redis.get(sessionKey);
        if (!sessionData) throw new UnauthorizedException('Invalid session');

        const session = JSON.parse(sessionData);
        if (!session.userId) {
          throw new UnauthorizedException('No user in session');
        }

        const user = await this.prisma.user.findUnique({
          where: { id: session.userId },
          include: {
            role: { include: { permissions: true } },
            memberships: {
              include: {
                tenant: true,
                permissions: true,
              },
            },
          },
        });
        if (!user) throw new UnauthorizedException('User not found');

        socket.data.user = mapPrismaUserToAuthUser(user);

        const ttlMs = this.config.get<number>('SESSION_MAX_AGE');
        if (ttlMs) {
          await redis.expire(sessionKey, Math.floor(ttlMs / 1000));
        }

        return next();
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.error(`WS Auth error: ${err.message}`, err.stack);
        }
        return next(new UnauthorizedException('Authentication failed'));
      }
    };
  }

  handleConnection(client: SocketWithUser) {
    this.wsService.registerClient(client);
  }

  handleDisconnect(client: SocketWithUser) {
    this.wsService.removeClient(client.id);
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: unknown,
  ) {
    client.emit('pong', { message: 'pong', data });
  }
}

// import {
//   MessageBody,
//   SubscribeMessage,
//   WebSocketGateway,
//   WebSocketServer,
//   ConnectedSocket,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   OnGatewayInit,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { WebsocketService } from './websocket.service';
// import { RedisService } from '../../db/redis/redis.service';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { mapPrismaUserToAuthUser } from '../../modules/auth/mappers/auth.mapper';
// import { UnauthorizedException } from '@nestjs/common';
// import * as cookie from 'cookie';
// import * as cookieSignature from 'cookie-signature';
// import { ConfigService } from '@nestjs/config';

// @WebSocketGateway({
//   cors: {
//     origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
//     credentials: true,
//   },
// })
// export class WebsocketGateway
//   implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
// {
//   @WebSocketServer() server: Server;

//   constructor(
//     private readonly wsService: WebsocketService,
//     private readonly redisService: RedisService,
//     private readonly prisma: PrismaService,
//     private readonly config: ConfigService,
//   ) {}

//   afterInit(server: Server) {
//     this.wsService.setServer(server);

//     server.use(async (socket: Socket, next) => {
//       try {
//         const cookies = socket.handshake.headers.cookie;
//         if (!cookies) {
//           return next(new UnauthorizedException('No cookie provided'));
//         }

//         const parsedCookies = cookie.parse(cookies);
//         const sessionName = this.config.get<string>(
//           'SESSION_COOKIE_NAME',
//           'session_id',
//         );
//         const signedSession = parsedCookies[sessionName];
//         if (!signedSession) {
//           return next(new UnauthorizedException('No session cookie'));
//         }

//         const secret = this.config.get<string>('SESSION_SECRET');
//         if (!secret) {
//           return next(new UnauthorizedException('Secret not configured'));
//         }

//         if (!signedSession.startsWith('s:')) {
//           return next(new UnauthorizedException('Invalid session format'));
//         }

//         const unsigned = cookieSignature.unsign(signedSession.slice(2), secret);
//         if (!unsigned) {
//           return next(new UnauthorizedException('Invalid session signature'));
//         }

//         const redis = this.redisService.getConnection();
//         const sessionData = await redis.get(`sess:${unsigned}`);
//         if (!sessionData) {
//           return next(new UnauthorizedException('Invalid session'));
//         }

//         const session = JSON.parse(sessionData);
//         if (!session.userId) {
//           return next(new UnauthorizedException('Not authenticated'));
//         }

//         const user = await this.prisma.user.findUnique({
//           where: { id: session.userId },
//           include: {
//             role: true,
//             memberships: {
//               include: {
//                 tenant: true,
//                 permissions: true,
//               },
//             },
//           },
//         });

//         if (!user) {
//           return next(new UnauthorizedException('User not found'));
//         }

//         socket.data.user = mapPrismaUserToAuthUser(user);
//         next();
//       } catch (error) {
//         next(new UnauthorizedException('Authentication failed'));
//       }
//     });
//   }

//   handleConnection(client: Socket) {
//     this.wsService.registerClient(client);
//     // this.wsService.joinTenantRoom(client);
//   }

//   handleDisconnect(client: Socket) {
//     this.wsService.removeClient(client.id);
//   }

//   @SubscribeMessage('ping')
//   handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
//     client.emit('pong', { message: 'pong', data });
//   }

//   // Example: Add more subscribed messages for chat/events
//   //   @SubscribeMessage('chatMessage')
//   //   handleChat(
//   //     @ConnectedSocket() client: Socket,
//   //     @MessageBody() { room, message }: { room: string; message: string },
//   //   ) {
//   //     // Business logic: e.g., save to DB, then emit
//   //     this.wsService.emitToRoom(room, 'chatMessage', {
//   //       from: client.data.user.id,
//   //       message,
//   //     });
//   //   }
// }
