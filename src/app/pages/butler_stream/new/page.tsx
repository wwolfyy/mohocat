import React from "react";
import NewPostForm from "@/components/NewPostForm";

interface BasicFeedingSpot {
  id: number;
  name: string;
}

const NewPostPage = async () => {
  // Fetch basic feeding spots at build time
  let feedingSpots: BasicFeedingSpot[] = [];

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/feeding-spots-basic`, {
      cache: 'force-cache', // Cache at build time
    });

    if (response.ok) {
      const data = await response.json();
      feedingSpots = data.feedingSpots || [];
    } else {
      console.warn('Failed to fetch feeding spots at build time');
    }
  } catch (error) {
    console.error('Error fetching feeding spots at build time:', error);
  }

  return (
    <div className="p-4" data-oid="qvvqsgw">
      <h1 className="text-center text-2xl font-bold mb-4" data-oid="01xkqxf">
        새글 작성
      </h1>
      <NewPostForm feedingSpots={feedingSpots} data-oid="i9344cf" />
    </div>
  );
};

export default NewPostPage;
