'use client';

import React from 'react';

/**
 * 촬영 날짜 — the day the attached media was RECORDED, which is not the day it is
 * being uploaded.
 *
 * Added 2026-08-02 for 공지사항 / 입양홍보, which had no such field. Nothing was ever
 * sent for them, so both the video and image upload paths silently stamped the
 * **upload moment** as the recording date — every iPhone `IMG_1234.MOV` came out
 * looking as though it had been filmed the day it was posted (owner-reported;
 * `log/DEBUG_LOG.md` 2026-08-02). Those fallbacks now store null, and this field is
 * how a real date gets supplied at all.
 *
 * 집사톡 / 집사게시판 have had an equivalent field from the start via
 * `useRichContentForm` — which is exactly why they were the one family the bug never
 * touched. Their copy is left alone here rather than swapped for this component: it
 * works, and rewriting a working composer is not part of fixing this. If a third
 * caller ever appears, converge them then.
 *
 * ⚠️ **A calendar date, not an instant.** `type="date"` yields `YYYY-MM-DD`, and it is
 * stored as UTC midnight of that day. It was briefly `datetime-local`, whose time had
 * nowhere to live and was silently discarded; treating it as an instant also shifted
 * the day backwards in KST (`log/DEBUG_LOG.md` 2026-07-27).
 */

interface RecordingDateFieldProps {
  /** Distinct per form — ids must stay unique on the page. */
  id?: string;
  /** `YYYY-MM-DD`, or '' when unknown. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const RecordingDateField = ({
  id = 'createdTime',
  value,
  onChange,
  disabled = false,
}: RecordingDateFieldProps) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      촬영 날짜 (선택사항)
    </label>
    <input
      type="date"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 disabled:opacity-50"
    />
    <p className="text-xs text-gray-500 mt-1">
      파일 이름에서 날짜를 자동으로 찾아 채워요. 찾지 못하면 비어 있고, 그대로 두면 날짜 없이
      저장돼요.
    </p>
  </div>
);

export default RecordingDateField;
