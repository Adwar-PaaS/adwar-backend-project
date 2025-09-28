import { User } from '@prisma/client';
import { UserViewDto } from '../dto/user-view.dto';
import { plainToInstance } from 'class-transformer';

export type UserView = UserViewDto;

export function mapUserView(user: any): UserView {
  const transformed = {
    ...user,
    tenant: user.memberships?.[0]?.tenant || null,
    addresses:
      user.addresses?.map((ua: any) => ({
        ...ua.address,
        type: ua.type,
        isPrimary: ua.isPrimary,
        isDefault: ua.isDefault,
      })) || [], 
  };
  return plainToInstance(UserViewDto, transformed, {
    excludeExtraneousValues: true,
  });
}

export function mapUserViews(users: any[]): UserView[] {
  return users.map(mapUserView);
}
