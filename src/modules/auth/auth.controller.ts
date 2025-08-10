import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './guards/session.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  setAuthCookies,
  clearAuthCookies,
} from '../../common/utils/cookie.util';
import { COOKIE_NAMES } from '../../common/utils/constants.util';
import { APIResponse } from '../../common/utils/api-response.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.auth.register(dto);
    return res
      .status(HttpStatus.CREATED)
      .json(
        APIResponse.success(
          result,
          'Registration successful',
          HttpStatus.CREATED,
        ),
      );
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { accessToken, refreshToken, sessionId, user } =
      await this.auth.login(dto, req.ip, req.headers['user-agent']);
    setAuthCookies(res, accessToken, refreshToken, sessionId);
    return res
      .status(HttpStatus.OK)
      .json(APIResponse.success({ user }, 'Login successful'));
  }

  @Post('refresh-token')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH];
    const sessionId = req.cookies?.[COOKIE_NAMES.SESSION];

    const result = await this.auth.refresh(sessionId, refreshToken);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.sessionId,
    );

    return res
      .status(HttpStatus.OK)
      .json(APIResponse.success({ user: result.user }, 'Token refreshed'));
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE_NAMES.SESSION]);
    clearAuthCookies(res);
    return res
      .status(HttpStatus.OK)
      .json(APIResponse.success(null, 'Logged out'));
  }

  @Get('check-auth')
  @UseGuards(SessionGuard)
  async checkAuth(@CurrentUser() user: JwtPayload) {
    const currentUser = await this.auth.getCurrentUser(user.id);
    return APIResponse.success({ user: currentUser }, 'Authenticated user');
  }
}
