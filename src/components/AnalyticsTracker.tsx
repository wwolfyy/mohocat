'use client';

import { useEffect } from 'react';
import { analytics } from '@/services/firebase';
import { logEvent } from 'firebase/analytics';
import { usePathname, useSearchParams } from 'next/navigation';

export function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (analytics) {
            // Log page view when route changes
            logEvent(analytics, 'page_view', {
                page_location: window.location.href,
                page_path: pathname,
                page_title: document.title
            });
        }
    }, [pathname, searchParams]);

    return null;
}
