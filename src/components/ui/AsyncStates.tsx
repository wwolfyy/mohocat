'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import Alert from './Alert';
import Button from './Button';

/**
 * The two things a surface must be able to say besides "here is the content":
 * *I am still looking* and *I could not look*.
 *
 * Shared rather than hand-rolled per page (2026-08-01): the 공지사항 list, the
 * 입양홍보 feed and the 공지사항 detail page each lacked both, in the same way, and
 * three private copies is exactly how the three post-media renderers drifted into
 * three different bugs the week before.
 *
 * The empty state stays with each surface — its wording is content-specific
 * (*아직 등록된 공지사항이 없어요*), and the point of this module is that such a
 * message is only ever rendered once a fetch has genuinely completed empty.
 */

/** Grey placeholder cards standing in for a list that is still loading. */
export const SkeletonList = ({ count = 3, className }: { count?: number; className?: string }) => (
  <div className={cn('space-y-4', className)} aria-busy="true" aria-live="polite">
    <span className="sr-only">불러오는 중이에요.</span>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start space-x-4">
          <div className="h-14 w-20 flex-shrink-0 animate-pulse rounded bg-gray-200" />
          <div className="flex-grow space-y-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * A failed fetch, said out loud and with a way out.
 *
 * ⚠️ Deliberately distinct from the empty state: telling a reader there is no
 * content when the truth is that we could not fetch it is the bug this replaces.
 */
export const ErrorNotice = ({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) => (
  <Alert variant="error" className={cn('flex flex-col items-center gap-3 py-8', className)}>
    <p>{message}</p>
    <Button variant="secondary" onClick={onRetry}>
      다시 시도
    </Button>
  </Alert>
);
