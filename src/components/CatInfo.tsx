'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Cat } from '@/types';
import { processTextWithLinks } from '@/utils/text-processing';
import { getCatService } from '@/services';
import Modal from './ui/Modal';
import PhotoAlbum from './PhotoAlbum';
import VideoAlbum from './VideoAlbum';

interface CatInfoProps {
  cat: Cat;
}

const getStatusEmoji = (status?: string) => {
  const statusToEmoji: Record<string, string> = {
    산냥이: 'ᨒ',
    집냥이: '🏠',
    별냥이: '🌈',
    행방불명: '❓',
  };
  return statusToEmoji[status || ''] || '❓';
};

/** Aligned label/value row used for the cat's structured facts. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline">
      <span className="w-24 shrink-0 font-medium text-gray-500">{label}</span>
      <span className="text-gray-800">{children}</span>
    </div>
  );
}

/** Free-text block with an optional sub-heading (성격, 건강상태, 특이사항…). */
function InfoBlock({ heading, html }: { heading?: string; html: string }) {
  return (
    <div>
      {heading && <h4 className="mb-1.5 font-semibold text-gray-700">{heading}</h4>}
      <div
        className="whitespace-pre-line text-gray-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/** Brand-tinted chip for the photo / video album actions. */
function AlbumButton({
  onClick,
  emoji,
  label,
}: {
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-ink ring-1 ring-brand-200 transition-colors duration-200 hover:bg-brand-100"
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}

export default function CatInfo({ cat }: CatInfoProps) {
  const [showPhotoAlbum, setShowPhotoAlbum] = useState(false);
  const [showVideoAlbum, setShowVideoAlbum] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [catModalLoading, setCatModalLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const catService = getCatService();

  // Handle cat modal link clicks
  useEffect(() => {
    const handleCatModalClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('cat-modal-link')) {
        const catName = target.getAttribute('data-cat-name');
        if (catName) {
          setCatModalLoading(true);
          try {
            const catData = await catService.getCatByName(catName);
            if (catData) {
              setSelectedCat(catData);
            } else {
              console.warn(`Cat not found: ${catName}`);
            }
          } catch (error) {
            console.error('Error loading cat:', error);
          } finally {
            setCatModalLoading(false);
          }
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleCatModalClick);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleCatModalClick);
      }
    };
  }, [cat, catService]);

  return (
    <div ref={contentRef}>
      {/* Header: avatar, name, status badge */}
      <div className="flex flex-col items-center text-center">
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-brand-100">
          <Image
            src={cat.thumbnailUrl}
            alt={cat.name}
            width={128}
            height={128}
            className="h-full w-full object-cover"
            priority={true}
            sizes="128px"
            quality={85}
          />
        </div>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{cat.name}</h3>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {cat.status && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
              <span>{getStatusEmoji(cat.status)}</span>
              {cat.status}
            </span>
          )}
          {cat.adoptable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
              <span>🏡</span>
              입양 가능
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 space-y-4">
        {cat.description && <InfoBlock html={processTextWithLinks(cat.description)} />}
        {cat.date_of_birth && (
          <InfoRow label="출생연도">
            {cat.date_of_birth}
            {cat.dob_certainty && (
              <span className="ml-2 text-sm text-gray-500">
                ({cat.dob_certainty === 'certain' ? '확실함' : '불확실'})
              </span>
            )}
          </InfoRow>
        )}
        {cat.sex && <InfoRow label="성별">{cat.sex}</InfoRow>}
        {cat.dwelling && <InfoRow label="거주지">{cat.dwelling}</InfoRow>}
        {cat.character && <InfoBlock heading="성격:" html={processTextWithLinks(cat.character)} />}
        {cat.parents && <InfoRow label="엄마">{cat.parents}</InfoRow>}
        {cat.offspring && <InfoRow label="애">{cat.offspring}</InfoRow>}
        <InfoBlock heading="건강상태:" html={processTextWithLinks(cat.sickness || 'Unknown')} />
        <InfoRow label="중성화 여부">
          {cat.isNeutered === true ? 'O' : cat.isNeutered === false ? 'X' : '?'}
        </InfoRow>
        {cat.note && <InfoBlock heading="특이사항:" html={processTextWithLinks(cat.note)} />}

        {/* Album actions */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <AlbumButton onClick={() => setShowPhotoAlbum(true)} emoji="📸" label="사진 보기" />
          <AlbumButton onClick={() => setShowVideoAlbum(true)} emoji="🎬" label="동영상 보기" />
        </div>
      </div>

      {/* Photo Album Modal */}
      <PhotoAlbum
        isOpen={showPhotoAlbum}
        onClose={() => setShowPhotoAlbum(false)}
        catName={cat.name}
      />
      {/* Video Album Modal */}
      <VideoAlbum
        isOpen={showVideoAlbum}
        onClose={() => setShowVideoAlbum(false)}
        catName={cat.name}
      />
      {/* Nested Cat Modal */}
      {selectedCat && (
        <Modal onClose={() => setSelectedCat(null)} size="xl">
          <CatInfo cat={selectedCat} />
        </Modal>
      )}
      {/* Cat Modal Loading */}
      {catModalLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-400" />
        </div>
      )}
    </div>
  );
}
