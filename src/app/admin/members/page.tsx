'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';
import RoleManagement from '@/components/admin/RoleManagement';
import PermissionDebug from '@/components/admin/PermissionDebug';
import RolePermissionConfig from '@/components/admin/RolePermissionConfig';
import ResourcePermissionConfig from '@/components/admin/ResourcePermissionConfig'; // Added import
import ContactManagement from '@/components/admin/ContactManagement';
import Card from '@/components/ui/Card';
import { adminStrings } from '@/constants/adminStrings';

const MemberManagementPage = () => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'roles' | 'permissions' | 'contacts' | 'debug'
  >('users');

  return (
    <div className="p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{adminStrings.members.title}</h1>
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-brand" />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'users'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {adminStrings.members.tabs.users}
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'roles'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {adminStrings.members.tabs.roles}
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'permissions'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {adminStrings.members.tabs.permissions}
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'debug'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {adminStrings.members.tabs.debug}
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'contacts'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {adminStrings.members.tabs.contacts}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <RoleManagement />}

      {activeTab === 'roles' && <RolePermissionConfig />}

      {activeTab === 'permissions' && <ResourcePermissionConfig />}

      {activeTab === 'contacts' && <ContactManagement />}

      {activeTab === 'debug' && (
        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            🔧 {adminStrings.members.debugToolTitle}
          </h3>
          <PermissionDebug />
        </Card>
      )}
    </div>
  );
};

export default MemberManagementPage;
