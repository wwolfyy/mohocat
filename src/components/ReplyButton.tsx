"use client";

import { useState } from "react";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";

interface ReplyButtonProps {
  postId: string;
  replyCount?: number;
  onToggleReply: () => void;
  showingReplies: boolean;
  showingReplyForm: boolean;
}

export default function ReplyButton({
  postId,
  replyCount = 0,
  onToggleReply,
  showingReplies,
  showingReplyForm,
}: ReplyButtonProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center space-x-3 mt-2">
        <div className="text-sm text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 mt-2">
      {isAuthenticated ? (
        <button
          onClick={onToggleReply}
          className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
        >
          <ChatBubbleLeftIcon className="h-4 w-4" />
          <span>{showingReplyForm ? "취소" : "댓글"}</span>
        </button>
      ) : (
        <div className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-400">
          <ChatBubbleLeftIcon className="h-4 w-4" />
          <span>댓글 (로그인 필요)</span>
        </div>
      )}

      {replyCount > 0 && (
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <span>{replyCount}개의 댓글</span>
        </div>
      )}
    </div>
  );
}
