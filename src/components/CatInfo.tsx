'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';
import PhotoAlbum from './PhotoAlbum';
import VideoAlbum from './VideoAlbum';

interface Cat {
  id: string;
  name: string;
  thumbnailUrl: string;
  description?: string;
  date_of_birth?: string;
  sex?: string;
  dwelling?: string;
  status?: string;
  character?: string;
  parents?: string;
  offspring?: string;
  sickness?: string;
  isNeutered?: boolean;
  note?: string;
}

interface CatInfoProps {
  cat: Cat;
}

const getStatusEmoji = (status?: string) => {
  const statusToEmoji: Record<string, string> = {
    '산냥이': 'ᨒ',
    '집냥이': '🏠',
    '별냥이': '🌈',
    '행방불명': '❓'
  };
  return statusToEmoji[status || ''] || '❓';
};

export default function CatInfo({ cat }: CatInfoProps) {
  const [showPhotoAlbum, setShowPhotoAlbum] = useState(false);
  const [showVideoAlbum, setShowVideoAlbum] = useState(false);

  return (
    <div className="p-4">
      <div className="flex justify-center mb-4">
        <img
          src={cat.thumbnailUrl}
          alt={cat.name}
          className="w-32 h-32 rounded-full object-cover"
        />
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold bg-white/80 py-2">{cat.name}</h3>

        {cat.description && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700"></h4>
            {/* <p className="mt-2 text-gray-600">{cat.description}</p> */}
            <p className="mt-2 text-gray-600" style={{ whiteSpace: 'pre-line' }}>{cat.description}</p>
          </div>
        )}

        {cat.date_of_birth && (
          <div className="flex items-center">
            <span className="w-24 font-semibold text-gray-700">출생연도:</span>
            <span className="text-gray-600">{cat.date_of_birth}</span>
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
            {/* <p className="text-gray-600">{cat.character}</p> */}
            <p className="mt-2 text-gray-600" style={{ whiteSpace: 'pre-line' }}>{cat.character}</p>
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
          {/* <p className="text-gray-600">{cat.sickness || 'Unknown'}</p> */}
          <p className="mt-2 text-gray-600" style={{ whiteSpace: 'pre-line' }}>{cat.sickness || 'Unknown'}</p>
        </div>

        <div className="flex items-center">
          <span className="w-24 font-semibold text-gray-700">중성화 여부:</span>
          <span className="text-gray-600">{cat.isNeutered ? 'O' : 'X'}</span>
        </div>

        {cat.note && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700">특이사항:</h4>
            {/* <p className="mt-2 text-gray-600">{cat.note}</p> */}
            <p className="mt-2 text-gray-600" style={{ whiteSpace: 'pre-line' }}>{cat.note}</p>
          </div>
        )}        <div className="flex items-center">
          <span className="w-24 font-semibold text-gray-700">사진첩:</span>
          <button
            onClick={() => setShowPhotoAlbum(true)}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
          >
            사진 보기 📸
          </button>
        </div>        <div className="flex items-center">
          <span className="w-24 font-semibold text-gray-700">동영상:</span>
          <button
            onClick={() => setShowVideoAlbum(true)}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
          >
            동영상 보기 🎬
          </button>
        </div>
      </div>      {/* Photo Album Modal */}
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
    </div>
  );
}