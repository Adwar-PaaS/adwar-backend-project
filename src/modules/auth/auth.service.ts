import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { APIResponse } from '../../common/utils/api-response.util';
import { JwtTokenUtil } from '../../common/utils/jwt-token.util';

@Injectable()
export class AuthService {
  private jwtUtil: JwtTokenUtil;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtUtil = new JwtTokenUtil(jwtService);
  }

  async register(dto: CreateUserDto) {
    const user = await this.userService.create(dto);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtUtil.generateAccessToken(payload);

    return APIResponse.success(
      { access_token: accessToken },
      'Registration successful',
    );
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtUtil.generateAccessToken(payload);

    return APIResponse.success(
      {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
        },
      },
      'Login successful',
    );
  }

  async refreshToken(userId: string, email: string) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshToken = await this.jwtUtil.generateRefreshToken(payload);

    return APIResponse.success(
      { refresh_token: refreshToken },
      'Refresh token generated',
    );
  }
}
