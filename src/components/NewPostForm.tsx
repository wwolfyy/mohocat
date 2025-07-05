import React, { useState, useEffect } from "react";
import { getPostService } from "@/services";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

interface Playlist {
  id: string;
  title: string;
  description?: string;
}

const NewPostForm = () => {
  // Service references
  const postService = getPostService();
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
    // Only fetch playlists if user is authenticated
    if (!isAuthenticated || loading) return;

    const fetchPlaylists = async () => {
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

    fetchPlaylists();
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
          throw new Error("Failed to get signed URL");
        }

        const { signedUrl, publicUrl } = await response.json();

        await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });
        return publicUrl;
      }),
    );
    return urls;
  };
  const uploadVideoToYouTube = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("title", title);
    formData.append("description", message || "Uploaded via Mountain Cats app");

    // Add enhanced metadata
    if (tags.trim()) {
      formData.append("tags", tags);
    }
    if (createdTime) {
      console.log("Sending created time to YouTube:", createdTime);
      formData.append("createdTime", createdTime);
    }
    if (selectedPlaylist) {
      formData.append("playlistId", selectedPlaylist);
    }

    try {
      const response = await fetch("/api/upload-youtube", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Upload failed with status ${response.status}: ${errorText}`,
        );
      }

      const result = await response.json();

      if (!result.videoUrl) {
        throw new Error("No video URL returned from upload");
      }

      return result.videoUrl;
    } catch (error) {
      throw error;
    }
  };
  const uploadVideosToYouTube = async (files: File[]): Promise<string[]> => {
    const urls = await Promise.all(
      files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("video", file);
        formData.append(
          "title",
          `${title} ${files.length > 1 ? `(Part ${index + 1})` : ""}`,
        );
        formData.append(
          "description",
          message || "Uploaded via Mountain Cats app",
        );

        // Add enhanced metadata
        if (tags.trim()) {
          formData.append("tags", tags);
        }
        if (createdTime) {
          console.log("Sending created time to YouTube:", createdTime);
          formData.append("createdTime", createdTime);
        }
        if (selectedPlaylist) {
          formData.append("playlistId", selectedPlaylist);
        }

        try {
          const response = await fetch("/api/upload-youtube", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Upload failed with status ${response.status}: ${errorText}`,
            );
          }

          const result = await response.json();

          if (!result.videoUrl) {
            throw new Error("No video URL returned from upload");
          }

          return result.videoUrl;
        } catch (error) {
          throw error;
        }
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

      const post = {
        title,
        username: user?.email || "unknown",
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
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

      // Use service layer instead of direct Firebase access
      await postService.createPost(post);

      setVideoFiles([]);
      setImageFiles([]);
      setTitle("");
      setMessage("");
      alert("Post created successfully!");

      // Redirect to the butler_stream page
      router.push("/pages/butler_stream");
    } catch (error) {
      alert(
        "Error creating post: " +
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
          required
          className="border p-2 rounded w-full"
        />
      </div>{" "}
      <div>
        <label className="block font-semibold">동영상 업로드:</label>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleVideoChange}
        />
      </div>
      <div>
        <label className="block font-semibold">사진 업로드:</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />
      </div>
      <div>
        <label className="block font-semibold">내용:</label>{" "}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>
      {/* YouTube Metadata Section */}
      {videoFiles.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            YouTube 동영상 설정
          </h3>
          {/* Tags */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">
              태그 (쉼표로 구분):
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 고양이, 산, 자연"
              className="border p-2 rounded w-full"
            />

            <p className="text-sm text-gray-600 mt-1">
              태그는 쉼표로 구분하여 입력하세요
            </p>
          </div>
          {/* Created Time */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">촬영 날짜:</label>{" "}
            <input
              type="date"
              value={createdTime}
              onChange={(e) => setCreatedTime(e.target.value)}
              className="border p-2 rounded"
            />
          </div>{" "}
          {/* Playlist Selection */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">재생목록에 추가:</label>
            {loadingPlaylists ? (
              <p className="text-sm text-gray-600">재생목록을 불러오는 중...</p>
            ) : (
              <>
                <select
                  value={selectedPlaylist}
                  onChange={(e) => setSelectedPlaylist(e.target.value)}
                  className="border p-2 rounded w-full"
                >
                  <option value="">재생목록 선택 안함</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {playlists.length > 0
                    ? `${playlists.length}개의 재생목록을 찾았습니다`
                    : "재생목록을 찾을 수 없습니다"}
                </p>
              </>
            )}
          </div>
        </div>
      )}
      <button
        type="submit"
        disabled={uploading}
        className={cn(
          "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
          "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
          uploading && "opacity-50 cursor-not-allowed",
        )}
      >
        {uploading ? "새글 작성 중..." : "작성 완료"}
      </button>
      {uploading && (
        <p className="text-sm text-gray-600 mt-2">
          {videoFiles.length > 0
            ? "Uploading videos to YouTube... This may take a few minutes."
            : "Uploading images..."}
        </p>
      )}
    </form>
  );
};

export default NewPostForm;
