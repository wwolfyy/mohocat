import React from "react";

interface Post {
  id: string;
  title: string;
  username: string;
  date: string;
  time: string;
  thumbnailUrl: string;
  mediaType: "video" | "image";
}

interface PostItemProps {
  post: Post;
}

const PostItem: React.FC<PostItemProps> = ({ post }) => {
  const { thumbnailUrl, date, time, username, mediaType, title } = post;
  return (
    <div className="flex items-center p-4 border-b">
      <img
        src={thumbnailUrl}
        alt="Post Thumbnail"
        className="w-16 h-16 rounded"
      />

      <div className="ml-4 flex-1">
        <div className="flex justify-between">
          <span className="font-semibold">{username}</span>
          <span className="text-gray-500">{`${date} ${time}`}</span>
        </div>
        <div className="font-bold mt-1">{title}</div>
        <div className="flex mt-1">
          {mediaType === "video" ? (
            <span className="text-blue-500">🎥 Video</span>
          ) : (
            <span className="text-green-500">🖼️ Image</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostItem;
