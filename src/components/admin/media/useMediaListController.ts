'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseDate } from '@/utils/parse-date';

/**
 * Shared read-side controller for the admin media tagging pages
 * (tag-images / tag-videos): list load, selection, tag/date filtering,
 * sorting, and pagination. The pages stay page-owned and keep their own
 * write paths; this hook only converges the twinned read-side machinery.
 *
 * Date values coming out of Firestore are normalized through the shared
 * `parseDate` (`@/utils/parse-date`) instead of the per-page
 * Firebase-Timestamp unwrapping blobs.
 */

export interface MediaListItem {
  id: string;
  tags?: string[];
  createdTime?: unknown;
}

export interface UseMediaListControllerOptions<T extends MediaListItem, SortKey extends string> {
  /** Fetch the full item list (service-layer call). Must be referentially stable. */
  load: () => Promise<T[]>;
  /** Page-specific error copy for a failed load. */
  loadErrorMessage: (message: string) => string;
  /** Date backing a given sort key; null when the item has none. */
  sortDate: (item: T, sortBy: SortKey) => Date | null;
  defaultSortBy: SortKey;
  initialPerPage?: number;
  /**
   * With the date-range filter enabled, exclude items whose creation date is
   * missing or unparseable (tag-videos semantics). When false, such items fall
   * back to the without-timestamp toggle (tag-images semantics).
   */
  dateFilterExcludesUndated?: boolean;
}

export function useMediaListController<T extends MediaListItem, SortKey extends string>({
  load,
  loadErrorMessage,
  sortDate,
  defaultSortBy,
  initialPerPage = 25,
  dateFilterExcludesUndated = false,
}: UseMediaListControllerOptions<T, SortKey>) {
  // List state
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Filter state
  const [showTagged, setShowTagged] = useState(true);
  const [showUntagged, setShowUntagged] = useState(true);
  const [showWithoutTimestamp, setShowWithoutTimestamp] = useState(true);
  const [enableDateFilter, setEnableDateFilterState] = useState(false);
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortKey>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPageState] = useState(initialPerPage);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await load());
    } catch (err) {
      console.error('Error loading media items:', err);
      setError(loadErrorMessage(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [load, loadErrorMessage]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Derived tag buckets (stat cards + filter labels)
  const taggedItems = useMemo(() => items.filter((i) => i.tags && i.tags.length > 0), [items]);
  const untaggedItems = useMemo(() => items.filter((i) => !i.tags || i.tags.length === 0), [items]);
  const withoutTimestampCount = useMemo(() => items.filter((i) => !i.createdTime).length, [items]);

  // Filter + sort
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const hasTags = item.tags && item.tags.length > 0;
        if (!hasTags && !showUntagged) return false;
        if (hasTags && !showTagged) return false;

        if (!item.createdTime && !showWithoutTimestamp) return false;

        if (enableDateFilter) {
          const created = item.createdTime ? parseDate(item.createdTime) : null;
          const createdDay = created ? created.toISOString().split('T')[0] : null;
          if (createdDay) {
            if (dateFilterFrom && createdDay < dateFilterFrom) return false;
            if (dateFilterTo && createdDay > dateFilterTo) return false;
          } else if (dateFilterExcludesUndated) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aValue = sortDate(a, sortBy);
        const bValue = sortDate(b, sortBy);

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return sortOrder === 'asc' ? 1 : -1;
        if (bValue === null) return sortOrder === 'asc' ? -1 : 1;

        if (isNaN(aValue.getTime()) && isNaN(bValue.getTime())) return 0;
        if (isNaN(aValue.getTime())) return sortOrder === 'asc' ? 1 : -1;
        if (isNaN(bValue.getTime())) return sortOrder === 'asc' ? -1 : 1;

        const comparison = aValue.getTime() - bValue.getTime();
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [
    items,
    showTagged,
    showUntagged,
    showWithoutTimestamp,
    enableDateFilter,
    dateFilterFrom,
    dateFilterTo,
    sortBy,
    sortOrder,
    sortDate,
    dateFilterExcludesUndated,
  ]);

  // Pagination derived values
  const totalPages = Math.ceil(filteredItems.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, endIndex),
    [filteredItems, startIndex, endIndex]
  );

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    showTagged,
    showUntagged,
    showWithoutTimestamp,
    enableDateFilter,
    dateFilterFrom,
    dateFilterTo,
    sortBy,
    sortOrder,
  ]);

  const setPerPage = useCallback((value: number) => {
    setPerPageState(value);
    setCurrentPage(1);
  }, []);

  // Disabling the date filter clears its bounds
  const setEnableDateFilter = useCallback((enabled: boolean) => {
    setEnableDateFilterState(enabled);
    if (!enabled) {
      setDateFilterFrom('');
      setDateFilterTo('');
    }
  }, []);

  // Selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setShowBatchActions(next.size > 0);
      return next;
    });
  }, []);

  // Adds all currently-visible (filtered) items to the selection; no deselect
  const selectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => new Set([...Array.from(prev), ...filteredItems.map((i) => i.id)]));
    setShowBatchActions(true);
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowBatchActions(false);
  }, []);

  return {
    // list
    items,
    setItems,
    loading,
    error,
    setError,
    reload,
    // derived buckets
    taggedItems,
    untaggedItems,
    withoutTimestampCount,
    filteredItems,
    paginatedItems,
    // selection
    selectedIds,
    toggleSelection,
    selectAllFiltered,
    clearSelection,
    showBatchActions,
    // filters
    showTagged,
    setShowTagged,
    showUntagged,
    setShowUntagged,
    showWithoutTimestamp,
    setShowWithoutTimestamp,
    enableDateFilter,
    setEnableDateFilter,
    dateFilterFrom,
    setDateFilterFrom,
    dateFilterTo,
    setDateFilterTo,
    // sort
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    // pagination
    currentPage,
    setCurrentPage,
    perPage,
    setPerPage,
    totalPages,
    startIndex,
    endIndex,
  };
}

export type MediaListController<T extends MediaListItem, SortKey extends string> = ReturnType<
  typeof useMediaListController<T, SortKey>
>;
