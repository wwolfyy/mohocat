import { useState, useMemo, useCallback } from 'react';

/**
 * Shared filtering for the photo / video album pages: a free-text search over
 * description + tags, plus a set of selected cat-name tags. Both `CatImage` and
 * `CatVideo` satisfy the `Filterable` shape, so one hook serves both pages
 * (previously this logic was duplicated verbatim in each page).
 */
interface Filterable {
  description?: string;
  tags: string[];
}

export function useMediaFilter<T extends Filterable>(items: T[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatNames, setSelectedCatNames] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = items;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.description?.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (selectedCatNames.size > 0) {
      result = result.filter((item) => item.tags.some((tag) => selectedCatNames.has(tag)));
    }

    return result;
  }, [items, searchQuery, selectedCatNames]);

  const removeCatFilter = useCallback((catName: string) => {
    setSelectedCatNames((prev) => {
      const next = new Set(prev);
      next.delete(catName);
      return next;
    });
  }, []);

  const clearCatFilter = useCallback(() => setSelectedCatNames(new Set()), []);

  return {
    searchQuery,
    setSearchQuery,
    selectedCatNames,
    setSelectedCatNames,
    filtered,
    removeCatFilter,
    clearCatFilter,
  };
}
