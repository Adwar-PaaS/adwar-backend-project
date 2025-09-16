import { ServiceType } from '@prisma/client';

export interface IShipmentAddressRef {
  id: string;
  address1: string;
  city: string;
  country: string;
}

export interface IShipment {
  id: string;
  shipmentNumber: string;
  pickupId?: string | null;
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  serviceType: ServiceType;
  shipmentValue: number;
  declaredValue?: number | null;
  weight: number;
  volumetricWeight?: number | null;
  dimensions?: Record<string, any> | null;
  numberOfItems: number;
  senderAccountNumber?: string | null;
  senderName: string;
  senderBusinessName?: string | null;
  senderPhone: string;
  senderEmail?: string | null;
  consigneeName: string;
  consigneePhone1: string;
  consigneePhone2?: string | null;
  consigneeEmail?: string | null;
  senderAddressId: string;
  consigneeAddressId: string;
  specialInstructions?: string | null;
  insuranceRequired: boolean;
  signatureRequired: boolean;
  fragileItems: boolean;
  estimatedDelivery?: Date | null;
  actualDelivery?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  senderAddress?: IShipmentAddressRef;
  consigneeAddress?: IShipmentAddressRef;
}
