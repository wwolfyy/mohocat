'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';
import { Cat } from '@/types';
import { processTextWithLinks } from '@/utils/text-processing';
import { getCatService } from '@/services';
import { XMarkIcon } from '@heroicons/react/24/outline';
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
    <div className="p-4" ref={contentRef}>
      <div className="flex justify-center mb-4">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <Image
            src={cat.thumbnailUrl}
            alt={cat.name}
            width={128}
            height={128}
            className="w-full h-full object-cover"
            priority={true}
            sizes="128px"
            quality={85}
          />
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold bg-white/80 py-2">{cat.name}</h3>
        {cat.description && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700"></h4>
            <div
              className="mt-2 text-gray-600 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: processTextWithLinks(cat.description) }}
            />
          </div>
        )}
        {cat.date_of_birth && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">출생연도:</span>
            <span className="text-gray-600">
              {cat.date_of_birth}
              {cat.dob_certainty && (
                <span className="ml-2 text-sm text-gray-500">
                  ({cat.dob_certainty === 'certain' ? '확실함' : '불확실'})
                </span>
              )}
            </span>
          </div>
        )}
        {cat.sex && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">성별:</span>
            <span className="text-gray-600">{cat.sex}</span>
          </div>
        )}
        {cat.dwelling && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">거주지:</span>
            <span className="text-gray-600">{cat.dwelling}</span>
          </div>
        )}
        {cat.status && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">현상태:</span>
            <span className="text-gray-600">
              {getStatusEmoji(cat.status)} {cat.status}
            </span>
          </div>
        )}
        {cat.character && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700">성격:</h4>
            <div
              className="mt-2 text-gray-600 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: processTextWithLinks(cat.character) }}
            />
          </div>
        )}
        {cat.parents && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">엄마:</span>
            <span className="text-gray-600">{cat.parents}</span>
          </div>
        )}
        {cat.offspring && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">애:</span>
            <span className="text-gray-600">{cat.offspring}</span>
          </div>
        )}
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700">건강상태:</h4>
          <div
            className="mt-2 text-gray-600 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: processTextWithLinks(cat.sickness || 'Unknown') }}
          />
        </div>
        <div className="flex items-center">
          <span className="w-24 font-semibold text-gray-700">중성화 여부:</span>
          <span className="text-gray-600">
            {cat.isNeutered === true ? 'O' : cat.isNeutered === false ? 'X' : '?'}
          </span>
        </div>
        {cat.note && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700">특이사항:</h4>
            <div
              className="mt-2 text-gray-600 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: processTextWithLinks(cat.note) }}
            />
          </div>
        )}{' '}
        <div className="flex items-center">
          <span className="w-24 font-semibold text-gray-700">사진첩:</span>
          <button
            onClick={() => setShowPhotoAlbum(true)}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
          >
            사진 보기 📸
          </button>
        </div>{' '}
        <div className="flex items-center">
          <span className="w-24 font-semibold text-gray-700">동영상:</span>
          <button
            onClick={() => setShowVideoAlbum(true)}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
          >
            동영상 보기 🎬
          </button>
        </div>
      </div>{' '}
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
        <div
          className="fixed inset-0 bg-black/85 flex items-start justify-center z-[70] overflow-y-auto py-4"
          onClick={() => setSelectedCat(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative my-auto min-h-fit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedCat(null)}
              className={cn(
                'absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600',
                'text-white rounded font-bold hover:shadow-lg transition-all duration-200',
                'flex items-center justify-center z-10'
              )}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <CatInfo cat={selectedCat} />
          </div>
        </div>
      )}
      {/* Cat Modal Loading */}
      {catModalLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      )}
    </div>
  );
}
