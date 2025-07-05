import React, { useState, useEffect } from "react";
import { getPostService, getFeedingSpotsService, FeedingSpot } from "@/services";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

interface Playlist {
  id: string;
  title: string;
  description?: string;
}

const NewPostForm = () => {
  // Define the default title constant
  const DEFAULT_TITLE = "급식소 챙기고 갑니다";

  // Service references
  const postService = getPostService();
  const feedingSpotsService = getFeedingSpotsService();
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
  // Feeding spots states
  const [feedingSpots, setFeedingSpots] = useState<FeedingSpot[]>([]);
  const [checkedSpots, setCheckedSpots] = useState<Set<number>>(new Set());
  const [loadingFeedingSpots, setLoadingFeedingSpots] = useState(false);

  // Fetch user's YouTube playlists and feeding spots on component mount
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

      // Fetch feeding spots
      console.log("Starting to fetch feeding spots...");
      setLoadingFeedingSpots(true);
      try {
        const spots = await feedingSpotsService.getAllFeedingSpots();
        setFeedingSpots(spots);
        console.log("Feeding spots loaded:", spots);
      } catch (error) {
        console.error("Error fetching feeding spots:", error);
      } finally {
        setLoadingFeedingSpots(false);
      }
    };

    fetchData();
  }, [isAuthenticated, loading, feedingSpotsService]);

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

  const handleFeedingSpotToggle = (spotId: number) => {
    setCheckedSpots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(spotId)) {
        newSet.delete(spotId);
      } else {
        newSet.add(spotId);
      }
      return newSet;
    });
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
    // Use the default title if no title is provided
    const finalTitle = title.trim() || DEFAULT_TITLE;
    formData.append("title", finalTitle);
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
        // Use the default title if no title is provided
        const finalTitle = title.trim() || DEFAULT_TITLE;
        formData.append(
          "title",
          `${finalTitle} ${files.length > 1 ? `(Part ${index + 1})` : ""}`,
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

      // Use the default title if no title is provided
      const finalTitle = title.trim() || DEFAULT_TITLE;

      const post = {
        title: finalTitle,
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

      // Update feeding spots if any were checked
      if (checkedSpots.size > 0) {
        try {
          const checkedSpotIds = Array.from(checkedSpots);
          const userDisplayName = user?.displayName || user?.email || "unknown";
          await feedingSpotsService.updateFeedingSpots(checkedSpotIds, userDisplayName);
          console.log(`Updated ${checkedSpotIds.length} feeding spots for user: ${userDisplayName}`);
        } catch (error) {
          console.error('Error updating feeding spots:', error);
          // Don't fail the post creation if feeding spots update fails
        }
      }

      setVideoFiles([]);
      setImageFiles([]);
      setTitle("");
      setMessage("");
      setCheckedSpots(new Set()); // Clear checked spots
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
          placeholder={DEFAULT_TITLE}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Feeding Spots Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          아래 급식소를 챙겼어요!
        </h3>
        {loadingFeedingSpots ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">급식소 정보를 불러오는 중...</p>
          </div>
        ) : feedingSpots.length === 0 ? (
          <p className="text-sm text-gray-600 py-4">급식소 정보가 없습니다.</p>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feedingSpots.map((spot) => (
                <label
                  key={spot.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 rounded p-2 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checkedSpots.has(spot.id)}
                    onChange={() => handleFeedingSpotToggle(spot.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 flex-1">
                    {spot.name}
                  </span>
                </label>
              ))}
            </div>
            {checkedSpots.size > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-green-600 font-medium">
                  선택된 급식소: {checkedSpots.size}개
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual divider between feeding spots and media upload */}
      <div className="border-t border-gray-200 my-6"></div>

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
