import { ReactNode } from 'react';

/** Branded loading indicator (replaces the bare gray "불러오는 중" text). */
export function AlbumLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-gray-500">{label}</p>
    </div>
  );
}

/** Warm empty/error message with an accent icon chip. */
export function AlbumMessage({
  icon,
  children,
  tone = 'neutral',
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: 'neutral' | 'error';
}) {
  const chip = tone === 'error' ? 'bg-red-50 text-red-400' : 'bg-brand-50 text-brand-500';
  const text = tone === 'error' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${chip}`}>
          {icon}
        </div>
      )}
      <p className={text}>{children}</p>
    </div>
  );
}

/** "전체 N장" / filtered-result summary line above the grid. */
export function ResultCount({
  count,
  unit,
  searchQuery,
  catCount,
}: {
  count: number;
  unit: string;
  searchQuery: string;
  catCount: number;
}) {
  const hasFilters = searchQuery.trim() || catCount > 0;
  let text: string;
  if (hasFilters) {
    const parts: string[] = [];
    if (searchQuery.trim()) parts.push(`"${searchQuery}"`);
    if (catCount > 0) parts.push(`${catCount}마리 고양이`);
    text = `${parts.join(' + ')} 검색 결과: ${count}${unit}`;
  } else {
    text = `전체 ${count}${unit}`;
  }
  return <div className="mb-4 text-center text-sm text-gray-500">{text}</div>;
}
