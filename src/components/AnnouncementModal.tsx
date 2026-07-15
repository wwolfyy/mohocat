'use client';

import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface AnnouncementModalProps {
  announcement: any;
  isOpen: boolean;
  onClose: () => void;
}

// Utility function to format Korea time
const formatKoreaDateTime = (date: string, time: string, createdAt?: any) => {
  try {
    let targetDate: Date | null = null;

    if (date && time) {
      const utcDateTime = new Date(`${date}T${time}Z`);
      if (!isNaN(utcDateTime.getTime())) {
        targetDate = utcDateTime;
      } else {
        const localDateTime = new Date(`${date}T${time}`);
        if (!isNaN(localDateTime.getTime())) {
          targetDate = localDateTime;
        }
      }
    }

    if (!targetDate && createdAt) {
      if (createdAt instanceof Date) {
        targetDate = createdAt;
      } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        const parsedDate = new Date(createdAt);
        if (!isNaN(parsedDate.getTime())) {
          targetDate = parsedDate;
        }
      } else if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        targetDate = createdAt.toDate();
      }
    }

    if (!targetDate) {
      targetDate = new Date();
    }

    const koreaTime = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000);

    return koreaTime.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toLocaleString('ko-KR');
  }
};

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, isOpen, onClose }) => {
  if (!isOpen || !announcement) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📢 공지사항" size="xl">
      {/* Content */}
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{announcement.title}</h3>

        {/* Date */}
        <p className="mb-4 text-sm text-gray-500">
          {formatKoreaDateTime(announcement.date, announcement.time, announcement.createdAt)}
        </p>

        {/* Message */}
        <div className="mb-6 whitespace-pre-wrap text-gray-700">{announcement.message}</div>

        {/* Images */}
        {announcement.imageUrls && announcement.imageUrls.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 font-medium text-gray-700">이미지</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {announcement.imageUrls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url}
                  alt={`공지사항 이미지 ${index + 1}`}
                  className="h-auto max-h-64 w-full rounded-lg border object-contain"
                />
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {announcement.videoUrls && announcement.videoUrls.length > 0 && (
          <div>
            <h4 className="mb-2 font-medium text-gray-700">동영상</h4>
            <div className="space-y-4">
              {announcement.videoUrls.map((url: string, index: number) => {
                const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

                if (isYouTube) {
                  // Extract YouTube video ID
                  const videoId = url.includes('youtu.be')
                    ? url.split('youtu.be/')[1]?.split('?')[0]
                    : url.split('v=')[1]?.split('&')[0];

                  if (videoId) {
                    return (
                      <div key={index} className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={`공지사항 동영상 ${index + 1}`}
                          className="h-full w-full rounded-lg"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                }

                return (
                  <video key={index} src={url} controls className="max-h-64 w-full rounded-lg">
                    Your browser does not support the video tag.
                  </video>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 border-t pt-4">
        <Button className="w-full" onClick={onClose}>
          확인
        </Button>
      </div>
    </Modal>
  );
};

export default AnnouncementModal;
