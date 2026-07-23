'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authHeader } from '@/lib/auth/authHeader';
import { cn } from '@/utils/cn';
import { adminStrings } from '@/constants/adminStrings';

const { roleManagement: t, roleLabels } = adminStrings;

export default function RoleManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load all users and their roles
  const loadUsers = async () => {
    if (!user) return;

    setLoading(true);
    setMessage(t.messages.loadingAll);

    try {
      // Use the working API that fetches all users from Firestore
      const usersCollection = await fetch('/api/admin/get-all-user-permissions-client', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader(user)),
        },
      });

      if (!usersCollection.ok) {
        const errorData = await usersCollection.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`${usersCollection.status} - ${errorData.error || 'No error details'}`);
      }

      const allUsers = await usersCollection.json();
      setUsers(allUsers);
      setMessage(t.messages.loaded(allUsers.length));
    } catch (error) {
      console.error('Failed to load users:', error);
      setMessage(t.messages.loadError((error as Error).message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  const assignRole = async (userId: string, role: string) => {
    if (!user) return;

    try {
      setMessage(t.messages.assigning(roleLabels[role] ?? role));
      // Admin-SDK route (Tier 1 write migration): the role write + its
      // permission_logs audit entry happen server-side in one transaction.
      const res = await fetch('/api/admin/assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader(user)),
        },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`${res.status} - ${errorData.error || 'No error details'}`);
      }
      setMessage(t.messages.assigned(roleLabels[role] ?? role));
      loadUsers();
    } catch (error) {
      console.error('Failed to assign role:', error);
      setMessage(t.messages.assignFailed);
    }
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">{adminStrings.common.loginRequired}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t.heading}</h2>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">{message}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-gray-600">{t.loadingUsers}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Admin Users Section */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🛡️ {roleLabels.admin}
                  <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    {users.filter((u) => u.role === 'admin').length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t.sections.admin.desc}</p>
              </div>
              <div className="space-y-3">
                {users
                  .filter((u) => u.role === 'admin')
                  .map((userItem) => (
                    <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                  ))}
                {users.filter((u) => u.role === 'admin').length === 0 && (
                  <p className="text-sm text-gray-400 italic">{t.sections.admin.empty}</p>
                )}
              </div>
            </div>

            {/* Butler Ground Section */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🧹 {roleLabels['butler-ground']}
                  <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    {users.filter((u) => u.role === 'butler-ground').length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t.sections.ground.desc}</p>
              </div>
              <div className="space-y-3">
                {users
                  .filter((u) => u.role === 'butler-ground')
                  .map((userItem) => (
                    <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                  ))}
                {users.filter((u) => u.role === 'butler-ground').length === 0 && (
                  <p className="text-sm text-gray-400 italic">{t.sections.ground.empty}</p>
                )}
              </div>
            </div>

            {/* Butler Internet Section */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  💻 {roleLabels['butler-internet']}
                  <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    {users.filter((u) => u.role === 'butler-internet').length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t.sections.internet.desc}</p>
              </div>
              <div className="space-y-3">
                {users
                  .filter((u) => u.role === 'butler-internet')
                  .map((userItem) => (
                    <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                  ))}
                {users.filter((u) => u.role === 'butler-internet').length === 0 && (
                  <p className="text-sm text-gray-400 italic">{t.sections.internet.empty}</p>
                )}
              </div>
            </div>

            {/* Viewer Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  👀 {roleLabels.viewer}
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                    {
                      users.filter(
                        (u) => !['admin', 'butler-ground', 'butler-internet'].includes(u.role)
                      ).length
                    }
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t.sections.viewer.desc}</p>
              </div>
              <div className="space-y-3">
                {users
                  .filter((u) => !['admin', 'butler-ground', 'butler-internet'].includes(u.role))
                  .map((userItem) => (
                    <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                  ))}
                {users.filter(
                  (u) => !['admin', 'butler-ground', 'butler-internet'].includes(u.role)
                ).length === 0 && (
                  <p className="text-sm text-gray-400 italic">{t.sections.viewer.empty}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// User Card Component for reusability
const UserCard = ({
  userItem,
  assignRole,
}: {
  userItem: any;
  assignRole: (uid: string, role: string) => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
    <div>
      <div className="font-medium text-gray-900">{userItem.displayName}</div>
      <div className="text-sm text-gray-600 font-mono">{userItem.email}</div>
      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
        <span>ID: {userItem.uid.substring(0, 8)}...</span>
        <button
          onClick={() => navigator.clipboard.writeText(userItem.uid)}
          className="hover:text-brand-500 transition-colors"
          title={t.copyId}
        >
          📋
        </button>
      </div>
    </div>
    <div className="flex flex-wrap gap-2 justify-end">
      {['admin', 'butler-ground', 'butler-internet', 'viewer'].map((role) => (
        <button
          key={role}
          onClick={() => assignRole(userItem.uid, role)}
          disabled={userItem.role === role}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border',
            userItem.role === role
              ? 'bg-brand-100 text-brand-800 border-brand-200 cursor-default font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400 hover:text-ink hover:bg-brand-50'
          )}
        >
          {roleLabels[role] ?? role}
        </button>
      ))}
    </div>
  </div>
);
