'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/types';
import ReplyButton from './ReplyButton';
import ReplyForm from './ReplyForm';
import { IPostService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { isAuthoredBy } from '@/utils/postAuthor';
import { useDialog } from '@/components/ui/useDialog';

interface ReplyItemProps {
  reply: Post;
  onReplySuccess: (newReply: Post) => void;
  maxDepth?: number;
  postService: IPostService;
  /**
   * Tell the list this reply is gone, so it drops the row and lowers its count
   * (2026-08-04). Optional: nested replies render without one, and a nested delete
   * is reported through the same callback the parent already passes down.
   */
  onReplyDeleted?: (replyId: string) => void;
}

export default function ReplyItem({
  reply,
  onReplySuccess,
  maxDepth = 3,
  postService,
  onReplyDeleted,
}: ReplyItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [nestedReplies, setNestedReplies] = useState<Post[]>([]);
  const [showNestedReplies, setShowNestedReplies] = useState(false);
  const [loadingNested, setLoadingNested] = useState(false);
  const [nestedReplyCount, setNestedReplyCount] = useState(reply.replyCount || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(reply.message ?? '');
  const [message, setMessage] = useState(reply.message ?? '');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const dialog = useDialog();

  /**
   * The visitor wrote THIS reply — not the post it hangs under (owner, 2026-08-04:
   * "for replies, I do not mean the author of the post, but the author of the
   * reply"). Same two-era test the rules apply, shared via `@/utils/postAuthor`.
   *
   * ⚠️ UX only. The rules refuse a non-author's write independently.
   */
  const isOwnReply = isAuthoredBy(reply, user);

  const handleSaveEdit = async () => {
    const next = draft.trim();
    if (!next) {
      await dialog.alert('댓글 내용을 입력해 주세요.');
      return;
    }
    if (next === message) {
      setIsEditing(false);
      return;
    }

    setBusy(true);
    try {
      // A reply is a document in the posts collection, so the ordinary post update
      // applies. The rules allow it because the author test passes and `message` is
      // not one of the provenance fields an edit may not touch.
      await postService.updatePost(reply.id, { message: next });
      setMessage(next);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update reply:', error);
      await dialog.alert('댓글을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await dialog.confirm(
      nestedReplyCount > 0
        ? `이 댓글과 답글 ${nestedReplyCount}개가 함께 지워져요. 정말 지울까요?`
        : '이 댓글을 지울까요?',
      '댓글 삭제'
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      // deleteReply also removes nested replies and recounts the parent — that
      // recount is the `replyCount` -1 the rules allow (§10q).
      await postService.deleteReply(reply.id);
      onReplyDeleted?.(reply.id);
    } catch (error) {
      console.error('Failed to delete reply:', error);
      await dialog.alert('댓글을 지우지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  };

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

  const handleNestedReplyDeleted = (deletedId: string) => {
    setNestedReplies((prev) => prev.filter((r) => r.id !== deletedId));
    setNestedReplyCount((prev) => Math.max(0, prev - 1));
  };

  const handleNestedReplySuccess = (newReply: Post) => {
    // When a deeply nested reply is created, just pass it up and update count
    setNestedReplyCount((prev) => prev + 1);
    onReplySuccess(newReply);
  };

  return (
    <div
      className={`mt-3 ${indentLevel > 0 ? `ml-${indentLevel * 4} border-l-2 border-gray-200 pl-4` : ''}`}
    >
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Reply content */}
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            {isEditing ? (
              <div className="mb-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 p-2 text-gray-800"
                  aria-label="댓글 수정"
                />
                <div className="mt-1 flex items-center space-x-3 text-sm">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={busy}
                    className="font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    {busy ? '저장 중...' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(message);
                      setIsEditing(false);
                    }}
                    disabled={busy}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-800 mb-2">{message}</p>
            )}
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
                    <span className="text-brand-600">댓글</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply actions */}
        <div className="mt-3 flex items-center space-x-4">
          {isOwnReply && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(message);
                  setIsEditing(true);
                }}
                disabled={busy}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {busy ? '삭제 중...' : '삭제'}
              </button>
            </>
          )}

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
              className="text-sm text-brand-700 hover:text-brand-800 transition-colors duration-200"
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
              <ReplyItem
                key={nestedReply.id}
                reply={nestedReply}
                onReplySuccess={handleNestedReplySuccess}
                maxDepth={maxDepth}
                postService={postService}
                onReplyDeleted={handleNestedReplyDeleted}
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
      {dialog.element}
    </div>
  );
}
