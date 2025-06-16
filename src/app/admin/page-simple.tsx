'use client';

import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🐱 Mountain Cats Admin</h1>
          <p className="text-gray-600 mt-2">
            Admin Dashboard - Basic Implementation
          </p>
        </div>

        {/* Simple Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Images</p>
                <p className="text-3xl font-bold text-gray-900">--</p>
              </div>
              <div className="text-2xl">🖼️</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Videos</p>
                <p className="text-3xl font-bold text-gray-900">--</p>
              </div>
              <div className="text-2xl">🎥</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-yellow-200 bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Untagged Images</p>
                <p className="text-3xl font-bold text-gray-900">--</p>
              </div>
              <div className="text-2xl">🏷️</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Untagged Videos</p>
                <p className="text-3xl font-bold text-gray-900">--</p>
              </div>
              <div className="text-2xl">📹</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/admin/tag-images"
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-start space-x-3">
                <div className="text-xl">🖼️</div>
                <div>
                  <h3 className="font-medium text-gray-900">Tag Images</h3>
                  <p className="text-sm text-gray-600 mt-1">Tag untagged images with cat names</p>
                </div>
              </div>
            </a>

            <a
              href="/admin/tag-videos"
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-start space-x-3">
                <div className="text-xl">🎥</div>
                <div>
                  <h3 className="font-medium text-gray-900">Tag Videos</h3>
                  <p className="text-sm text-gray-600 mt-1">Tag untagged videos with cat names</p>
                </div>
              </div>
            </a>

            <a
              href="/admin/cats"
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-start space-x-3">
                <div className="text-xl">🐱</div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Cats</h3>
                  <p className="text-sm text-gray-600 mt-1">Add, edit, or remove cat profiles</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500"
          >
            ← Back to Main Site
          </a>
        </div>
      </div>
    </div>
  );
}
