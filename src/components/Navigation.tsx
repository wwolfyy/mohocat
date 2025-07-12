"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/utils/cn";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle click on disabled items
  const handleDisabledClick = (e: React.MouseEvent, feature: string) => {
    e.preventDefault();
    alert(`${feature} 기능은 아직 구현되지 않았습니다.`);
  };

  return (
    <>
      {" "}
      {/* Desktop navigation */}
      <nav className="hidden md:flex items-center">
        <Link
          href="/pages/about"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          소개
        </Link>
        <span className="mx-3 text-gray-400">•</span>
        <Link
          href="/pages/contact"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          동참
        </Link>
        <span className="mx-3 text-gray-400">•</span>
        <Link
          href="/pages/photo-album"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          사진첩
        </Link>
        <span className="mx-3 text-gray-400">•</span>
        <Link
          href="/pages/video-album"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          동영상
        </Link>
        <span className="mx-3 text-gray-400">•</span>
        <span
          onClick={(e) => handleDisabledClick(e, "입양홍보")}
          className="text-gray-400 cursor-not-allowed opacity-60"
        >
          입양홍보
        </span>
        <span className="mx-3 text-gray-400">•</span>
        <Link
          href="/pages/announcements"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          공지
        </Link>
        <span className="mx-3 text-gray-400">•</span>
        <Link
          href="/pages/faq"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          FAQ
        </Link>
        <span className="mx-3 text-gray-400">|</span>
        <Link
          href="/pages/butler_stream"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          급식현황
        </Link>
        <span className="mx-3 text-gray-400">•</span>
        <Link
          href="/pages/butler_talk"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          집사톡
        </Link>
      </nav>
      {/* Mobile hamburger button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
            "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
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
              aria-hidden="true"
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
              aria-hidden="true"
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
              <Link
                href="/pages/about"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                소개
              </Link>
              <Link
                href="/pages/contact"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                동참
              </Link>
              <Link
                href="/pages/photo-album"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                사진첩
              </Link>
              <Link
                href="/pages/video-album"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                동영상
              </Link>
              <span
                onClick={(e) => {
                  handleDisabledClick(e, "입양홍보");
                  setIsMobileMenuOpen(false);
                }}
                className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed opacity-60 border-b border-gray-100"
              >
                입양홍보
              </span>
              <Link
                href="/pages/announcements"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                공지
              </Link>
              <Link
                href="/pages/faq"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <div className="border-t border-gray-300 my-1"></div>
              <div className="px-4 py-1 text-xs text-gray-500 font-medium">인증 회원 전용</div>
              <Link
                href="/pages/butler_stream"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                급식현황
              </Link>
              <Link
                href="/pages/butler_talk"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                집사톡
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
