-- Code Generator Function
CREATE SEQUENCE IF NOT EXISTS gen_code_seq START 1;

CREATE OR REPLACE FUNCTION gen_code(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
BEGIN
    new_code := prefix || '-' || lpad(nextval('gen_code_seq')::TEXT, 6, '0');
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."AddressType" AS ENUM ('HOME', 'WORK', 'OFFICE', 'BRANCH', 'PICKUP', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PriorityStatus" AS ENUM ('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'COD', 'CREDIT');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('STANDARD', 'EXPRESS', 'NEXT_DAY', 'SAME_DAY', 'ECONOMY', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('SYSTEM', 'INFO', 'ACTION', 'WARNING', 'ERROR', 'MARKETING', 'PICKUP', 'DELIVERY', 'PAYMENT');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'SIGNATURE', 'INVOICE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('DRAFT', 'CREATED', 'PENDING', 'APPROVED', 'ASSIGNED_FOR_PICKUP', 'PICKED_UP', 'RECEIVED_IN_WAREHOUSE', 'STORED_ON_SHELVES', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED', 'RETURNED_TO_OPERATION', 'READY_TO_RETURN_TO_ORIGIN', 'RETURNED_TO_ORIGIN');

-- CreateEnum
CREATE TYPE "public"."FailedReason" AS ENUM ('CUSTOMER_NOT_AVAILABLE', 'WRONG_ADDRESS', 'NO_ANSWER', 'DAMAGED_PACKAGE', 'OUT_OF_COVERAGE_AREA', 'MOBILE_SWITCHED_OFF', 'CUSTOMER_REFUSED', 'INCOMPLETE_ADDRESS', 'SECURITY_ISSUE', 'WEATHER_CONDITIONS', 'VEHICLE_BREAKDOWN', 'TRAFFIC_CONGESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DRIVER', 'PACKER', 'ACCOUNTANT', 'PICKER', 'OPERATION', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('USER', 'TENANT', 'ORDER', 'DRIVER', 'ROLE', 'PICKUP', 'TENANT_ORDER', 'TENANT_CUSTOMER', 'CUSTOMER_ORDER', 'BRANCH', 'SHIPMENT', 'PAYMENT', 'NOTIFICATION', 'ADDRESS', 'TRACKING', 'PRODUCT', 'INVENTORY', 'VEHICLE');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('ALL', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'APPROVE', 'EXPORT', 'IMPORT', 'REJECT', 'ASSIGN', 'COMPLETE', 'CANCEL');

-- CreateEnum
CREATE TYPE "public"."PickupType" AS ENUM ('REGULAR', 'EXPRESS', 'BULK', 'SCHEDULED', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "public"."BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."BranchCategory" AS ENUM ('WAREHOUSE', 'RETAIL', 'DISTRIBUTION_CENTER', 'SORTING_FACILITY', 'DARK_STORE');

-- CreateEnum
CREATE TYPE "public"."BranchType" AS ENUM ('MAIN', 'SUB', 'SATELLITE');

-- CreateEnum
CREATE TYPE "public"."PickUpStatus" AS ENUM ('CREATED', 'PENDING', 'SCHEDULED', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "customerSubdomain" TEXT,
    "roleId" UUID NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT,
    "description" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "licenseNumber" TEXT,
    "creatorId" UUID NOT NULL,
    "addressId" UUID,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_tenants" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" UUID NOT NULL,
    "name" "public"."RoleName" NOT NULL DEFAULT 'CUSTOMER',
    "tenantId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "actions" "public"."ActionType"[] DEFAULT ARRAY[]::"public"."ActionType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_permissions" (
    "id" UUID NOT NULL,
    "userTenantId" UUID NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "allowed" "public"."ActionType"[] DEFAULT ARRAY[]::"public"."ActionType"[],
    "denied" "public"."ActionType"[] DEFAULT ARRAY[]::"public"."ActionType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."addresses" (
    "id" UUID NOT NULL,
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "landmark" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_addresses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addressId" UUID NOT NULL,
    "type" "public"."AddressType" NOT NULL DEFAULT 'HOME',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT gen_code('BR'::text),
    "status" "public"."BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "tenantId" UUID,
    "addressId" UUID,
    "creatorId" UUID,
    "type" "public"."BranchType" NOT NULL DEFAULT 'MAIN',
    "category" "public"."BranchCategory" NOT NULL DEFAULT 'WAREHOUSE',
    "capacity" INTEGER,
    "operatingHours" JSONB,
    "contactInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "weight" DECIMAL(8,3),
    "dimensions" JSONB,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "totalWeight" DECIMAL(10,3),
    "totalValue" DECIMAL(12,2),
    "packageCount" INTEGER NOT NULL DEFAULT 1,
    "specialInstructions" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'CREATED',
    "failedReason" "public"."FailedReason",
    "priority" "public"."PriorityStatus" NOT NULL DEFAULT 'NORMAL',
    "pickupId" UUID,
    "customerId" UUID,
    "estimatedDelivery" TIMESTAMP(3),
    "scheduledDelivery" TIMESTAMP(3),
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
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scannedAt" TIMESTAMP(3),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" UUID NOT NULL,
    "pickupId" UUID NOT NULL,
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
CREATE TABLE "public"."tracking_events" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "updaterId" UUID,
    "status" "public"."OrderStatus" NOT NULL,
    "location" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "eventType" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_notes" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "authorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pickups" (
    "id" UUID NOT NULL,
    "pickupNumber" TEXT NOT NULL DEFAULT gen_code('PICK'::text),
    "status" "public"."PickUpStatus" NOT NULL DEFAULT 'CREATED',
    "type" "public"."PickupType" NOT NULL DEFAULT 'REGULAR',
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "driverId" UUID,
    "branchId" UUID,
    "addressId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipments" (
    "id" UUID NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "pickupId" UUID NOT NULL,
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
    "senderEmail" TEXT,
    "consigneeName" TEXT NOT NULL,
    "consigneePhone1" TEXT NOT NULL,
    "consigneePhone2" TEXT,
    "consigneeEmail" TEXT,
    "senderAddressId" UUID NOT NULL,
    "consigneeAddressId" UUID NOT NULL,
    "specialInstructions" TEXT,
    "insuranceRequired" BOOLEAN NOT NULL DEFAULT false,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT false,
    "fragileItems" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "senderId" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" UUID,
    "relatedType" "public"."EntityType",
    "category" "public"."NotificationCategory" NOT NULL DEFAULT 'INFO',
    "channels" "public"."NotificationChannel"[] DEFAULT ARRAY[]::"public"."NotificationChannel"[],
    "priority" "public"."PriorityStatus" NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,
    "templateId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_recipients" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "channel" "public"."NotificationChannel",
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "type" "public"."AttachmentType" NOT NULL DEFAULT 'OTHER',
    "relatedId" UUID NOT NULL,
    "relatedType" "public"."EntityType" NOT NULL,
    "metadata" JSONB,
    "uploadedBy" UUID,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" UUID,
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
    "id" UUID NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" UUID,
    "actionType" "public"."ActionType" NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "responseMsg" TEXT,
    "priority" "public"."PriorityStatus" NOT NULL DEFAULT 'MEDIUM',
    "senderId" UUID NOT NULL,
    "responderId" UUID,
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
CREATE UNIQUE INDEX "users_customerSubdomain_key" ON "public"."users"("customerSubdomain");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_customerSubdomain_idx" ON "public"."users"("customerSubdomain");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "public"."users"("roleId");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "public"."users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "public"."tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_addressId_key" ON "public"."tenants"("addressId");

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
CREATE INDEX "branches_addressId_idx" ON "public"."branches"("addressId");

-- CreateIndex
CREATE INDEX "branches_status_idx" ON "public"."branches"("status");

-- CreateIndex
CREATE INDEX "branches_type_idx" ON "public"."branches"("type");

-- CreateIndex
CREATE INDEX "branches_deletedAt_idx" ON "public"."branches"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenantId_code_key" ON "public"."branches"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "public"."products"("sku");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "public"."products"("sku");

-- CreateIndex
CREATE INDEX "products_deletedAt_idx" ON "public"."products"("deletedAt");

-- CreateIndex
CREATE INDEX "inventory_productId_idx" ON "public"."inventory"("productId");

-- CreateIndex
CREATE INDEX "inventory_branchId_idx" ON "public"."inventory"("branchId");

-- CreateIndex
CREATE INDEX "inventory_deletedAt_idx" ON "public"."inventory"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_branchId_key" ON "public"."inventory"("productId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "public"."orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_pickupId_idx" ON "public"."orders"("pickupId");

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
CREATE INDEX "order_items_productId_idx" ON "public"."order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_scannedAt_idx" ON "public"."order_items"("scannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_productId_key" ON "public"."order_items"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_pickupId_key" ON "public"."payments"("pickupId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "public"."payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_dueDate_idx" ON "public"."payments"("dueDate");

-- CreateIndex
CREATE INDEX "payments_transactionDate_idx" ON "public"."payments"("transactionDate");

-- CreateIndex
CREATE INDEX "payments_deletedAt_idx" ON "public"."payments"("deletedAt");

-- CreateIndex
CREATE INDEX "tracking_events_orderId_idx" ON "public"."tracking_events"("orderId");

-- CreateIndex
CREATE INDEX "tracking_events_updaterId_idx" ON "public"."tracking_events"("updaterId");

-- CreateIndex
CREATE INDEX "tracking_events_status_idx" ON "public"."tracking_events"("status");

-- CreateIndex
CREATE INDEX "tracking_events_timestamp_idx" ON "public"."tracking_events"("timestamp");

-- CreateIndex
CREATE INDEX "tracking_events_eventType_idx" ON "public"."tracking_events"("eventType");

-- CreateIndex
CREATE INDEX "order_notes_orderId_idx" ON "public"."order_notes"("orderId");

-- CreateIndex
CREATE INDEX "order_notes_authorId_idx" ON "public"."order_notes"("authorId");

-- CreateIndex
CREATE INDEX "order_notes_private_idx" ON "public"."order_notes"("private");

-- CreateIndex
CREATE UNIQUE INDEX "pickups_pickupNumber_key" ON "public"."pickups"("pickupNumber");

-- CreateIndex
CREATE INDEX "pickups_status_idx" ON "public"."pickups"("status");

-- CreateIndex
CREATE INDEX "pickups_scheduledFor_idx" ON "public"."pickups"("scheduledFor");

-- CreateIndex
CREATE INDEX "pickups_driverId_idx" ON "public"."pickups"("driverId");

-- CreateIndex
CREATE INDEX "pickups_branchId_idx" ON "public"."pickups"("branchId");

-- CreateIndex
CREATE INDEX "pickups_addressId_idx" ON "public"."pickups"("addressId");

-- CreateIndex
CREATE INDEX "pickups_deletedAt_idx" ON "public"."pickups"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "public"."shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_shipmentNumber_idx" ON "public"."shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_pickupId_idx" ON "public"."shipments"("pickupId");

-- CreateIndex
CREATE INDEX "shipments_serviceType_idx" ON "public"."shipments"("serviceType");

-- CreateIndex
CREATE INDEX "shipments_originCountry_originCity_idx" ON "public"."shipments"("originCountry", "originCity");

-- CreateIndex
CREATE INDEX "shipments_destinationCountry_destinationCity_idx" ON "public"."shipments"("destinationCountry", "destinationCity");

-- CreateIndex
CREATE INDEX "shipments_estimatedDelivery_idx" ON "public"."shipments"("estimatedDelivery");

-- CreateIndex
CREATE INDEX "shipments_deletedAt_idx" ON "public"."shipments"("deletedAt");

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
CREATE INDEX "notifications_deletedAt_idx" ON "public"."notifications"("deletedAt");

-- CreateIndex
CREATE INDEX "notification_recipients_recipientId_idx" ON "public"."notification_recipients"("recipientId");

-- CreateIndex
CREATE INDEX "notification_recipients_readAt_idx" ON "public"."notification_recipients"("readAt");

-- CreateIndex
CREATE INDEX "notification_recipients_deliveredAt_idx" ON "public"."notification_recipients"("deliveredAt");

-- CreateIndex
CREATE INDEX "notification_recipients_channel_idx" ON "public"."notification_recipients"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_recipientId_channel_key" ON "public"."notification_recipients"("notificationId", "recipientId", "channel");

-- CreateIndex
CREATE INDEX "attachments_relatedId_relatedType_idx" ON "public"."attachments"("relatedId", "relatedType");

-- CreateIndex
CREATE INDEX "attachments_type_idx" ON "public"."attachments"("type");

-- CreateIndex
CREATE INDEX "attachments_uploadedBy_idx" ON "public"."attachments"("uploadedBy");

-- CreateIndex
CREATE INDEX "attachments_isPublic_idx" ON "public"."attachments"("isPublic");

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
CREATE INDEX "requests_deletedAt_idx" ON "public"."requests"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "public"."user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_addresses" ADD CONSTRAINT "user_addresses_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."pickups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."pickups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_events" ADD CONSTRAINT "tracking_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_events" ADD CONSTRAINT "tracking_events_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_notes" ADD CONSTRAINT "order_notes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_notes" ADD CONSTRAINT "order_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickups" ADD CONSTRAINT "pickups_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickups" ADD CONSTRAINT "pickups_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickups" ADD CONSTRAINT "pickups_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."pickups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_senderAddressId_fkey" FOREIGN KEY ("senderAddressId") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_consigneeAddressId_fkey" FOREIGN KEY ("consigneeAddressId") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- instead of we have creator we can make dynamic model for this to avoid null to using it when need tracking user creator
