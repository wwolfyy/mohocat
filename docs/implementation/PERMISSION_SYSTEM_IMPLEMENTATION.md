# Permission System Implementation Plan

## Overview
Implement a configuration-driven permission system to replace hardcoded admin emails with 4 privilege levels: admin, butler-ground, butler-internet, and viewer.

## Configuration Files

### 1. Permission Configuration (`config/permissions.json`)
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
    "butler-ground": {
      "permissions": [
        "manage-cats",
        "manage-posts",
        "view-analytics"
      ],
      "description": "Physical cat care management"
    },
    "butler-internet": {
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

### 2. Configuration Loader (`src/config/permission-config.ts`)
```typescript
export interface PermissionConfig {
  roles: Record<string, {
    permissions: string[];
    description: string;
  }>;
  mountains: Record<string, {
    name: string;
    adminUsers: string[];
    defaultRole: string;
  }>;
}

export async function loadPermissionConfig(): Promise<PermissionConfig> {
  const response = await fetch('/config/permissions.json');
  if (!response.ok) {
    throw new Error('Failed to load permission configuration');
  }
  return response.json();
}

export async function getPermissionMatrix(): Promise<Record<string, string[]>> {
  const config = await loadPermissionConfig();
  return Object.fromEntries(
    Object.entries(config.roles).map(([role, data]) => [role, data.permissions])
  );
}
```

## Data Models

### User Permissions Model (`src/types/permissions.ts`)
```typescript
export interface UserPermissions {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  
  // Current mountain role
  currentRole: UserRole;
  
  // Historical roles for audit purposes
  roleHistory: UserRole[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  role: string; // 'admin' | 'butler-ground' | 'butler-internet' | 'viewer'
  permissions: string[];
  mountainId: string;
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
}
```

## Permission Service

### Core Service (`src/services/permission-service.ts`)
```typescript
export class PermissionService {
  private db = getFirestore();
  private config: PermissionConfig | null = null;

  private async loadConfig(): Promise<PermissionConfig> {
    if (!this.config) {
      this.config = await loadPermissionConfig();
    }
    return this.config;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userDoc = await this.db.collection('user_permissions').doc(userId).get();
    if (!userDoc.exists) return [];
    
    const userData = userDoc.data() as UserPermissions;
    const currentRole = userData.currentRole;
    
    return currentRole.isActive ? currentRole.permissions : [];
  }

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async assignRole(
    userId: string,
    role: string,
    mountainId: string,
    assignedBy: string
  ): Promise<void> {
    const config = await this.loadConfig();
    
    if (!config.roles[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    const newRole: UserRole = {
      role,
      permissions: config.roles[role].permissions,
      mountainId,
      assignedBy,
      assignedAt: new Date(),
      isActive: true
    };

    const userRef = this.db.collection('user_permissions').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data() as UserPermissions;
      
      // Deactivate previous role
      if (userData.currentRole) {
        userData.roleHistory = userData.roleHistory || [];
        userData.roleHistory.push({
          ...userData.currentRole,
          isActive: false
        });
      }

      await userRef.update({
        currentRole: newRole,
        roleHistory: userData.roleHistory,
        updatedAt: new Date()
      });
    } else {
      // Create new user permissions record
      await userRef.set({
        uid: userId,
        email: '', // Will be populated from auth
        currentRole: newRole,
        roleHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Log the role assignment
    await this.logRoleChange(userId, role, mountainId, assignedBy);
  }

  async logRoleChange(
    userId: string,
    newRole: string,
    mountainId: string,
    changedBy: string
  ): Promise<void> {
    await this.db.collection('permission_logs').add({
      userId,
      action: 'role-assigned',
      newRole,
      mountainId,
      changedBy,
      timestamp: new Date()
    });
  }
}
```

## Permission Hooks

### Permission Hook (`src/hooks/usePermissions.ts`)
```typescript
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const loadPermissions = async () => {
      setIsLoading(true);
      try {
        const permissionService = new PermissionService();
        const userPermissions = await permissionService.getUserPermissions(user.uid);
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [user?.uid]);

  // Convenience methods
  const hasPermission = useCallback((permission: string) => 
    permissions.includes(permission), [permissions]);

  const canManageCats = hasPermission('manage-cats');
  const canManagePosts = hasPermission('manage-posts');
  const canManageUsers = hasPermission('manage-users');
  const canViewAnalytics = hasPermission('view-analytics');
  const canManageSettings = hasPermission('manage-settings');
  const canExportData = hasPermission('export-data');

  return {
    permissions,
    isLoading,
    hasPermission,
    // Convenience getters
    canManageCats,
    canManagePosts,
    canManageUsers,
    canViewAnalytics,
    canManageSettings,
    canExportData,
    // Raw permission check
    checkPermission: hasPermission
  };
}
```

## Updated Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public collections - no auth required
    match /points/{x} {
      allow read: if true;
      allow write: if false;
    }

    match /cats/{x} {
      allow read: if true;
      allow write: if false;
    }

    match /about_content/{x} {
      allow read: if true;
      allow write: if false;
    }

    match /cat_images/{x} {
      allow read: if true;
      allow write: if false;
    }
    
    match /cat_videos/{x} {
      allow read: if true;
      allow write: if false;
    }

    match /posts_announcements/{x} {
      allow read: if true;
      allow write: if false;
    }

    // Permission-managed collections
    match /posts_feeding/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        hasPermission(request.auth.uid, 'manage-posts');
    }

    match /posts_butler/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        hasPermission(request.auth.uid, 'manage-posts');
    }

    // Permission system collections
    match /user_permissions/{userId} {
      // Users can read their own permissions
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Only admins can modify permissions (via cloud functions)
      allow write: if false;
    }

    match /permission_logs/{logId} {
      // Read access for admins
      allow read: if request.auth != null && 
        hasPermission(request.auth.uid, 'view-analytics');
      
      // Write access only via cloud functions
      allow write: if false;
    }

    // Admin-only collections
    match /admin_data/{document} {
      allow read, write: if request.auth != null && 
        hasPermission(request.auth.uid, 'manage-users');
    }

    match /analytics/{document} {
      allow read: if request.auth != null && 
        hasPermission(request.auth.uid, 'view-analytics');
      allow write: if request.auth != null && 
        hasPermission(request.auth.uid, 'manage-settings');
    }

    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// Helper function to check user permissions
