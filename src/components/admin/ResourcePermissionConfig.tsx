'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authHeader } from '@/lib/auth/authHeader';
import { NAV_GATE_PERMISSIONS, Permission } from '@/types/permissions';
import Button from '@/components/ui/Button';
import { adminStrings } from '@/constants/adminStrings';

const { resourceMatrix: t, common } = adminStrings;

/**
 * Only the **view** permissions, from their single source.
 *
 * 🔑 This matrix answers "which permission does a visitor need to *see* this nav
 * item", so a write grant is a category error here. `write-own-post-butler` /
 * `write-own-post-feeding` were offered until 2026-08-03 — never selected in live
 * config, and they would have gated a link on the ability to **post** rather than
 * to **read**. The `upload-own-*` pair is absent for the same reason.
 */
const ALL_PERMISSIONS: readonly Permission[] = NAV_GATE_PERMISSIONS;

/**
 * The nav resources this matrix can gate. ⚠️ **Must track the `resourceId` props in
 * `Navigation.tsx`** — a nav item with no row here can never be configured, which is
 * how `cats` (냥이들) went unmanageable until 2026-08-03. An unlisted resource has no
 * key in the config, and `useResourceAccess` treats a missing/empty list as public.
 */
const RESOURCES = [
  { id: 'about', label: '소개' },
  { id: 'cats', label: '냥이들' },
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
  const { user } = useAuth();
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
        throw new Error(`설정을 불러오지 못했어요: ${response.statusText}`);
      }
      const data = await response.json();
      // Initialize if empty
      if (!data.resources) data.resources = {};
      setConfig(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : common.unknownError);
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
          ...(await authHeader(user)),
        },
        body: JSON.stringify({ resources: config.resources }),
      });

      if (!response.ok) {
        throw new Error(t.saveFailed);
      }

      setSuccessMessage(t.saved);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return <div className="p-8 text-center text-gray-500">{t.loading}</div>;
  }

  if (error && !config) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{common.error(error)}</p>
        <Button onClick={fetchConfig} className="mt-4">
          {common.retry}
        </Button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            {successMessage && (
              <span className="text-green-600 text-sm font-medium animate-fade-in">
                {successMessage}
              </span>
            )}
            {error && <span className="text-red-600 text-sm font-medium">{error}</span>}
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? common.saving : common.saveChanges}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  {t.resourceHeader}
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
                          className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-300 cursor-pointer"
                          title={t.requiresTitle(resource.label, permission)}
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
