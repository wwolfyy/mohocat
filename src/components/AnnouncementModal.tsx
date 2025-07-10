"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

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

    const koreaTime = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));

    return koreaTime.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return new Date().toLocaleString("ko-KR");
  }
};

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  isOpen,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Wait for animation to complete
  };

  if (!isOpen || !announcement) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black bg-opacity-50 transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden",
          "transform transition-transform duration-150",
          isVisible ? "scale-100" : "scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-yellow-600">📢 공지사항</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Title */}
          <h3 className="text-lg font-semibold mb-2">{announcement.title}</h3>

          {/* Date */}
          <p className="text-sm text-gray-500 mb-4">
            {formatKoreaDateTime(announcement.date, announcement.time, announcement.createdAt)}
          </p>

          {/* Message */}
          <div className="mb-6 whitespace-pre-wrap">{announcement.message}</div>

          {/* Images */}
          {announcement.imageUrls && announcement.imageUrls.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">이미지</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcement.imageUrls.map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt={`공지사항 이미지 ${index + 1}`}
                    className="w-full h-auto max-h-64 object-contain rounded border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {announcement.videoUrls && announcement.videoUrls.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">동영상</h4>
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
                            className="w-full h-full rounded"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                  }

                  return (
                    <video
                      key={index}
                      src={url}
                      controls
                      className="w-full max-h-64 rounded"
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
