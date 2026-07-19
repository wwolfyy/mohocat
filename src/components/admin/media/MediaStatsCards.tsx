'use client';

import React from 'react';

/**
 * Statistics card row for the admin media tagging pages (총 / untagged /
 * tagged / needs-date-parse). Purely presentational — the pages compute the
 * numbers and pick the accent color per card.
 */

export interface MediaStatCard {
  label: string;
  value: number;
  /** Tailwind text-color class for the value; defaults to the ink color. */
  valueClassName?: string;
  /** Optional small line under the value (e.g. "n개 처리 중..."). */
  note?: string;
}

interface MediaStatsCardsProps {
  cards: MediaStatCard[];
}

// Tailwind needs literal class names, so map the card count to its grid class.
const GRID_COLS: Record<number, string> = {
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

const MediaStatsCards: React.FC<MediaStatsCardsProps> = ({ cards }) => (
  <div className={`grid grid-cols-1 ${GRID_COLS[cards.length] ?? 'md:grid-cols-4'} gap-4 mb-6`}>
    {cards.map((card) => (
      <div key={card.label} className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">{card.label}</h3>
        <p className={`text-3xl font-bold ${card.valueClassName ?? 'text-ink'}`}>{card.value}</p>
        {card.note && <p className="text-sm text-brand-500 mt-1">{card.note}</p>}
      </div>
    ))}
  </div>
);

export default MediaStatsCards;
