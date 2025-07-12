"use client";

import { useState, useEffect, useMemo } from "react";
import { getCatService } from "@/services";
import { thumbnailPreloader } from "@/services/thumbnailPreloader";
import type { Cat } from "@/types";
import { cn } from "@/utils/cn";

interface RandomCatThumbnailProps {
  pointId: string;
  className?: string;
}

// Simple cache to avoid refetching cats for the same point
const catCache = new Map<string, Cat[]>();

export default function RandomCatThumbnail({ pointId, className }: RandomCatThumbnailProps) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [thumbnailReady, setThumbnailReady] = useState(false);

  // Fetch cats for this point
  useEffect(() => {
    const loadCats = async () => {
      try {
        setLoading(true);

        // Check cache first
        if (catCache.has(pointId)) {
          setCats(catCache.get(pointId)!);
          setLoading(false);
          return;
        }

        const catService = getCatService();
        const { current } = await catService.getCatsByPointId(pointId);

        // Cache the result
        catCache.set(pointId, current);
        setCats(current);
      } catch (error) {
        console.error(`Error loading cats for point ${pointId}:`, error);
        setCats([]);
      } finally {
        setLoading(false);
      }
    };

    loadCats();
  }, [pointId]);

  // Memoize the selected cat to prevent re-randomization on every render
  const selectedCat = useMemo(() => {
    if (cats.length === 0) return null;

    // Filter cats that have thumbnails
    const catsWithThumbnails = cats.filter(cat => cat.thumbnailUrl && cat.thumbnailUrl.trim() !== '');

    if (catsWithThumbnails.length === 0) return null;

    // Select a truly random cat (changes on each page load)
    const randomIndex = Math.floor(Math.random() * catsWithThumbnails.length);
    const selectedCat = catsWithThumbnails[randomIndex];

    return selectedCat;
  }, [cats, pointId]);

  // Wait for the selected cat's thumbnail to be ready before showing animation
  useEffect(() => {
    const waitForThumbnail = async () => {
      if (!selectedCat?.thumbnailUrl) {
        setThumbnailReady(false);
        return;
      }

      try {
        // Always wait for the thumbnail to be loaded, even if preloader thinks it's ready
        // This ensures the actual image is loaded in the browser, not just cached by preloader
        await thumbnailPreloader.waitForThumbnail(selectedCat.thumbnailUrl);

        // Additional check: ensure the image is actually loadable right now
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image failed to load'));
          img.src = selectedCat.thumbnailUrl;
        });

        setThumbnailReady(true);
      } catch (error) {
        console.error('Error loading thumbnail:', error);
        setThumbnailReady(false);
      }
    };

    waitForThumbnail();
  }, [selectedCat]);

  // If loading, no cats, no thumbnails available, or thumbnail not ready, show the default dot
  if (loading || !selectedCat || imageError || !thumbnailReady) {
    return (
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-10 h-10 bg-white rounded-full border-2 border-gray-600",
          "transition-transform duration-200 group-hover:scale-110",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute top-1/2 left-1/2",
        "w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden",
        "transition-transform duration-200 group-hover:scale-110",
        "bg-gray-200", // Fallback background while image loads
        "animate-bubble-pop", // Bubble pop animation with built-in centering
        className
      )}
      title={`${selectedCat.name} ${selectedCat.alt_name ? `(${selectedCat.alt_name})` : ''}`}
    >
      <img
        src={selectedCat.thumbnailUrl}
        alt={selectedCat.name}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
}