'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PermissionService } from '@/services/permission-service';
import { RoleAssignmentService } from '@/services/role-assignment-service';
import { cn } from '@/utils/cn';

export default function RoleManagement() {
  const { user } = useAuth();
  const [roleAssignmentService] = useState(() => new RoleAssignmentService());
  const [permissionService] = useState(() => new PermissionService());

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load all users and their roles
  const loadUsers = async () => {
    if (!user) return;

    setLoading(true);
    setMessage('Loading all users...');

    try {
      console.log('=== FETCHING ALL USERS FROM FIRESTORE ===');

      // Use the working API that fetches all users from Firestore
      const usersCollection = await fetch('/api/admin/get-all-user-permissions-client', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!usersCollection.ok) {
        const errorData = await usersCollection.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to load users: ${usersCollection.status} - ${errorData.error || 'No error details'}`);
      }

      const allUsers = await usersCollection.json();
      console.log('Users loaded from API:', allUsers);
      setUsers(allUsers);
      setMessage(`Loaded ${allUsers.length} users from Firestore`);

    } catch (error) {
      console.error('Failed to load users:', error);
      setMessage(`Error loading users: ${(error as Error).message}`);
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
      setMessage(`Assigning ${role} role...`);
      await roleAssignmentService.assignSpecificRole(userId, role, user.uid, 'geyang');
      setMessage(`Role ${role} assigned successfully!`);
      loadUsers();
    } catch (error) {
      console.error('Failed to assign role:', error);
      setMessage('Failed to assign role - check console for details');
    }
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">Please log in to manage roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">{message}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Admin Users Section */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🛡️ Admin Users
                  <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    {users.filter(u => u.role === 'admin').length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Full administrative access. Manage all aspects of the application.
                </p>
              </div>
              <div className="space-y-3">
                {users.filter(u => u.role === 'admin').map(userItem => (
                  <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                ))}
                {users.filter(u => u.role === 'admin').length === 0 && (
                  <p className="text-sm text-gray-400 italic">No admin users found.</p>
                )}
              </div>
            </div>

            {/* Butler Ground Section */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🧹 Butler (Ground)
                  <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    {users.filter(u => u.role === 'butler-ground').length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Physical cat care management. Can manage cats and posts.
                </p>
              </div>
              <div className="space-y-3">
                {users.filter(u => u.role === 'butler-ground').map(userItem => (
                  <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                ))}
                {users.filter(u => u.role === 'butler-ground').length === 0 && (
                  <p className="text-sm text-gray-400 italic">No ground butlers found.</p>
                )}
              </div>
            </div>

            {/* Butler Internet Section */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  💻 Butler (Internet)
                  <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    {users.filter(u => u.role === 'butler-internet').length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Digital content management. Can manage posts and view analytics.
                </p>
              </div>
              <div className="space-y-3">
                {users.filter(u => u.role === 'butler-internet').map(userItem => (
                  <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                ))}
                {users.filter(u => u.role === 'butler-internet').length === 0 && (
                  <p className="text-sm text-gray-400 italic">No internet butlers found.</p>
                )}
              </div>
            </div>

            {/* Viewer Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  👀 Viewers
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                    {users.filter(u => !['admin', 'butler-ground', 'butler-internet'].includes(u.role)).length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Read-only access to public content.
                </p>
              </div>
              <div className="space-y-3">
                {users.filter(u => !['admin', 'butler-ground', 'butler-internet'].includes(u.role)).map(userItem => (
                  <UserCard key={userItem.uid} userItem={userItem} assignRole={assignRole} />
                ))}
                {users.filter(u => !['admin', 'butler-ground', 'butler-internet'].includes(u.role)).length === 0 && (
                  <p className="text-sm text-gray-400 italic">No viewers found.</p>
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
const UserCard = ({ userItem, assignRole }: { userItem: any, assignRole: (uid: string, role: string) => void }) => (
  <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
    <div>
      <div className="font-medium text-gray-900">{userItem.displayName}</div>
      <div className="text-sm text-gray-600 font-mono">{userItem.email}</div>
      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
        <span>ID: {userItem.uid.substring(0, 8)}...</span>
        <button
          onClick={() => navigator.clipboard.writeText(userItem.uid)}
          className="hover:text-blue-500 transition-colors"
          title="Copy full ID"
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
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border",
            userItem.role === role
              ? "bg-blue-100 text-blue-700 border-blue-200 cursor-default font-bold"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
          )}
        >
          {role}
        </button>
      ))}
    </div>
  </div>
);