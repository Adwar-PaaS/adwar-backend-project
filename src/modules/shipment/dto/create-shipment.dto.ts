import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ServiceType } from '@prisma/client';

export class CreateShipmentDto {
  @IsString()
  shipmentNumber!: string;

  @IsOptional()
  @IsString()
  pickupId?: string;

  @IsString()
  originCountry!: string;

  @IsString()
  originCity!: string;

  @IsString()
  destinationCountry!: string;

  @IsString()
  destinationCity!: string;

  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @IsNumber()
  shipmentValue!: number;

  @IsOptional()
  @IsNumber()
  declaredValue?: number;

  @IsNumber()
  weight!: number;

  @IsOptional()
  @IsNumber()
  volumetricWeight?: number;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsInt()
  numberOfItems!: number;

  @IsOptional()
  @IsString()
  senderAccountNumber?: string;

  @IsString()
  senderName!: string;

  @IsOptional()
  @IsString()
  senderBusinessName?: string;

  @IsString()
  senderPhone!: string;

  @IsOptional()
  @IsString()
  senderEmail?: string;

  @IsString()
  consigneeName!: string;

  @IsString()
  consigneePhone1!: string;

  @IsOptional()
  @IsString()
  consigneePhone2?: string;

  @IsOptional()
  @IsString()
  consigneeEmail?: string;

  @IsString()
  senderAddressId!: string;

  @IsString()
  consigneeAddressId!: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsBoolean()
  insuranceRequired!: boolean;

  @IsBoolean()
  signatureRequired!: boolean;

  @IsBoolean()
  fragileItems!: boolean;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}
