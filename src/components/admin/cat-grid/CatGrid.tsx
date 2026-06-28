'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'react-datasheet-grid/dist/style.css';
import {
  DataSheetGrid,
  textColumn,
  createTextColumn,
  checkboxColumn,
  keyColumn,
  type Column,
} from 'react-datasheet-grid';
import { FiSave, FiRotateCcw } from 'react-icons/fi';
import { getCatService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { triggerCatRevalidate } from '@/lib/revalidate-client';
import { Cat } from '@/types';
import { selectColumn, type SelectOption } from './selectColumn';

/**
 * Spreadsheet-style, cell-editable grid for the `cats` collection — a second
 * view alongside the card/form editor in `/admin/cats`.
 *
 * Edits accumulate in local state; a single "전체 저장" commits every dirty cell
 * as a Firestore `writeBatch` of *per-field* `update()`s (partial, non-destructive
 * writes), then revalidates the baked public pages. Editing Firestore directly,
 * cell-by-cell with typed columns, removes the string/type drift and full-doc
 * overwrite hazards of the Sheets-import path.
 */

// --- Column option sets (values match the card/form editor) -----------------
const SEX_OPTIONS: SelectOption<string>[] = [
  { value: 'M', label: '남 (M)' },
  { value: 'F', label: '여 (F)' },
  { value: 'U', label: 'U' },
];

const STATUS_OPTIONS: SelectOption<string>[] = [
  { value: '산냥이', label: '산냥이' },
  { value: '집냥이', label: '집냥이' },
  { value: '별냥이', label: '별냥이' },
  { value: '행방불명', label: '행방불명' },
];

const DOB_CERTAINTY_OPTIONS: SelectOption<string>[] = [
  { value: 'certain', label: 'Certain' },
  { value: 'uncertain', label: 'Uncertain' },
];

const NEUTERED_OPTIONS: SelectOption<boolean>[] = [
  { value: true, label: 'O (중성화됨)' },
  { value: false, label: 'X (중성화 안됨)' },
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
  date_of_birth: '출생연도는 비워둘 수 없습니다',
  isNeutered: '중성화 여부는 비워둘 수 없습니다',
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
  const catService = getCatService();
  const { user } = useAuth();

  const [originalCats, setOriginalCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catService.getAllCats();
      setOriginalCats(data);
      setRows(data);
    } catch (err: any) {
      setError('고양이 데이터를 불러오지 못했습니다: ' + err.message);
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

  const columns = useMemo<Column<Cat>[]>(
    () =>
      FIELD_SPECS.map(({ key, title, width, base }) => ({
        ...keyColumn<Cat>(key, base),
        id: key as string,
        title,
        minWidth: width,
        basis: width,
        grow: 0,
        shrink: 0,
      })),
    []
  );

  const cellClassName = useCallback(
    ({ rowData, columnId }: { rowData: unknown; rowIndex: number; columnId?: string }) => {
      const cat = rowData as Cat;
      if (columnId && invalidCells.has(`${cat.id}::${columnId}`)) {
        return 'dsg-cell-invalid';
      }
      return undefined;
    },
    [invalidCells]
  );

  const handleSave = async () => {
    setNotice(null);
    setError(null);

    if (errorMessages.length > 0) {
      // Block-save-until-clean: surfaced via both the banner below and the
      // inline red cell highlights.
      return;
    }
    if (updates.length === 0) {
      setNotice('변경사항이 없습니다.');
      return;
    }

    try {
      setSaving(true);
      await catService.batchUpdateCats(updates);
      // Refresh the baked home/adoption pages so edits show immediately.
      await triggerCatRevalidate(user);
      const count = updates.length;
      await loadCats();
      setNotice(`${count}마리의 정보를 저장했어요.`);
    } catch (err: any) {
      setError('저장에 실패했습니다: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setRows(originalCats);
    setNotice(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <style jsx global>{`
        .dsg-cell-invalid {
          background-color: #fee2e2 !important;
        }
      `}</style>

      {/* Save bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-sm text-gray-600">
          셀을 직접 수정한 뒤 <span className="font-medium">전체 저장</span>을 누르면 변경된 칸만
          저장돼요.
          {dirtyCount > 0 && (
            <span className="ml-2 text-amber-700 font-medium">미저장 {dirtyCount}행</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDiscard}
            disabled={saving || dirtyCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRotateCcw /> 되돌리기
          </button>
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || errorMessages.length > 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                저장 중...
              </>
            ) : (
              <>
                <FiSave /> 전체 저장
              </>
            )}
          </button>
        </div>
      </div>

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
          <p className="font-medium mb-1">아래 항목을 먼저 수정해 주세요 (빨간 칸):</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {Array.from(new Set(errorMessages)).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <DataSheetGrid<Cat>
        value={rows}
        onChange={(newRows) => setRows(newRows)}
        columns={columns}
        cellClassName={cellClassName}
        rowKey="id"
        lockRows
        height={600}
      />
    </div>
  );
}
