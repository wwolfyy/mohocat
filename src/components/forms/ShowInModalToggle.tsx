'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * 모달 팝업 설정 — the switch that makes a post pop up on a visitor's first page
 * view of the session.
 *
 * Extracted from `NewAnnouncementForm` (2026-07-31) when 입양홍보 gained the same
 * toggle. Copying the ~50 lines of switch markup into the second form is exactly
 * the copy-renamed-twin pattern the complexity-retirement track spent six phases
 * undoing, and this one has real behaviour attached (it decides what a visitor
 * sees before anything else on the site).
 *
 * 📌 **Only one popup shows per visit.** Several posts may carry the flag —
 * across both 공지사항 and 입양홍보 — and `AnnouncementModalContext` picks the most
 * recently updated. So turning this on is a request, not a guarantee, which is
 * what the helper line below means to convey.
 */

interface ShowInModalToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Names the post kind, e.g. '이 공지사항을' / '이 입양홍보 글을'. */
  description: string;
  disabled?: boolean;
}

const ShowInModalToggle = ({
  checked,
  onChange,
  description,
  disabled = false,
}: ShowInModalToggleProps) => (
  <div className="border-t pt-4">
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-lg font-semibold">모달 팝업 설정</label>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      <div className="flex items-center">
        <div
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex h-8 w-14 cursor-pointer items-center rounded-full transition-colors duration-200',
            checked ? 'bg-yellow-500' : 'bg-gray-300',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          role="switch"
          aria-checked={checked}
        >
          {/* Toggle circle */}
          <span
            className={cn(
              'inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200',
              checked ? 'translate-x-8' : 'translate-x-1'
            )}
          />
          {/* ON label */}
          <span
            className={cn(
              'absolute left-1.5 text-xs font-medium transition-opacity duration-200',
              checked ? 'text-white opacity-100' : 'text-gray-500 opacity-0'
            )}
            style={{ fontSize: '10px' }}
          >
            ON
          </span>
          {/* OFF label */}
          <span
            className={cn(
              'absolute right-1.5 text-xs font-medium transition-opacity duration-200',
              !checked ? 'text-gray-600 opacity-100' : 'text-white opacity-0'
            )}
            style={{ fontSize: '10px' }}
          >
            OFF
          </span>
        </div>
        <label className="ml-3 text-sm font-medium text-gray-700">팝업으로 표시</label>
      </div>
    </div>
  </div>
);

export default ShowInModalToggle;
