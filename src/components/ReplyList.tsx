'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/types';
import { getPostService } from '@/services';
import ReplyItem from './ReplyItem';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ReplyListProps {
  postId: string;
  replyCount?: number;
  onReplyCountUpdate: (count: number) => void;
}

export default function ReplyList({ postId, replyCount = 0, onReplyCountUpdate }: ReplyListProps) {
  const [replies, setReplies] = useState<Post[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loading, setLoading] = useState(false);

  const postService = getPostService();

  const loadReplies = async () => {
    if (replies.length > 0) return; // Already loaded

    console.log('ReplyList: Loading replies for postId:', postId);
    setLoading(true);
    try {
      const fetchedReplies = await postService.getReplies(postId);
      console.log('ReplyList: Fetched replies:', fetchedReplies);
      setReplies(fetchedReplies);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (!showReplies && replies.length === 0) {
      loadReplies();
    }
    setShowReplies(!showReplies);
  };

  const handleReplySuccess = (newReply: Post) => {
    setReplies(prev => [...prev, newReply]);
    onReplyCountUpdate(replyCount + 1);
  };

  if (replyCount === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleToggleReplies}
        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
        disabled={loading}
      >
        {showReplies ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
        <span>
          {loading
            ? '로딩 중...'
            : showReplies
              ? '댓글 숨기기'
              : `댓글 ${replyCount}개 보기`
          }
        </span>
      </button>

      {showReplies && (
        <div className="mt-2">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              onReplySuccess={handleReplySuccess}
            />
          ))}

          {replies.length === 0 && !loading && (
            <div className="text-gray-500 text-sm py-4">
              댓글이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
