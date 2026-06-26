'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Cat } from '@/types';
import CatCircleGrid from '@/components/CatCircleGrid';
import CatInfo from '@/components/CatInfo';
import Modal from '@/components/ui/Modal';
import { getCatService } from '@/services';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';

/**
 * 입양홍보 — public adoptable-cats gallery. Reads cats live (client-side) and
 * shows the ones an admin has flagged `adoptable` on circular cards; tapping a
 * card opens its `CatInfo`. Always renders (friendly empty state when none) so
 * the nav links / CTA never 404.
 */
export default function AdoptionPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCats = async () => {
      try {
        const all = await getCatService().getAllCats();
        // Only show adoptable cats that have a photo — a photo-less card would
        // break next/image and isn't useful on a showcase gallery anyway.
        const adoptable = all.filter(
          (cat) => cat.adoptable === true && cat.thumbnailUrl && cat.thumbnailUrl.trim() !== ''
        );
        if (cancelled) return;
        setCats(adoptable);

        const thumbnailUrls = adoptable.map((cat) => cat.thumbnailUrl);
        if (thumbnailUrls.length > 0) {
          thumbnailPreloader.preloadThumbnails(thumbnailUrls).catch((err) => {
            console.warn('Error preloading adoption thumbnails:', err);
          });
        }
      } catch (err) {
        // Surface a visible error state rather than silently showing "no cats".
        console.error('Error loading adoptable cats:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">입양홍보</h1>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-brand" />
        <p className="mt-4 text-gray-600">
          새 가족을 기다리는 냥이들이에요. 마음이 가는 친구가 있다면 동참 페이지에서 편하게 연락
          주세요.
        </p>
      </div>

      {/* Body states */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-6 text-center ring-1 ring-red-100">
          <p className="text-red-700">냥이 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        </div>
      ) : cats.length === 0 ? (
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
        <CatCircleGrid cats={cats} onSelect={setSelectedCat} priorityCount={8} />
      )}

      {/* Detail modal */}
      {selectedCat && (
        <Modal onClose={() => setSelectedCat(null)} size="xl">
          <CatInfo cat={selectedCat} />
        </Modal>
      )}
    </div>
  );
}
