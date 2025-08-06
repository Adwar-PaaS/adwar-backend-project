/*
  Warnings:

  - You are about to drop the column `name` on the `Warehouse` table. All the data in the column will be lost.
  - Added the required column `name` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Warehouse" DROP COLUMN "name";
