'use client';

import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import PostMedia from './PostMedia';

/**
 * The site-visit popup, for whichever post kind is flagged to pop up.
 *
 * Was `AnnouncementModal`, hard-wired to 공지사항 down to the title. Generalised
 * 2026-07-31 when 입양홍보 gained the same 팝업 toggle — a second near-identical
 * modal was the obvious wrong answer, given this codebase's history with
 * copy-renamed twins that drift.
 */

export type PostModalKind = 'announcement' | 'adoption';

/** Title bar per kind. The emoji is the only visual difference. */
const KIND_TITLES: Record<PostModalKind, string> = {
  announcement: '📢 공지사항',
  adoption: '🐾 입양홍보',
};

interface PostModalProps {
  post: any;
  kind: PostModalKind;
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

const PostModal: React.FC<PostModalProps> = ({ post, kind, isOpen, onClose }) => {
  if (!isOpen || !post) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={KIND_TITLES[kind]} size="xl">
      {/* Content */}
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{post.title}</h3>

        {/* Date */}
        <p className="mb-4 text-sm text-gray-500">
          {formatKoreaDateTime(post.date, post.time, post.createdAt)}
        </p>

        {/* Message */}
        <div className="mb-6 whitespace-pre-wrap text-gray-700">{post.message}</div>

        <PostMedia
          imageUrls={post.imageUrls}
          videoUrls={post.videoUrls}
          label={kind === 'adoption' ? '입양홍보' : '공지사항'}
        />
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

export default PostModal;
