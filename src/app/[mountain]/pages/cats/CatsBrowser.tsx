'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import type { Cat } from '@/types';
import {
  filterCats,
  sortCats,
  getUniqueLocations,
  getUniqueGenders,
  getUniqueBirthYears,
  EMPTY_CAT_FILTERS,
  type CatFilterState,
} from '@/utils/cat-filters';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import CatInfo from '@/components/CatInfo';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';

/**
 * 냥이들 — public "browse all cats" island.
 *
 * The cat list + a `dwelling`-id → point-title map are read server-side and
 * passed in; this owns the interactive layer only: search / filter, the
 * 별냥이·행방불명 "전체 보기" toggle, the responsive render (card grid on mobile,
 * data table on desktop, one filter bar + data source), and the `CatInfo`
 * detail modal. Filtering / sorting reuse the shared `@/utils/cat-filters`
 * helpers so this view matches the admin Cat Management predicate exactly.
 *
 * A cat's modal is addressable as `?cat=<id>` (PROJECT_PLAN §10c), so one cat
 * can be linked to directly — the modal had no URL of any kind before.
 */

// Statuses hidden by default (revealed by "전체 보기").
const HIDDEN_STATUSES = ['별냥이', '행방불명'];

// Query param carrying the open cat's **id**. Deliberately not the name: the
// in-content `[catmodal:이름]` token matches by name, so renaming a cat breaks
// every link to it silently — a URL people paste into KakaoTalk and keep must
// not inherit that (PROJECT_PLAN §10c C2).
const CAT_PARAM = 'cat';

/** Current location with `?cat=<id>` set, preserving any other query params. */
function catUrl(id: string): string {
  const params = new URLSearchParams(window.location.search);
  params.set(CAT_PARAM, id);
  return `${window.location.pathname}?${params.toString()}`;
}

// --- Display helpers (Korean-first) -----------------------------------------
function sexLabel(sex?: string): string {
  if (sex === 'M') return '♂ 수컷';
  if (sex === 'F') return '♀ 암컷';
  return '성별 미상';
}

function sexShort(sex?: string): string {
  if (sex === 'M') return '♂';
  if (sex === 'F') return '♀';
  return '–';
}

function birthYearLabel(cat: Cat): string {
  if (cat.date_of_birth == null) return '출생 미상';
  const approx = cat.dob_certainty === 'uncertain' ? '추정 ' : '';
  return `${approx}${cat.date_of_birth}년생`;
}

function neuteredLabel(isNeutered?: boolean): string {
  if (isNeutered === true) return '중성화 O';
  if (isNeutered === false) return '중성화 X';
  return '중성화 미상';
}

function neuteredShort(isNeutered?: boolean): string {
  if (isNeutered === true) return 'O';
  if (isNeutered === false) return 'X';
  return '?';
}

// --- Sortable table columns --------------------------------------------------
interface SortableCol {
  key: keyof Cat;
  label: string;
}

const SORT_COLUMNS: SortableCol[] = [
  { key: 'name', label: '이름' },
  { key: 'sex', label: '성별' },
  { key: 'date_of_birth', label: '출생연도' },
  { key: 'isNeutered', label: '중성화' },
  { key: 'dwelling', label: '현재 거주지' },
  { key: 'adoptable', label: '입양' },
];

/** Small brand-styled labelled select used across the filter panel. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Thumbnail with a brand-tinted placeholder for photo-less cats. */
function CatThumb({ cat, size }: { cat: Cat; size: number }) {
  const hasPhoto = !!cat.thumbnailUrl && cat.thumbnailUrl.trim() !== '';
  if (!hasPhoto) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-brand-50 text-brand-300 ring-1 ring-brand-100"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.5 }}>🐾</span>
      </div>
    );
  }
  return (
    <Image
      src={cat.thumbnailUrl}
      alt={cat.name}
      width={size}
      height={size}
      className="max-w-none rounded-lg object-cover ring-1 ring-black/5"
      style={{ width: size, height: size }}
    />
  );
}

