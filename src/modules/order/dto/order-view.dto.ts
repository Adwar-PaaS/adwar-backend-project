import { Expose, Type, Transform } from 'class-transformer';

class ProductViewDto {
  @Expose()
  id!: string;

  @Expose()
  sku!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  category?: string;

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  weight?: string | null;

  @Expose()
  isFragile!: boolean;
}

class OrderItemViewDto {
  @Expose()
  id!: string;

  @Expose()
  quantity!: number;

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  unitPrice!: string;

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  total!: string;

  @Expose()
  @Type(() => ProductViewDto)
  product!: ProductViewDto;
}

class CustomerViewDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string | null;
}

export class OrderViewDto {
  @Expose()
  id!: string;

  @Expose()
  orderNumber!: string;

  @Expose()
  referenceNumber?: string;

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  totalWeight?: string;

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  totalValue?: string;

  @Expose()
  packageCount!: number;

  @Expose()
  status!: string;

  @Expose()
  priority!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => CustomerViewDto)
  customer?: CustomerViewDto | null;

  @Expose()
  @Type(() => OrderItemViewDto)
  items!: OrderItemViewDto[];
}
