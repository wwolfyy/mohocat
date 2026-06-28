'use client';

import React, { useLayoutEffect, useRef } from 'react';
import type { CellProps, Column } from 'react-datasheet-grid';

/**
 * A native-`<select>` cell for `react-datasheet-grid`.
 *
 * The grid ships text / int / checkbox columns but no select; this fills the
 * gap for the cat editor's enumerated fields. Options are keyed by
 * `String(value)`, so the same component drives both string-valued columns
 * (sex / status / dob_certainty) and the boolean `isNeutered` column without a
 * second implementation.
 */
export interface SelectOption<V> {
  value: V;
  label: string;
}

interface SelectColumnData<V> {
  options: SelectOption<V>[];
}

function SelectComponent<V>({
  rowData,
  setRowData,
  focus,
  stopEditing,
  columnData,
}: CellProps<V | null, SelectColumnData<V>>) {
  const ref = useRef<HTMLSelectElement>(null);

  // Mirror the grid's focus model: pull DOM focus into the cell when it becomes
  // active, release it when it doesn't.
  useLayoutEffect(() => {
    if (focus) {
      ref.current?.focus();
    } else {
      ref.current?.blur();
    }
  }, [focus]);

  const currentKey = rowData === null || rowData === undefined ? '' : String(rowData);

  return (
    <select
      ref={ref}
      tabIndex={-1}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        paddingLeft: 8,
        paddingRight: 4,
        fontSize: 14,
        cursor: focus ? 'pointer' : 'default',
        // Only the focused cell should swallow pointer events; otherwise a
        // single click on an inactive cell would open the dropdown instead of
        // selecting the cell.
        pointerEvents: focus ? 'auto' : 'none',
      }}
      value={currentKey}
      onChange={(e) => {
        const key = e.target.value;
        const match = columnData.options.find((o) => String(o.value) === key);
        setRowData(match ? match.value : null);
      }}
      onBlur={() => stopEditing({ nextRow: false })}
    >
      <option value="">—</option>
      {columnData.options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Returned as `Column<any>` so `keyColumn(key, selectColumn(...))` accepts it for
// fields typed `string | undefined` or `boolean | undefined` without per-call casts.
export function selectColumn<V>(options: SelectOption<V>[]): Column<any> {
  const column: Column<V | null, SelectColumnData<V>, string> = {
    columnData: { options },
    component: SelectComponent as (props: CellProps<V | null, SelectColumnData<V>>) => JSX.Element,
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) =>
      rowData === null || rowData === undefined ? null : String(rowData),
    pasteValue: ({ value }) => {
      const match = options.find((o) => String(o.value) === value || o.label === value);
      return match ? match.value : null;
    },
    isCellEmpty: ({ rowData }) => rowData === null || rowData === undefined,
  };

  return column as Column<any>;
}
