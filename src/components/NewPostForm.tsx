'use client';

import React, { useState, useEffect } from 'react';
import { getPostService, getFeedingSpotsService, getImageService } from '@/services';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import CatSelectorModal from '@/components/CatSelectorModal';
import { parseRecordingDateFromTitle, formatDateForInput } from '@/utils/dateParser';

interface Playlist {
  id: string;
  title: string;
  description?: string;
}

interface BasicFeedingSpot {
  id: number;
  name: string;
}

interface NewPostFormProps {
  feedingSpots: BasicFeedingSpot[];
}

const NewPostForm = ({ feedingSpots }: NewPostFormProps) => {
  // Define the default title constant
  const DEFAULT_TITLE = '급식소 챙기고 갑니다';

  // Helper function to format date for datetime-local input in Korea timezone
  const formatKoreaTimeForInput = (date: Date): string => {
    // Convert to Korea time (UTC+9)
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const koreaTime = new Date(utcTime + 9 * 3600000);

    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    const hours = String(koreaTime.getHours()).padStart(2, '0');
    const minutes = String(koreaTime.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Generate dynamic title based on visit time
  const generateDynamicTitle = (visitTime: string) => {
    if (!visitTime) return DEFAULT_TITLE;

    const date = new Date(visitTime);
    const formattedDate = date
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\s/g, '')
      .replace(/\.$/, ''); // Remove spaces and trailing period

    return `${DEFAULT_TITLE} (${formattedDate})`;
  };

  // Service references
  const postService = getPostService();
  const feedingSpotsService = getFeedingSpotsService();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  // YouTube metadata states
  const [tags, setTags] = useState('');
  const [createdTime, setCreatedTime] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(''); // Will be set to 집사게시판 playlist ID
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  // Feeding spots states
  const [checkedSpots, setCheckedSpots] = useState<Set<number>>(new Set());
  const [feedingVisitTime, setFeedingVisitTime] = useState('');

  // Cat tagging states
  const [selectedVideoTags, setSelectedVideoTags] = useState<string[]>([]);
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);
  const [showVideoTagSelector, setShowVideoTagSelector] = useState(false);
  const [showImageTagSelector, setShowImageTagSelector] = useState(false);

  // Fetch user's YouTube playlists and feeding spots on component mount
  useEffect(() => {
    // Prepopulate feeding visit time with current time in UTC+9 (Korea time, rounded to current hour)
    const now = new Date();
    now.setMinutes(0, 0, 0); // Round to the hour first
    const timeString = formatKoreaTimeForInput(now);
    setFeedingVisitTime(timeString);

    // Set initial title with current date
    setTitle(generateDynamicTitle(timeString));
  }, []);

  // Update title when visit time changes
  useEffect(() => {
    if (feedingVisitTime) {
      setTitle(generateDynamicTitle(feedingVisitTime));
    }
  }, [feedingVisitTime]);

  useEffect(() => {
    // Only fetch if user is authenticated
    if (!isAuthenticated || loading) return;

    const fetchData = async () => {
      // Fetch playlists
      console.log('Starting to fetch playlists...');
      setLoadingPlaylists(true);
      try {
        const response = await fetch('/api/youtube-playlists');
        console.log('Playlist fetch response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Playlist data received:', data);
          const playlistsData = data.playlists || [];
          setPlaylists(playlistsData);
          console.log('Playlists set to state:', playlistsData);

          // Automatically select "집사게시판" playlist
          const butlerPlaylist = playlistsData.find(
            (playlist: Playlist) => playlist.title === '집사게시판'
          );
          if (butlerPlaylist) {
            setSelectedPlaylist(butlerPlaylist.id);
            console.log('Auto-selected 집사게시판 playlist:', butlerPlaylist.id);
          }
        } else {
          const errorText = await response.text();
          console.warn(
            'Failed to fetch playlists:',
            response.status,
            response.statusText,
            errorText
          );
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
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
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">로그인이 필요합니다</h2>
        <p className="text-yellow-700">
          새 글을 작성하려면 로그인이 필요합니다. 관리자에게 문의하여 계정을 요청하세요.
        </p>
      </div>
    );
  }

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      setVideoFiles(files);

      // Auto-parse recording date from the first video file name
      if (files.length > 0 && !createdTime) {
        const firstFileName = files[0].name;
        const parsedDate = parseRecordingDateFromTitle(firstFileName);
        if (parsedDate) {
          const dateString = formatDateForInput(parsedDate);
          setCreatedTime(dateString);
          console.log(
            `Auto-populated recording date from filename "${firstFileName}": ${dateString}`
          );
        }
      }
    } else {
      setVideoFiles([]);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setImageFiles(files);

      // Auto-parse recording date from the first image file name if no video files and no existing date
      if (files.length > 0 && videoFiles.length === 0 && !createdTime) {
        const firstFileName = files[0].name;
        const parsedDate = parseRecordingDateFromTitle(firstFileName);
        if (parsedDate) {
          const dateString = formatDateForInput(parsedDate);
          setCreatedTime(dateString);
          console.log(
            `Auto-populated recording date from image filename "${firstFileName}": ${dateString}`
          );
        }
      }
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

  const handleSelectAllFeedingSpots = () => {
    const allSpotIds = new Set(feedingSpots.map((spot) => spot.id));
    setCheckedSpots(allSpotIds);
  };

  const handleDeselectAllFeedingSpots = () => {
    setCheckedSpots(new Set());
  };

  const uploadImagesWithSignedUrls = async (files: File[]): Promise<string[]> => {
    const imageService = getImageService();

    const urls = await Promise.all(
      files.map(async (file, index) => {
        // Get signed URL
        const response = await fetch('/api/generate-signed-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });

        if (!response.ok) {
          throw new Error('Failed to get signed URL');
        }

        const { signedUrl, publicUrl } = await response.json();

        // Upload to Firebase Storage
        await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        // Create Firestore entry in cat_images collection
        try {
          const imageTagsToUse = selectedImageTags.length > 0 ? selectedImageTags : [];

          const imageData = {
            imageUrl: publicUrl,
            fileName: file.name,
            storagePath: publicUrl, // For direct uploads, this is the same as imageUrl
            tags: imageTagsToUse,
            uploadDate: new Date(),
            createdTime: createdTime ? new Date(createdTime) : new Date(),
            uploadedBy: user?.email || 'unknown',
            description: message || '',
            location: '', // Could be enhanced to include location info
            autoTagged: false, // User manually provided tags
            fileSize: file.size,
            dimensions: undefined, // Could be enhanced to read image dimensions
          };

          console.log('Creating Firestore entry for uploaded image:', imageData);

          const firestoreImageId = await imageService.createImage(imageData);
          console.log('Created cat_images entry with ID:', firestoreImageId);
        } catch (firestoreError) {
          console.error('Failed to create Firestore entry for image:', firestoreError);
          // Don't fail the entire upload if Firestore creation fails
        }

        return publicUrl;
      })
    );
    return urls;
  };
  const uploadVideoToYouTube = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('video', file);
    // Use the default title if no title is provided
    const finalTitle = title.trim() || generateDynamicTitle(feedingVisitTime);
    formData.append('title', finalTitle);
    formData.append('description', message || 'Uploaded via Mountain Cats app');

    // Add enhanced metadata
    if (tags.trim()) {
      formData.append('tags', tags);
    }
    if (createdTime) {
      console.log('Sending created time to YouTube:', createdTime);
      formData.append('createdTime', createdTime);
    }
    if (selectedPlaylist) {
      formData.append('playlistId', selectedPlaylist);
    }

    try {
      const response = await fetch('/api/upload-youtube', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.videoUrl) {
        throw new Error('No video URL returned from upload');
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
        formData.append('video', file);
        // Use the default title if no title is provided
        const finalTitle = title.trim() || generateDynamicTitle(feedingVisitTime);
        formData.append('title', `${finalTitle} ${files.length > 1 ? `(Part ${index + 1})` : ''}`);
        formData.append('description', message || 'Uploaded via Mountain Cats app');

        // Add enhanced metadata
        const videoTagsToUse =
          selectedVideoTags.length > 0 ? selectedVideoTags.join(', ') : tags.trim() || '산고양이';
        formData.append('tags', videoTagsToUse);
        if (createdTime) {
          console.log('Sending created time to YouTube:', createdTime);
          formData.append('createdTime', createdTime);
        }
        if (selectedPlaylist) {
          formData.append('playlistId', selectedPlaylist);
        }

        try {
          const response = await fetch('/api/upload-youtube', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
          }

          const result = await response.json();

          if (!result.videoUrl) {
            throw new Error('No video URL returned from upload');
          }

          return result.videoUrl;
        } catch (error) {
          throw error;
        }
      })
    );
    return urls;
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);

    try {
      let videoUrls: string[] = [];
      let videoThumb = '';
      let imageUrls: string[] = [];
      let mediaType: 'video' | 'image' = 'image';

      // Upload videos first if present (this takes longer)
      if (videoFiles.length > 0) {
        try {
          videoUrls = await uploadVideosToYouTube(videoFiles);
          mediaType = 'video';
        } catch (videoError) {
          alert(
            'Video upload failed: ' +
              (videoError instanceof Error ? videoError.message : 'Unknown error')
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
            'Image upload failed: ' +
              (imageError instanceof Error ? imageError.message : 'Unknown error')
          );
          return;
        }
      }

      // Only proceed with post creation if uploads succeeded
      const now = new Date();
      const thumbnailUrl = videoThumb || (imageUrls.length > 0 ? imageUrls[0] : '');

      // Use the default title if no title is provided
      const finalTitle = title.trim() || generateDynamicTitle(feedingVisitTime);

      const post = {
        title: finalTitle,
        username: user?.email || 'unknown',
        date: now.toISOString().split('T')[0], // YYYY-MM-DD format in UTC
        time: now.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format in UTC
        thumbnailUrl,
        mediaType,
        videoUrls,
        imageUrls,
        message,
        tags: mediaType === 'video' ? selectedVideoTags : selectedImageTags,
      };

      // Validate that we have the expected content
      if (videoFiles.length > 0 && videoUrls.length === 0) {
        throw new Error('Video files were selected but no video URLs were generated');
      }

      // Use service layer instead of direct Firebase access
      await postService.createPost(post);

      // Update feeding spots if any were checked
      if (checkedSpots.size > 0) {
        try {
          const checkedSpotIds = Array.from(checkedSpots);
          const userDisplayName = user?.displayName || user?.email || 'unknown';
          // Pass the feeding visit time from the form
          await feedingSpotsService.updateFeedingSpots(
            checkedSpotIds,
            userDisplayName,
            feedingVisitTime
          );
          console.log(
            `Updated ${checkedSpotIds.length} feeding spots for user: ${userDisplayName} at time: ${feedingVisitTime}`
          );
        } catch (error) {
          console.error('Error updating feeding spots:', error);
          // Don't fail the post creation if feeding spots update fails
        }
      }

      setVideoFiles([]);
      setImageFiles([]);
      setTitle('');
      setMessage('');
      setCheckedSpots(new Set()); // Clear checked spots
      // Reset feeding visit time to current time in UTC+9 (Korea time)
      const resetTime = new Date();
      resetTime.setMinutes(0, 0, 0);
      const resetTimeString = formatKoreaTimeForInput(resetTime);
      setFeedingVisitTime(resetTimeString);
      // Reset title with new current date
      setTitle(generateDynamicTitle(resetTimeString));
      alert('Post created successfully!');

      // Redirect to the butler_stream page
      router.push('/pages/butler_stream');
    } catch (error) {
      alert('Error creating post: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
          placeholder={generateDynamicTitle(feedingVisitTime)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Feeding Spots Section */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-4 mb-3">
          <h3 className="text-lg font-semibold text-gray-800">아래 급식소를 챙겼어요!</h3>
          {feedingSpots.length > 0 && (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAllFeedingSpots}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                모두 선택
              </button>
              <button
                type="button"
                onClick={handleDeselectAllFeedingSpots}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
        {feedingSpots.length === 0 ? (
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
                  <span className="text-sm text-gray-900 flex-1">{spot.name}</span>
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
            {checkedSpots.size > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  급식소 방문 시간:
                </label>
                <input
                  type="datetime-local"
                  value={feedingVisitTime}
                  onChange={(e) => setFeedingVisitTime(e.target.value)}
                  className="border p-2 rounded w-full max-w-xs"
                  step="3600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  급식소를 방문한 날짜와 시간을 선택하세요 (시간 단위)
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
        <input type="file" accept="video/*" multiple onChange={handleVideoChange} />
      </div>

      {/* YouTube Metadata Section */}
      {videoFiles.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">YouTube 동영상 설정</h3>
          {/* Cat Tags */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">등장하는 고양이:</label>
            <input
              type="text"
              value={selectedVideoTags.join(', ')}
              onClick={() => setShowVideoTagSelector(true)}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-gray-50"
              placeholder="고양이를 선택하려면 클릭하세요"
            />
          </div>
          {/* Created Time */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">촬영 날짜:</label>
            <input
              type="date"
              value={createdTime}
              onChange={(e) => setCreatedTime(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              동영상이나 이미지 파일명에서 자동으로 날짜를 추출합니다. 필요시 수정 가능합니다.
            </p>
          </div>
          {/* Playlist Selection */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">재생목록에 추가:</label>
            {loadingPlaylists ? (
              <p className="text-sm text-gray-600">재생목록을 불러오는 중...</p>
            ) : (
              <>
                <input
                  type="text"
                  value="집사게시판"
                  readOnly
                  disabled
                  className="border p-2 rounded w-full bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  모든 동영상은 자동으로 "집사게시판" 재생목록에 추가됩니다
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block font-semibold">사진 업로드:</label>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
      </div>

      {/* Image Cat Tags - only show if images are selected */}
      {imageFiles.length > 0 && (
        <div>
          <label className="block font-semibold">등장하는 고양이:</label>
          <input
            type="text"
            value={selectedImageTags.join(', ')}
            onClick={() => setShowImageTagSelector(true)}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-gray-50"
            placeholder="고양이를 선택하려면 클릭하세요"
          />
        </div>
      )}
      <div>
        <label className="block font-semibold">내용:</label>{' '}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>
      <button
        type="submit"
        disabled={uploading}
        className={cn(
          'w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300',
          'text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {uploading ? '새글 작성 중...' : '작성 완료'}
      </button>
      {uploading && (
        <p className="text-sm text-gray-600 mt-2">
          {videoFiles.length > 0
            ? 'Uploading videos to YouTube... This may take a few minutes.'
            : 'Uploading images...'}
        </p>
      )}

      {/* Cat Selector Modals */}
      <CatSelectorModal
        isOpen={showVideoTagSelector}
        onClose={() => setShowVideoTagSelector(false)}
        selectedTags={selectedVideoTags}
        onTagsChange={setSelectedVideoTags}
        title="비디오에 등장하는 고양이 선택"
      />

      <CatSelectorModal
        isOpen={showImageTagSelector}
        onClose={() => setShowImageTagSelector(false)}
        selectedTags={selectedImageTags}
        onTagsChange={setSelectedImageTags}
        title="이미지에 등장하는 고양이 선택"
      />
    </form>
  );
};

export default NewPostForm;
