# Permission System Implementation

## ✅ COMPLETED IMPLEMENTATION

The permission system has been **successfully implemented and is fully functional**. This document provides a comprehensive guide to the new configuration-driven permission system.

### 🎯 What Has Been Accomplished

✅ **Complete Permission System** - Role-based access control throughout the application
✅ **Real User Management** - Full visibility and control over all users via Firestore
✅ **Simplified Authentication** - Clear, user-friendly authentication flows
✅ **Professional Interface** - Clean, intuitive admin interface for user management
✅ **Security First** - Robust authentication and authorization
✅ **API Integration** - Complete backend/frontend integration
✅ **Service Account Setup** - Proper Firebase Admin SDK configuration

### 🔧 Key Features Implemented

- **Role Management Interface** - Complete user management in admin panel
- **Firestore Integration** - Direct integration with `user_permissions` collection
- **API Routes** - Backend API using Firebase Admin SDK
- **Simplified Authentication** - Streamlined KakaoTalk and email/password flows
- **Permission-Based Access** - Dynamic permission checking throughout the app

## Overview

The permission system replaces hardcoded admin emails with a flexible, configuration-based approach that supports 4 privilege levels across multiple mountains:

- **admin**: Full administrative access
- **butler-offline**: Physical cat care management
- **butler-online**: Digital content management  
- **viewer**: Read-only access to public content

## File Structure

```
├── config/
│   └── permissions.json              # Permission configuration
├── src/
│   ├── config/
│   │   └── permission-config.ts      # Configuration loader
│   ├── types/
│   │   └── permissions.ts            # TypeScript interfaces
│   ├── services/
│   │   └── permission-service.ts     # Core permission service
│   ├── hooks/
│   │   └── usePermissions.ts         # React hooks for permission checking
│   ├── components/
│   │   └── admin/
│   │       └── PermissionManager.tsx # Admin interface for role management
│   └── utils/
│       └── permission-utils.ts       # Utility functions
└── docs/
    └── implementation/
        ├── PERMISSION_SYSTEM_IMPLEMENTATION.md  # Implementation plan
        └── PERMISSION_SYSTEM_README.md          # This file
```

## Configuration

### Permission Configuration (`config/permissions.json`)

The system uses a JSON configuration file to define roles and permissions:

```json
{
  "roles": {
    "admin": {
      "permissions": [
        "manage-cats",
        "manage-posts",
        "manage-users",
        "view-analytics",
        "manage-settings",
        "export-data"
      ],
      "description": "Full administrative access"
    },
    "butler-offline": {
      "permissions": [
        "manage-cats",
        "manage-posts",
        "view-analytics"
      ],
      "description": "Physical cat care management"
    },
    "butler-online": {
      "permissions": [
        "manage-posts",
        "view-analytics"
      ],
      "description": "Digital content management"
    },
    "viewer": {
      "permissions": [],
      "description": "Read-only access to public content"
    }
  },
  "mountains": {
    "geyang": {
      "name": "Geyang Mountain",
      "adminUsers": ["admin@geyang-cats.com"],
      "defaultRole": "viewer"
    },
    "jirisan": {
      "name": "Jirisan Mountain",
      "adminUsers": [],
      "defaultRole": "viewer"
    }
  }
}
```

## Core Components

### 1. Permission Service (`src/services/permission-service.ts`)

The main service for managing permissions:

```typescript
const permissionService = new PermissionService();

// Check user permissions
const permissions = await permissionService.getUserPermissions(userId);
const hasPermission = await permissionService.checkPermission(userId, 'manage-posts');

// Assign roles
await permissionService.assignRole(userId, 'admin', 'geyang', adminUserId);

// Manage user status
await permissionService.suspendRole(userId, adminUserId, 'Violation of terms');
await permissionService.reactivateRole(userId, adminUserId);
```

### 2. Permission Hooks (`src/hooks/usePermissions.ts`)

React hooks for checking permissions in components:

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const {
    canManagePosts,
    canViewAnalytics,
    hasPermission,
    isAdmin
  } = usePermissions();

  if (!canManagePosts) {
    return <div>Access denied</div>;
  }

  return <div>Content management interface</div>;
}
```

### 3. Permission Manager (`src/components/admin/PermissionManager.tsx`)

Admin interface for managing user roles:

```typescript
import { PermissionManager } from '@/components/admin/PermissionManager';

function AdminPage() {
  return (
    <div>
      <h1>User Management</h1>
      <PermissionManager mountainId="geyang" />
    </div>
  );
}
```

## Usage Examples

### Checking Permissions in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions';

export function AdminContent() {
  const { canManageUsers, canViewAnalytics } = usePermissions();

  return (
    <div>
      {canManageUsers && (
        <UserManagementPanel />
      )}
      
      {canViewAnalytics && (
        <AnalyticsPanel />
      )}
    </div>
  );
}
```

