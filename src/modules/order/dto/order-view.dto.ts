import { Expose, Type, Transform } from 'class-transformer';
import {
  decimalToString,
  dateToISOString,
} from 'src/common/utils/helpers.util';

class OrderItemViewDto {
  @Expose()
  id!: string;

  @Expose()
  sku?: string | null;

  @Expose()
  quantity!: number;

  @Expose()
  @Transform(decimalToString)
  unitPrice!: string;

  @Expose()
  @Transform(decimalToString)
  total!: string;

  @Expose()
  name?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  category?: string | null;

  @Expose()
  @Transform(decimalToString)
  weight?: string | null;

  @Expose()
  isFragile!: boolean;

  @Expose()
  @Transform(dateToISOString)
  scannedAt!: string | null;
}

class CustomerViewDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;
}

export class OrderViewDto {
  @Expose()
  id!: string;

  @Expose()
  orderNumber!: string;

  // ✅ Explicitly nullable for Prisma String?
  @Expose()
  referenceNumber?: string | null;

  @Expose()
  @Transform(decimalToString)
  totalWeight?: string;

  @Expose()
  @Transform(decimalToString)
  totalValue?: string;

  @Expose()
  packageCount!: number;

  @Expose()
  status!: string;

  @Expose()
  priority!: string;

  @Expose()
  @Transform(dateToISOString)
  createdAt!: string;

  @Expose()
  @Transform(dateToISOString)
  updatedAt!: string;

  @Expose()
  @Type(() => CustomerViewDto)
  customer?: CustomerViewDto | null;

  @Expose()
  @Type(() => OrderItemViewDto)
  items!: OrderItemViewDto[];
}
