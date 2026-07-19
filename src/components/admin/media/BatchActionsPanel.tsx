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
  children: React.ReactNode;
}

const BatchActionsPanel: React.FC<BatchActionsPanelProps> = ({
  title,
  cancelLabel,
  onCancel,
  children,
}) => (
  <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg mb-4">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    <div className="flex gap-2 mt-3">
      <Button variant="secondary" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  </div>
);

export default BatchActionsPanel;
