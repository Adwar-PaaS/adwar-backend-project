import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { SessionGuard } from './guards/session.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { APIResponse } from '../../common/utils/api-response.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Session } from 'express-session';
import { clearCookieConfig } from '../../config/cookie.config';
import { AuthUser } from './interfaces/auth-user.interface';
import { AttachUserToTenantDto } from '../users/dto/attach-user-to-tenant.dto';
import { UsersService } from '../users/users.service';
import { Throttle, SkipThrottle, seconds } from '@nestjs/throttler';

export interface AuthenticatedRequest extends Request {
  session: Session & {
    userId?: string;
    role?: {
      id: string;
      name: string;
    };
  };
  user?: AuthUser;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<APIResponse<{ user: AuthUser }>> {
    const user = await this.auth.register(dto);
    return APIResponse.success(
      { user },
      'Registration successful',
      HttpStatus.CREATED,
    );
  }

  @Post('attach-to-tenant')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  async attachUserToTenant(
    @Body() dto: AttachUserToTenantDto,
  ): Promise<APIResponse<{ user: AuthUser }>> {
    const user = await this.auth.attachUserToTenant(dto);

    return APIResponse.success(
      { user },
      'User attached to tenant successfully',
      HttpStatus.CREATED,
    );
  }

  @Post('login')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<APIResponse<{ user: AuthUser }>> {
    const user = await this.auth.login(dto.email, dto.password);

    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );

    req.session.userId = user.id;
    req.session.role = { id: user.role.id, name: user.role.name };

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );

    return APIResponse.success({ user }, 'Login successful', HttpStatus.OK);
  }

  @Post('logout')
  @UseGuards(SessionGuard, CsrfGuard)
  @SkipThrottle()
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<Response> {
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((err) => (err ? reject(err) : resolve())),
    );

    res.clearCookie(
      process.env.SESSION_COOKIE_NAME || 'session_id',
      clearCookieConfig,
    );

    return res
      .status(HttpStatus.OK)
      .json(APIResponse.success(null, 'Logged out successfully'));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 30, ttl: seconds(300) } })
  async me(
    @CurrentUser() user: { id: string },
  ): Promise<APIResponse<{ user: AuthUser }>> {
    const currentUser = await this.auth.getCurrentUser(user.id);
    return APIResponse.success(
      { user: currentUser },
      'Authenticated user',
      HttpStatus.OK,
    );
  }

  @Post('refresh')
  @UseGuards(SessionGuard, CsrfGuard)
  @Throttle({ default: { limit: 20, ttl: seconds(300) } })
  async refresh(
    @Req() req: AuthenticatedRequest,
  ): Promise<APIResponse<{ user: AuthUser }>> {
    if (!req.session) throw new Error('Session missing');
    req.session.touch();
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );

    const currentUser = await this.auth.getCurrentUser(
      req.session.userId as string,
    );
    return APIResponse.success(
      { user: currentUser },
      'Session refreshed successfully',
      HttpStatus.OK,
    );
  }

  @Get('csrf-token')
  @Throttle({ default: { limit: 5, ttl: seconds(30) } })
  async getCsrfToken(
    @Req() req: Request,
  ): Promise<APIResponse<{ token: string }>> {
    const token = req.cookies['XSRF-TOKEN'];
    if (!token) {
      throw new ForbiddenException('CSRF token not found');
    }
    return APIResponse.success(
      { token },
      'CSRF token retrieved',
      HttpStatus.OK,
    );
  }
}
