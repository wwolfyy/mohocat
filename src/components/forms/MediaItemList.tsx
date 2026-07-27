'use client';

import React from 'react';

/**
 * One-file-per-section media picker with per-file metadata (butler-media-
 * separation plan B3.1).
 *
 * Replaces a single `multiple` file input for the rich-content family. With one
 * picker the whole selection had to share one title and one description, which
 * only works when every file is about the same thing — the reason this exists.
 * Each section owns its file plus its own 제목/설명, and a fresh empty section
 * appears as soon as the last one has a file.
 *
 * Presentational only: the parent owns the items and receives whole-array
 * updates, exactly as `MediaUploadField` does. It never uploads — the upload
 * strategy is injected into the form's submit flow (`uploadStrategies.ts`).
 *
 * ⚠️ **Videos have a 제목, photos do not.** YouTube owns a real title; a photo's
 * `cat_images` record has only `fileName` and `description`, and `description` is
 * what shows in the album caption and the lightbox. A photo title would be
 * write-only data (plan §4.1).
 */

export interface MediaItem {
  file: File;
  /** Video only — empty falls back to the post title (with a Part-n suffix). */
  title: string;
  /** Empty is saved as empty: no YouTube description, no photo caption. */
  description: string;
}

const LABELS = {
  image: {
    section: '사진',
    addLabel: '사진 선택',
    accept: 'image/*',
    descriptionPlaceholder: '이 사진에 대한 설명',
    descriptionHelp: '비어 있으면 설명 없이 저장돼요.',
  },
  video: {
    section: '동영상 (YouTube에 올라가요)',
    addLabel: '동영상 선택',
    accept: 'video/*',
    descriptionPlaceholder: '이 동영상의 YouTube 설명',
    descriptionHelp: '비어 있으면 YouTube 설명 없이 올라가요.',
  },
} as const;

interface MediaItemListProps {
  kind: 'image' | 'video';
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  /** Disables every control while a submit is in flight. */
  disabled?: boolean;
}

const MediaItemList = ({ kind, items, onItemsChange, disabled = false }: MediaItemListProps) => {
  const labels = LABELS[kind];

  const selectFile = (index: number, file: File | null) => {
    if (!file) return;
    const next = [...items];
    next[index] = { ...(next[index] ?? { title: '', description: '' }), file };
    onItemsChange(next);
  };

  const updateField = (index: number, field: 'title' | 'description', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onItemsChange(next);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{labels.section}</label>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-md border border-gray-300 p-3 bg-gray-50">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm text-gray-800 break-all">{item.file.name}</p>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled}
                className="shrink-0 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                삭제
              </button>
            </div>

            {kind === 'video' && (
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateField(index, 'title', e.target.value)}
                  disabled={disabled}
                  placeholder="이 동영상의 YouTube 제목"
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
                />
                <p className="text-xs text-gray-500 mt-1">비어 있으면 글 제목이 사용돼요.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">설명</label>
              <textarea
                value={item.description}
                onChange={(e) => updateField(index, 'description', e.target.value)}
                disabled={disabled}
                rows={2}
                placeholder={labels.descriptionPlaceholder}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
              />
              <p className="text-xs text-gray-500 mt-1">{labels.descriptionHelp}</p>
            </div>
          </div>
        ))}
      </div>

      {/* The trailing empty picker. Always present, so adding the next file is
          one click and the list grows as the user goes. */}
      <div className={items.length > 0 ? 'mt-3' : ''}>
        <label className="block text-xs font-medium text-gray-700 mb-1">{labels.addLabel}</label>
        <input
          type="file"
          accept={labels.accept}
          disabled={disabled}
          // Remount after each pick so choosing the same filename twice still
          // fires onChange (the input would otherwise hold the old value).
          key={items.length}
          onChange={(e) => selectFile(items.length, e.target.files?.[0] ?? null)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default MediaItemList;
