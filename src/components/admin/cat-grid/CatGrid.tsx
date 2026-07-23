'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'react-datasheet-grid/dist/style.css';
import {
  DataSheetGrid,
  textColumn,
  createTextColumn,
  checkboxColumn,
  keyColumn,
  type CellProps,
  type Column,
  type SimpleColumn,
} from 'react-datasheet-grid';
import { FiSave, FiRotateCcw, FiSearch, FiFilter } from 'react-icons/fi';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { getCatService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { triggerPublicRevalidate } from '@/lib/revalidate-client';
import { Cat } from '@/types';
import {
  filterCats,
  sortCats,
  getUniqueLocations,
  getUniqueStatuses,
  getUniqueGenders,
  getUniqueBirthYears,
  EMPTY_CAT_FILTERS,
  type CatFilterState,
} from '@/utils/cat-filters';
import { selectColumn, type SelectOption } from './selectColumn';
import { adminStrings } from '@/constants/adminStrings';
import Button from '@/components/ui/Button';
import { useMountain } from '@/components/MountainProvider';

const { catGrid: t, common } = adminStrings;

/**
 * Spreadsheet-style, cell-editable grid for the `cats` collection — a second
 * view alongside the card/form editor in `/admin/cats`.
 *
 * Edits accumulate in local state; a single "전체 저장" commits every dirty cell
 * as a Firestore `writeBatch` of *per-field* `update()`s (partial, non-destructive
 * writes), then revalidates the baked public pages. Editing Firestore directly,
 * cell-by-cell with typed columns, removes the string/type drift and full-doc
 * overwrite hazards of the Sheets-import path.
 *
 * Filter / sort / select / bulk-edit are **view-layer** concerns: the full `rows`
 * array (keyed by `id`) stays the source of truth and the save path is unchanged.
 * A transient `__selected` flag is baked into the displayed rows for the checkbox
 * column and stripped before any write.
 */

type GridRow = Cat & { __selected?: boolean };

// --- Column option sets (values match the card/form editor) -----------------
const SEX_OPTIONS: SelectOption<string>[] = [
  { value: 'M', label: '남 (M)' },
  { value: 'F', label: '여 (F)' },
  { value: 'U', label: 'U' },
];

const STATUS_OPTIONS: SelectOption<string>[] = [
  { value: '산냥이', label: '산냥이' },
  { value: '쉼터냥이', label: '쉼터냥이' },
  { value: '집냥이', label: '집냥이' },
  { value: '별냥이', label: '별냥이' },
  { value: '행방불명', label: '행방불명' },
];

const DOB_CERTAINTY_OPTIONS: SelectOption<string>[] = [
  { value: 'certain', label: t.options.certain },
  { value: 'uncertain', label: t.options.uncertain },
];

const NEUTERED_OPTIONS: SelectOption<boolean>[] = [
  { value: true, label: 'O (중성화됨)' },
  { value: false, label: 'X (중성화 안됨)' },
];

const ADOPTABLE_OPTIONS: SelectOption<boolean>[] = [
  { value: true, label: '입양 가능' },
  { value: false, label: '입양 대상 아님' },
];

// A plain integer column for the birth *year*: `intColumn` formats with a
// thousands separator ("2,016"), which reads wrong for a year.
const yearColumn = createTextColumn<number | null>({
  alignRight: true,
  parseUserInput: (value) => {
    const n = parseInt(value.trim(), 10);
    return Number.isNaN(n) ? null : n;
  },
  formatBlurredInput: (value) => (value == null ? '' : String(value)),
  formatInputOnFocus: (value) => (value == null ? '' : String(value)),
});

// --- Field metadata ---------------------------------------------------------
type FieldType = 'string' | 'int' | 'neutered' | 'checkbox';

interface FieldSpec {
  key: keyof Cat;
  title: string;
  width: number;
  type: FieldType;
  base: Column<any>;
}

// `isNeutered` and `date_of_birth` are mandatory: a dirty edit may not *clear*
// them (that would write `undefined`/blank). They may stay empty on rows the
// user never touches — an untouched field is never part of a patch, so it never
// reaches a write. `ignoreUndefinedProperties` stays off, by design.
const MANDATORY_BLANK_MESSAGE: Partial<Record<keyof Cat, string>> = {
  date_of_birth: t.mandatory.dobBlank,
  isNeutered: t.mandatory.neuteredBlank,
};

const FIELD_SPECS: FieldSpec[] = [
  { key: 'name', title: '이름', width: 120, type: 'string', base: textColumn },
  { key: 'alt_name', title: '별명', width: 120, type: 'string', base: textColumn },
  { key: 'sex', title: '성별', width: 100, type: 'string', base: selectColumn(SEX_OPTIONS) },
  { key: 'status', title: '상태', width: 110, type: 'string', base: selectColumn(STATUS_OPTIONS) },
  { key: 'date_of_birth', title: '출생연도', width: 100, type: 'int', base: yearColumn },
  {
    key: 'dob_certainty',
    title: '출생 정확도',
    width: 120,
    type: 'string',
    base: selectColumn(DOB_CERTAINTY_OPTIONS),
  },
  {
    key: 'isNeutered',
    title: '중성화',
    width: 130,
    type: 'neutered',
    base: selectColumn(NEUTERED_OPTIONS),
  },
  { key: 'dwelling', title: '현재 거주지', width: 130, type: 'string', base: textColumn },
  { key: 'prev_dwelling', title: '이전 거주지', width: 130, type: 'string', base: textColumn },
  { key: 'thumbnailUrl', title: '썸네일 URL', width: 220, type: 'string', base: textColumn },
  { key: 'description', title: '설명', width: 240, type: 'string', base: textColumn },
  { key: 'character', title: '성격', width: 200, type: 'string', base: textColumn },
  { key: 'sickness', title: '건강/질병', width: 200, type: 'string', base: textColumn },
  { key: 'parents', title: '부모', width: 130, type: 'string', base: textColumn },
  { key: 'offspring', title: '자녀', width: 130, type: 'string', base: textColumn },
  { key: 'note', title: '메모', width: 220, type: 'string', base: textColumn },
  { key: 'adoptable', title: '입양가능', width: 90, type: 'checkbox', base: checkboxColumn },
];

const FIELD_TYPES = FIELD_SPECS.reduce(
  (acc, { key, type }) => {
    acc[key] = type;
    return acc;
  },
  {} as Record<keyof Cat, FieldType>
);

// --- Bulk edit ---------------------------------------------------------------
type BulkEditor = 'select' | 'neutered' | 'adoptable' | 'number' | 'locations';

interface BulkFieldSpec {
  key: keyof Cat;
  label: string;
  editor: BulkEditor;
  options?: SelectOption<any>[];
}

const BULK_FIELDS: BulkFieldSpec[] = [
  { key: 'status', label: '상태', editor: 'select', options: STATUS_OPTIONS },
  { key: 'dwelling', label: '현재 거주지', editor: 'locations' },
  { key: 'prev_dwelling', label: '이전 거주지', editor: 'locations' },
  { key: 'isNeutered', label: '중성화', editor: 'neutered', options: NEUTERED_OPTIONS },
  { key: 'adoptable', label: '입양가능', editor: 'adoptable', options: ADOPTABLE_OPTIONS },
  { key: 'sex', label: '성별', editor: 'select', options: SEX_OPTIONS },
  { key: 'dob_certainty', label: '출생 정확도', editor: 'select', options: DOB_CERTAINTY_OPTIONS },
  { key: 'date_of_birth', label: '출생연도', editor: 'number' },
];

/** Convert the bulk-toolbar's raw string input into the field's typed value. */
function coerceBulkValue(spec: BulkFieldSpec, raw: string): { ok: boolean; value?: unknown } {
  if (raw === '') return { ok: false };
  switch (spec.editor) {
    case 'select':
    case 'locations':
      return { ok: true, value: raw };
    case 'neutered':
    case 'adoptable':
      return { ok: true, value: raw === 'true' };
    case 'number': {
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? { ok: false } : { ok: true, value: n };
    }
    default:
      return { ok: false };
  }
}

// --- Selection checkbox (gutter) cell ---------------------------------------
interface SelectionColumnData {
  toggle: (id: string) => void;
}

function SelectionCell({ rowData, columnData }: CellProps<GridRow, SelectionColumnData>) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
    >
      <input
        type="checkbox"
        checked={!!rowData.__selected}
        onChange={() => columnData.toggle(rowData.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={t.selectRow}
      />
    </div>
  );
}

// --- Row diff / validation (operates on the full `rows`, unaffected by view) -
interface CatUpdate {
  id: string;
  updates: Partial<Cat>;
}

interface RowAnalysis {
  /** `${id}::${field}` keys of cells that fail validation. */
  invalidCells: Set<string>;
  errorMessages: string[];
  /** Per-row partial patches for rows that are dirty *and* valid. */
  updates: CatUpdate[];
  dirtyCount: number;
}

/**
 * Diff each editable row against its loaded original, producing per-field
 * patches (only changed fields), the set of invalid cells, and human-readable
 * error messages. Pure — drives both the live cell highlighting and the Save.
 */
function analyzeRows(rows: Cat[], originalById: Map<string, Cat>): RowAnalysis {
  const invalidCells = new Set<string>();
  const errorMessages: string[] = [];
  const updates: CatUpdate[] = [];
  let dirtyCount = 0;

  for (const row of rows) {
    const original = originalById.get(row.id);
    if (!original) continue; // grid is edit-only (lockRows); ignore unknown rows

    const patch: Record<string, unknown> = {};
    let rowInvalid = false;
    const label = row.name || row.id;

    for (const spec of FIELD_SPECS) {
      const key = spec.key;
      const o = original[key];
      const r = row[key];

      switch (FIELD_TYPES[key]) {
        case 'string': {
          const os = o == null ? '' : String(o);
          const rs = r == null ? '' : String(r);
          if (os !== rs) patch[key] = rs;
          break;
        }
        case 'int': {
          const on = o == null ? null : o;
          const rn = r == null ? null : r;
          if (on !== rn) {
            if (rn === null) {
              invalidCells.add(`${row.id}::${key}`);
              errorMessages.push(`${label} · ${MANDATORY_BLANK_MESSAGE[key]}`);
              rowInvalid = true;
            } else {
              patch[key] = rn;
            }
          }
          break;
        }
        case 'neutered': {
          const ob = o == null ? undefined : o;
          const rb = r == null ? undefined : r;
          if (ob !== rb) {
            if (rb === undefined) {
              invalidCells.add(`${row.id}::${key}`);
              errorMessages.push(`${label} · ${MANDATORY_BLANK_MESSAGE[key]}`);
              rowInvalid = true;
            } else {
              patch[key] = rb;
            }
          }
          break;
        }
        case 'checkbox': {
          const ob = o ?? false;
          const rb = r ?? false;
          if (ob !== rb) patch[key] = rb;
          break;
        }
      }
    }

    const hasPatch = Object.keys(patch).length > 0;
    if (hasPatch || rowInvalid) dirtyCount++;
    if (hasPatch && !rowInvalid) {
      updates.push({ id: row.id, updates: patch as Partial<Cat> });
    }
  }

  return { invalidCells, errorMessages, updates, dirtyCount };
}

export default function CatGrid() {
  const mountainId = useMountain();
  const catService = getCatService(mountainId);
  const { user } = useAuth();

  const [originalCats, setOriginalCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // View state (filter / sort / selection / bulk-edit)
  const [filters, setFilters] = useState<CatFilterState>(EMPTY_CAT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<keyof Cat | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<keyof Cat>(BULK_FIELDS[0].key);
  const [bulkValue, setBulkValue] = useState('');

  const loadCats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catService.getAllCats();
      setOriginalCats(data);
      setRows(data);
    } catch (err: any) {
      setError(t.loadFailed(err.message));
    } finally {
      setLoading(false);
    }
  }, [catService]);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  const originalById = useMemo(
    () => new Map(originalCats.map((cat) => [cat.id, cat])),
    [originalCats]
  );

  const { invalidCells, errorMessages, updates, dirtyCount } = useMemo(
    () => analyzeRows(rows, originalById),
    [rows, originalById]
  );

  // Unique values for the filter dropdowns (shared util; same as card view).
  const uniqueStatuses = useMemo(() => getUniqueStatuses(rows), [rows]);
  const uniqueLocations = useMemo(() => getUniqueLocations(rows), [rows]);
  const uniqueGenders = useMemo(() => getUniqueGenders(rows), [rows]);
  const uniqueBirthYears = useMemo(() => getUniqueBirthYears(rows), [rows]);

  // Filter → sort → bake the transient selection flag for display.
  const displayedRows = useMemo<GridRow[]>(() => {
    const filtered = filterCats(rows, filters);
    const sorted = sortKey ? sortCats(filtered, sortKey, sortOrder) : filtered;
    return sorted.map((cat) => ({ ...cat, __selected: selectedIds.has(cat.id) }));
  }, [rows, filters, sortKey, sortOrder, selectedIds]);

  const displayedIds = useMemo(() => displayedRows.map((r) => r.id), [displayedRows]);
  const allDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selectedIds.has(id));

  // Selection handlers (stable: use functional setState).
  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = displayedIds.length > 0 && displayedIds.every((id) => next.has(id));
      if (allSelected) {
        displayedIds.forEach((id) => next.delete(id));
      } else {
        displayedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [displayedIds]);

  const handleSort = useCallback((key: keyof Cat) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortOrder('asc');
      return key;
    });
  }, []);

  // Editable columns with clickable, sortable headers.
  const columns = useMemo<Column<GridRow>[]>(
    () =>
      FIELD_SPECS.map(({ key, title, width, base }) => ({
        ...keyColumn<GridRow>(key as keyof GridRow, base),
        id: key as string,
        title: (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSort(key);
            }}
            title={t.sortHint}
            aria-label={`${title} — ${t.sortHint}`}
            className="flex items-center gap-1 w-full font-medium hover:text-brand-700"
          >
            <span className="truncate">{title}</span>
            {/* Persistent affordance: a faded sort glyph marks every sortable
                column; the active column shows a solid directional arrow. */}
            <span className="ml-auto shrink-0">
              {sortKey === key ? (
                sortOrder === 'asc' ? (
                  <FaSortUp size={12} className="text-brand-600" />
                ) : (
                  <FaSortDown size={12} className="text-brand-600" />
                )
              ) : (
                <FaSort size={12} className="text-gray-400" />
              )}
            </span>
          </button>
        ),
        minWidth: width,
        basis: width,
        grow: 0,
        shrink: 0,
      })),
    [sortKey, sortOrder, handleSort]
  );

  // Selection checkbox in the gutter column (replaces the row-number gutter).
  const gutterColumn: SimpleColumn<GridRow, SelectionColumnData> = {
    basis: 44,
    minWidth: 44,
    component: SelectionCell as (props: CellProps<GridRow, SelectionColumnData>) => JSX.Element,
    columnData: { toggle: toggleRow },
    title: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input
          type="checkbox"
          checked={allDisplayedSelected}
          onChange={toggleSelectAll}
          aria-label={t.selectAll}
        />
      </div>
    ),
  };

  const cellClassName = useCallback(
    ({ rowData, columnId }: { rowData: unknown; rowIndex: number; columnId?: string }) => {
      const cat = rowData as GridRow;
      if (columnId && invalidCells.has(`${cat.id}::${columnId}`)) {
        return 'dsg-cell-invalid';
      }
      return undefined;
    },
    [invalidCells]
  );

  // Grid edits come back as the displayed subset; merge by id into the full set.
  const handleGridChange = useCallback((newRows: GridRow[]) => {
    const byId = new Map(newRows.map((r) => [r.id, r]));
    setRows((prev) =>
      prev.map((r) => {
        const edited = byId.get(r.id);
        if (!edited) return r;
        const { __selected, ...rest } = edited;
        return rest as Cat;
      })
    );
  }, []);

  const bulkSpec = BULK_FIELDS.find((b) => b.key === bulkField)!;
  const bulkReady = selectedIds.size > 0 && coerceBulkValue(bulkSpec, bulkValue).ok;

  const applyBulkEdit = () => {
    const { ok, value } = coerceBulkValue(bulkSpec, bulkValue);
    if (!ok || selectedIds.size === 0) return;
    setRows((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? ({ ...r, [bulkSpec.key]: value } as Cat) : r))
    );
    setNotice(null);
  };

  const handleSave = async () => {
    setNotice(null);
    setError(null);

    if (errorMessages.length > 0) {
      // Block-save-until-clean: surfaced via both the banner below and the
      // inline red cell highlights.
      return;
    }
    if (updates.length === 0) {
      setNotice(t.noChanges);
      return;
    }

    try {
      setSaving(true);
      await catService.batchUpdateCats(updates);
      // Refresh the baked home/adoption pages so edits show immediately.
      await triggerPublicRevalidate(user);
      const count = updates.length;
      await loadCats();
      setNotice(t.saved(count));
    } catch (err: any) {
      setError(t.saveFailed(err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setRows(originalCats);
    setNotice(null);
    setError(null);
  };

  const clearFilters = () => {
    setFilters(EMPTY_CAT_FILTERS);
    setSortKey(null);
    setSortOrder('asc');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div>
      <style jsx global>{`
        .dsg-cell-invalid {
          background-color: #fee2e2 !important;
        }
        /* Tint the whole header row (brand-100) so it reads as a header, with a
           slightly stronger bottom border for a spreadsheet feel. */
        .dsg-cell-header {
          background-color: #fef9c3 !important;
          border-bottom: 2px solid #fde047 !important;
        }
      `}</style>

      {/* Save bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-sm text-gray-600">
          {t.editHintPre}
          <span className="font-medium">{t.saveAll}</span>
          {t.editHintPost}
          {dirtyCount > 0 && (
            <span className="ml-2 text-amber-700 font-medium">{t.unsavedRows(dirtyCount)}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleDiscard}
            disabled={saving || dirtyCount === 0}
            className="gap-2"
          >
            <FiRotateCcw /> {t.discard}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || errorMessages.length > 0}
            className="gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ink"></div>
                {common.saving}
              </>
            ) : (
              <>
                <FiSave /> {t.saveAll}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
          />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <FiFilter /> {t.filterToggle}
        </Button>
        <div className="text-sm text-gray-500 flex items-center">
          {t.count(displayedRows.length, rows.length)}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FilterSelect
              label={t.filters.status}
              value={filters.statusFilter}
              onChange={(v) => setFilters({ ...filters, statusFilter: v })}
              options={uniqueStatuses.map((s) => ({ value: s, label: s }))}
            />
            <FilterSelect
              label={t.filters.location}
              value={filters.locationFilter}
              onChange={(v) => setFilters({ ...filters, locationFilter: v })}
              options={uniqueLocations.map((l) => ({ value: l, label: l }))}
            />
            <FilterSelect
              label={t.filters.gender}
              value={filters.genderFilter}
              onChange={(v) => setFilters({ ...filters, genderFilter: v })}
              options={uniqueGenders.map((g) => ({
                value: g,
                label: g === 'M' ? t.filters.male : g === 'F' ? t.filters.female : g,
              }))}
            />
            <FilterSelect
              label={t.filters.birthYear}
              value={filters.birthYearFilter}
              onChange={(v) => setFilters({ ...filters, birthYearFilter: v })}
              options={uniqueBirthYears.map((y) => ({
                value: y.toString(),
                label: t.filters.yearLabel(y),
              }))}
            />
            <FilterSelect
              label={t.filters.neutered}
              value={filters.neuteredFilter}
              onChange={(v) => setFilters({ ...filters, neuteredFilter: v })}
              options={[
                { value: 'true', label: t.filters.neuteredYes },
                { value: 'false', label: t.filters.neuteredNo },
                { value: 'unknown', label: t.filters.neuteredUnknown },
              ]}
            />
            <FilterSelect
              label={t.filters.adoptable}
              value={filters.adoptableFilter}
              onChange={(v) => setFilters({ ...filters, adoptableFilter: v })}
              options={[
                { value: 'true', label: t.filters.adoptableYes },
                { value: 'false', label: t.filters.adoptableNo },
              ]}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              {t.clearFilters}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk-edit toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-lg flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{t.bulk.selected(selectedIds.size)}</span>
          <span className="text-sm text-gray-500">·</span>
          <span className="text-sm text-gray-600">{t.bulk.field}</span>
          <select
            value={bulkField}
            onChange={(e) => {
              setBulkField(e.target.value as keyof Cat);
              setBulkValue('');
            }}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {BULK_FIELDS.map((b) => (
              <option key={b.key as string} value={b.key as string}>
                {b.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">{t.bulk.value}</span>
          <BulkValueEditor
            spec={bulkSpec}
            value={bulkValue}
            onChange={setBulkValue}
            locations={uniqueLocations}
          />
          <Button onClick={applyBulkEdit} disabled={!bulkReady} size="sm">
            {t.bulk.apply}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>
            {t.bulk.deselect}
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 text-green-800 rounded text-sm">
          {notice}
        </div>
      )}

      {errorMessages.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
          <p className="font-medium mb-1">{t.fixFirst}</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {Array.from(new Set(errorMessages)).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <DataSheetGrid<GridRow>
        value={displayedRows}
        onChange={handleGridChange}
        columns={columns}
        gutterColumn={gutterColumn}
        cellClassName={cellClassName}
        rowKey="id"
        lockRows
        height={600}
      />
    </div>
  );
}

// --- Small presentational helpers -------------------------------------------
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        <option value="">{t.all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BulkValueEditor({
  spec,
  value,
  onChange,
  locations,
}: {
  spec: BulkFieldSpec;
  value: string;
  onChange: (value: string) => void;
  locations: string[];
}) {
  const baseClass =
    'px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';

  if (spec.editor === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.bulk.yearPlaceholder}
        min={1990}
        max={2030}
        className={`${baseClass} w-28`}
      />
    );
  }

  if (spec.editor === 'locations') {
    const listId = `bulk-loc-${spec.key as string}`;
    return (
      <>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          list={listId}
          placeholder={t.bulk.locationPlaceholder}
          className={`${baseClass} w-44`}
        />
        <datalist id={listId}>
          {locations.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </>
    );
  }

  // select / neutered / adoptable — all driven by spec.options
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
      <option value="">{t.bulk.selectPlaceholder}</option>
      {(spec.options ?? []).map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
