import Link from 'next/link';

/**
 * Site footer. Grounds the layout (so the page doesn't feel unfinished below the
 * map) and is the conventional home for policy links.
 *
 * Real content is shown now (site name, non-profit note, copyright). The legal
 * links point at the 개인정보처리방침 (`/pages/privacy`) and 이용약관
 * (`/pages/terms`) pages — tracked in `docs/compliance/compliance-plan.md`.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
        <div className="text-gray-500">
          <span className="font-semibold text-gray-700">산냥이집냥이</span>
          <span className="mx-2 text-gray-300">·</span>
          <span>비영리 커뮤니티</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link href="/pages/privacy" className="text-gray-500 transition hover:text-gray-700">
            개인정보처리방침
          </Link>
          <Link href="/pages/terms" className="text-gray-500 transition hover:text-gray-700">
            이용약관
          </Link>
        </nav>

        <div className="text-xs text-gray-400">© {year} 산냥이집냥이</div>
      </div>
    </footer>
  );
}
