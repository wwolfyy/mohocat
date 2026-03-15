'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/types';
import ReplyButton from './ReplyButton';
import ReplyForm from './ReplyForm';
import { IPostService } from '@/services';
import { cn } from '@/utils/cn';

interface AdminReplyItemProps {
  reply: Post;
  onReplySuccess: (newReply: Post) => void;
  onReplyDeleted: (replyId: string) => void;
  maxDepth?: number;
  postService: IPostService;
}

export default function AdminReplyItem({
  reply,
  onReplySuccess,
  onReplyDeleted,
  maxDepth = 3,
  postService,
}: AdminReplyItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [nestedReplies, setNestedReplies] = useState<Post[]>([]);
  const [showNestedReplies, setShowNestedReplies] = useState(false);
  const [loadingNested, setLoadingNested] = useState(false);
  const [nestedReplyCount, setNestedReplyCount] = useState(reply.replyCount || 0);
  const [isDeleting, setIsDeleting] = useState(false);

  const canReply = (reply.depth || 0) < maxDepth;
  const indentLevel = Math.min(reply.depth || 0, 3); // Max visual indent

  // Update nested reply count when reply.replyCount changes
  useEffect(() => {
    setNestedReplyCount(reply.replyCount || 0);
  }, [reply.replyCount]);

  const loadNestedReplies = async () => {
    if (nestedReplies.length > 0) return; // Already loaded

    setLoadingNested(true);
    try {
      console.log('Loading nested replies for reply:', reply.id);
      const fetchedNestedReplies = await postService.getReplies(reply.id);
      console.log('Fetched nested replies:', fetchedNestedReplies);
      setNestedReplies(fetchedNestedReplies);
    } catch (error) {
      console.error('Error loading nested replies:', error);
    } finally {
      setLoadingNested(false);
    }
  };

  const handleToggleNestedReplies = () => {
    if (!showNestedReplies && nestedReplies.length === 0 && nestedReplyCount > 0) {
      loadNestedReplies();
    }
    setShowNestedReplies(!showNestedReplies);
  };

  const handleReplySuccess = (newReply: Post) => {
    // Add the new reply to nested replies
    setNestedReplies((prev) => [...prev, newReply]);
    setNestedReplyCount((prev) => prev + 1);
    setShowReplyForm(false);
    setShowNestedReplies(true); // Automatically show nested replies when a new one is added
    // Notify parent about the new reply
    onReplySuccess(newReply);
  };

  const handleNestedReplySuccess = (newReply: Post) => {
    // When a deeply nested reply is created, just pass it up and update count
    setNestedReplyCount((prev) => prev + 1);
    onReplySuccess(newReply);
  };

  const handleNestedReplyDeleted = (replyId: string) => {
    // Remove from local state
    setNestedReplies((prev) => prev.filter((r) => r.id !== replyId));
    setNestedReplyCount((prev) => prev - 1);
    // Notify parent
    onReplyDeleted(replyId);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this reply? This will also delete all nested replies.'
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await postService.deleteReply(reply.id);
      onReplyDeleted(reply.id);
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Failed to delete reply. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`mt-3 ${indentLevel > 0 ? `ml-${indentLevel * 4} border-l-2 border-gray-200 pl-4` : ''}`}
    >
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Reply content */}
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <p className="text-gray-800 mb-2">{reply.message}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{reply.username}</span>
                <span>•</span>
                <span>
                  {reply.date} {reply.time}
                </span>
                {reply.depth && reply.depth > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">댓글</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admin controls and reply actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {canReply && (
              <ReplyButton
                postId={reply.id}
                replyCount={nestedReplyCount}
                onToggleReply={() => setShowReplyForm(!showReplyForm)}
                showingReplies={false}
                showingReplyForm={showReplyForm}
              />
            )}

            {/* Show nested replies button */}
            {nestedReplyCount > 0 && (
              <button
                onClick={handleToggleNestedReplies}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                disabled={loadingNested}
              >
                {loadingNested
                  ? '로딩 중...'
                  : showNestedReplies
                    ? '답글 숨기기'
                    : `답글 ${nestedReplyCount}개 보기`}
              </button>
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600',
              'transition-colors duration-200',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <ReplyForm
            parentId={reply.id}
            parentUsername={reply.username}
            onReplySuccess={handleReplySuccess}
            onCancel={() => setShowReplyForm(false)}
            depth={reply.depth || 0}
            postService={postService}
          />
        )}

        {/* Nested replies */}
        {showNestedReplies && nestedReplies.length > 0 && (
          <div className="mt-3">
            {nestedReplies.map((nestedReply) => (
              <AdminReplyItem
                key={nestedReply.id}
                reply={nestedReply}
                onReplySuccess={handleNestedReplySuccess}
                onReplyDeleted={handleNestedReplyDeleted}
                maxDepth={maxDepth}
                postService={postService}
              />
            ))}
          </div>
        )}

        {showNestedReplies &&
          nestedReplies.length === 0 &&
          !loadingNested &&
          nestedReplyCount > 0 && (
            <div className="text-gray-500 text-sm py-4 ml-4">답글을 불러올 수 없습니다.</div>
          )}
      </div>
    </div>
  );
}
