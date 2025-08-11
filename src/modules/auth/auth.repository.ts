import { Injectable } from '@nestjs/common';
import { RedisService } from '../../db/redis/redis.service';
import { UsersRepository } from '../users/users.repository';
import {
  SESSION_PREFIX,
  SESSION_TTL_SECONDS,
} from '../../common/utils/constants.util';

@Injectable()
export class AuthRepository {
  constructor(
    private readonly redis: RedisService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async createUser(dto: any) {
    return this.usersRepo.create(dto);
  }

  async findUserByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }

  async findUserById(userId: string) {
    return this.usersRepo.findOne(userId);
  }

  async createSession(sessionId: string, data: any) {
    return this.redis.set(
      SESSION_PREFIX + sessionId,
      data,
      SESSION_TTL_SECONDS,
    );
  }

  async getSession<T>(sessionId: string) {
    return this.redis.get<T>(SESSION_PREFIX + sessionId);
  }

  async updateSession(sessionId: string, data: any) {
    return this.redis.set(
      SESSION_PREFIX + sessionId,
      data,
      SESSION_TTL_SECONDS,
    );
  }

  async deleteSession(sessionId: string) {
    return this.redis.del(SESSION_PREFIX + sessionId);
  }
}
