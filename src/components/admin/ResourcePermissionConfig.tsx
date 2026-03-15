'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Permission } from '@/types/permissions';

const ALL_PERMISSIONS: Permission[] = [
  'view-post-feeding',
  'view-post-butler',
  'view-photo',
  'view-video',
];

// Content Pages/Resources to protect
const RESOURCES = [
  { id: 'about', label: '소개' },
  { id: 'contact', label: '동참' },
  { id: 'photo_album', label: '사진첩' },
  { id: 'video_album', label: '동영상' },
  { id: 'adoption', label: '입양홍보' },
  { id: 'announcements', label: '공지' },
  { id: 'faq', label: 'FAQ' },
  { id: 'butler_stream', label: '급식현황' },
  { id: 'butler_talk', label: '집사톡' },
];

interface ResourceConfigData {
  resources: Record<string, Permission[]>;
}

export default function ResourcePermissionConfig() {
  const [config, setConfig] = useState<ResourceConfigData | null>(null);
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
      const response = await fetch('/api/admin/resource-permissions');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      const data = await response.json();
      // Initialize if empty
      if (!data.resources) data.resources = {};
      setConfig(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (resourceId: string, permission: Permission) => {
    if (!config) return;

    const currentPermissions = config.resources[resourceId] || [];
    const hasPermission = currentPermissions.includes(permission);

    let newPermissions: Permission[];
    if (hasPermission) {
      newPermissions = currentPermissions.filter((p) => p !== permission);
    } else {
      newPermissions = [...currentPermissions, permission];
    }

    setConfig({
      ...config,
      resources: {
        ...config.resources,
        [resourceId]: newPermissions,
      },
    });
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/resource-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resources: config.resources }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSuccessMessage('Resource permissions saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return <div className="p-8 text-center text-gray-500">Loading resource configuration...</div>;
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Resource Access Control</h2>
            <p className="text-sm text-gray-500">
              Configure required permissions to access specific pages.
            </p>
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
                  Page / Resource
                </th>
                {ALL_PERMISSIONS.map((perm) => (
                  <th
                    key={perm}
                    className="px-4 py-3 font-medium text-gray-900 text-center uppercase tracking-wider"
                  >
                    {perm}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {RESOURCES.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {resource.label}
                    <div className="text-xs text-gray-400 font-normal">{resource.id}</div>
                  </td>
                  {ALL_PERMISSIONS.map((permission) => {
                    const isChecked = config.resources[resource.id]?.includes(permission);
                    return (
                      <td
                        key={`${resource.id}-${permission}`}
                        className="px-4 py-3 text-center border-l border-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={() => handleToggle(resource.id, permission)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          title={`${resource.label} requires ${permission}`}
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
