'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Point } from '@/types';
import { cn } from '@/utils/cn';
import CatGallery from './CatGallery';

export default function MountainViewer() {
  const [points, setPoints] = useState<Point[]>([]);
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  useEffect(() => {
    const loadPoints = async () => {
      try {
        console.log('Loading points from Firestore...');
        const pointsCollection = collection(db, 'points');
        const pointsSnapshot = await getDocs(pointsCollection);
        console.log('Points snapshot:', pointsSnapshot);
        const pointsData = pointsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Point document:', { id: doc.id, data });
          return {
            id: doc.id,
            ...data
          };
        }) as Point[];
        console.log('Processed points data:', pointsData);
        setPoints(pointsData);
      } catch (error) {
        console.error('Error loading points:', error);
      }
    };

    loadPoints();
  }, []);

  const handleMouseOver = (point: Point) => {
    console.log('MouseOver triggered for point:', point.id);
    setActivePoint(point);
  };

  const handleMouseLeave = () => {
    console.log('MouseLeave triggered');
    setActivePoint(null);
  };

  const handlePointClick = (point: Point) => {
    console.log('Click triggered for point:', point.id);
    setSelectedPoint(point);
  };

  return (
    <div className="relative w-full">
      <div className="w-full aspect-[16/9] relative">
        <img
          src="/images/screenshot_mt_geyang_50.png"
          alt="Satellite view of mountain"
          className="absolute inset-0 w-full h-full object-contain"
        />
        {/* Debug info */}
        {/* <div className="absolute top-0 left-0 bg-black/50 text-white p-2 z-50">
          Points loaded: {points.length}
          Active point: {activePoint?.id || 'none'}
        </div> */}

        {points.map((point) => (
          <div
            key={point.id}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            onMouseEnter={() => handleMouseOver(point)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handlePointClick(point)}
          >
            <div
              className={cn(
                "w-8 h-8 bg-red-500 rounded-full cursor-pointer ring-4 ring-white",
                "transition-transform duration-200 group-hover:scale-110"
              )}
            />
            {activePoint?.id === point.id && (
              <>
                <div
                  className={cn(
                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
                    "text-black font-semibold text-sm whitespace-nowrap",
                    "bg-yellow-400 rounded-full px-2 py-1 z-10 shadow-lg"
                  )}
                >
                  {point.title}
                </div>
                <div
                  className={cn(
                    "absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2",
                    "border-2 border-white rounded-full animate-pulse"
                  )}
                  style={{ left: '50%', top: '50%' }}
                />
              </>
            )}
          </div>
        ))}

        {selectedPoint && (
          <CatGallery
            pointId={selectedPoint.id}
            onClose={() => setSelectedPoint(null)}
          />
        )}
      </div>
    </div>
  );
}