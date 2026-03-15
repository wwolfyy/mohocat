'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { NavigationBarLogout } from '@/components/auth/NavigationBarLogout';
import { NavigationBarLogin } from '@/components/auth/NavigationBarLogin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface NavItemProps {
  href: string;
  resourceId: string;
  label: string;
  mobile?: boolean;
  onClick?: () => void;
  canAccessResource: (resourceId: string) => boolean;
  isLoading: boolean;
}

const NavItem = ({
  href,
  resourceId,
  label,
  mobile,
  onClick,
  canAccessResource,
  isLoading,
}: NavItemProps) => {
  const hasAccess = canAccessResource(resourceId);

  // While loading, we might want to default to disabled or loading state to prevent flickering?
  // Or just default to hidden? User request implies "greyed out".
  // Let's treat loading as "no access yet" -> disabled.
  const isDisabled = isLoading || !hasAccess;

  const baseClasses = mobile
    ? 'block px-4 py-2 text-sm border-b border-gray-100'
    : 'transition-colors cursor-pointer';

  const activeClasses = mobile
    ? 'text-gray-700 hover:bg-gray-100'
    : 'text-gray-600 hover:text-gray-900';

  const disabledClasses = mobile
    ? 'text-gray-300 cursor-not-allowed bg-gray-50'
    : 'text-gray-300 cursor-not-allowed';

  const handleClick = (e: React.MouseEvent) => {
    if (isDisabled) {
      e.preventDefault();
      // Optional: alert("You do not have permission to access this page.");
      return;
    }
    if (onClick) onClick();
  };

  if (isDisabled) {
    return (
      <span className={cn(baseClasses, disabledClasses)} onClick={handleClick}>
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(baseClasses, activeClasses)} onClick={onClick}>
      {label}
    </Link>
  );
};

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { canAccessResource, isLoading } = useResourceAccess();

  // Separator component
  const Separator = () => <span className="mx-3 text-gray-400">•</span>;

  return (
    <>
      {' '}
      {/* Desktop navigation */}
      <nav className="hidden md:flex items-center">
        <NavItem
          href="/pages/about"
          resourceId="about"
          label="소개"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/contact"
          resourceId="contact"
          label="동참"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/photo-album"
          resourceId="photo_album"
          label="사진첩"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/video-album"
          resourceId="video_album"
          label="동영상"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/adoption"
          resourceId="adoption"
          label="입양홍보"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/announcements"
          resourceId="announcements"
          label="공지"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/faq"
          resourceId="faq"
          label="FAQ"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <span className="mx-3 text-gray-400">|</span>

        {/* Protected items that were previously hidden */}
        <NavItem
          href="/pages/butler_stream"
          resourceId="butler_stream"
          label="급식현황"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />
        <Separator />
        <NavItem
          href="/pages/butler_talk"
          resourceId="butler_talk"
          label="집사톡"
          canAccessResource={canAccessResource}
          isLoading={isLoading}
        />

        {/* Login/Logout Buttons */}
        <div className="ml-6">
          <NavigationBarLogin />
          <NavigationBarLogout />
        </div>
      </nav>
      {/* Mobile hamburger button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            'w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300',
            'text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200'
          )}
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          {!isMobileMenuOpen ? (
            <svg
              className="block h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          ) : (
            <svg
              className="block h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>

        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              <NavItem
                href="/pages/about"
                resourceId="about"
                label="소개"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/contact"
                resourceId="contact"
                label="동참"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/photo-album"
                resourceId="photo_album"
                label="사진첩"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/video-album"
                resourceId="video_album"
                label="동영상"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/adoption"
                resourceId="adoption"
                label="입양홍보"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/announcements"
                resourceId="announcements"
                label="공지"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/faq"
                resourceId="faq"
                label="FAQ"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />

              <div className="border-t border-gray-300 my-1"></div>
              <div className="px-4 py-1 text-xs text-gray-500 font-medium">인증 회원 전용</div>

              <NavItem
                href="/pages/butler_stream"
                resourceId="butler_stream"
                label="급식현황"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />
              <NavItem
                href="/pages/butler_talk"
                resourceId="butler_talk"
                label="집사톡"
                mobile
                onClick={() => setIsMobileMenuOpen(false)}
                canAccessResource={canAccessResource}
                isLoading={isLoading}
              />

              <div className="border-t border-gray-300 my-1"></div>
              <div className="px-4 py-1 text-xs text-gray-500 font-medium">인증</div>
              <div className="px-4 py-2">
                <NavigationBarLogin />
              </div>
              <div className="border-t border-gray-300 my-1"></div>
              <div className="px-4 py-1 text-xs text-gray-500 font-medium">계정</div>
              <div className="px-4 py-2">
                <NavigationBarLogout />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
