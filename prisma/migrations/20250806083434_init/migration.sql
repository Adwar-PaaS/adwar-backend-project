/*
  Warnings:

  - Changed the type of `status` on the `Tenant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `name` to the `Warehouse` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TenantStatus" AS ENUM ('Activate', 'Deactivate');

-- AlterTable
ALTER TABLE "public"."Tenant" DROP COLUMN "status",
ADD COLUMN     "status" "public"."TenantStatus" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Warehouse" ADD COLUMN     "name" TEXT NOT NULL;
