'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Cat } from '@/types';
import { processTextWithLinks } from '@/utils/text-processing';
import { getCatService } from '@/services';
import { useMediaLinks } from '@/hooks/useMediaLinks';
import Modal from './ui/Modal';
import PhotoAlbum from './PhotoAlbum';
import VideoAlbum from './VideoAlbum';
import { useMountain } from '@/components/MountainProvider';
import { buildCatLink } from '@/utils/cat-link';

interface CatInfoProps {
  cat: Cat;
}

const getStatusEmoji = (status?: string) => {
  const statusToEmoji: Record<string, string> = {
    산냥이: 'ᨒ',
    쉼터냥이: '🫶',
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
      {heading && <h4 className="mb-1 text-sm font-semibold text-gray-500">{heading}</h4>}
      <div
        className="whitespace-pre-line text-gray-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * 이 냥이 링크 chip — hands the visitor a link straight to this cat.
 *
 * Exists because the `?cat=<id>` deep link is only useful if a human can get one
 * without looking an id up in Firebase. On a phone this opens the OS share sheet
 * (one tap into a KakaoTalk chat, which is where these links actually go); where
 * that is unavailable it copies to the clipboard instead.
 */
function ShareCatButton({ cat }: { cat: Cat }) {
  const mountainId = useMountain();
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  // Capability check runs after mount: `navigator` does not exist during SSR,
  // and branching the label during render would be a hydration mismatch.
  const [useShareSheet, setUseShareSheet] = useState(false);
  useEffect(() => {
    // ⚠️ Gate on "is a share sheet the right affordance here", NOT merely on
    // "does navigator.share exist" — desktop Chrome exposes it and then refuses
    // it. Measured on macOS Chrome: share rejects `NotAllowedError — Permission
    // denied`, while clipboard writes resolve fine. And where the sheet does
    // open on a desktop, dismissing it yields AbortError, which is silent by
    // design (below) — so the button just looked dead. Touch devices are both
    // where the sheet works and where it is worth having: one tap into a
    // KakaoTalk chat instead of copy-switch-paste.
    setUseShareSheet(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        window.matchMedia('(pointer: coarse)').matches
    );
  }, []);

  useEffect(() => {
    if (feedback === 'idle') return;
    const t = setTimeout(() => setFeedback('idle'), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('copied');
    } catch (error) {
      // Clipboard access can be refused (insecure context, permissions). Say so
      // rather than leave a button that looks like it worked.
      console.error('Error copying cat link:', error);
      setFeedback('failed');
    }
  };

  const handleClick = () => {
    const url = buildCatLink(window.location.origin, window.location.pathname, mountainId, cat.id);

    // ⚠️ `navigator.share` needs transient activation, so it must be called
    // synchronously in this handler — `await` anything first and iOS Safari
    // rejects with NotAllowedError.
    if (useShareSheet && typeof navigator.share === 'function') {
      navigator.share({ title: cat.name, url }).catch((error: unknown) => {
        // 🔑 Dismissing the share sheet rejects with AbortError. That is the
        // visitor changing their mind, not a failure — it must not log or show
        // an error. Everything else is real, so fall back to copying rather
        // than appearing to have shared.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error sharing cat link:', error);
        void copyToClipboard(url);
      });
      return;
    }

    void copyToClipboard(url);
  };

  const label =
    feedback === 'copied'
      ? '복사했어요'
      : feedback === 'failed'
        ? '복사하지 못했어요'
        : useShareSheet
          ? '링크 공유'
          : '링크 복사';

  return (
    <AlbumButton onClick={handleClick} emoji={feedback === 'copied' ? '✅' : '🔗'} label={label} />
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
  const { mediaOverlays } = useMediaLinks(contentRef);

  const mountainId = useMountain();
  const catService = getCatService(mountainId);

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
      <div className="mt-6 space-y-5">
        {/* Intro description (free text, no heading) */}
        {cat.description && <InfoBlock html={processTextWithLinks(cat.description)} />}

        {/* Structured facts — grouped in one aligned panel */}
        <div className="space-y-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
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
          <InfoRow label="중성화 여부">
            {cat.isNeutered === true ? 'O' : cat.isNeutered === false ? 'X' : '?'}
          </InfoRow>
          {cat.parents && <InfoRow label="엄마">{cat.parents}</InfoRow>}
          {cat.offspring && <InfoRow label="애">{cat.offspring}</InfoRow>}
        </div>

        {/* Prose sections — consistent headed blocks */}
        {cat.adoption_info && (
          <InfoBlock heading="입양정보" html={processTextWithLinks(cat.adoption_info)} />
        )}
        {cat.name_origin && (
          <InfoBlock heading="작명 사유" html={processTextWithLinks(cat.name_origin)} />
        )}
        {cat.character && <InfoBlock heading="성격" html={processTextWithLinks(cat.character)} />}
        <InfoBlock heading="건강상태" html={processTextWithLinks(cat.sickness || 'Unknown')} />
        {cat.note && <InfoBlock heading="특이사항" html={processTextWithLinks(cat.note)} />}

        {/* Album actions */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <AlbumButton onClick={() => setShowPhotoAlbum(true)} emoji="📸" label="사진 보기" />
          <AlbumButton onClick={() => setShowVideoAlbum(true)} emoji="🎬" label="동영상 보기" />
          <ShareCatButton cat={cat} />
        </div>
      </div>

      {/* Inline media links ([img:…] / [video:…]) → Lightbox / VideoPlayer */}
      {mediaOverlays}

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
