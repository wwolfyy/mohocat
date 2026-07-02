import Link from 'next/link';
import type { Cat } from '@/types';
import { getAllCatsServer } from '@/lib/server/cat-reads';
import { REVALIDATE_SECONDS } from '@/lib/cache-config';
import AdoptionGallery from './AdoptionGallery';
import AdoptionPromotionClient from '@/components/AdoptionPromotionClient';

// §7a: bake the adoptable-cats read at build/server time (Admin SDK) instead of
// the client-side `getAllCats()` waterfall. ISR fallback backstop — see
// `src/lib/cache-config.ts` and docs/manuals/deployment/README.md → "ISR revalidation".
export const revalidate = REVALIDATE_SECONDS;

/**
 * 입양홍보 — public adoptable-cats gallery. Reads cats server-side and shows the
 * ones an admin has flagged `adoptable` (with a photo) on circular cards; the
 * interactive grid + detail modal live in the `AdoptionGallery` client island.
 * Always renders (friendly empty state when none) so the nav links / CTA never
 * 404.
 */
export default async function AdoptionPage() {
  let adoptable: Cat[] = [];
  let error = false;
  try {
    const all = await getAllCatsServer();
    // Only show adoptable cats that have a photo — a photo-less card would break
    // next/image and isn't useful on a showcase gallery anyway.
    adoptable = all.filter(
      (cat) => cat.adoptable === true && cat.thumbnailUrl && cat.thumbnailUrl.trim() !== ''
    );
  } catch (err) {
    // Surface a visible error state rather than silently showing "no cats".
    console.error('Error loading adoptable cats:', err);
    error = true;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">입양홍보</h1>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-brand" />
        <p className="mt-4 text-gray-600">
          새 가족을 기다리는 냥이들이에요. 마음이 가는 친구가 있다면{' '}
          <Link
            href="/pages/contact"
            className="font-semibold text-gray-900 underline underline-offset-2 hover:text-brand"
          >
            동참
          </Link>{' '}
          페이지에서 연락 주세요.
        </p>
      </div>

      {/* Body states */}
      {error ? (
        <div className="rounded-xl bg-red-50 p-6 text-center ring-1 ring-red-100">
          <p className="text-red-700">냥이 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        </div>
      ) : adoptable.length === 0 ? (
        <div className="rounded-xl bg-brand-50 p-8 text-center ring-1 ring-brand-100">
          <p className="text-lg font-semibold text-gray-900">
            지금은 입양을 기다리는 냥이가 없어요
          </p>
          <p className="mt-2 text-gray-600">
            새로운 소식이 생기면 이곳에 올려 드릴게요. 궁금한 점이 있다면 언제든 문의해 주세요.
          </p>
          <Link
            href="/pages/contact"
            className="mt-5 inline-block rounded-lg bg-gradient-to-r from-brand to-accent px-5 py-2.5 font-bold text-ink shadow-sm transition hover:shadow-md"
          >
            문의하러 가기
          </Link>
        </div>
      ) : (
        <AdoptionGallery cats={adoptable} />
      )}

      {/* 새로운 입양 소식 — admin-authored adoption-promotion posts (posts_adoption),
          independent of the adoptable-cats list above. Client island, live-fetched. */}
      <section className="mt-14">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">새로운 입양 소식</h2>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-brand" />
        </div>
        <AdoptionPromotionClient />
      </section>
    </div>
  );
}
