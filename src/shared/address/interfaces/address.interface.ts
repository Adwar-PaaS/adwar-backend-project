export interface IAddress {
  id: string;
  label?: string;
  address1: string;
  address2?: string;
  district?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  landmark?: string;
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
