"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";
import AdminPostList from "@/components/AdminPostList";

const AdminPosts = () => {
  const [activeTab, setActiveTab] = useState<"butler_stream" | "butler_talk" | "announcements" | "adoption_promotion">("butler_stream");

  return (
    <div className="p-4">
      <h1 className="text-center text-2xl font-bold mb-6">
        Post Management
      </h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("butler_stream")}
          className={cn(
            "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
            activeTab === "butler_stream"
              ? "border-yellow-500 text-yellow-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          급식현황
        </button>
        <button
          onClick={() => setActiveTab("butler_talk")}
          className={cn(
            "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
            activeTab === "butler_talk"
              ? "border-yellow-500 text-yellow-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          집사톡
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={cn(
            "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
            activeTab === "announcements"
              ? "border-yellow-500 text-yellow-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          공지사항
        </button>
        <button
          onClick={() => setActiveTab("adoption_promotion")}
          className={cn(
            "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
            activeTab === "adoption_promotion"
              ? "border-yellow-500 text-yellow-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          입양홍보
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "adoption_promotion" ? (
        <div className="flex justify-center items-center py-12 text-gray-500">
          입양홍보 탭은 준비 중입니다.
        </div>
      ) : (
        <AdminPostList postType={activeTab} />
      )}
    </div>
  );
};

export default AdminPosts;