function hasPermission(userId, permission) {
  return exists(/databases/$(database)/documents/user_permissions/$(userId)) &&
         get(/databases/$(database)/documents/user_permissions/$(userId)).data.currentRole.isActive &&
         permission in get(/databases/$(database)/documents/user_permissions/$(userId)).data.currentRole.permissions;
}
```

## Implementation Steps

### Step 1: Create Configuration Files
1. Create `config/permissions.json` with role definitions
2. Create `src/config/permission-config.ts` for loading configuration

### Step 2: Create Data Models
1. Create `src/types/permissions.ts` with TypeScript interfaces
2. Set up Firestore collections:
   - `user_permissions` - stores user roles and permissions
   - `permission_logs` - audit trail of permission changes

### Step 3: Implement Permission Service
1. Create `src/services/permission-service.ts`
2. Implement permission checking and role assignment methods
3. Add logging for audit trail

### Step 4: Create Permission Hooks
1. Create `src/hooks/usePermissions.ts`
2. Add convenience methods for common permission checks
3. Integrate with existing useAuth hook

### Step 5: Update Security Rules
1. Replace existing security rules with permission-based rules
2. Add `hasPermission` helper function
3. Protect admin collections with appropriate permission checks

### Step 6: Create Admin Interface
1. Build admin component for role management
2. Add user listing with current roles
3. Implement role assignment interface
4. Add permission audit log viewer

### Step 7: Populate Initial Data
1. Create admin user records in `user_permissions` collection
2. Assign initial roles to existing admin users
3. Test permission checking throughout the application

## Key Benefits

1. **Configuration-driven**: Easy to modify roles and permissions without code changes
2. **Audit trail**: Complete logging of all permission changes
3. **Flexible**: Supports complex permission scenarios
4. **Secure**: Proper authentication and authorization at database level
5. **Maintainable**: Clear separation of concerns and clean architecture

## Migration Notes

- No migration needed - start fresh with new permission system
- Populate `user_permissions` collection with existing admin users
- Update admin interface to use new permission system
- Remove hardcoded admin emails from `src/lib/auth/admin.ts`