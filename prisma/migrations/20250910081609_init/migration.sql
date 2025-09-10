-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."AddressType" AS ENUM ('HOME', 'WORK', 'OFFICE', 'BRANCH', 'PICKUP', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'COD');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('STANDARD', 'EXPRESS', 'NEXT_DAY', 'SAME_DAY', 'ECONOMY');

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('SYSTEM', 'INFO', 'ACTION', 'WARNING', 'ERROR', 'MARKETING');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."AttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'SIGNATURE', 'INVOICE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'ASSIGNED_FOR_PICKUP', 'PICKED_UP', 'RECEIVED_IN_WAREHOUSE', 'STORED_ON_SHELVES', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED', 'RETURNED_TO_OPERATION', 'READY_TO_RETURN_TO_ORIGIN', 'RETURNED_TO_ORIGIN');

-- CreateEnum
CREATE TYPE "public"."FailedReason" AS ENUM ('CUSTOMER_NOT_AVAILABLE', 'WRONG_ADDRESS', 'NO_ANSWER', 'DAMAGED_PACKAGE', 'OUT_OF_COVERAGE_AREA', 'MOBILE_SWITCHED_OFF', 'CUSTOMER_REFUSED', 'INCOMPLETE_ADDRESS', 'SECURITY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DRIVER', 'PACKER', 'ACCOUNTANT', 'PICKER', 'OPERATION', 'CUSTOMER', 'BRANCH_MANAGER');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('USER', 'TENANT', 'ORDER', 'DRIVER', 'ROLE', 'PICKUP_REQUEST', 'TENANT_ORDER', 'TENANT_CUSTOMER', 'CUSTOMER_ORDER', 'BRANCH', 'SHIPMENT', 'PAYMENT', 'NOTIFICATION', 'ADDRESS', 'PICKUP', 'TRACKING');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('ALL', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'APPROVE', 'EXPORT', 'IMPORT', 'REJECT', 'ASSIGN', 'COMPLETE', 'CANCEL');

