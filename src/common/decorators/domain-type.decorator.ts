import { SetMetadata } from '@nestjs/common';
import { DomainType } from '../enums/domain.enum';

export const DOMAIN_TYPE_KEY = 'domainType';
export const DomainTypeGuard = (domainType: DomainType) =>
  SetMetadata(DOMAIN_TYPE_KEY, domainType);
