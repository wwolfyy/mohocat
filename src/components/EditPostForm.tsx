'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPostService,
  getButlerTalkService,
  getAnnouncementService,
  getAdoptionService,
} from '@/services';
import { cn } from '@/utils/cn';
import { useMountain } from '@/components/MountainProvider';

export type EditablePostType =
  | 'butler_stream'
  | 'butler_talk'
  | 'announcements'
  | 'adoption_promotion';

interface EditPostFormProps {
  postType: EditablePostType;
  postId: string;
}

/**
 * Shared post editor — corrects the text and media links of an existing post of
 * any type. Loads the post via the matching service and saves through
 * `updatePost`, which merges (updateDoc), so fields this form doesn't touch
 * (tags, showInModal, username, date, replyCount, …) are preserved.
 *
 * Scope is deliberately text + media URLs: adding brand-new media *files* stays
 * in the per-type create forms (their upload paths differ — signed URLs for
 * feeding, direct Storage for announcements/adoption, YouTube for video).
 */
const EditPostForm: React.FC<EditPostFormProps> = ({ postType, postId }) => {
  const router = useRouter();
  const mountainId = useMountain();

  // The service backing this post type (mirrors AdminPostList.serviceFor).
  const serviceFor = (type: EditablePostType) =>
    type === 'butler_stream'
      ? getPostService(mountainId)
      : type === 'butler_talk'
        ? getButlerTalkService(mountainId)
        : type === 'announcements'
          ? getAnnouncementService(mountainId)
          : getAdoptionService(mountainId);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const post = await serviceFor(postType).getPostById(postId);
        if (!active) return;

        if (!post) {
          setNotFound(true);
          return;
        }

        setTitle(post.title || '');
        setMessage(post.message || '');
        setImageUrls(Array.isArray(post.imageUrls) ? post.imageUrls : []);
        setVideoUrls(Array.isArray(post.videoUrls) ? post.videoUrls : []);
      } catch (error) {
        console.error('Error loading post to edit:', error);
        if (active) {
          alert('게시물을 불러오지 못했습니다. 다시 시도해주세요.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postType, postId]);

  const addImageUrl = () => {
    if (currentImageUrl.trim()) {
      setImageUrls([...imageUrls, currentImageUrl.trim()]);
      setCurrentImageUrl('');
    }
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const addVideoUrl = () => {
    if (currentVideoUrl.trim()) {
      setVideoUrls([...videoUrls, currentVideoUrl.trim()]);
      setCurrentVideoUrl('');
    }
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!message.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const cleanImageUrls = imageUrls.filter((url) => url.trim());
      const cleanVideoUrls = videoUrls.filter((url) => url.trim());

      // Keep thumbnail/mediaType consistent with the resulting media lists.
      const postData = {
        title: title.trim(),
        message: message.trim(),
        imageUrls: cleanImageUrls,
        videoUrls: cleanVideoUrls,
        thumbnailUrl: cleanImageUrls.length > 0 ? cleanImageUrls[0] : null,
        mediaType: cleanVideoUrls.length > 0 ? 'video' : cleanImageUrls.length > 0 ? 'image' : null,
      };

      await serviceFor(postType).updatePost(postId, postData);

      alert('게시물이 수정되었습니다!');
      router.push('/admin/posts');
    } catch (error) {
      alert(
        '게시물 수정 중 오류가 발생했습니다: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-gray-600">게시물을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push('/admin/posts')}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all duration-200"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block font-semibold">내용:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="내용을 입력하세요"
          className="w-full p-2 border rounded"
          rows={6}
          required
        />
      </div>

      {/* Image URLs — add/remove existing links */}
      <div>
        <label className="block font-semibold mb-2">이미지 URL</label>
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
            {imageUrls.map((url, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-gray-100 rounded"
              >
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

      {/* Video URLs — add/remove existing links */}
      <div>
        <label className="block font-semibold mb-2">동영상 URL</label>
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
            {videoUrls.map((url, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-gray-100 rounded"
              >
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

      <p className="text-sm text-gray-500">
        새 이미지/동영상 파일 업로드는 새 글 작성에서만 지원돼요. 여기서는 제목·내용과 미디어 링크를
        수정할 수 있어요.
      </p>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={saving}
          className={cn(
            'w-full py-3 bg-gradient-to-r from-brand to-accent',
            'text-ink rounded-lg font-bold hover:shadow-lg transition-all duration-200',
            saving && 'opacity-50 cursor-not-allowed'
          )}
        >
          {saving ? '저장 중...' : '수정 저장'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          className="w-full py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all duration-200"
        >
          취소
        </button>
      </div>
    </form>
  );
};

export default EditPostForm;