-- CreateEnum
CREATE TYPE "public"."ShipmentStatus" AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "public"."PickUpStatus" AS ENUM ('CREATED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."BranchCategory" AS ENUM ('WAREHOUSE', 'RETAIL');

-- CreateEnum
CREATE TYPE "public"."BranchType" AS ENUM ('MAIN', 'SUB');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "roleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_tenants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" "public"."RoleName" NOT NULL DEFAULT 'CUSTOMER',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "actions" "public"."ActionType"[] DEFAULT ARRAY[]::"public"."ActionType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_permissions" (
    "id" TEXT NOT NULL,
    "userTenantId" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "actions" "public"."ActionType"[] DEFAULT ARRAY[]::"public"."ActionType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."addresses" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "tenantId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "type" "public"."AddressType" NOT NULL DEFAULT 'HOME',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "tenantId" TEXT,
    "customerId" TEXT,
    "addressId" TEXT NOT NULL,
    "type" "public"."BranchType" NOT NULL DEFAULT 'MAIN',
    "category" "public"."BranchCategory" NOT NULL DEFAULT 'WAREHOUSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "totalWeight" DECIMAL(10,3),
    "totalValue" DECIMAL(12,2),
    "specialInstructions" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "failedReason" "public"."FailedReason",
    "priority" "public"."OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "customerId" TEXT,
    "branchId" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "weight" DECIMAL(8,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'CASH',
    "codAmount" DECIMAL(12,2),
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "driverCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "insuranceFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creditFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "extraFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentReferenceNumber" TEXT,
    "paymentCardType" TEXT,
    "approvalCode" TEXT,
    "transactionDate" TIMESTAMP(3),
    "transactionType" TEXT,
    "transactionSource" TEXT,
    "transactionPercentage" DECIMAL(5,2),
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT,
    "status" "public"."OrderStatus" NOT NULL,
    "location" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "hub" TEXT,
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "eventType" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_notes" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pickups" (
    "id" TEXT NOT NULL,
    "status" "public"."PickUpStatus" NOT NULL DEFAULT 'CREATED',
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "driverId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pickup_requests" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "respondedBy" TEXT,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pickup_orders" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pickup_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipments" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "pickupId" TEXT,
    "originCountry" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "serviceType" "public"."ServiceType" NOT NULL DEFAULT 'STANDARD',
    "shipmentValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "declaredValue" DECIMAL(12,2),
    "weight" DECIMAL(10,3) NOT NULL,
    "volumetricWeight" DECIMAL(10,3),
    "dimensions" JSONB,
    "numberOfItems" INTEGER NOT NULL DEFAULT 1,
    "senderAccountNumber" TEXT,
    "senderName" TEXT NOT NULL,
    "senderBusinessName" TEXT,
    "senderPhone" TEXT NOT NULL,
    "consigneeName" TEXT NOT NULL,
    "consigneePhone1" TEXT NOT NULL,
    "consigneePhone2" TEXT,
    "senderAddressId" TEXT NOT NULL,
    "consigneeAddressId" TEXT NOT NULL,
    "specialInstructions" TEXT,
    "insuranceRequired" BOOLEAN NOT NULL DEFAULT false,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipment_orders" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "shipment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "senderId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" TEXT,
    "relatedType" "public"."EntityType",
    "category" "public"."NotificationCategory" NOT NULL DEFAULT 'INFO',
    "channels" "public"."NotificationChannel"[] DEFAULT ARRAY[]::"public"."NotificationChannel"[],
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_recipients" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "type" "public"."AttachmentType" NOT NULL DEFAULT 'OTHER',
    "relatedId" TEXT NOT NULL,
    "relatedType" "public"."EntityType" NOT NULL,
    "metadata" JSONB,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" TEXT,
    "actionType" "public"."ActionType" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."requests" (
    "id" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" TEXT,
    "actionType" "public"."ActionType" NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "responseMsg" TEXT,
    "priority" "public"."RequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "senderId" TEXT NOT NULL,
    "responderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "public"."users"("roleId");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "public"."users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "public"."tenants"("email");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "public"."tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_creatorId_idx" ON "public"."tenants"("creatorId");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "public"."tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_deletedAt_idx" ON "public"."tenants"("deletedAt");

-- CreateIndex
CREATE INDEX "user_tenants_tenantId_idx" ON "public"."user_tenants"("tenantId");

-- CreateIndex
CREATE INDEX "user_tenants_branchId_idx" ON "public"."user_tenants"("branchId");

-- CreateIndex
CREATE INDEX "user_tenants_deletedAt_idx" ON "public"."user_tenants"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_userId_tenantId_key" ON "public"."user_tenants"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "public"."roles"("tenantId");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "public"."roles"("name");

-- CreateIndex
CREATE INDEX "roles_deletedAt_idx" ON "public"."roles"("deletedAt");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "public"."role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_entityType_idx" ON "public"."role_permissions"("entityType");

-- CreateIndex
CREATE INDEX "role_permissions_deletedAt_idx" ON "public"."role_permissions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_entityType_key" ON "public"."role_permissions"("roleId", "entityType");

-- CreateIndex
CREATE INDEX "user_permissions_userTenantId_idx" ON "public"."user_permissions"("userTenantId");

-- CreateIndex
CREATE INDEX "user_permissions_entityType_idx" ON "public"."user_permissions"("entityType");

-- CreateIndex
CREATE INDEX "user_permissions_deletedAt_idx" ON "public"."user_permissions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userTenantId_entityType_key" ON "public"."user_permissions"("userTenantId", "entityType");

-- CreateIndex
CREATE INDEX "addresses_country_city_idx" ON "public"."addresses"("country", "city");

-- CreateIndex
CREATE INDEX "addresses_tenantId_idx" ON "public"."addresses"("tenantId");

-- CreateIndex
CREATE INDEX "addresses_isActive_idx" ON "public"."addresses"("isActive");

-- CreateIndex
CREATE INDEX "addresses_latitude_longitude_idx" ON "public"."addresses"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "addresses_deletedAt_idx" ON "public"."addresses"("deletedAt");

-- CreateIndex
CREATE INDEX "user_addresses_userId_idx" ON "public"."user_addresses"("userId");

-- CreateIndex
CREATE INDEX "user_addresses_type_idx" ON "public"."user_addresses"("type");

-- CreateIndex
CREATE INDEX "user_addresses_isPrimary_idx" ON "public"."user_addresses"("isPrimary");

-- CreateIndex
CREATE INDEX "user_addresses_deletedAt_idx" ON "public"."user_addresses"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_addresses_userId_addressId_key" ON "public"."user_addresses"("userId", "addressId");

-- CreateIndex
CREATE INDEX "branches_tenantId_idx" ON "public"."branches"("tenantId");

-- CreateIndex
CREATE INDEX "branches_customerId_idx" ON "public"."branches"("customerId");

-- CreateIndex
CREATE INDEX "branches_addressId_idx" ON "public"."branches"("addressId");

-- CreateIndex
CREATE INDEX "branches_status_idx" ON "public"."branches"("status");

-- CreateIndex
CREATE INDEX "branches_type_idx" ON "public"."branches"("type");

-- CreateIndex
CREATE INDEX "branches_deletedAt_idx" ON "public"."branches"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "public"."orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_branchId_idx" ON "public"."orders"("branchId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "public"."orders"("status");

-- CreateIndex
CREATE INDEX "orders_priority_idx" ON "public"."orders"("priority");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "public"."orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_estimatedDelivery_idx" ON "public"."orders"("estimatedDelivery");

-- CreateIndex
CREATE INDEX "orders_deliveredAt_idx" ON "public"."orders"("deliveredAt");

-- CreateIndex
CREATE INDEX "orders_deletedAt_idx" ON "public"."orders"("deletedAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "public"."order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_sku_idx" ON "public"."order_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_sku_key" ON "public"."order_items"("orderId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "public"."payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "public"."payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_dueDate_idx" ON "public"."payments"("dueDate");

-- CreateIndex
CREATE INDEX "payments_transactionDate_idx" ON "public"."payments"("transactionDate");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "public"."payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_deletedAt_idx" ON "public"."payments"("deletedAt");

-- CreateIndex
CREATE INDEX "tracking_orderId_idx" ON "public"."tracking"("orderId");

-- CreateIndex
CREATE INDEX "tracking_driverId_idx" ON "public"."tracking"("driverId");

-- CreateIndex
CREATE INDEX "tracking_status_idx" ON "public"."tracking"("status");

-- CreateIndex
CREATE INDEX "tracking_timestamp_idx" ON "public"."tracking"("timestamp");

-- CreateIndex
CREATE INDEX "tracking_isPublic_idx" ON "public"."tracking"("isPublic");

-- CreateIndex
CREATE INDEX "tracking_eventType_idx" ON "public"."tracking"("eventType");

-- CreateIndex
CREATE INDEX "tracking_createdAt_idx" ON "public"."tracking"("createdAt");

-- CreateIndex
CREATE INDEX "order_notes_orderId_idx" ON "public"."order_notes"("orderId");

-- CreateIndex
CREATE INDEX "order_notes_authorId_idx" ON "public"."order_notes"("authorId");

-- CreateIndex
CREATE INDEX "order_notes_private_idx" ON "public"."order_notes"("private");

-- CreateIndex
CREATE INDEX "order_notes_createdAt_idx" ON "public"."order_notes"("createdAt");

-- CreateIndex
CREATE INDEX "pickups_status_idx" ON "public"."pickups"("status");

-- CreateIndex
CREATE INDEX "pickups_scheduledFor_idx" ON "public"."pickups"("scheduledFor");

-- CreateIndex
CREATE INDEX "pickups_driverId_idx" ON "public"."pickups"("driverId");

-- CreateIndex
CREATE INDEX "pickups_branchId_idx" ON "public"."pickups"("branchId");

-- CreateIndex
CREATE INDEX "pickups_createdAt_idx" ON "public"."pickups"("createdAt");

-- CreateIndex
CREATE INDEX "pickups_deletedAt_idx" ON "public"."pickups"("deletedAt");

-- CreateIndex
CREATE INDEX "pickup_requests_pickupId_idx" ON "public"."pickup_requests"("pickupId");

-- CreateIndex
CREATE INDEX "pickup_requests_requestedBy_idx" ON "public"."pickup_requests"("requestedBy");

-- CreateIndex
CREATE INDEX "pickup_requests_respondedBy_idx" ON "public"."pickup_requests"("respondedBy");

-- CreateIndex
CREATE INDEX "pickup_requests_status_idx" ON "public"."pickup_requests"("status");

-- CreateIndex
CREATE INDEX "pickup_requests_requestedAt_idx" ON "public"."pickup_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "pickup_requests_deletedAt_idx" ON "public"."pickup_requests"("deletedAt");

-- CreateIndex
CREATE INDEX "pickup_orders_pickupId_idx" ON "public"."pickup_orders"("pickupId");

-- CreateIndex
CREATE INDEX "pickup_orders_orderId_idx" ON "public"."pickup_orders"("orderId");

-- CreateIndex
CREATE INDEX "pickup_orders_sequence_idx" ON "public"."pickup_orders"("sequence");

-- CreateIndex
CREATE INDEX "pickup_orders_deletedAt_idx" ON "public"."pickup_orders"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_orders_pickupId_orderId_key" ON "public"."pickup_orders"("pickupId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "public"."shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_shipmentNumber_idx" ON "public"."shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_pickupId_idx" ON "public"."shipments"("pickupId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "public"."shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_serviceType_idx" ON "public"."shipments"("serviceType");

-- CreateIndex
CREATE INDEX "shipments_originCountry_originCity_idx" ON "public"."shipments"("originCountry", "originCity");

-- CreateIndex
CREATE INDEX "shipments_destinationCountry_destinationCity_idx" ON "public"."shipments"("destinationCountry", "destinationCity");

-- CreateIndex
CREATE INDEX "shipments_estimatedDelivery_idx" ON "public"."shipments"("estimatedDelivery");

-- CreateIndex
CREATE INDEX "shipments_createdAt_idx" ON "public"."shipments"("createdAt");

-- CreateIndex
CREATE INDEX "shipments_deletedAt_idx" ON "public"."shipments"("deletedAt");

-- CreateIndex
CREATE INDEX "shipment_orders_orderId_idx" ON "public"."shipment_orders"("orderId");

-- CreateIndex
CREATE INDEX "shipment_orders_shipmentId_idx" ON "public"."shipment_orders"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_orders_shipmentId_orderId_key" ON "public"."shipment_orders"("shipmentId", "orderId");

-- CreateIndex
CREATE INDEX "notifications_relatedId_relatedType_idx" ON "public"."notifications"("relatedId", "relatedType");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "public"."notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "public"."notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_scheduledFor_idx" ON "public"."notifications"("scheduledFor");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "public"."notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_deletedAt_idx" ON "public"."notifications"("deletedAt");

-- CreateIndex
CREATE INDEX "notification_recipients_recipientId_idx" ON "public"."notification_recipients"("recipientId");

-- CreateIndex
CREATE INDEX "notification_recipients_readAt_idx" ON "public"."notification_recipients"("readAt");

-- CreateIndex
CREATE INDEX "notification_recipients_deliveredAt_idx" ON "public"."notification_recipients"("deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_recipientId_key" ON "public"."notification_recipients"("notificationId", "recipientId");

-- CreateIndex
CREATE INDEX "attachments_relatedId_relatedType_idx" ON "public"."attachments"("relatedId", "relatedType");

-- CreateIndex
CREATE INDEX "attachments_type_idx" ON "public"."attachments"("type");

-- CreateIndex
CREATE INDEX "attachments_uploadedBy_idx" ON "public"."attachments"("uploadedBy");

-- CreateIndex
CREATE INDEX "attachments_createdAt_idx" ON "public"."attachments"("createdAt");

-- CreateIndex
CREATE INDEX "attachments_deletedAt_idx" ON "public"."attachments"("deletedAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "public"."audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actionType_idx" ON "public"."audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "requests_entityType_entityId_idx" ON "public"."requests"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "requests_senderId_idx" ON "public"."requests"("senderId");

-- CreateIndex
CREATE INDEX "requests_responderId_idx" ON "public"."requests"("responderId");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "public"."requests"("status");

-- CreateIndex
CREATE INDEX "requests_priority_idx" ON "public"."requests"("priority");

-- CreateIndex
CREATE INDEX "requests_expiresAt_idx" ON "public"."requests"("expiresAt");

-- CreateIndex
CREATE INDEX "requests_createdAt_idx" ON "public"."requests"("createdAt");

-- CreateIndex
CREATE INDEX "requests_deletedAt_idx" ON "public"."requests"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tenants" ADD CONSTRAINT "user_tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tenants" ADD CONSTRAINT "user_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tenants" ADD CONSTRAINT "user_tenants_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_userTenantId_fkey" FOREIGN KEY ("userTenantId") REFERENCES "public"."user_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_addresses" ADD CONSTRAINT "user_addresses_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking" ADD CONSTRAINT "tracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking" ADD CONSTRAINT "tracking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_notes" ADD CONSTRAINT "order_notes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_notes" ADD CONSTRAINT "order_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickups" ADD CONSTRAINT "pickups_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickups" ADD CONSTRAINT "pickups_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickup_requests" ADD CONSTRAINT "pickup_requests_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."pickups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickup_requests" ADD CONSTRAINT "pickup_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickup_requests" ADD CONSTRAINT "pickup_requests_respondedBy_fkey" FOREIGN KEY ("respondedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickup_orders" ADD CONSTRAINT "pickup_orders_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."pickups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickup_orders" ADD CONSTRAINT "pickup_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."pickups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_senderAddressId_fkey" FOREIGN KEY ("senderAddressId") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_consigneeAddressId_fkey" FOREIGN KEY ("consigneeAddressId") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipment_orders" ADD CONSTRAINT "shipment_orders_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "public"."shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipment_orders" ADD CONSTRAINT "shipment_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
