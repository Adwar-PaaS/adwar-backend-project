import { Prisma } from '@prisma/client';
import { makeSelector } from '../utils/selector.util';

export const addressFields = {
  id: true,
  label: true,
  address1: true,
  address2: true,
  district: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  isActive: true,
  landmark: true,
  instructions: true,
};

export const addressSelector =
  makeSelector<Prisma.AddressSelect>(addressFields);
