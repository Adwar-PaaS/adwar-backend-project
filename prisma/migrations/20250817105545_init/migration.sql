-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('Activate', 'Deactivate');

-- AlterTable
ALTER TABLE "public"."Tenant" ALTER COLUMN "status" SET DEFAULT 'Activate';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'Activate';