export default function CatsBrowser({
  cats,
  dwellingNames,
}: {
  cats: Cat[];
  dwellingNames: Record<string, string>;
}) {
  const [filters, setFilters] = useState<CatFilterState>(EMPTY_CAT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sortKey, setSortKey] = useState<keyof Cat>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const deepLinkHandled = useRef(false);

  // Open the cat named by `?cat=<id>` on arrival (§10c C1).
  //
  // Read from `window.location` rather than `useSearchParams()` on purpose:
  // this page is statically prerendered (`export const revalidate`), and
  // `useSearchParams` in a client component would opt the whole route out of it.
  //
  // The param is *consumed* — stripped with `replaceState` before the modal
  // opens. The modal's own history entry then re-adds it (`historyUrl` below),
  // which is what makes closing pop back to a clean URL and back/forward behave.
  // Runs once: re-stripping while the modal is open would eat that entry.
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    const params = new URLSearchParams(window.location.search);
    const catId = params.get(CAT_PARAM);
    if (!catId) return;

    params.delete(CAT_PARAM);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);

    // Matched against the full list, not the filtered view, so a link to a
    // 별냥이 / 행방불명 cat still opens without the visitor toggling anything.
    // A link to a cat that no longer exists just lands on the list.
    const cat = cats.find((c) => c.id === catId);
    if (!cat) return;

    // ⚠️ Open on a later task, not here. Next's AppRouter re-asserts its own
    // canonical URL onto history in an effect that runs after ours (verified in
    // dev at next/dist/client/components/app-router.js). If the modal's history
    // push lands in the same commit as the strip above, that re-assert runs last
    // with a canonical URL it computed *before* the push and wipes `?cat=` right
    // back off — closing the modal then has no entry to pop and the URL desyncs.
    // Yielding once lets the router settle on the stripped URL first.
    //
    // `setTimeout`, not `requestAnimationFrame`: a shared link is very often
    // opened into a *background* tab, where rAF never fires until the tab is
    // looked at — the modal would simply not be there on arrival.
    //
    // Deliberately *not* cancelled on cleanup: this effect re-runs whenever the
    // router hands down a fresh `cats` array, and cancelling would drop the
    // pending open on the floor — the guard above then swallows the retry, so
    // the deep link would silently do nothing.
    setTimeout(() => setSelectedCat(cat), 0);
  }, [cats]);

  // Keep the open cat in step with the URL across browser back/forward.
  // `useModalLayer`'s history entry already closes the modal on **back**; this
  // covers the other direction, since only the URL knows which cat a **forward**
  // navigation is returning to.
  //
  // 📌 In practice forward currently lands on a *clean* URL rather than
  // `?cat=…`: Next's AppRouter re-asserts its canonical URL onto the entry while
  // handling the back navigation, so there is nothing for this to restore. That
  // is self-consistent (no modal, no param) and left alone deliberately — this
  // listener is what keeps it correct if that ever changes, and pairs with the
  // adopt branch in `useModalLayer` so a restore can't push a duplicate entry
  // and trap the back button.
  useEffect(() => {
    const syncFromUrl = () => {
      const catId = new URLSearchParams(window.location.search).get(CAT_PARAM);
      setSelectedCat(catId ? (cats.find((c) => c.id === catId) ?? null) : null);
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [cats]);

  // Warm the thumbnail image files into cache (no Firestore).
  useEffect(() => {
    const urls = cats.map((c) => c.thumbnailUrl).filter((u) => u && u.trim() !== '');
    if (urls.length > 0) {
      thumbnailPreloader.preloadThumbnails(urls).catch((err) => {
        console.warn('Error preloading cat thumbnails:', err);
      });
    }
  }, [cats]);

  const dwellingLabel = (id?: string): string => {
    if (!id) return '거주지 미상';
    return dwellingNames[id] || id;
  };

  // Base set: hide 별냥이/행방불명 unless "전체 보기" is on.
  const base = useMemo(
    () => (showAll ? cats : cats.filter((c) => !HIDDEN_STATUSES.includes(c.status ?? ''))),
    [cats, showAll]
  );
  const hiddenCount = useMemo(
    () => cats.filter((c) => HIDDEN_STATUSES.includes(c.status ?? '')).length,
    [cats]
  );

  // Filter dropdown options — derived from the visible base set.
  const uniqueGenders = useMemo(() => getUniqueGenders(base), [base]);
  const uniqueBirthYears = useMemo(() => getUniqueBirthYears(base), [base]);
  const uniqueLocations = useMemo(() => getUniqueLocations(base), [base]);

  const displayed = useMemo(() => {
    const filtered = filterCats(base, filters);
    return sortCats(filtered, sortKey, sortOrder);
  }, [base, filters, sortKey, sortOrder]);

  const handleSort = (key: keyof Cat) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => setFilters(EMPTY_CAT_FILTERS);
  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div>
      {/* Search + filter toggle + count */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="이름으로 검색"
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters((s) => !s)}
          className="gap-2"
        >
          <FiFilter /> 필터
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              label="성별"
              value={filters.genderFilter}
              onChange={(v) => setFilters({ ...filters, genderFilter: v })}
              options={uniqueGenders.map((g) => ({ value: g, label: sexLabel(g) }))}
            />
            <FilterSelect
              label="출생연도"
              value={filters.birthYearFilter}
              onChange={(v) => setFilters({ ...filters, birthYearFilter: v })}
              options={uniqueBirthYears.map((y) => ({ value: y.toString(), label: `${y}년생` }))}
            />
            <FilterSelect
              label="중성화"
              value={filters.neuteredFilter}
              onChange={(v) => setFilters({ ...filters, neuteredFilter: v })}
              options={[
                { value: 'true', label: '중성화 O' },
                { value: 'false', label: '중성화 X' },
                { value: 'unknown', label: '미상' },
              ]}
            />
            <FilterSelect
              label="현재 거주지"
              value={filters.locationFilter}
              onChange={(v) => setFilters({ ...filters, locationFilter: v })}
              options={uniqueLocations.map((l) => ({ value: l, label: dwellingLabel(l) }))}
            />
            <FilterSelect
              label="입양"
              value={filters.adoptableFilter}
              onChange={(v) => setFilters({ ...filters, adoptableFilter: v })}
              options={[
                { value: 'true', label: '입양 가능' },
                { value: 'false', label: '입양 대상 아님' },
              ]}
            />
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                필터 초기화
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 별냥이/행방불명 toggle */}
      {hiddenCount > 0 && (
        <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="accent-brand-500"
          />
          별냥이 · 행방불명 냥이도 보기
        </label>
      )}

      {displayed.length === 0 ? (
        <div className="rounded-xl bg-brand-50 p-8 text-center ring-1 ring-brand-100">
          <p className="text-gray-600">조건에 맞는 냥이가 없어요.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card grid */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {displayed.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className="flex flex-col rounded-xl bg-white p-3 text-left ring-1 ring-gray-100 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-2 flex justify-center">
                  <CatThumb cat={cat} size={120} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold text-gray-900">{cat.name}</span>
                  {cat.adoptable === true && (
                    <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                      입양가능
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {sexLabel(cat.sex)} · {birthYearLabel(cat)}
                </p>
                <p className="text-xs text-gray-500">{neuteredLabel(cat.isNeutered)}</p>
                <p className="truncate text-xs text-gray-500">📍 {dwellingLabel(cat.dwelling)}</p>
                {cat.sickness && cat.sickness.trim() !== '' && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">🩺 {cat.sickness}</p>
                )}
              </button>
            ))}
          </div>

          {/* Desktop: data table */}
          <div className="hidden overflow-hidden rounded-xl ring-1 ring-gray-100 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-50 text-gray-700">
                <tr>
                  <th className="w-20 px-4 py-3 font-semibold">사진</th>
                  {SORT_COLUMNS.map((col) => (
                    <th key={col.key as string} className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-brand-700"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <FaSortUp size={11} className="text-brand-600" />
                          ) : (
                            <FaSortDown size={11} className="text-brand-600" />
                          )
                        ) : (
                          <FaSort size={11} className="text-gray-300" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold">건강상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => setSelectedCat(cat)}
                    className="cursor-pointer bg-white transition hover:bg-brand-50/40"
                  >
                    <td className="px-4 py-2">
                      <CatThumb cat={cat} size={44} />
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-2 text-gray-600">{sexShort(cat.sex)}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {cat.date_of_birth == null
                        ? '–'
                        : `${cat.dob_certainty === 'uncertain' ? '~' : ''}${cat.date_of_birth}`}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{neuteredShort(cat.isNeutered)}</td>
                    <td className="px-4 py-2 text-gray-600">{dwellingLabel(cat.dwelling)}</td>
                    <td className="px-4 py-2">
                      {cat.adoptable === true ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          가능
                        </span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-2 text-gray-500">
                      <span className="line-clamp-1" title={cat.sickness || undefined}>
                        {cat.sickness && cat.sickness.trim() !== '' ? cat.sickness : '–'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedCat && (
        <Modal onClose={() => setSelectedCat(null)} size="xl" historyUrl={catUrl(selectedCat.id)}>
          <CatInfo cat={selectedCat} />
        </Modal>
      )}
    </div>
  );
}
