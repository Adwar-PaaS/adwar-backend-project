-- Drop the broken column
ALTER TABLE "RolePermission" DROP COLUMN "actionType";

-- Add it back correctly as an array of enums
ALTER TABLE "RolePermission"
ADD COLUMN "actionType" "ActionType"[] NOT NULL DEFAULT '{}';

-- 1. Drop the old unique index that included the array column
DROP INDEX IF EXISTS "RolePermission_roleId_entityType_actionType_key";

-- 2. Create the new unique index on roleId + entityType
CREATE UNIQUE INDEX "RolePermission_roleId_entityType_key"
ON "public"."RolePermission"("roleId", "entityType");
