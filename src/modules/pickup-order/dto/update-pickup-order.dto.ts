import { PartialType } from '@nestjs/mapped-types';
import { CreatePickupOrderDto } from './create-pickup-order.dto';

export class UpdatePickupOrderDto extends PartialType(CreatePickupOrderDto) {}
