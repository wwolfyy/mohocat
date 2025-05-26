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
            {/* Yellow label with point title */}
            <div
              className={cn(
                "bg-yellow-400 text-black text-xs font-semibold px-2 py-1 rounded-md shadow-lg",
                "cursor-pointer transition-transform duration-200 group-hover:scale-110",
                "whitespace-nowrap border border-gray-600"
              )}
            >
              {point.title}
            </div>
            
            {/* White circle indicator below the label */}
            <div
              className={cn(
                "w-4 h-4 bg-white rounded-full border-2 border-gray-600 mx-auto mt-1",
                "transition-transform duration-200 group-hover:scale-110"
              )}
            />
            
            {/* Hover effect - pulsing circle */}
            {activePoint?.id === point.id && (
              <div
                className={cn(
                  "absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2",
                  "border-2 border-yellow-400 rounded-full animate-pulse",
                  "top-1/2 left-1/2"
                )}
              />
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