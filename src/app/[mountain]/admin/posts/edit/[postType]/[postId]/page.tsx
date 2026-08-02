import EditPostForm from '@/components/EditPostForm';
import NewAnnouncementForm from '@/components/NewAnnouncementForm';
import NewAdoptionForm from '@/components/NewAdoptionForm';
import NewButlerTalkForm from '@/components/NewButlerTalkForm';
import { isPostType, type PostType } from '@/services/post-types';

/**
 * Post editor.
 *
 * 🔑 **Every post type that can carry uploaded media is edited by its own
 * composer** (2026-08-02, owner) — the same component that creates it, in edit
 * mode. They all used to go through `EditPostForm`, which could only take media
 * as a **pasted URL**: changing a photo meant finding its Storage URL by hand.
 * That restriction was a leftover — the three composers had converged onto the
 * same signed-URL upload path on 2026-07-30, so the pipeline was already there
 * to reuse.
 *
 * ⚠️ **급식현황 is the one exception, and deliberately so.** Its composer
 * (`NewPostForm`) does not upload media at all — that was removed by owner
 * decision on 2026-07-27, since 집사톡 is the media surface and 급식현황 is a
 * 급식소 check-in log. Sending its edit screen to that composer would offer no
 * media controls, so legacy 급식현황 posts that still carry media would have no
 * way to change it. It stays on `EditPostForm`'s URL list, which can.
 */
const COMPOSER_EDITED: PostType[] = ['announcements', 'adoption_promotion', 'butler_talk'];

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
          ) : postType === 'butler_talk' ? (
            <NewButlerTalkForm postId={postId} />
          ) : (
            <EditPostForm postType={postType} postId={postId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPostPage;
