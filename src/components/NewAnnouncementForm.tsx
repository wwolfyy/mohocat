"use client";

import React, { useState } from "react";
import { getAnnouncementService, getStorageService } from "@/services";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

const NewAnnouncementForm = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // File upload states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  // URL input states
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");

  const announcementService = getAnnouncementService();
  const storageService = getStorageService();
  const router = useRouter();
  const { user } = useAuth();

  // Helper function to format date for datetime-local input in Korea timezone
  const formatKoreaTimeForInput = (date: Date): string => {
    // Convert to Korea time (UTC+9)
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const koreaTime = new Date(utcTime + (9 * 3600000));

    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    const hours = String(koreaTime.getHours()).padStart(2, '0');
    const minutes = String(koreaTime.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // File handling functions
  const handleImageFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      setImageFiles([...imageFiles, ...files]);
    }
  };

  const handleVideoFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      setVideoFiles([...videoFiles, ...files]);
    }
  };

  const removeImageFile = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const removeVideoFile = (index: number) => {
    setVideoFiles(videoFiles.filter((_, i) => i !== index));
  };

  const addImageUrl = () => {
    if (currentImageUrl.trim()) {
      setImageUrls([...imageUrls, currentImageUrl.trim()]);
      setCurrentImageUrl("");
    }
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const addVideoUrl = () => {
    if (currentVideoUrl.trim()) {
      setVideoUrls([...videoUrls, currentVideoUrl.trim()]);
      setCurrentVideoUrl("");
    }
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index));
  };

  // Upload functions
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const path = `announcements/images/${Date.now()}_${file.name}`;
      return await storageService.uploadFile(file, path);
    });
    return await Promise.all(uploadPromises);
  };

  const uploadVideosToYouTube = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title || "공지사항 동영상");
      formData.append("description", message || "공지사항 동영상");
      formData.append("tags", "공지사항");

      const response = await fetch("/api/upload-youtube", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to upload video: ${response.statusText} - ${errorText}`,
        );
      }

      const result = await response.json();
      return result.videoUrl;
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      if (!title.trim()) {
        alert("제목을 입력해주세요.");
        return;
      }

      if (!message.trim()) {
        alert("내용을 입력해주세요.");
        return;
      }

      if (!user?.email) {
        alert("사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
        return;
      }

      // Upload files and combine with URLs
      let allImageUrls = [...imageUrls.filter(url => url.trim())];
      let allVideoUrls = [...videoUrls.filter(url => url.trim())];

      // Upload image files if any
      if (imageFiles.length > 0) {
        try {
          const uploadedImageUrls = await uploadImages(imageFiles);
          allImageUrls = [...allImageUrls, ...uploadedImageUrls];
        } catch (error) {
          alert("이미지 업로드 실패: " + (error instanceof Error ? error.message : "Unknown error"));
          return;
        }
      }

      // Upload video files if any
      if (videoFiles.length > 0) {
        try {
          const uploadedVideoUrls = await uploadVideosToYouTube(videoFiles);
          allVideoUrls = [...allVideoUrls, ...uploadedVideoUrls];
        } catch (error) {
          alert("동영상 업로드 실패: " + (error instanceof Error ? error.message : "Unknown error"));
          return;
        }
      }

      // Get current time in Korea timezone
      const now = new Date();
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));

      const postData = {
        title: title.trim(),
        message: message.trim(),
        username: user.email,
        date: koreaTime.toISOString().split('T')[0], // YYYY-MM-DD
        time: koreaTime.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        imageUrls: allImageUrls,
        videoUrls: allVideoUrls,
        thumbnailUrl: allImageUrls.length > 0 ? allImageUrls[0] : null,
        mediaType: allVideoUrls.length > 0 ? "video" : allImageUrls.length > 0 ? "image" : null,
      };

      console.log("Creating announcement with data:", postData);
      await announcementService.createPost(postData);

      // Reset form
      setTitle("");
      setMessage("");
      setImageFiles([]);
      setVideoFiles([]);
      setImageUrls([]);
      setVideoUrls([]);
      setCurrentImageUrl("");
      setCurrentVideoUrl("");

      alert("공지사항이 성공적으로 작성되었습니다!");

      // Redirect to the announcements page
      router.push("/pages/announcements");
    } catch (error) {
      alert(
        "공지사항 작성 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="공지사항 제목을 입력하세요"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block font-semibold">내용:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="공지사항 내용을 입력하세요"
          className="w-full p-2 border rounded"
          rows={6}
          required
        />
      </div>

      {/* Image Section - Hybrid File Upload + URL */}
      <div>
        <label className="block font-semibold mb-2">이미지</label>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">파일 업로드:</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageFilesChange}
            className="w-full p-2 border rounded"
          />
          {imageFiles.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-600">업로드할 이미지:</p>
              {imageFiles.map((file, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeImageFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium mb-2">또는 URL 입력:</label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={currentImageUrl}
              onChange={(e) => setCurrentImageUrl(e.target.value)}
              placeholder="이미지 URL을 입력하세요"
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={addImageUrl}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              추가
            </button>
          </div>
          {imageUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">추가된 이미지 URL:</p>
              {imageUrls.map((url, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span className="text-sm truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeImageUrl(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Section - Hybrid File Upload + URL */}
      <div>
        <label className="block font-semibold mb-2">동영상</label>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">파일 업로드 (YouTube에 업로드됩니다):</label>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoFilesChange}
            className="w-full p-2 border rounded"
          />
          {videoFiles.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-600">업로드할 동영상:</p>
              {videoFiles.map((file, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeVideoFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium mb-2">또는 YouTube URL 입력:</label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={currentVideoUrl}
              onChange={(e) => setCurrentVideoUrl(e.target.value)}
              placeholder="YouTube URL을 입력하세요"
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={addVideoUrl}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              추가
            </button>
          </div>
          {videoUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">추가된 동영상 URL:</p>
              {videoUrls.map((url, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span className="text-sm truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeVideoUrl(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>



      <div className="flex gap-4">
        <button
          type="submit"
          disabled={uploading}
          className={cn(
            "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
            "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {uploading ? "작성 중..." : "공지사항 작성"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="w-full py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all duration-200"
        >
          취소
        </button>
      </div>
    </form>
  );
};

export default NewAnnouncementForm;
