'use client';

import React from 'react';

/**
 * Card grid + empty state for the admin media tagging pages. The card render
 * is a slot — the item cards (thumbnail vs player, badges, selection
 * checkbox, click wiring) stay page-owned.
 */

interface MediaGridProps<T extends { id: string }> {
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  emptyMessage: string;
}

function MediaGrid<T extends { id: string }>({
  items,
  renderCard,
  emptyMessage,
}: MediaGridProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <React.Fragment key={item.id}>{renderCard(item)}</React.Fragment>
      ))}
    </div>
  );
}

export default MediaGrid;
