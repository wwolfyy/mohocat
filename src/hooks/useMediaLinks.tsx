'use client';

import { RefObject, useEffect, useState } from 'react';
import type { CatImage, CatVideo } from '@/types/media';
import Lightbox from '@/components/ui/Lightbox';
import VideoPlayer from '@/components/ui/VideoPlayer';

const isYouTubeUrl = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url);

/** Build a minimal CatImage for the Lightbox from a bare image URL. */
const imageFromUrl = (url: string): CatImage => ({
  id: url,
  imageUrl: url,
  fileName: '',
  storagePath: '',
  tags: [],
  uploadDate: new Date(),
  uploadedBy: '',
});

/** Build a minimal CatVideo for the VideoPlayer from a bare video URL. */
const videoFromUrl = (url: string): CatVideo => ({
  id: url,
  videoUrl: url,
  storagePath: '',
  tags: [],
  uploadDate: new Date(),
  uploadedBy: '',
  videoType: isYouTubeUrl(url) ? 'youtube' : 'storage',
});

/**
 * Attaches a delegated click listener to `ref` that opens inline media links
 * ([img:label](url) → Lightbox, [video:label](url) → VideoPlayer) rendered by
 * `processTextWithLinks`. Returns the viewer overlays to render. Shared by
 * `CatInfo` and `CatLinkedText` so any processed text carries working media
 * links without duplicating the open-logic. (Cat-modal links stay handled by
 * each host — see follow-up to consolidate those too.)
 */
export function useMediaLinks(ref: RefObject<HTMLElement>) {
  const [image, setImage] = useState<CatImage | null>(null);
  const [video, setVideo] = useState<CatVideo | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const url = target.getAttribute('data-media-url');
      if (!url) return;

      if (target.classList.contains('cat-image-link')) {
        setImage(imageFromUrl(url));
      } else if (target.classList.contains('cat-video-link')) {
        setVideo(videoFromUrl(url));
      }
    };

    const el = ref.current;
    el?.addEventListener('click', handleClick);
    return () => el?.removeEventListener('click', handleClick);
  }, [ref]);

  const noop = () => {};

  const mediaOverlays = (
    <>
      {image && (
        <Lightbox
          image={image}
          onClose={() => setImage(null)}
          onPrevious={noop}
          onNext={noop}
          hasPrevious={false}
          hasNext={false}
        />
      )}
      {video && (
        <VideoPlayer
          video={video}
          onClose={() => setVideo(null)}
          onPrevious={noop}
          onNext={noop}
          hasPrevious={false}
          hasNext={false}
        />
      )}
    </>
  );

  return { mediaOverlays };
}
