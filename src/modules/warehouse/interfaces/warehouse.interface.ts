export interface IWarehouse {
  id: string;
  location: string;
  stock: number;
  tenantId: string;
  tenant?: {
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
