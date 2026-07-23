'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { getPublicMountains, getMountainConfig, getMountainName } from '@/utils/config';
import { findMountainIdByHost } from '@/lib/tenant';
import { useMountain } from '@/components/MountainProvider';

interface MountainOption {
  id: string;
  name: string;
  description: string;
}

export default function MountainSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const currentMountainId = useMountain();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selectable mountains — hidden stub tenants are routable but not listed here.
  const mountains: MountainOption[] = getPublicMountains();
  const currentMountainName = getMountainName(currentMountainId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
    }, 150); // Match animation duration
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  const handleMountainSelect = (mountainId: string) => {
    if (mountainId !== currentMountainId) {
      // On a mapped production subdomain, the other mountain is another origin —
      // link to its primary domain. On unmapped hosts (dev, Vercel preview) use
      // direct path access to the [mountain] segment instead (see middleware).
      const onMappedHost = findMountainIdByHost(window.location.host) !== null;
      const targetDomain = getMountainConfig(mountainId).domains[0];
      window.location.href =
        onMappedHost && targetDomain
          ? `${window.location.protocol}//${targetDomain}`
          : `/${mountainId}`;
    }
    handleClose();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-300 hover:shadow-md hover:scale-105 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="transition-colors duration-300">{currentMountainName}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-all duration-300 group-hover:text-brand-600 ${
            isOpen ? 'rotate-180 text-brand-600' : 'group-hover:animate-bounce-gentle'
          }`}
        />
      </button>

      {isOpen && (
        <div
          // Panel opens leftward from a left-anchored button (`right-0`). At w-72
          // the 288px panel's left edge ran off the viewport (~-31px on a phone,
          // ~-15px even on desktop) since the button's right edge is content-driven
          // (~257–273px) regardless of viewport width. w-60 keeps the left edge
          // on-screen at every width.
          className={`absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${
            isAnimating ? 'animate-dropdown-exit' : 'animate-dropdown-enter'
          }`}
        >
          <div className="py-1" role="menu" aria-orientation="vertical">
            {mountains.map((mountain, index) => (
              <button
                key={mountain.id}
                onClick={() => handleMountainSelect(mountain.id)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-all duration-200 hover:translate-x-1 hover:shadow-sm ${
                  mountain.id === currentMountainId
                    ? 'bg-brand-50 text-brand-700 border-l-2 border-brand-500'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                role="menuitem"
              >
                <div className="font-medium transition-colors duration-200">{mountain.name}</div>
                <div className="text-xs text-gray-500 mt-1 transition-colors duration-200">
                  {mountain.description}
                </div>
              </button>
            ))}
          </div>

          {mountains.length < 2 && (
            <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 italic animate-pulse-subtle">
              다른 산들을 위한 자리.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
