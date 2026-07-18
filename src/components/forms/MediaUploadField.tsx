'use client';

import React, { useState } from 'react';

/**
 * Hybrid file-upload + URL input section for the content forms (complexity-
 * retirement P1.1). Presentational only: renders the file picker, the
 * pending-file list, and the URL add/remove list exactly as the four content
 * forms hand-roll them today — it never uploads (the upload strategy is injected
 * into the form's submit flow; see `uploadStrategies.ts`).
 *
 * The parent owns `files` and `urls` and receives whole-array updates; only the
 * transient URL text input is component-local. `kind` selects the image/video
 * label set the forms share verbatim. No progress UI: none of the current forms
 * render per-file progress (they disable the submit button while uploading), and
 * the migrations are behavior-preserving.
 */

const LABELS = {
  image: {
    section: '이미지',
    fileInput: '파일 업로드:',
    pending: '업로드할 이미지:',
    urlInput: '또는 URL 입력:',
    urlPlaceholder: '이미지 URL을 입력하세요',
    addedUrls: '추가된 이미지 URL:',
    accept: 'image/*',
  },
  video: {
    section: '동영상',
    fileInput: '파일 업로드 (YouTube에 업로드됩니다):',
    pending: '업로드할 동영상:',
    urlInput: '또는 YouTube URL 입력:',
    urlPlaceholder: 'YouTube URL을 입력하세요',
    addedUrls: '추가된 동영상 URL:',
    accept: 'video/*',
  },
} as const;

interface MediaUploadFieldProps {
  kind: 'image' | 'video';
  files: File[];
  onFilesChange: (files: File[]) => void;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
}

const MediaUploadField = ({
  kind,
  files,
  onFilesChange,
  urls,
  onUrlsChange,
}: MediaUploadFieldProps) => {
  const labels = LABELS[kind];
  const [currentUrl, setCurrentUrl] = useState('');

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesChange([...files, ...Array.from(event.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const addUrl = () => {
    if (currentUrl.trim()) {
      onUrlsChange([...urls, currentUrl.trim()]);
      setCurrentUrl('');
    }
  };

  const removeUrl = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block font-semibold mb-2">{labels.section}</label>

      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{labels.fileInput}</label>
        <input
          type="file"
          accept={labels.accept}
          multiple
          onChange={handleFilesChange}
          className="w-full p-2 border rounded"
        />
        {files.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">{labels.pending}</p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-gray-100 rounded"
              >
                <span className="text-sm truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium mb-2">{labels.urlInput}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder={labels.urlPlaceholder}
            className="flex-1 p-2 border rounded"
          />
          <button
            type="button"
            onClick={addUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            추가
          </button>
        </div>
        {urls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">{labels.addedUrls}</p>
            {urls.map((url, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-gray-100 rounded"
              >
                <span className="text-sm truncate">{url}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaUploadField;
