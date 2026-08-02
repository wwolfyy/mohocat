'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NewButlerTalkForm from '@/components/NewButlerTalkForm';
import NewPostForm from '@/components/NewPostForm';
import { getFeedingSpotsService } from '@/services';
import { getServiceForPostType, isPostType, type PostType } from '@/services/post-types';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useMountain } from '@/components/MountainProvider';

/**
 * Member-facing post editor — "I want to fix my own post."
 *
 * 🔑 **Separate from `/admin/posts/edit/...` on purpose.** That route is the
 * CMS: it is admin-gated, covers all four post types, and lets an admin edit
 * anyone's post. This one covers **only the two boards members may write**
 * (급식현황 · 집사톡) and only the visitor's **own** post.
 *
 * ⚠️ **The check here is a UX gate, not the security boundary.** Authorization
 * lives in `firestore.rules`, which independently refuses an update from anyone
 * who is not the author and refuses to let an edit rewrite authorship or 게시일.
 * This exists so an author is not sent to a form whose save would be denied.
 *
 * 📌 **급식현황 edits use the composer, not `EditPostForm`** — a member should
 * not be handed a list of raw media URLs. The trade-off is that a member cannot
 * change media on a legacy post; an admin still can, through the CMS.
 */

const EDITABLE_BY_MEMBERS: Record<string, { permission: string; backTo: string }> = {
  butler_talk: { permission: 'write-own-post-butler', backTo: '/pages/butler_talk' },
  butler_stream: { permission: 'write-own-post-feeding', backTo: '/pages/butler_stream' },
};

type Access = 'checking' | 'ok' | 'not-author' | 'unsupported' | 'missing';

export default function MemberEditPostPage({
  params,
}: {
  // ⚠️ The slug must be `id`, not `postId`: Next refuses two different slug
  // names at the same path position, and the sibling detail route is
  // `/pages/posts/[postType]/[id]`.
  params: { postType: string; id: string };
}) {
  const { postType, id: postId } = params;
  const router = useRouter();
  const mountainId = useMountain();
  const { user, loading: authLoading } = useAuth();
  const { hasAnyPermission, isLoading: permissionsLoading } = usePermissions();

  const [access, setAccess] = useState<Access>('checking');
  const [feedingSpots, setFeedingSpots] = useState<{ id: number; name: string }[]>([]);

  const config = EDITABLE_BY_MEMBERS[postType];

  useEffect(() => {
    if (authLoading || permissionsLoading) return;

    if (!isPostType(postType) || !config) {
      setAccess('unsupported');
      return;
    }

    if (!user) {
      router.push(`/pages/login?redirect=/pages/posts/${postType}/${postId}/edit`);
      return;
    }

    const check = async () => {
      try {
        const service = getServiceForPostType(postType as PostType, mountainId);
        const post = await service.getPostById(postId);

        if (!post) {
          setAccess('missing');
          return;
        }

        // Mirrors the rules' two-era author test: uid when the post has one,
        // otherwise the email it was authored under (posts predating authorUid).
        const isAuthor = post.authorUid
          ? post.authorUid === user.uid
          : Boolean(user.email) && post.username === user.email;

        setAccess(
          isAuthor && hasAnyPermission(['manage-posts', config.permission]) ? 'ok' : 'not-author'
        );
      } catch (error) {
        console.error(`Failed to load ${postType}/${postId} for editing:`, error);
        throw error;
      }
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, permissionsLoading, user?.uid, postType, postId, mountainId]);

  // 급식현황's composer needs the spot list even in edit mode (it renders the
  // section hidden rather than branching its markup).
  useEffect(() => {
    if (postType !== 'butler_stream' || access !== 'ok') return;

    getFeedingSpotsService(mountainId)
      .getAllFeedingSpots()
      .then((spots) => setFeedingSpots(spots.map((s) => ({ id: s.id, name: s.name }))))
      .catch((error) => {
        console.error('Failed to load feeding spots:', error);
        throw error;
      });
  }, [postType, access, mountainId]);

  if (access === 'checking') {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-2">불러오는 중이에요...</p>
      </div>
    );
  }

  if (access !== 'ok') {
    const message =
      access === 'missing'
        ? '게시물을 찾을 수 없어요.'
        : access === 'unsupported'
          ? '이 게시물은 여기서 수정할 수 없어요.'
          : '내가 쓴 글만 수정할 수 있어요.';

    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">수정할 수 없어요</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-center text-2xl font-bold mb-4">글 수정</h1>
      {postType === 'butler_talk' ? (
        <NewButlerTalkForm postId={postId} editRedirectTo={config.backTo} />
      ) : (
        <NewPostForm feedingSpots={feedingSpots} postId={postId} />
      )}
    </div>
  );
}
