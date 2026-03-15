'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Permission, Role as RoleType } from '@/types/permissions';

const ALL_PERMISSIONS: Permission[] = [
  'manage-app',
  'manage-cat',
  'manage-canteen',
  'manage-shelter',
  'manage-photo',
  'manage-video',
  'manage-posts',
  'manage-users',
  'view-post-feeding',
  'view-post-butler',
  'view-photo',
  'view-video',
];

interface RoleConfig {
  permissions: Permission[];
  description: string;
}

interface ConfigData {
  roles: Record<string, RoleConfig>;
}

export default function RolePermissionConfig() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/role-permissions');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (role: string, permission: Permission) => {
    if (!config) return;

    const currentPermissions = config.roles[role]?.permissions || [];
    const hasPermission = currentPermissions.includes(permission);

    let newPermissions: Permission[];
    if (hasPermission) {
      newPermissions = currentPermissions.filter((p) => p !== permission);
    } else {
      newPermissions = [...currentPermissions, permission];
    }

    setConfig({
      ...config,
      roles: {
        ...config.roles,
        [role]: {
          ...config.roles[role],
          permissions: newPermissions,
        },
      },
    });
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/role-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roles: config.roles }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return <div className="p-8 text-center text-gray-500">Loading configuration...</div>;
  }

  if (error && !config) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error: {error}</p>
        <button
          onClick={fetchConfig}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!config) return null;

  const roles = Object.keys(config.roles).filter((r) =>
    ['admin', 'butler-ground', 'butler-internet', 'viewer'].includes(r)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Permission Matrix</h2>
            <p className="text-sm text-gray-500">Configure which roles have which permissions.</p>
          </div>
          <div className="flex items-center gap-4">
            {successMessage && (
              <span className="text-green-600 text-sm font-medium animate-fade-in">
                {successMessage}
              </span>
            )}
            {error && <span className="text-red-600 text-sm font-medium">{error}</span>}
            <button
              onClick={saveConfig}
              disabled={saving}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-white transition-colors',
                saving
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              )}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role}
                    className="px-4 py-3 font-medium text-gray-900 text-center uppercase tracking-wider w-1/6"
                  >
                    {role === 'butler-ground'
                      ? 'butler-ground'
                      : role === 'butler-internet'
                        ? 'butler-internet'
                        : role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ALL_PERMISSIONS.map((permission) => (
                <tr key={permission} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700 font-mono">{permission}</td>
                  {roles.map((role) => {
                    const isChecked = config.roles[role]?.permissions.includes(permission);
                    return (
                      <td key={`${role}-${permission}`} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePermissionToggle(role, permission)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
