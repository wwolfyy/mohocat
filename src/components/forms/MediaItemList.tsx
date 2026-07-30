'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * One-file-per-section media picker with per-file metadata (butler-media-
 * separation plan B3.1).
 *
 * Replaces a single `multiple` file input. With one picker the whole selection
 * had to share one title and one description, which only works when every file
 * is about the same thing — the reason this exists. Each section owns its file
 * plus its own 제목/설명, and a fresh empty section appears as soon as the last
 * one has a file.
 *
 * Used by **all three** composers (집사톡 · 공지사항 · 입양홍보) since 2026-07-30;
 * the flat `MediaUploadField` picker it replaced is gone. The two admin forms
 * additionally render a `MediaUrlList` beneath this for pasted URLs, which this
 * component deliberately knows nothing about.
 *
 * Presentational only: the parent owns the items and receives whole-array
 * updates. It never uploads — the upload strategy is injected into the form's
 * submit flow (`uploadStrategies.ts`).
 *
 * ⚠️ **Videos have a 제목, photos do not.** YouTube owns a real title; a photo's
 * `cat_images` record has only `fileName` and `description`, and `description` is
 * what shows in the album caption and the lightbox. A photo title would be
 * write-only data (plan §4.1).
 *
 * **On the heavy borders:** the section is framed and the files are divided by
 * conspicuous rules on purpose (owner, 2026-07-30). With several files stacked,
 * and a 동영상 list sitting directly above a 사진 list, it was not visually
 * obvious where one file's fields ended and the next began — or which section a
 * picker belonged to. That ambiguity is what made someone reach for the wrong
 * picker and read `accept="image/*"` greying out videos as a bug.
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
  /**
   * Overrides the hint under 설명. Needed because what an empty 설명 *does* differs
   * by form: in 집사톡 it stays empty, while 공지사항 / 입양홍보 fall back to the
   * post body. The hint has to match, or it teaches the wrong thing.
   */
  descriptionHelp?: string;
}

const MediaItemList = ({
  kind,
  items,
  onItemsChange,
  disabled = false,
  descriptionHelp,
}: MediaItemListProps) => {
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
    <section className="rounded-lg border-2 border-gray-400 bg-white overflow-hidden">
      {/* Section header — the bar that makes 동영상-vs-사진 unmistakable when the
          two lists sit back to back. */}
      <header className="flex items-center justify-between gap-2 border-b-2 border-gray-400 bg-gray-100 px-3 py-2">
        <span className="text-sm font-semibold text-gray-800">{labels.section}</span>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs font-semibold text-white">
            {items.length}개
          </span>
        )}
      </header>

      {items.length > 0 && (
        <ul className="divide-y-2 divide-dashed divide-gray-400">
          {items.map((item, index) => (
            <li key={index} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex min-w-0 items-start gap-2">
                  {/* The file's position in the list, so a stack of similarly-named
                      files stays countable. */}
                  <span className="mt-0.5 shrink-0 rounded bg-gray-200 px-1.5 text-xs font-semibold text-gray-700">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-800 break-all">{item.file.name}</p>
                </div>
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
                <p className="text-xs text-gray-500 mt-1">
                  {descriptionHelp ?? labels.descriptionHelp}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* The trailing empty picker. Always present, so adding the next file is
          one click and the list grows as the user goes. Tinted and ruled off from
          the files above it so it reads as "add another", not as part of the last
          file's fields. */}
      <div className={cn('bg-gray-50 p-3', items.length > 0 && 'border-t-2 border-gray-400')}>
        <label className="block text-xs font-medium text-gray-700 mb-1">{labels.addLabel}</label>
        <input
          type="file"
          accept={labels.accept}
          disabled={disabled}
          // Remount after each pick so choosing the same filename twice still
          // fires onChange (the input would otherwise hold the old value).
          key={items.length}
          onChange={(e) => selectFile(items.length, e.target.files?.[0] ?? null)}
          className="w-full p-2 border border-gray-300 rounded-md bg-white"
        />
      </div>
    </section>
  );
};

export default MediaItemList;
