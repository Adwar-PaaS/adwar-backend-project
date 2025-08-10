import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { AuthRepository } from './auth.repository';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { Role } from '@prisma/client';
import { ACCESS_TOKEN_EXPIRES } from '../../common/utils/constants.util';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  private createJwtPayload(user: any): JwtPayload {
    return { id: user.id, email: user.email, role: user.role as Role };
  }

  async register(dto: any) {
    const user = await this.repo.createUser(dto);
    const payload = this.createJwtPayload(user);
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Registration successful',
      data: { accessToken, user },
    };
  }

  async login(
    dto: { email: string; password: string },
    ip?: string,
    ua?: string,
  ) {
    const user = await this.repo.findUserByEmail(dto.email);
    if (!user)
      throw new ApiError('Invalid credentials', HttpStatus.UNAUTHORIZED);

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid)
      throw new ApiError('Invalid credentials', HttpStatus.UNAUTHORIZED);

    const payload = this.createJwtPayload(user);
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });

    const sessionId = uuid();
    const refreshToken = uuid();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.repo.createSession(sessionId, {
      userId: user.id,
      refreshTokenHash,
      createdAt: Date.now(),
      ip,
      ua,
    });

    return { accessToken, refreshToken, sessionId, user };
  }

  async refresh(sessionId: string, refreshToken: string) {
    if (!sessionId || !refreshToken) {
      throw new ApiError(
        'Missing session or refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const session = await this.repo.getSession<{
      userId: string;
      refreshTokenHash: string;
    }>(sessionId);
    if (!session)
      throw new ApiError('Invalid session', HttpStatus.UNAUTHORIZED);

    const ok = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!ok) {
      await this.repo.deleteSession(sessionId);
      throw new ApiError('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    const newRefreshToken = uuid();
    const newHash = await bcrypt.hash(newRefreshToken, 10);

    await this.repo.updateSession(sessionId, {
      ...session,
      refreshTokenHash: newHash,
    });

    const user = await this.repo.findUserById(session.userId);
    if (!user) throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);

    const payload = this.createJwtPayload(user);
    const newAccessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
      sessionId,
    };
  }

  async logout(sessionId: string) {
    if (sessionId) await this.repo.deleteSession(sessionId);
  }

  async getCurrentUser(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);
    return user;
  }
}
