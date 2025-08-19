# Role-Based Permission System Documentation

## Overview

This system provides granular role-based access control where:
- **Permissions** are stored in a separate table with Entity + Action combinations
- **Roles** can have multiple permissions through the `RolePermission` junction table
- **Users** are assigned a single role but inherit all permissions from that role

## Database Schema

```
Permission: { id, entity, action }
Role: { id, name, tenantId }
RolePermission: { id, roleId, permissionId }
User: { id, roleId, ... }
```

## API Endpoints

### 1. Get Available Permissions for Frontend
```
GET /api/roles/permissions/available
```
Returns permissions grouped by entity for easy display in checkboxes:
```json
{
  "data": {
    "permissions": {
      "USER": [
        { "id": "uuid", "action": "CREATE", "description": "create user" },
        { "id": "uuid", "action": "UPDATE", "description": "update user" },
        { "id": "uuid", "action": "VIEW", "description": "view user" },
        { "id": "uuid", "action": "DELETE", "description": "delete user" },
        { "id": "uuid", "action": "ALL", "description": "all user" }
      ],
      "ORDER": [
        { "id": "uuid", "action": "CREATE", "description": "create order" },
        // ... etc
      ]
    }
  }
}
```

### 2. Create Role with Permissions
```
POST /api/roles
{
  "name": "ADMIN",
  "tenantId": "optional-tenant-id",
  "permissionIds": ["perm-id-1", "perm-id-2", ...]
}
```

### 3. Get Role for Editing
```
GET /api/roles/:roleId
```
Returns role with permissions marked as assigned/unassigned:
```json
{
  "data": {
    "role": {
      "id": "role-id",
      "name": "ADMIN",
      "permissions": [
        {
          "entity": "USER",
          "actions": [
            { "id": "perm-id", "action": "CREATE", "assigned": true },
            { "id": "perm-id", "action": "UPDATE", "assigned": false },
            // ...
          ]
        }
      ]
    }
  }
}
```

### 4. Update Role Permissions
```
PUT /api/roles/:roleId/permissions
{
  "permissionIds": ["perm-id-1", "perm-id-3", ...]
}
```

## Frontend Implementation Guide

### 1. Create Role Page Setup

```javascript
// 1. Fetch available permissions when page loads
const { data: availablePermissions } = await api.get('/roles/permissions/available');

// 2. Create state for form
const [roleName, setRoleName] = useState('');
const [selectedPermissions, setSelectedPermissions] = useState(new Set());

// 3. Render permission checkboxes
{Object.entries(availablePermissions.permissions).map(([entity, actions]) => (
  <div key={entity}>
    <h3>{entity}</h3>
    {actions.map(action => (
      <label key={action.id}>
        <input 
          type="checkbox"
          checked={selectedPermissions.has(action.id)}
          onChange={(e) => {
            const newSelected = new Set(selectedPermissions);
            if (e.target.checked) {
              newSelected.add(action.id);
            } else {
              newSelected.delete(action.id);
            }
            setSelectedPermissions(newSelected);
          }}
        />
        {action.description}
      </label>
    ))}
  </div>
))}

// 4. Submit form
const handleSubmit = async () => {
  await api.post('/roles', {
    name: roleName,
    permissionIds: Array.from(selectedPermissions)
  });
};
```

### 2. Edit Role Page Setup

```javascript
// 1. Fetch role with current permissions
const { data: roleData } = await api.get(`/roles/${roleId}`);

// 2. Initialize form with existing permissions
const [selectedPermissions, setSelectedPermissions] = useState(
  new Set(
    roleData.role.permissions
      .flatMap(p => p.actions)
      .filter(a => a.assigned)
      .map(a => a.id)
  )
);

// 3. Render with pre-selected checkboxes
{roleData.role.permissions.map(permission => (
  <div key={permission.entity}>
    <h3>{permission.entity}</h3>
    {permission.actions.map(action => (
      <label key={action.id}>
        <input 
          type="checkbox"
          checked={selectedPermissions.has(action.id)}
          onChange={handlePermissionChange}
        />
        {action.description}
      </label>
    ))}
  </div>
))}
```

## Setup Instructions

### 1. Run Database Migration
```bash
npx prisma db push
```

### 2. Seed Permissions and Roles
```bash
npx prisma db seed
```

### 3. Add Services to Auth Module
```typescript
// auth.module.ts
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { RoleController } from './controllers/role.controller';

@Module({
  controllers: [AuthController, RoleController],
  providers: [AuthService, PermissionService, RoleService],
  // ...
})
export class AuthModule {}
```

## Permission Checking

### In Controllers
```typescript
@Get('/admin-only')
@Permissions(EntityType.USER, ActionType.ALL)
async adminOnlyEndpoint() {
  // Only users with USER:ALL permission can access
}
```

### Programmatically
```typescript
const canUpdateUsers = await permissionService.hasPermission(
  userId, 
  EntityType.USER, 
  ActionType.UPDATE
);
```

## Entities and Actions

### Entities
- `USER` - User management
- `TENANT` - Tenant/organization management  
- `WAREHOUSE` - Warehouse management
- `ORDER` - Order management

### Actions
- `ALL` - Full access to the entity
- `CREATE` - Can create new records
- `UPDATE` - Can modify existing records
- `DELETE` - Can remove records
- `VIEW` - Can view/read records

## Example Usage Flow

1. **Admin creates a new role**: "Warehouse Manager"
2. **Admin selects permissions**: 
   - WAREHOUSE: ALL
   - ORDER: CREATE, UPDATE, VIEW
   - USER: VIEW
3. **System saves** role with selected permission IDs
4. **When creating users**, admin can assign "Warehouse Manager" role
5. **User inherits** all permissions from that role
6. **System checks** permissions on each API call using guards
