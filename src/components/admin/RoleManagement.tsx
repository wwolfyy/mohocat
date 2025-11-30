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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Management</h2>
        
        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">{message}</p>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">All Users</h3>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-600">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map((userItem) => (
               <div key={userItem.uid} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                 <div>
                   <div className="font-medium text-gray-900">{userItem.displayName}</div>
                   <div className="text-sm text-gray-600">{userItem.email}</div>
                   <div className="text-sm text-blue-600 font-medium">{userItem.role}</div>
                   <div className="text-xs text-gray-400 mt-1">
                     <strong>Firestore ID:</strong> {userItem.uid}
                   </div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex space-x-2">
                     {['admin', 'butler-ground', 'butler-internet', 'viewer'].map((role) => (
                       <button
                         key={role}
                         onClick={() => assignRole(userItem.uid, role)}
                         className={cn(
                           "px-3 py-1 rounded text-sm font-medium transition-colors",
                           userItem.role === role
                             ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                             : "bg-blue-500 text-white hover:bg-blue-600"
                         )}
                       >
                         {role}
                       </button>
                     ))}
                   </div>
                   <button
                     onClick={() => {
                       navigator.clipboard.writeText(userItem.uid);
                       setMessage('Firestore ID copied to clipboard!');
                       setTimeout(() => setMessage(''), 2000);
                     }}
                     className="w-full px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                   >
                     Copy ID
                   </button>
                 </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Role Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">admin</h4>
              <p className="text-sm text-gray-600">Full administrative access</p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>• Manage cats</li>
                <li>• Manage posts</li>
                <li>• Manage users</li>
                <li>• View analytics</li>
                <li>• Manage settings</li>
                <li>• Export data</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">butler-ground</h4>
              <p className="text-sm text-gray-600">Physical cat care management</p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>• Manage cats</li>
                <li>• Manage posts</li>
                <li>• View analytics</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">butler-internet</h4>
              <p className="text-sm text-gray-600">Digital content management</p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>• Manage posts</li>
                <li>• View analytics</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">viewer</h4>
              <p className="text-sm text-gray-600">Read-only access to public content</p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>• No special permissions</li>
                <li>• Access to public content only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}