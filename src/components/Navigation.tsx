'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { NavigationBarLogout } from '@/components/auth/NavigationBarLogout';
import { NavigationBarLogin } from '@/components/auth/NavigationBarLogin';
import { NavDropdown } from '@/components/NavDropdown';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { useAuth } from '@/hooks/useAuth';

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

  // Treat loading as "no access yet" so items don't flicker enabled→disabled.
  const isDisabled = isLoading || !hasAccess;

  // Dropdown/mobile panels render block items; the desktop top-level links
  // are rendered directly in the nav, so NavItem is always a block item here.
  const baseClasses = 'block px-4 py-2 text-sm';

  const activeClasses = mobile
    ? 'text-gray-700 hover:bg-gray-100'
    : 'text-gray-700 hover:bg-gray-50';

  const disabledClasses = 'text-gray-300 cursor-not-allowed bg-gray-50';

  const handleClick = (e: React.MouseEvent) => {
    if (isDisabled) {
      e.preventDefault();
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

const CTA_CLASSES = cn(
  'rounded-lg px-4 py-2 font-bold',
  'bg-gradient-to-r from-brand to-accent text-ink',
  'shadow-sm transition-all duration-200 hover:shadow-md'
);

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { canAccessResource, isLoading } = useResourceAccess();
  const { isAuthenticated } = useAuth();
  const access = { canAccessResource, isLoading };

  const closeMobile = () => setIsMobileMenuOpen(false);

  const MobileSection = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-gray-400">
      {children}
    </div>
  );

  return (
    <>
      {/* Desktop navigation */}
      <nav className="hidden items-center gap-5 md:flex">
        <NavDropdown label="소개">
          <NavItem href="/pages/about" resourceId="about" label="산냥이와 집냥이" {...access} />
          <NavItem href="/pages/cats" resourceId="cats" label="냥이들" {...access} />
          <NavItem href="/pages/contact" resourceId="contact" label="동참" {...access} />
          <NavItem href="/pages/adoption" resourceId="adoption" label="입양홍보" {...access} />
        </NavDropdown>

        <NavDropdown label="갤러리">
          <NavItem href="/pages/photo-album" resourceId="photo_album" label="사진첩" {...access} />
          <NavItem href="/pages/video-album" resourceId="video_album" label="동영상" {...access} />
        </NavDropdown>

        <NavDropdown label="소식">
          <NavItem
            href="/pages/announcements"
            resourceId="announcements"
            label="공지"
            {...access}
          />
          <NavItem href="/pages/adoption" resourceId="adoption" label="입양홍보" {...access} />
        </NavDropdown>

        <span className="h-5 w-px bg-gray-200" aria-hidden="true" />

        {/* Priority CTA */}
        <Link href="/pages/adoption" className={CTA_CLASSES}>
          입양홍보
        </Link>

        {/* 집사메뉴 — enabled only when logged in */}
        <NavDropdown
          label="집사메뉴"
          disabled={!isAuthenticated}
          disabledTooltip="먼저 로그인 하세요"
        >
          <NavItem
            href="/pages/butler_stream"
            resourceId="butler_stream"
            label="급식현황"
            {...access}
          />
          <NavItem href="/pages/butler_talk" resourceId="butler_talk" label="집사톡" {...access} />
          <NavItem href="/pages/faq" resourceId="faq" label="FAQ" {...access} />
        </NavDropdown>

        <div className="flex items-center">
          <NavigationBarLogin />
          <NavigationBarLogout />
        </div>
      </nav>

      {/* Mobile hamburger button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            // Ghost/utility styling — no brand fill (that belongs to the 입양홍보
            // CTA); just a quiet dark icon with a faint tap-feedback wash. Keeps
            // the ~40px tap target via p-2.
            'rounded-lg p-2 text-gray-800',
            'transition-colors duration-200 hover:bg-black/5 active:bg-black/10'
          )}
          aria-expanded={isMobileMenuOpen}
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
                strokeWidth={1.5}
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
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>

        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-dropdown-enter rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              <MobileSection>동참</MobileSection>
              <NavItem
                href="/pages/about"
                resourceId="about"
                label="소개"
                mobile
                onClick={closeMobile}
                {...access}
              />
              <NavItem
                href="/pages/cats"
                resourceId="cats"
                label="냥이들"
                mobile
                onClick={closeMobile}
                {...access}
              />
              <NavItem
                href="/pages/contact"
                resourceId="contact"
                label="동참"
                mobile
                onClick={closeMobile}
                {...access}
              />
              <NavItem
                href="/pages/adoption"
                resourceId="adoption"
                label="입양홍보"
                mobile
                onClick={closeMobile}
                {...access}
              />

              <MobileSection>갤러리</MobileSection>
              <NavItem
                href="/pages/photo-album"
                resourceId="photo_album"
                label="사진첩"
                mobile
                onClick={closeMobile}
                {...access}
              />
              <NavItem
                href="/pages/video-album"
                resourceId="video_album"
                label="동영상"
                mobile
                onClick={closeMobile}
                {...access}
              />

              <MobileSection>소식</MobileSection>
              <NavItem
                href="/pages/announcements"
                resourceId="announcements"
                label="공지"
                mobile
                onClick={closeMobile}
                {...access}
              />

              <div className="px-4 py-3">
                <Link
                  href="/pages/adoption"
                  onClick={closeMobile}
                  className={cn(CTA_CLASSES, 'block text-center')}
                >
                  입양홍보
                </Link>
              </div>

              <MobileSection>집사메뉴 {!isAuthenticated && '(먼저 로그인 하세요)'}</MobileSection>
              {isAuthenticated ? (
                <>
                  <NavItem
                    href="/pages/butler_stream"
                    resourceId="butler_stream"
                    label="급식현황"
                    mobile
                    onClick={closeMobile}
                    {...access}
                  />
                  <NavItem
                    href="/pages/butler_talk"
                    resourceId="butler_talk"
                    label="집사톡"
                    mobile
                    onClick={closeMobile}
                    {...access}
                  />
                  <NavItem
                    href="/pages/faq"
                    resourceId="faq"
                    label="FAQ"
                    mobile
                    onClick={closeMobile}
                    {...access}
                  />
                </>
              ) : (
                <span className="block px-4 py-2 text-sm text-gray-300">
                  급식현황 · 집사톡 · FAQ
                </span>
              )}

              <div className="my-1 border-t border-gray-200" />
              <div className="px-4 py-2">
                <NavigationBarLogin />
              </div>
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
