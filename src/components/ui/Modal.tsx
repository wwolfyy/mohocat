'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';
import { useModalLayer } from './useModalLayer';

/**
 * Shared modal shell for the public app. Establishes the single "warm card
 * floating over the map" theme: frosted dark backdrop, white rounded card with
 * a soft shadow, scale/fade entrance, a neutral circular ghost close button,
 * plus ESC-to-close and body scroll-lock.
 *
 * Render it conditionally (`{open && <Modal …/>}`) or drive it with `isOpen`.
 * Compose page-specific content as `children`; pass an optional `title` to get
 * the standard header row.
 */

// Kept deliberately narrow so modals float over the map without dominating it
// ("amplify the map"). Bump a size only when content genuinely needs the width.
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

export type ModalSize = keyof typeof SIZE_CLASSES;

interface ModalProps {
  /** Optional gate — when explicitly `false`, nothing renders. Defaults to open. */
  isOpen?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional header title; when present renders the standard title + close row. */
  title?: ReactNode;
  size?: ModalSize;
  /** Extra classes for the white card. */
  className?: string;
  /** Hide the floating close button (e.g. when content provides its own action row). */
  hideCloseButton?: boolean;
  /** Accessible label when no visible `title` is given. */
  ariaLabel?: string;
}

// Module-level counter so nested modals don't fight over the body scroll-lock:
// the lock is released only when the last open modal unmounts.
let scrollLockCount = 0;

export default function Modal({
  isOpen = true,
  onClose,
  children,
  title,
  size = 'md',
  className,
  hideCloseButton = false,
  ariaLabel,
}: ModalProps) {
  // Render through a portal to <body> so the modal escapes any ancestor that
  // establishes a containing block for `fixed` elements (e.g. the frosted
  // header's `backdrop-blur`), which would otherwise trap/clip it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ESC closes only the topmost overlay, and the z-index is derived from this
  // modal's depth in the shared overlay stack so nested modals stack correctly.
  const zIndex = useModalLayer(isOpen, { onEscape: onClose });

  // Lock body scroll while any modal is open.
  useEffect(() => {
    if (!isOpen) return;
    scrollLockCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex items-start justify-center overflow-y-auto py-4',
        'bg-black/50 backdrop-blur-sm animate-modal-backdrop motion-reduce:animate-none'
      )}
      style={{ zIndex }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : ariaLabel}
    >
      <div
        className={cn(
          'relative my-auto min-h-fit w-full mx-4',
          'bg-white rounded-xl shadow-xl p-6',
          'animate-modal-panel motion-reduce:animate-none',
          SIZE_CLASSES[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-xl font-bold text-gray-900 text-center mb-5 pr-10">{title}</h3>
        )}
        {!hideCloseButton && <ModalCloseButton onClose={onClose} />}
        {children}
      </div>
    </div>,
    document.body
  );
}

/** The standard neutral circular ghost close button, exported for custom layouts. */
export function ModalCloseButton({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="닫기"
      className={cn(
        'absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full',
        'bg-gray-100 text-gray-500 transition-colors duration-200',
        'hover:bg-gray-200 hover:text-gray-900',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        className
      )}
    >
      <XMarkIcon className="h-5 w-5" />
    </button>
  );
}
