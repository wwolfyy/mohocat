'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import type { MediaListController, MediaListItem } from './useMediaListController';

/**
 * Filter/selection/sort/pagination control panel for the admin media tagging
 * pages. Binds directly to a `useMediaListController` instance; all copy comes
 * in via `labels` so the two pages keep their own wording.
 */

export interface MediaFilterBarLabels {
  title: string;
  showTagged: (n: number) => string;
  showUntagged: (n: number) => string;
  byCreatedDate: string;
  showWithoutTimestamp: (n: number) => string;
  applyDateRange: string;
  from: string;
  to: string;
  selectionDisplay: string;
  selectAll: string;
  clearSelection: (n: number) => string;
  sortBy: string;
  newestFirst: string;
  oldestFirst: string;
  perPage: string;
  showingRange: (start: number, end: number, total: number) => string;
}

export interface SortOption<SortKey extends string> {
  value: SortKey;
  label: string;
}

interface MediaFilterBarProps<T extends MediaListItem, SortKey extends string> {
  controller: MediaListController<T, SortKey>;
  labels: MediaFilterBarLabels;
  sortOptions: SortOption<SortKey>[];
  perPageOptions?: number[];
}

function MediaFilterBar<T extends MediaListItem, SortKey extends string>({
  controller,
  labels,
  sortOptions,
  perPageOptions = [10, 25, 50, 100],
}: MediaFilterBarProps<T, SortKey>) {
  const c = controller;

  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{labels.title}</h3>

      {/* Tag filters */}
      <div className="flex gap-6 mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={c.showTagged}
            onChange={(e) => c.setShowTagged(e.target.checked)}
            className="w-4 h-4 accent-brand-500 rounded mr-2"
          />
          <span className="text-sm text-gray-700">{labels.showTagged(c.taggedItems.length)}</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={c.showUntagged}
            onChange={(e) => c.setShowUntagged(e.target.checked)}
            className="w-4 h-4 accent-brand-500 rounded mr-2"
          />
          <span className="text-sm text-gray-700">
            {labels.showUntagged(c.untaggedItems.length)}
          </span>
        </label>
      </div>

      {/* Date filters */}
      <div className="border-t border-gray-300 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{labels.byCreatedDate}</h4>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={c.showWithoutTimestamp}
              onChange={(e) => c.setShowWithoutTimestamp(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
            />
            <span className="text-sm text-gray-700">
              {labels.showWithoutTimestamp(c.withoutTimestampCount)}
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={c.enableDateFilter}
              onChange={(e) => c.setEnableDateFilter(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
            />
            <span className="text-sm text-gray-700">{labels.applyDateRange}</span>
          </label>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${c.enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>
              {labels.from}
            </label>
            <input
              type="date"
              value={c.dateFilterFrom}
              onChange={(e) => c.setDateFilterFrom(e.target.value)}
              disabled={!c.enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                c.enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${c.enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>
              {labels.to}
            </label>
            <input
              type="date"
              value={c.dateFilterTo}
              onChange={(e) => c.setDateFilterTo(e.target.value)}
              disabled={!c.enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                c.enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Selection and display controls */}
      <div className="border-t border-gray-300 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{labels.selectionDisplay}</h4>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm" onClick={c.selectAllFiltered}>
            {labels.selectAll}
          </Button>
          {c.selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={c.clearSelection}>
              {labels.clearSelection(c.selectedIds.size)}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">{labels.sortBy}</label>
            <select
              value={c.sortBy}
              onChange={(e) => c.setSortBy(e.target.value as SortKey)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={c.sortOrder}
              onChange={(e) => c.setSortOrder(e.target.value as 'asc' | 'desc')}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="desc">{labels.newestFirst}</option>
              <option value="asc">{labels.oldestFirst}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">{labels.perPage}</label>
            <select
              value={c.perPage}
              onChange={(e) => c.setPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            {labels.showingRange(
              c.startIndex + 1,
              Math.min(c.endIndex, c.filteredItems.length),
              c.filteredItems.length
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaFilterBar;
