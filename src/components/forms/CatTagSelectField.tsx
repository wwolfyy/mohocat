'use client';

import React from 'react';

/**
 * 등장하는 고양이 — the read-only field that opens the shared `CatSelectorModal`.
 *
 * Extracted 2026-07-30 from the two hand-rolled copies inside `NewButlerTalkForm`
 * when 공지사항 / 입양홍보 gained cat selection too: three composers × video and
 * image would have been six copies of the same nine lines. The modal itself stays
 * form-owned, so each form keeps control of which selection the picker commits to.
 *
 * ⚠️ **Not the same thing as `admin/media/CatTagField`,** and neither should grow
 * into the other. That one is the tagging *editor's* field: a free-text
 * comma-separated string an admin can type into directly, with removable chips.
 * This one is selector-only (`readOnly`) over a `string[]` — a composer should not
 * be a place where a cat name gets invented by typo, because the name is what the
 * album and `[catmodal:이름]` tokens match on.
 */

interface CatTagSelectFieldProps {
  /** Distinct per field — both sections can appear on one form. */
  id: string;
  tags: string[];
  onOpen: () => void;
  disabled?: boolean;
}

const CatTagSelectField = ({ id, tags, onOpen, disabled = false }: CatTagSelectFieldProps) => (
  <div className="mt-2">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      등장하는 고양이
    </label>
    <input
      type="text"
      id={id}
      value={tags.join(', ')}
      onClick={onOpen}
      readOnly
      disabled={disabled}
      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 cursor-pointer bg-gray-50 disabled:opacity-50"
      placeholder="고양이를 선택하려면 클릭하세요"
    />
  </div>
);

export default CatTagSelectField;
