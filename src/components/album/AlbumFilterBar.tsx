'use client';

import { useState } from 'react';
import { FaSearch, FaCat } from 'react-icons/fa';
import CatSelectorModal from '@/components/CatSelectorModal';

interface AlbumFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCatNames: string[];
  onCatNamesChange: (names: string[]) => void;
  searchPlaceholder?: string;
}

/**
 * Shared search + cat-name filter for both album pages. Owns the
 * `CatSelectorModal` (Phase A shared modal; commits on 완료). Selected cats are
 * shown in a SINGLE consolidated chip row (the old pages rendered them twice).
 * Colors follow design.md — brand/neutral, blue retired; removing a filter is
 * not destructive, so its × stays neutral (no red).
 */
export default function AlbumFilterBar({
  searchQuery,
  onSearchChange,
  selectedCatNames,
  onCatNamesChange,
  searchPlaceholder = '고양이 이름이나 설명으로 검색...',
}: AlbumFilterBarProps) {
  const [showCatSelector, setShowCatSelector] = useState(false);
  const hasCats = selectedCatNames.length > 0;

  const removeCat = (name: string) => onCatNamesChange(selectedCatNames.filter((n) => n !== name));

  return (
    <div className="mb-8">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <FaSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Cat-selector trigger */}
          <button
            type="button"
            onClick={() => setShowCatSelector(true)}
            className="flex min-h-[42px] w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm transition-colors hover:bg-gray-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <span className="text-gray-600">
              {hasCats ? '클릭하여 더 많은 고양이 추가' : '클릭하여 고양이 선택'}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-brand-600">
              <FaCat className="h-4 w-4" /> 고양이 선택
            </span>
          </button>
        </div>

        {/* Consolidated selected-cat chips (single source) */}
        {hasCats && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">필터된 고양이:</span>
            {selectedCatNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-ink ring-1 ring-brand-200"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeCat(name)}
                  className="ml-0.5 text-gray-500 transition-colors hover:text-gray-700"
                  aria-label={`${name} 필터 제거`}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => onCatNamesChange([])}
              className="text-sm text-gray-400 underline transition-colors hover:text-gray-600"
            >
              모두 지우기
            </button>
          </div>
        )}
      </div>

      <CatSelectorModal
        isOpen={showCatSelector}
        onClose={() => setShowCatSelector(false)}
        selectedTags={selectedCatNames}
        onTagsChange={onCatNamesChange}
      />
    </div>
  );
}
