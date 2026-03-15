import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { PermissionService } from '@/services/permission-service';

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const permissionService = new PermissionService();

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const loadPermissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const userPermissions = await permissionService.getUserPermissions(user.uid);
        setPermissions(userPermissions);
      } catch (error: any) {
        console.error('Failed to load permissions:', error);
        setError(error.message || 'Failed to load permissions');
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [user?.uid]);

  // Permission checking functions
  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (permissionList: string[]) =>
      permissionList.some((permission) => permissions.includes(permission)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (permissionList: string[]) =>
      permissionList.every((permission) => permissions.includes(permission)),
    [permissions]
  );

  // Convenience getters for specific permissions
  const canManageCats = hasPermission('manage-cat');
  const canManagePosts = hasPermission('manage-posts');
  const canManageUsers = hasPermission('manage-users');
  const canViewAnalytics = hasPermission('view-analytics');
  const canManageSettings = hasPermission('manage-settings');
  const canExportData = hasPermission('export-data');

  // Role-based convenience functions
  const isAdmin = canManageUsers && canManageSettings && canExportData;
  const isButlerOffline = canManageCats && canManagePosts && canViewAnalytics;
  const isButlerOnline = canManagePosts && canViewAnalytics;
  const isViewer = permissions.length === 0;

  // Action permission checks
  const canCreateContent = canManagePosts;
  const canEditContent = canManagePosts;
  const canDeleteContent = canManagePosts;
  const canManageCatData = canManageCats;
  const canViewReports = canViewAnalytics;
  const canManageSystemSettings = canManageSettings;
  const canExportSystemData = canExportData;

  // Admin-level permissions (require full admin access)
  const canManageAllUsers = isAdmin;
  const canAccessAllFeatures = isAdmin;

  return {
    // Basic state
    permissions,
    isLoading,
    error,

    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Specific permission getters
    canManageCats,
    canManagePosts,
    canManageUsers,
    canViewAnalytics,
    canManageSettings,
    canExportData,

    // Role-based getters
    isAdmin,
    isButlerOffline,
    isButlerOnline,
    isViewer,

    // Action-based getters
    canCreateContent,
    canEditContent,
    canDeleteContent,
    canManageCatData,
    canViewReports,
    canManageSystemSettings,
    canExportSystemData,
    canManageAllUsers,
    canAccessAllFeatures,

    // Utility functions
    hasRequiredPermissions: (requiredPermissions: string[]) =>
      requiredPermissions.every((permission) => permissions.includes(permission)),

    // Refresh permissions (useful after role changes)
    refreshPermissions: async () => {
      if (user) {
        try {
          const userPermissions = await permissionService.getUserPermissions(user.uid);
          setPermissions(userPermissions);
          setError(null);
        } catch (error: any) {
          console.error('Failed to refresh permissions:', error);
          setError(error.message || 'Failed to refresh permissions');
        }
      }
    },
  };
}

/**
 * Hook for checking permissions without the full permission data
 * Use this for simple permission checks to avoid unnecessary re-renders
 */
export function usePermissionCheck() {
  const { user } = useAuth();
  const [permissionService] = useState(() => new PermissionService());

  const checkPermission = useCallback(
    async (permission: string): Promise<boolean> => {
      if (!user) return false;

      try {
        return await permissionService.checkPermission(user.uid, permission);
      } catch (error) {
        console.error('Permission check failed:', error);
        return false;
      }
    },
    [user?.uid, permissionService]
  );

  const checkAnyPermission = useCallback(
    async (permissions: string[]): Promise<boolean> => {
      if (!user) return false;

      try {
        return await permissionService.hasAnyPermission(user.uid, permissions);
      } catch (error) {
        console.error('Permission check failed:', error);
        return false;
      }
    },
    [user?.uid, permissionService]
  );

  const checkAllPermissions = useCallback(
    async (permissions: string[]): Promise<boolean> => {
      if (!user) return false;

      try {
        return await permissionService.hasAllPermissions(user.uid, permissions);
      } catch (error) {
        console.error('Permission check failed:', error);
        return false;
      }
    },
    [user?.uid, permissionService]
  );

  return {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
  };
}
