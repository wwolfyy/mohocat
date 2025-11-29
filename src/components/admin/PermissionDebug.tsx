'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleAssignmentService } from '@/services/role-assignment-service';
import { PermissionService } from '@/services/permission-service';
import { cn } from '@/utils/cn';

export default function PermissionDebug() {
  const { user } = useAuth();
  const [roleAssignmentService] = useState(() => new RoleAssignmentService());
  const [permissionService] = useState(() => new PermissionService());
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const runDebug = async () => {
    if (!user) {
      setMessage('No user logged in');
      return;
    }

    setLoading(true);
    setMessage('Running debug checks...');
    
    try {
      const debugData: any = {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        },
        checks: {}
      };

      // Check 1: Does user need role assignment?
      debugData.checks.needsRoleAssignment = await roleAssignmentService.needsRoleAssignment(user.uid);
      setMessage('✓ Checked role assignment status');

      // Check 2: Get user role
      debugData.checks.userRole = await roleAssignmentService.getUserRole(user.uid);
      setMessage('✓ Retrieved user role');

      // Check 3: Get user permissions
      debugData.checks.userPermissions = await permissionService.getUserPermissions(user.uid);
      setMessage('✓ Retrieved user permissions');

      // Check 4: Test permission checks
      debugData.checks.canManageCats = await permissionService.checkPermission(user.uid, 'manage-cats');
      debugData.checks.canManagePosts = await permissionService.checkPermission(user.uid, 'manage-posts');
      debugData.checks.canManageUsers = await permissionService.checkPermission(user.uid, 'manage-users');
      
      setDebugInfo(debugData);
      setMessage('Debug completed successfully!');

    } catch (error: any) {
      console.error('Debug failed:', error);
      setMessage(`Debug failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!user) return;
    
    setLoading(true);
    setMessage('Assigning role...');
    
    try {
      await roleAssignmentService.assignUserRole(user.uid, user.email || user.uid, 'geyang');
      setMessage('Role assigned successfully!');
      // Run debug again to see updated info
      setTimeout(runDebug, 1000);
    } catch (error: any) {
      console.error('Role assignment failed:', error);
      setMessage(`Role assignment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Permission Debug Tool</h2>
        
        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">{message}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex space-x-3">
            <button
              onClick={runDebug}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              🔍 Run Debug
            </button>
            <button
              onClick={assignRole}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              🎯 Assign Role
            </button>
          </div>

          {Object.keys(debugInfo).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Debug Results:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(debugInfo, (key, value) => {
                  if (key === 'assignedAt' || key === 'createdAt' || key === 'updatedAt') {
                    return value?.toISOString?.() || value;
                  }
                  return value;
                }, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}