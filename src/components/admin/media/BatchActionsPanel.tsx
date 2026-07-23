'use client';

import React from 'react';
import Button from '@/components/ui/Button';

/**
 * Shell for the batch-actions box that appears when items are selected.
 * The action sections themselves (tags, dates, …) differ per page and come
 * in as children; the shell owns the container, the title, and the cancel
 * (clear-selection) button.
 */

interface BatchActionsPanelProps {
  title: string;
  cancelLabel: string;
  onCancel: () => void;
  /** Section columns on md+ screens (tag-images: 2, tag-videos: 3). */
  columns?: 2 | 3;
  children: React.ReactNode;
}

// Tailwind needs literal class names.
const GRID_COLS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
};

const BatchActionsPanel: React.FC<BatchActionsPanelProps> = ({
  title,
  cancelLabel,
  onCancel,
  columns = 2,
  children,
}) => (
  <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg mb-4">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className={`grid grid-cols-1 ${GRID_COLS[columns]} gap-3`}>{children}</div>
    <div className="flex gap-2 mt-3">
      <Button variant="secondary" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  </div>
);

export default BatchActionsPanel;
