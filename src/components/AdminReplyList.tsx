"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Post } from "@/types";
import { IPostService } from "@/services";
import AdminReplyItem from "./AdminReplyItem";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface AdminReplyListProps {
  postId: string;
  replyCount?: number;
  onReplyCountUpdate: (count: number) => void;
  postService: IPostService;
}

export interface AdminReplyListRef {
  addReply: (reply: Post) => void;
  removeReply: (replyId: string) => void;
}

const AdminReplyList = forwardRef<AdminReplyListRef, AdminReplyListProps>(({
  postId,
  replyCount = 0,
  onReplyCountUpdate,
  postService,
}, ref) => {
  const [replies, setReplies] = useState<Post[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadReplies = async () => {
    if (replies.length > 0) return; // Already loaded

    console.log("AdminReplyList: Loading replies for postId:", postId);
    setLoading(true);
    try {
      const fetchedReplies = await postService.getReplies(postId);
      console.log("AdminReplyList: Fetched replies:", fetchedReplies);
      setReplies(fetchedReplies);
    } catch (error) {
      console.error("Error loading replies:", error);
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
    // Check if this reply is a direct child of the current post
    if (newReply.parentId === postId) {
      // Only add direct children to this ReplyList
      setReplies((prev) => [...prev, newReply]);
      // Automatically show replies when a new one is added
      setShowReplies(true);
    }
    // Always update the reply count for the parent
    onReplyCountUpdate(replyCount + 1);
  };

  const handleReplyDeleted = (replyId: string) => {
    // Remove from local state
    setReplies(prev => prev.filter(reply => reply.id !== replyId));
    // Update reply count
    onReplyCountUpdate(Math.max(0, replyCount - 1));
  };

  const addReply = (reply: Post) => {
    handleReplySuccess(reply);
  };

  const removeReply = (replyId: string) => {
    handleReplyDeleted(replyId);
  };

  useImperativeHandle(ref, () => ({
    addReply,
    removeReply,
  }));

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
            ? "로딩 중..."
            : showReplies
              ? "댓글 숨기기"
              : `댓글 ${replyCount}개 보기`}
        </span>
      </button>

      {showReplies && (
        <div className="mt-2">
          {replies.map((reply) => (
            <AdminReplyItem
              key={reply.id}
              reply={reply}
              onReplySuccess={handleReplySuccess}
              onReplyDeleted={handleReplyDeleted}
              postService={postService}
            />
          ))}

          {replies.length === 0 && !loading && (
            <div className="text-gray-500 text-sm py-4">댓글이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
});

AdminReplyList.displayName = 'AdminReplyList';

export default AdminReplyList;
