'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMountain } from '@/components/MountainProvider';
import { getServiceForPostType, isPostType, type PostType } from '@/services/post-types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorNotice } from '@/components/ui/AsyncStates';
import PostMedia from '@/components/PostMedia';
import { Post } from '@/types';
import ReplyButton from '@/components/ReplyButton';
import ReplyForm from '@/components/ReplyForm';
import ReplyList from '@/components/ReplyList';

/**
 * Detail view for a single post — `/pages/posts/{postType}/{id}`.
 *
 * 🐛 **The type is in the path because the id alone does not identify a post
 * (2026-08-02).** Each type lives in its own Firestore collection
 * (`posts_feeding` / `posts_butler` / `posts_announcements` / `posts_adoption`)
 * and ids are unique only *within* one, so this page — which hard-coded
 * `getPostService`, i.e. `posts_feeding` — could only ever answer
 * "게시물을 찾을 수 없습니다." for a 집사톡, 공지사항 or 입양홍보 post.
 *
 * 🔑 **A segment, not a `?type=` query param, and no default.** A query param can
 * go missing; the route then still matches and has to guess a collection, which
 * reproduces the original bug silently. As a segment, a link that omits the type
 * does not resolve at all. Build links with `postDetailPath()`.
 *
 * 🎨 **It renders like the 공지사항 detail page, because it is the same page for a
 * different collection** (owner, 2026-08-02). It used to hand-roll its own
 * markup: an unpadded full-bleed `<img>` under English `Video:` / `Images:`
 * headings, with videos as a thumbnail linking off to youtube.com. Fixing the
 * collection bug made that visible on 집사톡 and 급식현황 for the first time.
 * Now: the same shell (back link · title · author • date · white card) and the
 * same shared `PostMedia`, so every surface shows a post's media identically —
 * one column, full width, each medium captioned with its own 제목/설명/태그.
 */

/** Where each type's list lives, and what to call it in the UI. */
const POST_TYPE_UI: Record<PostType, { label: string; listPath: string }> = {
  butler_stream: { label: '급식현황', listPath: '/pages/butler_stream' },
  butler_talk: { label: '집사톡', listPath: '/pages/butler_talk' },
  announcements: { label: '공지사항', listPath: '/pages/announcements' },
  adoption_promotion: { label: '입양홍보', listPath: '/pages/adoption' },
};

/**
 * 급식현황 and 집사톡 are community feeds and carry replies. 공지사항 / 입양홍보
 * are admin-authored announcements — they have never had a 댓글 thread, and
 * reaching them through this route (the admin CMS links here) must not quietly
 * become the place one appears.
 */
const REPLYABLE: PostType[] = ['butler_stream', 'butler_talk'];

const PostDetailsPage = () => {
  // Service references
  const mountainId = useMountain();
  const router = useRouter();
  // `useParams`, not `window.location.pathname`: both are route state, and
  // reading them from the URL string meant the fetch could not react to them.
  const { id, postType } = useParams<{ id: string; postType: string }>();

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

  // 🐛 Same three-states fix the 공지사항 detail page got on 2026-08-01: `post`
  // was a single nullable value, so "Post not found." was the *first* render of
  // every visit and a thrown fetch landed on that same screen — a failure was
  // indistinguishable from a deleted post, and nothing ever set state again.
  const fetchPost = useCallback(async () => {
    // An unrecognised type is a dead link, not a reason to guess a collection.
    if (!id || !isPostType(postType)) return null;

    // Use the service layer instead of direct Firebase access.
    return getServiceForPostType(postType, mountainId).getPostById(id);
  }, [id, postType, mountainId]);

  const { status, data: post, reload } = useAsyncData(fetchPost);

  // The replies below must read and write the same collection the post came
  // from, so they take the service the post was actually resolved with.
  const postService = isPostType(postType) ? getServiceForPostType(postType, mountainId) : null;
  const ui = isPostType(postType) ? POST_TYPE_UI[postType] : null;

  useEffect(() => {
    if (post) setReplyCount(post.replyCount || 0);
  }, [post]);

  const handleReplySuccess = (reply: Post) => {
    setReplyCount((prev) => prev + 1);
    setShowReplyForm(false);
  };

  const handleReplyCountUpdate = (count: number) => {
    setReplyCount(count);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-4xl p-6" aria-busy="true" aria-live="polite">
          <span className="sr-only">불러오는 중이에요.</span>
          <div className="mb-4 h-9 w-32 animate-pulse rounded-lg bg-gray-200" />
          <div className="mb-2 h-9 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="mb-6 h-4 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-white shadow-md" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-4xl p-6">
          <ErrorNotice message="게시물을 불러오지 못했어요." onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!post || !postService || !ui) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center" data-oid="gb28vk9">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">게시물을 찾을 수 없습니다.</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => router.push(ui.listPath)}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            ← {ui.label} 목록으로
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{post.title}</h1>
          <div className="text-sm text-gray-500 mb-4">
            <span className="font-medium">{post.username}</span>
            <span className="mx-2">•</span>
            <span>
              {post.date} {post.time}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{post.message}</p>
          </div>

          {/* The shared renderer, so this page shows exactly what the 공지사항
              detail page and the 입양홍보 feed show: every image and every video,
              each with its own 제목/설명/태그. `videoUrl` is the legacy
              single-value field some older posts still carry. */}
          <PostMedia
            imageUrls={post.imageUrls}
            videoUrls={post.videoUrls?.length ? post.videoUrls : post.videoUrl && [post.videoUrl]}
            label={ui.label}
            layout="full"
          />

          {REPLYABLE.includes(postType as PostType) && (
            <div className="mt-8 border-t pt-6" data-oid=":lorruy">
              <h3 className="text-lg font-semibold mb-4" data-oid="8ds1dch">
                댓글
              </h3>

              <ReplyButton
                postId={post.id}
                replyCount={replyCount}
                onToggleReply={() => setShowReplyForm(!showReplyForm)}
                showingReplies={false}
                showingReplyForm={showReplyForm}
                data-oid=".tzeqq4"
              />

              {showReplyForm && (
                <ReplyForm
                  parentId={post.id}
                  parentUsername={post.username}
                  onReplySuccess={handleReplySuccess}
                  onCancel={() => setShowReplyForm(false)}
                  postService={postService}
                  data-oid="wr4xkv7"
                />
              )}

              <ReplyList
                postId={post.id}
                replyCount={replyCount}
                onReplyCountUpdate={handleReplyCountUpdate}
                postService={postService}
                data-oid="1hxe0gs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailsPage;