### Server-Side Permission Checking

```typescript
import { checkUserPermission } from '@/utils/permission-utils';

export async function getServerSideProps(context) {
  const userId = getCurrentUserId(context);
  
  if (!(await checkUserPermission(userId, 'manage-users'))) {
    return {
      redirect: {
        destination: '/unauthorized',
        permanent: false,
      },
    };
  }

  // Continue with protected page logic
}
```

### Programmatic Role Assignment

```typescript
import { PermissionService } from '@/services/permission-service';

export async function assignUserRole(userId: string, role: string) {
  const permissionService = new PermissionService();
  
  try {
    await permissionService.assignRole(
      userId,
      role,
      'geyang',  // mountain ID
      getCurrentUserId()  // admin who is assigning
    );
    
    console.log(`Successfully assigned ${role} to user ${userId}`);
  } catch (error) {
    console.error('Failed to assign role:', error);
  }
}
```

## Firestore Collections

The system uses the following Firestore collections:

### `user_permissions`
Stores user role information:
```javascript
{
  uid: "user-uid",
  email: "user@example.com",
  currentRole: {
    role: "admin",
    permissions: ["manage-cats", "manage-posts", "manage-users", "view-analytics", "manage-settings", "export-data"],
    mountainId: "geyang",
    assignedBy: "admin-uid",
    assignedAt: Timestamp,
    isActive: true
  },
  roleHistory: [...],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `permission_logs`
Audit trail for permission changes:
```javascript
{
  userId: "user-uid",
  action: "role-assigned",
  newRole: "admin",
  mountainId: "geyang",
  changedBy: "admin-uid",
  timestamp: Timestamp,
  metadata: {...}
}
```

## Security Rules

The system includes updated Firestore security rules that integrate with the permission system:

```javascript
// Helper function to check user permissions
function hasPermission(userId, permission) {
  return exists(/databases/$(database)/documents/user_permissions/$(userId)) &&
         get(/databases/$(database)/documents/user_permissions/$(userId)).data.currentRole.isActive &&
         permission in get(/databases/$(database)/documents/user_permissions/$(userId)).data.currentRole.permissions;
}

// Protect admin collections
match /admin_data/{document} {
  allow read, write: if request.auth != null && 
    hasPermission(request.auth.uid, 'manage-users');
}
```

## Migration Guide

### From Hardcoded Admin Emails

1. **Populate initial admin users**:
   ```typescript
   const permissionService = new PermissionService();
   
   // Assign admin role to existing hardcoded admin users
   await permissionService.assignRole(
     'user-uid',
     'admin',
     'geyang',
     'migration-script'
   );
   ```

2. **Update admin components**:
   Replace hardcoded email checks with permission-based checks:
   ```typescript
   // Before
   if (user.email === 'admin@geyang-cats.com') {
     // Show admin features
   }
   
   // After
   const { canManageUsers } = usePermissions();
   if (canManageUsers) {
     // Show admin features
   }
   ```

3. **Update security rules**:
   Replace hardcoded email checks with permission-based rules as shown above.

## Best Practices

1. **Use specific permissions**: Check for specific permissions rather than roles when possible
2. **Cache permissions**: Use the provided hooks to cache permission data and avoid unnecessary database calls
3. **Audit changes**: All permission changes are automatically logged for compliance
4. **Secure by default**: Deny access by default and explicitly grant permissions
5. **Regular reviews**: Periodically review user permissions and remove unnecessary access

## Troubleshooting

### Common Issues

1. **Permission not updating**: Clear the permission cache or refresh the user's session
2. **Role assignment failing**: Check that the role exists in the configuration file
3. **Security rules blocking access**: Ensure the user has the required permissions and the rules are correctly configured

### Debugging

Enable debug logging in the permission service:
```typescript
// Add debug logging
console.log('User permissions:', await permissionService.getUserPermissions(userId));
console.log('Permission check result:', await permissionService.checkPermission(userId, 'manage-posts'));
```

## Future Enhancements

1. **Multi-mountain support**: Extend the system to support users with different roles across multiple mountains
2. **Permission inheritance**: Implement hierarchical permission inheritance
3. **Time-based permissions**: Add time-based permission restrictions
4. **Group-based permissions**: Support for group-based permission management
5. **UI improvements**: Enhanced admin interface with better search and filtering

## Support

For questions or issues related to the permission system:

1. Check the implementation plan document
2. Review the example usage in this README
3. Examine the type definitions for available methods and properties
4. Check the audit logs for permission change history