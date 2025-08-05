import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

export class JwtTokenUtil {
  constructor(private jwtService: JwtService) {}

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: '7d' });
  }
}
