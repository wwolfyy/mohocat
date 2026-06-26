'use client';

import Image from 'next/image';
import type { Cat } from '@/types';
import { cn } from '@/utils/cn';

interface CatCircleGridProps {
  cats: Cat[];
  onSelect: (cat: Cat) => void;
  /** Number of leading thumbnails to mark `priority` for eager loading. */
  priorityCount?: number;
}

/**
 * Shared circular cat-card grid — round avatar + name in a centered wrap layout,
 * each card a button that opens the cat's detail. Used by both the map's
 * `CatGallery` and the public 입양홍보 (adoption) gallery so the look stays in one
 * place.
 */
export default function CatCircleGrid({ cats, onSelect, priorityCount = 0 }: CatCircleGridProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {cats.map((cat, index) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat)}
          className={cn(
            'group w-28 cursor-pointer rounded-xl p-1 transition-transform duration-200 hover:scale-110',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
          )}
        >
          <div
            className={cn(
              'aspect-square overflow-hidden rounded-full border-4 border-white shadow-lg',
              'ring-0 ring-brand-300 transition-all duration-200 group-hover:ring-4'
            )}
          >
            <Image
              src={cat.thumbnailUrl}
              alt={cat.name}
              width={112}
              height={112}
              className="h-full w-full object-cover"
              sizes="112px"
              quality={85}
              priority={index < priorityCount}
            />
          </div>
          <div className="mt-1.5 w-full truncate text-center text-sm font-medium text-gray-700">
            {cat.name}
          </div>
        </button>
      ))}
    </div>
  );
}
