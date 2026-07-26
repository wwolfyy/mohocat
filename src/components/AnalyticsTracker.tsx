'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMountain } from '@/components/MountainProvider';

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function AnalyticsTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mountainId = useMountain();

  useEffect(() => {
    // gtag is only defined when the GA snippet loaded (root layout, gated on
    // NEXT_PUBLIC_GA_MEASUREMENT_ID) — absent in local dev / emulator / e2e, so
    // this is a no-op there. Every page_view carries mountain_id so the shared
    // GA4 property can segment by tenant (multi-mountain plan M7 §2.7).
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      // Register mountain_id as a *default* parameter, not just a per-event one.
      // GA4's Enhanced-measurement events (scroll, outbound click, file download,
      // video engagement, form interaction) are emitted by gtag itself, so there
      // is no call site to pass parameters at — without this they'd arrive with no
      // mountain_id and be unsegmentable. Set before the page_view below so the
      // whole stream is consistent.
      //
      // Caveat: this only applies to events sent *after* this effect runs, so an
      // automatic event firing before hydration would still miss it. In practice
      // those events need user interaction, which comes later.
      window.gtag('set', { mountain_id: mountainId });

      // mountain_id is also passed explicitly here so the page_view stays
      // self-describing regardless of the default above.
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: pathname,
        page_title: document.title,
        mountain_id: mountainId,
      });
    }
  }, [pathname, searchParams, mountainId]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerContent />
    </Suspense>
  );
}
