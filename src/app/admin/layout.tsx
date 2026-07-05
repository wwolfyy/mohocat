'use client';

import { usePathname } from 'next/navigation';
import AdminAuth from '@/components/admin/AdminAuth';
import { cn } from '@/utils/cn';
import { adminStrings } from '@/constants/adminStrings';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Helper function to determine if a path is active
  const isActivePath = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  // Tailwind classes for a nav item (active / inactive / disabled).
  const getNavItemClasses = (path: string, isDisabled = false) =>
    cn(
      'px-4 py-2 rounded transition-colors',
      isDisabled
        ? 'text-gray-400 opacity-60 cursor-not-allowed'
        : isActivePath(path)
          ? 'bg-brand-50 text-ink font-medium'
          : 'text-gray-500 hover:bg-gray-50 cursor-pointer'
    );

  // Handle click on disabled items
  const handleDisabledClick = (e: React.MouseEvent, feature: string) => {
    e.preventDefault();
    alert(adminStrings.nav.notImplemented(feature));
  };

  return (
    <AdminAuth>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1200px] mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-8">
              <nav className="flex gap-4">
                <a href="/admin" className={getNavItemClasses('/admin')}>
                  {adminStrings.nav.dashboard}
                </a>
                <a
                  href="/admin/app-management"
                  className={getNavItemClasses('/admin/app-management')}
                >
                  {adminStrings.nav.appManagement}
                </a>
                <a href="/admin/cats" className={getNavItemClasses('/admin/cats')}>
                  {adminStrings.nav.cats}
                </a>
                <a href="/admin/points" className={getNavItemClasses('/admin/points')}>
                  {adminStrings.nav.feedingStations}
                </a>
                <span
                  className={getNavItemClasses('/admin/winter-houses', true)}
                  onClick={(e) => handleDisabledClick(e, adminStrings.nav.winterHouses)}
                >
                  {adminStrings.nav.winterHouses}
                </span>
                <a href="/admin/tag-images" className={getNavItemClasses('/admin/tag-images')}>
                  {adminStrings.nav.photos}
                </a>
                <a href="/admin/tag-videos" className={getNavItemClasses('/admin/tag-videos')}>
                  {adminStrings.nav.videos}
                </a>
                <a href="/admin/posts" className={getNavItemClasses('/admin/posts')}>
                  {adminStrings.nav.posts}
                </a>
                <a href="/admin/members" className={getNavItemClasses('/admin/members')}>
                  {adminStrings.nav.members}
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </AdminAuth>
  );
}
