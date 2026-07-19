'use client';

import { useMemo, useState } from 'react';

/**
 * Shared 자동 날짜 인식 machinery for the admin media tagging pages: find the
 * items that have no creation date but a parseable one (from filename or
 * title), loop over them with per-item processing feedback, write each parsed
 * date through the injected updater, and return a result report.
 *
 * Confirmation prompts and result alerts stay page-owned — the pages format
 * the report with their own strings (and P6.1 later converts those alerts to
 * the shared Modal system).
 */

export interface AutoParseResult {
  label: string;
  date?: string;
  success: boolean;
  error?: string;
}

export interface AutoParseReport {
  successCount: number;
  failCount: number;
  results: AutoParseResult[];
}

export interface UseDateAutoParseOptions<T extends { id: string }> {
  items: T[];
  setItems: (items: T[]) => void;
  /** Whether the item is missing the date the parser would fill. */
  needsDate: (item: T) => boolean;
  /** Extract a date from the item's filename/title; null when unparseable. */
  parse: (item: T) => Date | null;
  /** Human label used in the result report (filename or title). */
  label: (item: T) => string;
  /** Persist the parsed date (service-layer write). */
  applyUpdate: (item: T, date: Date) => Promise<void>;
  /** Merge the parsed date into the local item for the batched state update. */
  mergeParsedDate: (item: T, date: Date) => T;
}

export function useDateAutoParse<T extends { id: string }>({
  items,
  setItems,
  needsDate,
  parse,
  label,
  applyUpdate,
  mergeParsedDate,
}: UseDateAutoParseOptions<T>) {
  const [parsing, setParsing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  /** Items the auto-parse run would touch (drives the stat card + confirm copy). */
  const candidates = useMemo(
    () => items.filter((item) => needsDate(item) && parse(item) !== null),
    [items, needsDate, parse]
  );

  const run = async (): Promise<AutoParseReport> => {
    setParsing(true);
    setProcessingIds(new Set());

    let successCount = 0;
    let failCount = 0;
    const results: AutoParseResult[] = [];
    const updatedItems = [...items];

    try {
      for (const item of candidates) {
        try {
          setProcessingIds((prev) => new Set(prev).add(item.id));

          const parsedDate = parse(item);
          if (parsedDate) {
            await applyUpdate(item, parsedDate);

            const index = updatedItems.findIndex((i) => i.id === item.id);
            if (index !== -1) {
              updatedItems[index] = mergeParsedDate(updatedItems[index], parsedDate);
            }

            successCount++;
            results.push({
              label: label(item),
              date: parsedDate.toISOString().split('T')[0],
              success: true,
            });
          }
        } catch (error) {
          console.error(`Error auto-parsing date for ${label(item)}:`, error);
          failCount++;
          results.push({
            label: label(item),
            success: false,
            error: error instanceof Error ? error.message : 'Date parsing failed',
          });
        } finally {
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      }

      // Batch the local state update once at the end
      setItems(updatedItems);
      return { successCount, failCount, results };
    } finally {
      setParsing(false);
      setProcessingIds(new Set());
    }
  };

  return { parsing, processingIds, candidates, run };
}
