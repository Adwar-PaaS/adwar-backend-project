import {
  Body,
  Controller,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { APIResponse } from '../../common/utils/api-response.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Session } from 'express-session';
import { clearCookieConfig } from '../../config/cookie.config';
import { AuthUser } from './interfaces/auth-user.interface';

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
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto);
    return APIResponse.success(
      { user },
      'Registration successful',
      HttpStatus.CREATED,
    );
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
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
  @UseGuards(SessionGuard)
  async logout(@Req() req: AuthenticatedRequest, @Res() res: Response) {
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
  async me(@CurrentUser() user: { id: string }) {
    const currentUser = await this.auth.getCurrentUser(user.id);
    return APIResponse.success(
      { user: currentUser },
      'Authenticated user',
      HttpStatus.OK,
    );
  }

  @Post('refresh')
  @UseGuards(SessionGuard)
  async refresh(@Req() req: AuthenticatedRequest) {
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
}
