-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DRIVER', 'PACKER', 'ACCOUNTANT', 'PICKER', 'OPERATION', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."WarehouseStatus" AS ENUM ('OPEN', 'EMPTY', 'FULL', 'CLOSED', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('USER', 'BRANCH', 'ROLE', 'TENANT', 'WAREHOUSE', 'ORDER', 'DRIVER', 'DRIVER_ORDER', 'TENANT_ORDER', 'TENANT_CUSTOMER', 'CUSTOMER_ORDER', 'TENANT_WAREHOUSE');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('ALL', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM (
    'CREATED',
    'PENDING',
    'APPROVED',
    'ASSIGNED_FOR_PICKUP',
    'PICKED_UP',
    'RECEIVED_IN_WAREHOUSE',
    'STORED_ON_SHELVES',
    'READY_FOR_DISPATCH',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'RESCHEDULED',
    'CANCELLED',
    'RETURNED_TO_OPERATION',
    'READY_TO_RETURN_TO_ORIGIN',
    'RETURNED_TO_ORIGIN'
);

-- CreateEnum
CREATE TYPE "public"."AttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RelatedType" AS ENUM ('USER', 'TENANT', 'WAREHOUSE', 'ORDER', 'DRIVER', 'ROLE');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."FailedReason" AS ENUM (
    'CUSTOMER_NOT_AVAILABLE',
    'WRONG_ADDRESS',
    'NO_ANSWER',
    'DAMAGED_PACKAGE',
    'OUT_OF_COVERAGE_AREA',
    'MOBILE_SWITCHED_OFF',
    'OTHER'
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

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
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "actionType" "ActionType"[] DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."WarehouseStatus" NOT NULL DEFAULT 'OPEN',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPermission" (
    "id" TEXT NOT NULL,
    "userTenantId" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "actionType" "public"."ActionType"[] DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL,
    "failedReason" "public"."FailedReason",
    "deliveryLocation" TEXT,
    "merchantLocation" TEXT,
    "paymentType" TEXT,
    "COD_Collection_Method" TEXT,
    "COD_Amount" DOUBLE PRECISION,
    "notes" TEXT,
    "description" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "warehouseId" TEXT,
    "driverId" TEXT,
    "customerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "public"."AttachmentType" NOT NULL,
    "relatedId" TEXT,
    "relatedType" "public"."RelatedType" NOT NULL,
    "metadata" JSON,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" TEXT,
    "actionType" "public"."ActionType" NOT NULL,
    "oldValues" JSON,
    "newValues" JSON,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
);

-- CreateTable
CREATE TABLE "public"."Request" (
    "id" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" TEXT,
    "actionType" "public"."ActionType" NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "responseMsg" TEXT,
    "senderId" TEXT NOT NULL,
    "responderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id"),
);

-- CreateTable
CREATE TABLE "public"."PickUp" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PickUpRequest" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "respondedBy" TEXT,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickUpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PickUpOrder" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    CONSTRAINT "PickUpOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Request_entityType_entityId_idx" ON "public"."Request"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Request_senderId_idx" ON "public"."Request"("senderId");

-- CreateIndex
CREATE INDEX "Request_responderId_idx" ON "public"."Request"("responderId");

-- CreateIndex
CREATE INDEX "PickUpRequest_pickupId_idx" ON "public"."PickUpRequest"("pickupId");

-- CreateIndex
CREATE INDEX "PickUpRequest_requestedBy_idx" ON "public"."PickUpRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "PickUpRequest_respondedBy_idx" ON "public"."PickUpRequest"("respondedBy");

-- CreateIndex
CREATE INDEX "PickUpOrder_pickupId_idx" ON "public"."PickUpOrder"("pickupId");

-- CreateIndex
CREATE INDEX "PickUpOrder_orderId_idx" ON "public"."PickUpOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PickUpOrder_pickupId_orderId_key" ON "public"."PickUpOrder"("pickupId", "orderId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog" ("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "public"."AuditLog" ("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_actionType_idx" ON "public"."AuditLog" ("actionType");

-- CreateIndex
-- CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "public"."Role"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "public"."Tenant"("email");

-- CreateIndex
CREATE INDEX "UserTenant_tenantId_idx" ON "public"."UserTenant"("tenantId");

-- CreateIndex
CREATE INDEX "UserTenant_warehouseId_idx" ON "public"."UserTenant"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "public"."UserTenant"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "public"."Role"("tenantId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "public"."RolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_entityType_actionType_key" ON "public"."RolePermission"("roleId", "entityType", "actionType");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_idx" ON "public"."Warehouse"("tenantId");

-- CreateIndex
CREATE INDEX "UserPermission_userTenantId_idx" ON "public"."UserPermission"("userTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userTenantId_entityType_key" ON "public"."UserPermission"("userTenantId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_sku_key" ON "public"."Order"("sku");

-- CreateIndex
CREATE INDEX "Order_warehouseId_idx" ON "public"."Order"("warehouseId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_relatedId_relatedType_idx" ON "public"."Attachment"("relatedId", "relatedType");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "public"."Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_userTenantId_fkey" FOREIGN KEY ("userTenantId") REFERENCES "public"."UserTenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order"
ADD CONSTRAINT "Order_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order"
ADD CONSTRAINT "Order_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order"
ADD CONSTRAINT "Order_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog"
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickUpRequest"
    ADD CONSTRAINT "PickUpRequest_pickupId_fkey"
    FOREIGN KEY ("pickupId") REFERENCES "public"."PickUp"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickUpRequest"
    ADD CONSTRAINT "PickUpRequest_requestedBy_fkey"
    FOREIGN KEY ("requestedBy") REFERENCES "public"."User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickUpRequest"
    ADD CONSTRAINT "PickUpRequest_respondedBy_fkey"
    FOREIGN KEY ("respondedBy") REFERENCES "public"."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickUpOrder"
    ADD CONSTRAINT "PickUpOrder_pickupId_fkey"
    FOREIGN KEY ("pickupId") REFERENCES "public"."PickUp"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickUpOrder"
    ADD CONSTRAINT "PickUpOrder_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request"
ADD CONSTRAINT "Request_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request"
ADD CONSTRAINT "Request_responderId_fkey"
FOREIGN KEY ("responderId") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
