'use client';

import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { PermissionService } from '@/services/permission-service';
import { getAvailableRoles, getRoleDetails } from '@/config/permission-config';
import { cn } from '@/utils/cn';

interface PermissionManagerProps {
  mountainId?: string;
}

export function PermissionManager({ mountainId = 'geyang' }: PermissionManagerProps) {
  const { user } = useAuth();
  const permissionService = new PermissionService();

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const { canManageUsers } = usePermissions();

  useEffect(() => {
    if (!canManageUsers) return;

    loadInitialData();
  }, [canManageUsers]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load users in the mountain
      const usersData = await permissionService.getUsersInMountain(mountainId);
      setUsers(usersData);

      // Load available roles
      const availableRoles = await getAvailableRoles();
      setRoles(availableRoles);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleAssignment = async () => {
    if (!selectedUserId || !selectedRole) {
      setError('Please select both user and role');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await permissionService.assignRole(selectedUserId, selectedRole, mountainId, user!.uid);

      setSuccess(`Successfully assigned ${selectedRole} role to user`);
      setSelectedUserId('');
      setSelectedRole('');
      loadInitialData(); // Refresh the user list
    } catch (error: any) {
      console.error('Failed to assign role:', error);
      setError(`Failed to assign role: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserSuspension = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await permissionService.suspendRole(userId, user!.uid, 'Admin action');
      setSuccess('Successfully suspended user');
      loadInitialData(); // Refresh the user list
    } catch (error: any) {
      console.error('Failed to suspend user:', error);
      setError(`Failed to suspend user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserReactivation = async (userId: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await permissionService.reactivateRole(userId, user!.uid);
      setSuccess('Successfully reactivated user');
      loadInitialData(); // Refresh the user list
    } catch (error: any) {
      console.error('Failed to reactivate user:', error);
      setError(`Failed to reactivate user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getUserRoleInfo = (user: any) => {
    const role = user.currentRole;
    return {
      role: role.role,
      isActive: role.isActive,
      assignedAt: role.assignedAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
      assignedBy: role.assignedBy,
    };
  };

  if (!canManageUsers) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">You don&apos;t have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Role Assignment Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign User Role</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2',
                'focus:ring-blue-500 focus:border-transparent'
              )}
            >
              <option value="">Select a user</option>
              {users.map((userItem) => (
                <option key={userItem.id} value={userItem.id}>
                  {userItem.email} ({userItem.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2',
                'focus:ring-blue-500 focus:border-transparent'
              )}
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRoleAssignment}
              disabled={actionLoading || !selectedUserId || !selectedRole}
              className={cn(
                'w-full px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-blue-500 hover:bg-blue-600 text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {actionLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Assigning...
                </div>
              ) : (
                'Assign Role'
              )}
            </button>
          </div>
        </div>

        {/* Role Descriptions */}
        {selectedRole && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Role
            </h4>
            <div className="text-sm text-gray-600">
              {/* This could be enhanced to show detailed role permissions */}
              Assign this role to grant appropriate permissions for {selectedRole} access.
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Users in {mountainId.charAt(0).toUpperCase() + mountainId.slice(1)}
        </h3>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found in this mountain.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => {
                  const roleInfo = getUserRoleInfo(userItem);
                  const isSuspended = !roleInfo.isActive;

                  return (
                    <tr key={userItem.id} className={isSuspended ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            roleInfo.role === 'admin' && 'bg-red-100 text-red-800',
                            roleInfo.role === 'butler-ground' && 'bg-orange-100 text-orange-800',
                            roleInfo.role === 'butler-internet' && 'bg-blue-100 text-blue-800',
                            roleInfo.role === 'viewer' && 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {roleInfo.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          )}
                        >
                          {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {roleInfo.assignedAt} by {roleInfo.assignedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {isSuspended ? (
                          <button
                            onClick={() => handleUserReactivation(userItem.id)}
                            disabled={actionLoading}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserSuspension(userItem.id)}
                            disabled={actionLoading}
                            className="text-red-600 hover:text-red-900"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
