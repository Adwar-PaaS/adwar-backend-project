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
import { UnauthorizedException } from '@nestjs/common';
import * as cookie from 'cookie';

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

  constructor(
    private readonly wsService: WebsocketService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.wsService.setServer(server);

    server.use(async (socket: Socket, next) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
          return next(new UnauthorizedException('No cookie provided'));
        }

        const parsedCookies = cookie.parse(cookies);
        const sessionName = process.env.SESSION_COOKIE_NAME || 'session_id';
        const sessionID = parsedCookies[sessionName];
        if (!sessionID) {
          return next(new UnauthorizedException('No session cookie'));
        }

        const redis = this.redisService.getConnection();
        const sessionData = await redis.get(`sess:${sessionID}`);
        if (!sessionData) {
          return next(new UnauthorizedException('Invalid session'));
        }

        const session = JSON.parse(sessionData);
        if (!session.userId) {
          return next(new UnauthorizedException('Not authenticated'));
        }

        const user = await this.prisma.user.findUnique({
          where: { id: session.userId },
          include: {
            role: true,
            memberships: {
              include: {
                tenant: true,
                permissions: true,
              },
            },
          },
        });

        if (!user) {
          return next(new UnauthorizedException('User not found'));
        }

        socket.data.user = mapPrismaUserToAuthUser(user);
        next();
      } catch (error) {
        next(new UnauthorizedException('Authentication failed'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.wsService.registerClient(client);
    // this.wsService.joinTenantRoom(client);
  }

  handleDisconnect(client: Socket) {  
    this.wsService.removeClient(client.id);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    client.emit('pong', { message: 'pong', data });
  }

  // Example: Add more subscribed messages for chat/events
  //   @SubscribeMessage('chatMessage')
  //   handleChat(
  //     @ConnectedSocket() client: Socket,
  //     @MessageBody() { room, message }: { room: string; message: string },
  //   ) {
  //     // Business logic: e.g., save to DB, then emit
  //     this.wsService.emitToRoom(room, 'chatMessage', {
  //       from: client.data.user.id,
  //       message,
  //     });
  //   }
}
