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
