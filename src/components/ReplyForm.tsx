'use client';

import { useState } from 'react';
import { getPostService } from '@/services';
import { useAuth } from '@/hooks/useAuth';

interface ReplyFormProps {
  parentId: string;
  parentUsername: string;
  onReplySuccess: (reply: any) => void;
  onCancel: () => void;
  depth?: number;
}

export default function ReplyForm({
  parentId,
  parentUsername,
  onReplySuccess,
  onCancel,
  depth = 0
}: ReplyFormProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();

  const postService = getPostService();

  // Don't render if not authenticated
  if (loading) {
    return (
      <div className="mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
        <div className="text-sm text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-3 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
        <div className="text-sm text-gray-600">
          댓글을 작성하려면 로그인이 필요합니다.
          <button
            onClick={onCancel}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    if (!user?.email) {
      alert('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const replyData = {
        parentId,
        message: message.trim(),
        username: user.email, // Use authenticated user's email
        date: now.toLocaleDateString('ko-KR'),
        time: now.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        title: `Re: ${parentUsername}님의 글`, // Auto-generated title for replies
      };

      const newReply = await postService.createReply(replyData);
      onReplySuccess(newReply);
      setMessage('');
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400 ${
      depth > 0 ? 'ml-4' : ''
    }`}>
      <div className="text-sm text-gray-600 mb-3">
        <span className="font-medium">{parentUsername}</span>님의 글에 댓글을 작성합니다
        <div className="text-xs text-blue-600 mt-1">
          작성자: {user?.email}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            placeholder="댓글을 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting ? '작성 중...' : '댓글 작성'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
