'use client';

import React from 'react';

/**
 * Comma-separated cat-tag input that opens the shared CatSelectorModal
 * (🐱 button / click on the field) and renders the current tags as
 * removable chips. The modal itself stays page-owned so the page controls
 * the selector context and commit target.
 */

interface CatTagFieldProps {
  value: string;
  onChange: (value: string) => void;
  onOpenSelector: () => void;
  placeholder?: string;
}

const CatTagField: React.FC<CatTagFieldProps> = ({
  value,
  onChange,
  onOpenSelector,
  placeholder,
}) => {
  const removeTag = (tagToRemove: string) => {
    onChange(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag && tag !== tagToRemove)
        .join(', ')
    );
  };

  return (
    <div>
      <div className="relative mb-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={onOpenSelector}
          placeholder={placeholder}
          className="border border-gray-300 rounded px-2 py-1 w-full cursor-pointer pr-12 text-sm"
        />
        <button
          type="button"
          onClick={onOpenSelector}
          className="absolute right-1 top-1 text-brand-600 hover:text-brand-700 text-xs"
        >
          🐱
        </button>
      </div>

      {value && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.split(',').map((tag, index) => {
            const trimmedTag = tag.trim();
            if (!trimmedTag) return null;
            return (
              <span
                key={index}
                className="inline-flex items-center bg-brand-100 text-ink text-xs px-1 py-0.5 rounded"
              >
                {trimmedTag}
                <button
                  type="button"
                  onClick={() => removeTag(trimmedTag)}
                  className="ml-1 text-ink/70 hover:text-ink"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CatTagField;
