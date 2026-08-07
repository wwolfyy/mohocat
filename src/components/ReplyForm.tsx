'use client';

import { useState } from 'react';
import { IPostService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';

interface ReplyFormProps {
  parentId: string;
  parentUsername: string;
  onReplySuccess: (reply: any) => void;
  onCancel: () => void;
  depth?: number;
  postService: IPostService;
}

export default function ReplyForm({
  parentId,
  parentUsername,
  onReplySuccess,
  onCancel,
  depth = 0,
  postService,
}: ReplyFormProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();

  // Don't render if not authenticated
  if (loading) {
    return (
      <div className="mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-brand-300">
        <div className="text-sm text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-3 p-4 bg-brand-50 rounded-lg border-l-4 border-brand-300">
        <div className="text-sm text-gray-600">
          댓글을 작성하려면 로그인이 필요해요.
          <button onClick={onCancel} className="ml-2 text-brand-700 hover:text-brand-800 underline">
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
        // ⚠️ A reply is a document in the SAME collection as the post it hangs
        // under, so the post rules govern it — including the create rule's
        // "you may only author as yourself" check. Without this a member's
        // reply would be denied while their post succeeded (2026-08-02).
        ...(user.uid ? { authorUid: user.uid } : {}),
        date: now.toLocaleDateString('ko-KR'),
        time: now.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        title: `Re: ${parentUsername}님의 글`, // Auto-generated title for replies
        depth: depth + 1, // Increment depth for nested replies
      };

      console.log('Creating reply with data:', replyData);
      const newReply = await postService.createReply(replyData);
      console.log('Created reply:', newReply);
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
    <div
      className={`mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-brand-300 ${
        depth > 0 ? 'ml-4' : ''
      }`}
    >
      <div className="text-sm text-gray-600 mb-3">
        <span className="font-medium">{parentUsername}</span>
        님의 글에 댓글을 작성합니다
        <div className="text-xs text-brand-600 mt-1">작성자: {user?.email}</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            placeholder="댓글을 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex space-x-2">
          <Button type="submit" variant="primary" disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? '작성 중...' : '댓글 작성'}
          </Button>

          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
