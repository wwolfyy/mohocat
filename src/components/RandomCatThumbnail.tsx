"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getCatService } from "@/services";
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
  const [imageLoaded, setImageLoaded] = useState(false);

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

  // Reset image loaded state when cat changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [selectedCat]);

  // If loading or no cats, show nothing
  if (loading || !selectedCat) {
    return null;
  }

  // If image failed to load, show nothing (fallback to default map behavior)
  if (imageError) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden",
        "transition-transform duration-200 group-hover:scale-110",
        "bg-gray-200", // Fallback background while image loads
        // Only show and animate when image is loaded
        imageLoaded ? "animate-bubble-pop" : "opacity-0 scale-0",
        className
      )}
      title={`${selectedCat.name} ${selectedCat.alt_name ? `(${selectedCat.alt_name})` : ''}`}
    >
      <Image
        src={selectedCat.thumbnailUrl}
        alt={selectedCat.name}
        width={40}
        height={40}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        onLoad={() => {
          setImageLoaded(true);
          setImageError(false);
        }}
        priority={true} // Prioritize loading for better UX
        sizes="40px" // Specify exact size for optimization
        quality={85} // Optimize for good quality vs file size balance
      />
    </div>
  );
}