'use client';

import { useState } from 'react';
import { Post } from '@/types';
import ReplyButton from './ReplyButton';
import ReplyForm from './ReplyForm';

interface ReplyItemProps {
  reply: Post;
  onReplySuccess: (newReply: Post) => void;
  maxDepth?: number;
}

export default function ReplyItem({ reply, onReplySuccess, maxDepth = 3 }: ReplyItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<Post[]>([]);

  const canReply = (reply.depth || 0) < maxDepth;
  const indentLevel = Math.min(reply.depth || 0, 3); // Max visual indent

  const handleReplySuccess = (newReply: Post) => {
    setReplies(prev => [...prev, newReply]);
    setShowReplyForm(false);
    onReplySuccess(newReply);
  };

  return (
    <div className={`mt-3 ${indentLevel > 0 ? `ml-${indentLevel * 4} border-l-2 border-gray-200 pl-4` : ''}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Reply content */}
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <p className="text-gray-800 mb-2">{reply.message}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{reply.username}</span>
                <span>•</span>
                <span>{reply.date} {reply.time}</span>
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

        {/* Reply actions */}
        {canReply && (
          <ReplyButton
            postId={reply.id}
            replyCount={reply.replyCount}
            onToggleReply={() => setShowReplyForm(!showReplyForm)}
            showingReplies={false}
            showingReplyForm={showReplyForm}
          />
        )}

        {/* Reply form */}
        {showReplyForm && (
          <ReplyForm
            parentId={reply.id}
            parentUsername={reply.username}
            onReplySuccess={handleReplySuccess}
            onCancel={() => setShowReplyForm(false)}
            depth={reply.depth || 0}
          />
        )}

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-3">
            {replies.map((nestedReply) => (
              <ReplyItem
                key={nestedReply.id}
                reply={nestedReply}
                onReplySuccess={onReplySuccess}
                maxDepth={maxDepth}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
