"use client";

import React, { useState, useEffect } from "react";
import { getButlerTalkService } from "@/services";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

interface Playlist {
  id: string;
  title: string;
  description?: string;
}

const NewButlerTalkForm = () => {
  // Define the default title constant
  const DEFAULT_TITLE = "집사톡 글입니다";

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

  // Generate dynamic title based on current time
  const generateDynamicTitle = () => {
    const date = new Date();
    const formattedDate = date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\s/g, '').replace(/\.$/, ''); // Remove spaces and trailing period

    return `${DEFAULT_TITLE} (${formattedDate})`;
  };

  // Service references
  const butlerTalkService = getButlerTalkService();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  // YouTube metadata states
  const [tags, setTags] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // Fetch user's YouTube playlists on component mount
  useEffect(() => {
    // Leave title empty for butler talk posts
  }, []);

  useEffect(() => {
    // Only fetch if user is authenticated
    if (!isAuthenticated || loading) return;

    const fetchData = async () => {
      // Fetch playlists
      console.log("Starting to fetch playlists...");
      setLoadingPlaylists(true);
      try {
        const response = await fetch("/api/youtube-playlists");
        console.log("Playlist fetch response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Playlist data received:", data);
          setPlaylists(data.playlists || []);
          console.log("Playlists set to state:", data.playlists || []);
        } else {
          const errorText = await response.text();
          console.warn(
            "Failed to fetch playlists:",
            response.status,
            response.statusText,
            errorText,
          );
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
      } finally {
        setLoadingPlaylists(false);
      }
    };

    fetchData();
  }, [isAuthenticated, loading]);

  // Don't render if not authenticated
  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          로그인이 필요합니다
        </h2>
        <p className="text-yellow-700">
          새 글을 작성하려면 로그인이 필요합니다. 관리자에게 문의하여 계정을
          요청하세요.
        </p>
      </div>
    );
  }

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setVideoFiles(Array.from(event.target.files));
    } else {
      setVideoFiles([]);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImageFiles(Array.from(event.target.files));
    }
  };

  const uploadImagesWithSignedUrls = async (
    files: File[],
  ): Promise<string[]> => {
    const urls = await Promise.all(
      files.map(async (file) => {
        const response = await fetch("/api/generate-signed-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get signed URL: ${response.statusText}`);
        }

        const { uploadUrl, downloadUrl } = await response.json();

        // Upload file using the signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
        }

        return downloadUrl;
      }),
    );

    return urls;
  };

  const uploadVideosToYouTube = async (files: File[]): Promise<string[]> => {
    const urls = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append("video", file);
        formData.append("title", title || generateDynamicTitle());
        formData.append("description", message || "산고양이 영상");
        formData.append("tags", tags || "산고양이");
        formData.append("playlistId", selectedPlaylist);
        formData.append("createdTime", createdTime);

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
      }),
    );

    return urls;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);

    try {
      let videoUrls: string[] = [];
      let videoThumb = "";
      let imageUrls: string[] = [];
      let mediaType: "video" | "image" = "image";

      // Upload videos first if present (this takes longer)
      if (videoFiles.length > 0) {
        try {
          videoUrls = await uploadVideosToYouTube(videoFiles);
          mediaType = "video";
        } catch (videoError) {
          alert(
            "Video upload failed: " +
              (videoError instanceof Error
                ? videoError.message
                : "Unknown error"),
          );
          return;
        }
      }

      // Upload images
      if (imageFiles.length > 0) {
        try {
          imageUrls = await uploadImagesWithSignedUrls(imageFiles);
          if (!videoThumb && imageUrls.length > 0) {
            videoThumb = imageUrls[0];
          }
        } catch (imageError) {
          alert(
            "Image upload failed: " +
              (imageError instanceof Error
                ? imageError.message
                : "Unknown error"),
          );
          return;
        }
      }

      // Only proceed with post creation if uploads succeeded
      const now = new Date();
      const thumbnailUrl =
        videoThumb || (imageUrls.length > 0 ? imageUrls[0] : "");

      // Use a simple default title if no title is provided
      const finalTitle = title.trim() || "집사톡 글입니다";

      const post = {
        title: finalTitle,
        username: user?.email || "unknown",
        date: now.toISOString().split('T')[0], // YYYY-MM-DD format in UTC
        time: now.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format in UTC
        thumbnailUrl,
        mediaType,
        videoUrls,
        imageUrls,
        message,
      };

      // Validate that we have the expected content
      if (videoFiles.length > 0 && videoUrls.length === 0) {
        throw new Error(
          "Video files were selected but no video URLs were generated",
        );
      }

      // Use service layer to create post in posts_butler collection
      await butlerTalkService.createPost(post);

      alert("글이 성공적으로 작성되었습니다!");
      router.push("/pages/butler_talk");
    } catch (error) {
      alert(
        "글 작성 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title Input */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          제목
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Message Input */}
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          내용
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="글 내용을 입력하세요"
        />
      </div>

      {/* Video Upload */}
      <div>
        <label
          htmlFor="videos"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          동영상 파일 (YouTube 업로드)
        </label>
        <input
          type="file"
          id="videos"
          accept="video/*"
          multiple
          onChange={handleVideoChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        {videoFiles.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            {videoFiles.length}개의 동영상 파일이 선택되었습니다.
          </p>
        )}
      </div>

      {/* YouTube Metadata - only show if video files are selected */}
      {videoFiles.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            YouTube 업로드 설정
          </h3>

          {/* Tags */}
          <div className="mb-4">
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 산고양이, 급식소, 고양이"
            />
          </div>

          {/* Created Time */}
          <div className="mb-4">
            <label
              htmlFor="createdTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              촬영 시간 (선택사항)
            </label>
            <input
              type="datetime-local"
              id="createdTime"
              value={createdTime}
              onChange={(e) => setCreatedTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Playlist Selection */}
          <div className="mb-4">
            <label
              htmlFor="playlist"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              재생목록 선택
            </label>
            {loadingPlaylists ? (
              <p className="text-sm text-gray-600">재생목록을 불러오는 중...</p>
            ) : (
              <select
                id="playlist"
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">재생목록 선택 (선택사항)</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Image Upload */}
      <div>
        <label
          htmlFor="images"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이미지 파일
        </label>
        <input
          type="file"
          id="images"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        {imageFiles.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            {imageFiles.length}개의 이미지 파일이 선택되었습니다.
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={uploading}
          className={cn(
            "w-full py-3 px-4 rounded-md font-medium text-white transition-colors",
            uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          )}
        >
          {uploading ? "업로드 중..." : "글 작성"}
        </button>
      </div>
    </form>
  );
};

export default NewButlerTalkForm;
