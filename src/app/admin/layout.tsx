'use client';

import { usePathname } from 'next/navigation';
import AdminAuth from '@/components/admin/AdminAuth';
import { cn } from '@/utils/cn';

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
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-500 hover:bg-gray-50 cursor-pointer'
    );

  // Handle click on disabled items
  const handleDisabledClick = (e: React.MouseEvent, feature: string) => {
    e.preventDefault();
    alert(`${feature} 기능은 아직 구현되지 않았습니다.`);
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
                  대쉬보드
                </a>
                <a
                  href="/admin/app-management"
                  className={getNavItemClasses('/admin/app-management')}
                >
                  앱관리
                </a>
                <a href="/admin/cats" className={getNavItemClasses('/admin/cats')}>
                  고양이 관리
                </a>
                <span
                  className={getNavItemClasses('/admin/points', true)}
                  onClick={(e) => handleDisabledClick(e, '급식소 관리')}
                >
                  급식소 관리
                </span>
                <span
                  className={getNavItemClasses('/admin/winter-houses', true)}
                  onClick={(e) => handleDisabledClick(e, '겨울집 관리')}
                >
                  겨울집 관리
                </span>
                <a href="/admin/tag-images" className={getNavItemClasses('/admin/tag-images')}>
                  사진 관리
                </a>
                <a href="/admin/tag-videos" className={getNavItemClasses('/admin/tag-videos')}>
                  동영상 관리
                </a>
                <a href="/admin/posts" className={getNavItemClasses('/admin/posts')}>
                  게시물 관리
                </a>
                <a href="/admin/members" className={getNavItemClasses('/admin/members')}>
                  사용자 관리
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
