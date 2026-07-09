'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { MdKeyboardArrowDown } from 'react-icons/md';

interface NavDropdownProps {
  label: string;
  children: React.ReactNode;
  /** When true the trigger is greyed out and the panel cannot open. */
  disabled?: boolean;
  /** Tooltip shown on the trigger while disabled (e.g. login hint). */
  disabledTooltip?: string;
}

/**
 * Top-level navigation item that reveals a dropdown panel of links.
 * Opens on hover or click; closes on outside click, Escape, or selection.
 * Used for the grouped desktop navigation (동참 / 갤러리 / 소식 / 집사메뉴).
 */
export function NavDropdown({
  label,
  children,
  disabled = false,
  disabledTooltip,
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const openNow = () => {
    if (disabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  // Small grace period so moving the cursor from trigger to panel doesn't close it.
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  if (disabled) {
    return (
      <span
        className="flex items-center gap-0.5 cursor-not-allowed select-none text-gray-300"
        title={disabledTooltip}
        aria-disabled="true"
      >
        {label}
        <MdKeyboardArrowDown size={18} />
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        className={cn(
          'flex items-center gap-0.5 transition-colors',
          open ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
        )}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <MdKeyboardArrowDown
          size={18}
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-44 z-50 overflow-hidden',
            'bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5',
            'animate-dropdown-enter'
          )}
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
        >
          {/* Clicking any link inside selects and closes the panel. */}
          <div className="py-1" onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
