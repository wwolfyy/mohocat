import Link from 'next/link';

/**
 * Site footer. Grounds the layout (so the page doesn't feel unfinished below the
 * map) and is the conventional home for policy links.
 *
 * Real content is shown now (site name, non-profit note, copyright). The legal
 * links are placeholders until the corresponding pages exist — tracked in
 * `docs/compliance/compliance-plan.md`. Do NOT make them live links until the
 * 개인정보처리방침 / 이용약관 pages are written and reviewed.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
        <div className="text-gray-500">
          <span className="font-semibold text-gray-700">산냥이집냥이</span>
          <span className="mx-2 text-gray-300">·</span>
          <span>비영리 고양이 커뮤니티</span>
        </div>

        {/* Placeholders — pages pending the compliance workstream. */}
        <nav className="flex items-center gap-4">
          <span className="cursor-not-allowed text-gray-400" title="준비 중입니다">
            개인정보처리방침
          </span>
          <span className="cursor-not-allowed text-gray-400" title="준비 중입니다">
            이용약관
          </span>
          <Link
            href="/pages/contact"
            className="text-gray-500 transition-colors hover:text-gray-800"
          >
            문의
          </Link>
        </nav>

        <div className="text-xs text-gray-400">© {year} 산냥이집냥이</div>
      </div>
    </footer>
  );
}
