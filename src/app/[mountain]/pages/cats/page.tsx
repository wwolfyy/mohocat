import type { Cat, Point } from '@/types';
import { getAllPointsServer } from '@/lib/server/point-reads';
import { getAllCatsServer } from '@/lib/server/cat-reads';
import { REVALIDATE_SECONDS } from '@/lib/cache-config';
import CatsBrowser from './CatsBrowser';

// §7a: bake the cat + point reads at build/server time (Admin SDK / server read)
// instead of a client-side Firestore waterfall. ISR fallback backstop — see
// `src/lib/cache-config.ts` and docs/manuals/deployment/README.md → "ISR revalidation".
export const revalidate = REVALIDATE_SECONDS;

/**
 * 냥이들 — public "browse all cats" page. Reads every cat server-side and hands
 * them to the `CatsBrowser` client island (search / filter / responsive
 * card-grid-or-table / detail modal). Points are read alongside to resolve each
 * cat's `dwelling` id into a human-readable point title. Always renders (friendly
 * empty / error states) so the nav link never 404s.
 */
export default async function CatsPage() {
  let cats: Cat[] = [];
  let dwellingNames: Record<string, string> = {};
  let error = false;
  try {
    const [allCats, points] = await Promise.all([getAllCatsServer(), getAllPointsServer()]);
    cats = allCats;
    dwellingNames = points.reduce<Record<string, string>>((acc, p: Point) => {
      acc[p.id] = p.title;
      return acc;
    }, {});
  } catch (err) {
    // Surface a visible error state rather than silently showing "no cats".
    console.error('Error loading cats:', err);
    error = true;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">냥이들</h1>
        <div className="mx-auto mt-1.5 mb-2 h-0.5 w-8 rounded-full bg-brand" />
        <p className="text-sm text-gray-500">계양산 냥이들을 한눈에 만나 보세요.</p>
      </div>

      {/* Body states */}
      {error ? (
        <div className="rounded-xl bg-red-50 p-6 text-center ring-1 ring-red-100">
          <p className="text-red-700">냥이 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        </div>
      ) : cats.length === 0 ? (
        <div className="rounded-xl bg-brand-50 p-8 text-center ring-1 ring-brand-100">
          <p className="text-lg font-semibold text-gray-900">아직 등록된 냥이가 없어요</p>
          <p className="mt-2 text-gray-600">새로운 냥이 소식이 생기면 이곳에 올려 드릴게요.</p>
        </div>
      ) : (
        <CatsBrowser cats={cats} dwellingNames={dwellingNames} />
      )}
    </div>
  );
}
