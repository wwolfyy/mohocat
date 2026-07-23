'use client';

import React from 'react';

/**
 * Numbered pagination controls with a 7-page sliding window, as used by the
 * admin media tagging pages. Renders nothing when there is a single page.
 */

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  /** Odd number of page buttons shown (tag-images: 7, tag-videos: 5). */
  windowSize?: number;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
  windowSize = 7,
}) => {
  if (totalPages <= 1) return null;

  const half = Math.floor(windowSize / 2);

  return (
    <div className="flex justify-center items-center mt-6 gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {previousLabel}
      </button>

      {Array.from({ length: Math.min(windowSize, totalPages) }, (_, i) => {
        let pageNum;
        if (totalPages <= windowSize) {
          pageNum = i + 1;
        } else if (currentPage <= half + 1) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - half) {
          pageNum = totalPages - (windowSize - 1) + i;
        } else {
          pageNum = currentPage - half + i;
        }

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-2 text-sm border rounded ${
              currentPage === pageNum
                ? 'bg-brand text-ink border-brand font-bold'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </button>
    </div>
  );
};

export default PaginationBar;
