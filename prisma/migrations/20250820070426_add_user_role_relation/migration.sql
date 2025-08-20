/*
  Warnings:

  - You are about to drop the column `lastLogin` on the `Tenant` table. All the data in the column will be lost.
  - The `status` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `User` table. All the data in the column will be lost.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `stock` on the `Warehouse` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('SUPERADMIN', 'ADMIN', 'DRIVER', 'PACKER', 'ACCOUNTANT', 'PICKER', 'OPERATION', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('Activate', 'Deactivate');

-- CreateEnum
CREATE TYPE "public"."WarehouseStatus" AS ENUM ('OPEN_TO_ADD', 'EMPTY', 'FULL', 'CLOSED', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('ORDERS', 'CUSTOMERS', 'WAREHOUSES', 'USERS', 'DRIVERS', 'DRIVER_ORDERS', 'TENANT_ORDERS', 'TENANT_CUSTOMERS', 'CUSTOMER_ORDERS', 'TENANT_WAREHOUSES');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('ALL', 'CREATE', 'UPDATE', 'VIEW', 'RETRIEVE', 'ACTIVATE', 'DEACTIVATE');

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_tenantId_fkey";

-- AlterTable
ALTER TABLE "public"."Tenant" DROP COLUMN "lastLogin",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."Status" NOT NULL DEFAULT 'Activate';

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
DROP COLUMN "tenantId",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "roleId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."Status" NOT NULL DEFAULT 'Activate';

-- AlterTable
ALTER TABLE "public"."Warehouse" DROP COLUMN "stock",
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "currentStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."WarehouseStatus" NOT NULL DEFAULT 'OPEN_TO_ADD';

-- DropEnum
DROP TYPE "public"."Role";

-- DropEnum
DROP TYPE "public"."TenantStatus";

-- DropEnum
DROP TYPE "public"."UserStatus";

-- CreateTable
CREATE TABLE "public"."UserTenant" (
    "id" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" "public"."RoleName" NOT NULL,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "entity" "public"."EntityType" NOT NULL,
    "action" "public"."ActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "public"."UserTenant"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "public"."Role"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_entity_action_key" ON "public"."Permission"("entity", "action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "public"."RolePermission"("roleId", "permissionId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTenant" ADD CONSTRAINT "UserTenant_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
