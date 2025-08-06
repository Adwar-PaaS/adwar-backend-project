import { Role } from '../../../common/enums/role.enum';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}
