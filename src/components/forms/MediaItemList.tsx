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

/**
 * A medium already attached to the post — only reachable when the form is
 * editing (2026-08-02). It is a stored URL, not a `File`, so it never goes
 * through an upload strategy; the form simply carries it back into `imageUrls` /
 * `videoUrls` unless the operator removes it.
 *
 * ⚠️ **No 제목/설명 here, deliberately.** Those live on the medium's own record
 * (`cat_images` / `cat_videos`), not on the post, and for a video **YouTube is
 * the source of truth** — a caption edited here would be overwritten by the next
 * 📺 YouTube와 동기화. Metadata is edited in 사진 관리 / 동영상 관리; this list is
 * for deciding what stays attached.
 */
export interface ExistingMedia {
  url: string;
  /** What the operator sees — a filename, or a video title/id. */
  label: string;
  /** Preview image, so removal is a visual choice rather than a URL-matching one. */
  thumbnailUrl?: string;
}

const LABELS = {
  image: {
    section: '사진',
    addLabel: '사진 선택',
    accept: 'image/*',
    descriptionPlaceholder: '이 사진에 대한 설명',
    descriptionHelp: '비어 있으면 설명 없이 저장돼요.',
    // Written out per kind rather than built from `section`: the video section
    // label carries a parenthetical, and 은/는 depends on the preceding syllable.
    singleOnlyHint: '사진은 한 장만 올릴 수 있어요.',
  },
  video: {
    section: '동영상 (YouTube에 올라가요)',
    addLabel: '동영상 선택',
    accept: 'video/*',
    descriptionPlaceholder: '이 동영상의 YouTube 설명',
    descriptionHelp: '비어 있으면 YouTube 설명 없이 올라가요.',
    singleOnlyHint: '동영상은 하나만 올릴 수 있어요.',
  },
} as const;

interface MediaItemListProps {
  kind: 'image' | 'video';
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  /** Disables every control while a submit is in flight. */
  disabled?: boolean;
  /**
   * Whether the section accepts more than one file. `false` hides the trailing
   * picker once a file is present, so the list caps at one; the file can still be
   * 삭제'd and replaced. Defaults to `true` — the admin composers
   * (공지사항 / 입양홍보) are unrestricted by decision, and only 집사톡 passes this,
   * from `config/media_control.json` (PROJECT_PLAN §10d).
   */
  allowMultiple?: boolean;
  /**
   * Media already on the post, shown above the pickers. Edit-mode only —
   * omitted entirely by the create forms, which have nothing attached yet.
   */
  existing?: ExistingMedia[];
  /** Required whenever `existing` is passed: receives the retained list. */
  onExistingChange?: (existing: ExistingMedia[]) => void;
}

const MediaItemList = ({
  kind,
  items,
  onItemsChange,
  disabled = false,
  allowMultiple = true,
  existing = [],
  onExistingChange,
}: MediaItemListProps) => {
  const labels = LABELS[kind];
  // A retained medium counts against the cap exactly as a new pick does —
  // otherwise editing would be a way around 집사톡's one-video/one-photo limit.
  const totalCount = existing.length + items.length;
  const canAddMore = allowMultiple || totalCount === 0;

  const removeExisting = (index: number) => {
    onExistingChange?.(existing.filter((_, i) => i !== index));
  };

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
        {totalCount > 0 && (
          <span className="shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs font-semibold text-white">
            {totalCount}개
          </span>
        )}
      </header>

      {existing.length > 0 && (
        <ul className="divide-y-2 divide-dashed divide-gray-400 border-b-2 border-gray-400">
          {existing.map((medium, index) => (
            <li key={medium.url} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded bg-gray-200 px-1.5 text-xs font-semibold text-gray-700">
                  {index + 1}
                </span>
                <span className="shrink-0 rounded bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                  기존
                </span>
                {medium.thumbnailUrl && (
                  // A plain <img>: these are arbitrary Storage / YouTube URLs and
                  // this is a 64px admin preview, not a surface worth routing
                  // through the image optimizer.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={medium.thumbnailUrl}
                    alt=""
                    className="h-10 w-16 shrink-0 rounded object-cover"
                    // A preview is a convenience; a broken-image glyph next to a
                    // 삭제 button is worse than no preview. Removed videos and
                    // moved objects both land here.
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <p className="truncate text-sm text-gray-800">{medium.label}</p>
              </div>
              <button
                type="button"
                onClick={() => removeExisting(index)}
                disabled={disabled}
                className="shrink-0 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="divide-y-2 divide-dashed divide-gray-400">
          {items.map((item, index) => (
            <li key={index} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex min-w-0 items-start gap-2">
                  {/* The file's position in the list, so a stack of similarly-named
                      files stays countable. Continues the numbering of any
                      already-attached media above rather than restarting at 1. */}
                  <span className="mt-0.5 shrink-0 rounded bg-gray-200 px-1.5 text-xs font-semibold text-gray-700">
                    {existing.length + index + 1}
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
                <p className="text-xs text-gray-500 mt-1">{labels.descriptionHelp}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* The trailing empty picker. Present whenever another file may be added, so
          adding the next one is one click and the list grows as the user goes.
          Tinted and ruled off from the files above it so it reads as "add
          another", not as part of the last file's fields. When the section is
          capped at one file it disappears after the first pick — leaving the
          picker visible but inert would read as broken. */}
      {canAddMore && (
        <div className={cn('bg-gray-50 p-3', totalCount > 0 && 'border-t-2 border-gray-400')}>
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
          {!allowMultiple && <p className="text-xs text-gray-500 mt-1">{labels.singleOnlyHint}</p>}
        </div>
      )}

      {/* Said plainly because the operator cannot see it: 삭제 detaches the medium
          from this post. The file itself stays in Storage / on YouTube — which is
          what makes the action safe to undo, and why it is not a delete button. */}
      {existing.length > 0 && (
        <p className="border-t-2 border-gray-400 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          {kind === 'video'
            ? '삭제하면 이 글에서만 빠져요. YouTube 영상은 지워지지 않아요.'
            : '삭제하면 이 글에서만 빠져요. 사진 자체는 사진첩에 그대로 남아요.'}
        </p>
      )}
    </section>
  );
};

export default MediaItemList;
