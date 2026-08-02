'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMountain } from '@/components/MountainProvider';
import { getServiceForPostType, isPostType } from '@/services/post-types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorNotice } from '@/components/ui/AsyncStates';
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
 */
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
      <div className="p-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">불러오는 중이에요.</span>
        <div className="mb-4 h-8 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4">
        <ErrorNotice message="게시물을 불러오지 못했어요." onRetry={reload} />
      </div>
    );
  }

  if (!post || !postService) {
    return (
      <div className="p-4" data-oid="gb28vk9">
        게시물을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="p-4" data-oid="cqcgpeq">
      <h1 className="text-2xl font-bold mb-4" data-oid="v2qhust">
        {post.title}
      </h1>
      <p data-oid="l.1t25q">{post.message}</p> {/* Show videos if present */}
      {((post.videoUrls && post.videoUrls.length > 0) || post.videoUrl) && (
        <div className="mt-4" data-oid="-lefipm">
          <h2 className="text-xl font-semibold mb-2" data-oid="pdg-0.z">
            {post.videoUrls?.length > 1 ? `Videos (${post.videoUrls.length}):` : 'Video:'}
          </h2>
          <div className="space-y-4" data-oid="kmf5wsd">
            {(() => {
              // Support both new videoUrls array and legacy videoUrl
              const videoUrls = post.videoUrls || [post.videoUrl];
              return videoUrls.map((videoUrl: string, index: number) => {
                // Extract YouTube video ID from URL
                const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                const videoId = match ? match[1] : null;

                if (videoId) {
                  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                  return (
                    <div key={index} data-oid="jf:vmdm">
                      {videoUrls.length > 1 && (
                        <h3 className="text-lg font-medium mb-2" data-oid="sctacn8">
                          Video {index + 1}
                        </h3>
                      )}
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block relative group"
                        data-oid="2jdmjk-"
                      >
                        <img
                          src={thumbnailUrl}
                          alt={`Video thumbnail ${index + 1}`}
                          className="w-full max-w-2xl rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
                          onError={(e) => {
                            // Fallback to medium quality thumbnail if maxres fails
                            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          }}
                          data-oid="8hlo15j"
                        />

                        {/* Play button overlay */}
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg"
                          data-oid="pge1wr5"
                        >
                          <div
                            className="bg-red-600 text-white rounded-full p-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                            data-oid="f40yn1v"
                          >
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              data-oid="rpd6ug3"
                            >
                              <path d="M8 5v14l11-7z" data-oid="8o90stx" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                } else {
                  // Fallback for non-YouTube videos or invalid URLs
                  return (
                    <div key={index} data-oid="wt09hvd">
                      {videoUrls.length > 1 && (
                        <h3 className="text-lg font-medium mb-2" data-oid="kg:sav:">
                          Video {index + 1}
                        </h3>
                      )}
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 underline"
                        data-oid="a1c-6ih"
                      >
                        Watch Video {index + 1}
                      </a>
                    </div>
                  );
                }
              });
            })()}
          </div>
        </div>
      )}
      {/* Show images if present */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className="mt-4" data-oid="j..7qvf">
          <h2 className="text-xl font-semibold mb-2" data-oid="1.mkqfc">
            Images:
          </h2>
          <div className="space-y-2" data-oid="-icr5up">
            {post.imageUrls.map((url: string, index: number) => (
              <img
                key={index}
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full rounded"
                data-oid="mwcywrv"
              />
            ))}
          </div>
        </div>
      )}
      {/* Reply section */}
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
    </div>
  );
};

export default PostDetailsPage;
