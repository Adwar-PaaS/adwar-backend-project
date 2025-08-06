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
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.auth.register(dto);
    return res.status(result.statusCode).json(result);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.auth.login(dto);
    return res.status(result.statusCode).json(result);
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  async refresh(@Req() req, @Res() res: Response) {
    const result = await this.auth.refreshToken(req.user.id, req.user.email);
    return res.status(result.statusCode).json(result);
  }

  @Get('check-auth')
  @UseGuards(JwtAuthGuard)
  async checkAuth(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.auth.getCurrentUser(user);
    return res.status(result.statusCode).json(result);
  }
}
