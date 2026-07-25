import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// GA4 measurement ID (multi-mountain plan M7 §2.7). Analytics is decoupled from
// the Firebase app: a single shared GA4 property driven by this env var, not the
// Firebase config's measurementId. Unset (local dev / emulator / e2e / Preview
// without it) => the gtag snippet below is not rendered and no analytics loads.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: '산냥이집냥이',
  description: 'Explore cats living in the mountains',
};

// Add a new viewport export
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Optional: Prevents user zooming, can improve perceived stability
};

/**
 * Root layout: the tenant-independent HTML shell only (font, global CSS,
 * metadata). Everything tenant-scoped — providers, header/nav, footer — lives
 * in `[mountain]/layout.tsx`, inside the MountainProvider (multi-mountain plan
 * M3). `/api` routes are the only other children of this layout.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-oid="axlgnem">
      <body className={inter.className} data-oid="jwk6i0o">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                // send_page_view:false — AnalyticsTracker emits every page_view with the
                // active mountain_id (M7 §2.7), so GA4 can segment by tenant.
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
