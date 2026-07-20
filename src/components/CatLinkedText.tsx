'use client';

import { useEffect, useRef, useState } from 'react';
import type { Cat } from '@/types';
import { getCatService } from '@/services';
import { processTextWithLinks } from '@/utils/text-processing';
import { useMediaLinks } from '@/hooks/useMediaLinks';
import Modal from './ui/Modal';
import CatInfo from './CatInfo';
import { useMountain } from '@/components/MountainProvider';

interface CatLinkedTextProps {
  /** Raw text, possibly containing `[catmodal:name]` and markdown/URL links. */
  text: string;
  className?: string;
}

/**
 * Renders free text with `processTextWithLinks` (markdown/URL links + the
 * `[catmodal:name]` → cat-modal-link spans) and opens the referenced cat's detail
 * modal when such a link is clicked. Encapsulates the click-to-open-CatInfo pattern
 * so any post/body text can carry cat links (mirrors the handler inlined in CatInfo).
 */
export default function CatLinkedText({ text, className }: CatLinkedTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { mediaOverlays } = useMediaLinks(ref);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(false);
  const mountainId = useMountain();
  const catService = getCatService(mountainId);

  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('cat-modal-link')) return;

      const catName = target.getAttribute('data-cat-name');
      if (!catName) return;

      setLoading(true);
      try {
        const catData = await catService.getCatByName(catName);
        if (catData) setSelectedCat(catData);
        else console.warn(`Cat not found: ${catName}`);
      } catch (error) {
        console.error('Error loading cat:', error);
      } finally {
        setLoading(false);
      }
    };

    const el = ref.current;
    el?.addEventListener('click', handleClick);
    return () => el?.removeEventListener('click', handleClick);
  }, [catService]);

  return (
    <>
      <div
        ref={ref}
        className={className}
        dangerouslySetInnerHTML={{ __html: processTextWithLinks(text) }}
      />

      {mediaOverlays}

      {selectedCat && (
        <Modal onClose={() => setSelectedCat(null)} size="xl">
          <CatInfo cat={selectedCat} />
        </Modal>
      )}

      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-400" />
        </div>
      )}
    </>
  );
}
