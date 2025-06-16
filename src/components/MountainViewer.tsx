'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import type { Point, Cat } from '@/types';
import { cn } from '@/utils/cn';
import CatGallery from './CatGallery';

interface MountainViewerProps {
  points: Point[];
  cats: Cat[];
}

export default function MountainViewer({ points, cats }: MountainViewerProps) {
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(true);

  const [cssVariables, setCssVariables] = useState({
    // Default values, will be updated once image dimensions are known
    '--mobile-scale-factor': 1,
    '--mobile-point-counter-scale-factor': 1,
  });


  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setIsLoadingDimensions(false);
    };
    img.onerror = () => {
      console.error("Failed to load image for aspect ratio calculation. Using default 16:9 dimensions.");
      setImageNaturalDimensions({ width: 1600, height: 900 }); // Default to a 16:9 ratio
      setIsLoadingDimensions(false);
    };
    img.src = "/images/screenshot_mt_geyang_50.png"; // Ensure this path is correct
  }, []);

  useEffect(() => {
    if (imageNaturalDimensions) {
      const actualAspectRatio = imageNaturalDimensions.width / imageNaturalDimensions.height;

      // The parent of the scaled image container (ImageAndPointsPositioningContext, or IPPC)
      // is the CenteringWrapper. Before IPPC's own scale and before rotation,
      // CenteringWrapper has an aspect ratio of 9/16 (screen_width / (screen_width * 16/9)).
      const parentPreRotationAspectRatio = 9 / 16;
      let newMobileScaleFactor;

      if (actualAspectRatio > parentPreRotationAspectRatio) {
        // Image is wider than its pre-rotation parent container.
        // Its initial height H_img0 = screen_width / actualAspectRatio.
        // We want H_img0 * S = screen_width (for the visual width after rotation).
        // So, S = screen_width / H_img0 = actualAspectRatio.
        newMobileScaleFactor = actualAspectRatio;
      } else {
        // Image is narrower or same aspect ratio as its pre-rotation parent.
        // Its initial height H_img0 = screen_width * (16/9).
        // We want H_img0 * S = screen_width. So, S = screen_width / (screen_width * 16/9) = 9/16.
        newMobileScaleFactor = 9 / 16;
      }
      setCssVariables({
        '--mobile-scale-factor': newMobileScaleFactor,
        '--mobile-point-counter-scale-factor': newMobileScaleFactor > 0 ? 1 / newMobileScaleFactor : 9/16,
      });
    }
  }, [imageNaturalDimensions]);
  const handleMouseOver = (point: Point) => {
    setActivePoint(point);
  };
  const handleMouseLeave = () => {
    setActivePoint(null);
  };
  const handlePointClick = (point: Point) => {
    setSelectedPoint(point);
  };

  return (
    <div
      style={cssVariables as React.CSSProperties} // Apply CSS variables for dynamic scaling
      className={cn(
        "relative w-screen left-1/2 -translate-x-1/2", // Changed: Fill viewport width and center
        "aspect-[9/16]", // Mobile: Portrait aspect ratio (inverse of a 16:9 image)
        "md:aspect-[16/9]" // Desktop: Landscape aspect ratio
      )}
    >
      {isLoadingDimensions ? (
        <div className="w-full h-full flex justify-center items-center bg-gray-100">
          <p className="text-gray-500">Loading map...</p>
        </div>
      ) : (
        <>
          {/* This container handles the rotation */}
          <div
            className={cn(
              "absolute inset-0 origin-center",
              "rotate-90", // Mobile: rotate
              "md:rotate-0" // Desktop: no rotation
            )}
          >
            {/* This div centers the image content */}
            <div className="relative w-full h-full flex justify-center items-center">
              {/* This div is scaled and acts as positioning context */}
              <div className={cn(
                "relative", // Base
                "scale-[var(--mobile-scale-factor)]", // Mobile: dynamic scale
                "md:scale-100 md:w-full md:h-full" // Desktop: normal scale, full width/height of parent
              )}>
                <img
                  src="/images/screenshot_mt_geyang_50.png"
                  alt="Satellite view of mountain"
                  className={cn(
                    "block max-w-full max-h-full", // Mobile: Behaves like object-contain
                    "md:w-full md:h-full md:object-cover"
 , // Add rounded corners
 "rounded-lg")}
                />
                {/* Compass Image */}
                <img
                  src="/images/arrow_north.svg"
                  alt="Compass indicating North"
                  className={cn(
                    "absolute z-10", // Base classes
                    "w-4 h-6 bottom-4 left-4 top-auto right-auto", // Mobile: Smaller size, positioned relative to original bottom-left
                    "md:w-8 md:h-12 md:top-4 md:left-4 md:right-auto md:bottom-auto" // Desktop: Original size, top-left position
                  )}
                  title="North is up"
                />

                {/* Points */}
                {points.map((point) => (
                  <div
                    key={point.id}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 group",
                      "-rotate-90 origin-center", // Mobile: Counter-rotate point container
                      "scale-[var(--mobile-point-counter-scale-factor)] md:scale-100", // Mobile: Counter-scale
                      "md:rotate-0" // Desktop: No counter-rotation
                    )}
                    onMouseEnter={() => handleMouseOver(point)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handlePointClick(point)}
                  >
                    {/* White circle indicator - always centered in the PointWrapper */}
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                        "w-4 h-4 bg-white rounded-full border-2 border-gray-600",
                        "transition-transform duration-200 group-hover:scale-110"
                      )}
                    />

                    {/* Label - positioned relative to the centered circle */}
                    <div
                      className={cn(
                        "bg-yellow-400 text-black text-xs font-semibold px-2 py-1 rounded-md shadow-lg",
                        "cursor-pointer transition-transform duration-200 group-hover:scale-110",
                        "whitespace-nowrap border border-gray-600",
                        "absolute",
                        // Conditional positioning:
                        {
                          // Default: Label above point
                          "left-1/2 -translate-x-1/2 bottom-[calc(50%_+_0.75rem)]":
                            point.title !== "하느재 등산로 입구 부근" && point.title !== "공원 관리소 부근",

                          // "하느재 등산로 입구 부근": Right on mobile, Above on desktop
                          "top-1/2 -translate-y-1/2 left-[calc(50%_+_0.75rem)] md:left-1/2 md:-translate-x-1/2 md:bottom-[calc(50%_+_0.75rem)] md:top-auto md:translate-y-0":
                            point.title === "하느재 등산로 입구 부근",

                          // "공원 관리소 부근": Lower-Right on mobile, Above on desktop
                          // No -translate-y-1/2 for top on mobile as we want its top edge to align.
                          // No -translate-x-1/2 for left on mobile as we want its left edge to align.
                          "top-[calc(50%_+_0.75rem)] left-[calc(50%_+_0.75rem)] md:left-1/2 md:-translate-x-1/2 md:bottom-[calc(50%_+_0.75rem)] md:top-auto":
                            point.title === "공원 관리소 부근",
                        }
                      )}
                    >
                      {point.title}
                    </div>

                  {/*
                    Hover effect - also centered on the point.
                    It's larger, so it visually encompasses the circle and label.
                  */}
                  {activePoint?.id === point.id && (
                    <div
                      className={cn(
                        "absolute w-48 h-48 -translate-x-1/2 -translate-y-1/2",
                        "border-2 border-yellow-400 rounded-full animate-pulse",
                        "top-1/2 left-1/2" // Positioned relative to the main point container
                      )}
                    />
                  )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedPoint && (
            <CatGallery
              pointId={selectedPoint.id}
              cats={cats}
              onClose={() => setSelectedPoint(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
