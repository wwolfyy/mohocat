import EditPostForm from '@/components/EditPostForm';
import NewAnnouncementForm from '@/components/NewAnnouncementForm';
import NewAdoptionForm from '@/components/NewAdoptionForm';
import { isPostType, type PostType } from '@/services/post-types';

/**
 * Post editor.
 *
 * 🔑 **공지사항 and 입양홍보 are edited by their own composer** (2026-08-02,
 * owner) — the same component that creates them, in edit mode. Before this they
 * went through `EditPostForm`, which could only take media as a **pasted URL**:
 * changing a photo meant finding its Storage URL by hand. That restriction was a
 * leftover — those two forms moved onto the same signed-URL upload path 집사톡
 * uses on 2026-07-30, so the pipeline was already there to reuse.
 *
 * 급식현황 / 집사톡 stay on `EditPostForm` for now: they are community posts
 * built on a different hook (`useRichContentForm`), and 급식현황's composer
 * deliberately does not upload media at all (2026-07-27 owner decision).
 */
const COMPOSER_EDITED: PostType[] = ['announcements', 'adoption_promotion'];

const EditPostPage = ({ params }: { params: { postType: string; postId: string } }) => {
  const { postType, postId } = params;

  const description = isPostType(postType)
    ? COMPOSER_EDITED.includes(postType)
      ? '제목·내용과 사진·동영상을 작성할 때와 똑같이 수정해 보세요.'
      : '게시물의 제목·내용과 미디어 링크를 수정해 보세요.'
    : '';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">게시물 수정</h1>
          <div className="mb-3 h-1 w-12 rounded-full bg-brand" />
          <p className="text-gray-600">{description}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {!isPostType(postType) ? (
            <p className="text-gray-600">지원하지 않는 게시물 종류예요.</p>
          ) : postType === 'announcements' ? (
            <NewAnnouncementForm postId={postId} />
          ) : postType === 'adoption_promotion' ? (
            <NewAdoptionForm postId={postId} />
          ) : (
            <EditPostForm postType={postType} postId={postId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPostPage;
