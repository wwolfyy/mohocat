'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { FaPaw } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

const STORAGE_KEY = 'mohocat:intro-card-dismissed';

/**
 * Small dismissible nudge that floats over the bottom-left of the map,
 * inviting visitors to click a cat photo. Dismissal is remembered across
 * visits via localStorage so it nudges once, not every time (redesign §1).
 */
export default function IntroCard() {
  const [visible, setVisible] = useState(false);

  // Read persisted dismissal on mount (client-only, avoids hydration mismatch).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setVisible(true);
      }
    } catch (error) {
      // localStorage can be unavailable (private mode). The card is cosmetic,
      // so degrade gracefully by showing it rather than crashing the page.
      console.error('IntroCard: unable to read dismissal state', error);
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (error) {
      // Persisting failed; dismissal still applies for this session.
      console.error('IntroCard: unable to persist dismissal state', error);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 z-30 md:bottom-6 md:left-6',
        'flex items-center gap-2.5 py-2 pl-3 pr-2',
        'rounded-full bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur-md',
        'animate-dropdown-enter'
      )}
      role="status"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-brand to-accent text-ink animate-bounce-gentle">
        <FaPaw size={14} />
      </span>
      <span className="text-sm font-semibold text-gray-800">지도의 고양이 사진을 클릭해보세요</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <MdClose size={16} />
      </button>
    </div>
  );
}
