import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

import { APIResponse } from '../../common/utils/api-response.util';
import { JwtTokenUtil } from '../../common/utils/jwt-token.util';
import { Role } from '../../common/enums/role.enum';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { createResponseShape } from '../../common/utils/response-shape.util';

@Injectable()
export class AuthService {
  private jwtUtil: JwtTokenUtil;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtUtil = new JwtTokenUtil(jwtService);
  }

  async register(dto: RegisterDto) {
    const user = await this.userService.create(dto);
    const payload = this.createJwtPayload(user);
    const access_token = await this.jwtUtil.generateAccessToken(payload);

    return APIResponse.success(
      {
        access_token,
        user: this.formatUser(user),
      },
      'Registration successful',
      HttpStatus.CREATED,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    const isValid = user && (await bcrypt.compare(dto.password, user.password));
    if (!isValid) {
      throw new ApiError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const payload = this.createJwtPayload(user);
    const access_token = await this.jwtUtil.generateAccessToken(payload);

    return APIResponse.success(
      {
        access_token,
        user: this.formatUser(user),
      },
      'Login successful',
    );
  }

  async refreshToken(userId: string, email: string) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);
    }

    const payload = this.createJwtPayload(user);
    const refresh_token = await this.jwtUtil.generateRefreshToken(payload);

    return APIResponse.success({ refresh_token }, 'Refresh token generated');
  }

  async getCurrentUser(user: JwtPayload) {
    const foundUser = await this.userService.findOne(user.id);

    if (!foundUser) {
      throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);
    }

    return APIResponse.success(
      this.formatUser(foundUser),
      'Authenticated user fetched successfully',
    );
  }

  private formatUser(user: any) {
    return createResponseShape(user, [
      'id',
      'email',
      'fullName',
      'role',
      'tenantId',
    ]);
  }

  private createJwtPayload(user: any): JwtPayload {
    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
    };
  }
}
