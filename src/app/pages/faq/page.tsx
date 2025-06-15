'use client';

import React from 'react';
import FAQAccordion from '@/components/FAQ';

const FAQPage = () => {
  const faqItems = [
    {
      question: "Why do I see console errors about 'ERR_BLOCKED_BY_CLIENT'?",
      answer: (
        <div className="space-y-3">
          <p>
            This error appears when your ad blocker interferes with Firebase's real-time database connections.
            It's completely harmless and doesn't affect the core functionality of the application.
          </p>
          <p>
            <strong>What's happening:</strong> Ad blockers sometimes block Firebase's WebSocket connections
            because they contain tracking-like parameters in the URL.
          </p>
          <p>
            <strong>Impact:</strong> The app works perfectly - you can still upload videos, create posts,
            and view content. You might just miss real-time updates when other users post content.
          </p>
          <p>
            <strong>Solution:</strong> If you want real-time updates, consider whitelisting this site
            in your ad blocker settings. Otherwise, simply refresh the page to see new content.
          </p>
        </div>
      )
    },
    {
      question: "How do I upload videos to the platform?",
      answer: (
        <div className="space-y-3">
          <p>
            To upload videos:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Navigate to the "New Post" page</li>
            <li>Fill in the title and description</li>
            <li>Select your video file (supports common formats like .mp4, .mov, .avi)</li>
            <li>Optionally add images to accompany your video</li>
            <li>Click "Create Post"</li>
          </ol>
          <p>
            Your video will be uploaded to YouTube and embedded in your post. This process may take
            a few minutes depending on video size.
          </p>
        </div>
      )
    },
    {
      question: "What video formats are supported?",
      answer: "The platform supports common video formats including MP4, MOV, AVI, and other standard formats. Videos are uploaded to YouTube, so any format supported by YouTube will work."
    },
    {
      question: "Can I upload both images and videos in the same post?",
      answer: "Yes! You can create posts that contain both a video and multiple images. The video will be displayed as a clickable thumbnail, and all images will be shown in a gallery below it."
    },
    {
      question: "Why does video uploading take so long?",
      answer: (
        <div className="space-y-3">
          <p>
            Video uploading involves several steps that can take time:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Processing and uploading the file to YouTube</li>
            <li>YouTube's own processing and encoding</li>
            <li>Generating thumbnails and metadata</li>
          </ul>
          <p>
            Larger videos naturally take longer. Please be patient and don't close the browser
            while uploading.
          </p>
        </div>
      )
    },
    {
      question: "How do I navigate through multiple pages of posts?",
      answer: "Use the pagination controls at the bottom of the post list. Click the numbered buttons to jump to specific pages, or use the 'Previous' and 'Next' buttons to navigate sequentially."
    },
    {
      question: "What should I do if my video upload fails?",
      answer: (
        <div className="space-y-3">
          <p>
            If your video upload fails, try these steps:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Check your internet connection</li>
            <li>Ensure your video file isn't corrupted</li>
            <li>Try a smaller file size or different format</li>
            <li>Refresh the page and try again</li>
          </ul>
          <p>
            If problems persist, the issue might be temporary with YouTube's services.
          </p>
        </div>
      )
    },
    {
      question: "Are my uploaded videos public?",
      answer: "Yes, videos uploaded through this platform are made public on YouTube. Make sure you're comfortable with your content being publicly accessible before uploading."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-gray-600">
          Find answers to common questions about using the Mountain Cats platform
        </p>
      </div>

      <FAQAccordion items={faqItems} />

      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-900 mb-3">
          Still have questions?
        </h2>
        <p className="text-blue-800">
          If you couldn't find what you're looking for, feel free to reach out through our contact page
          or create a post in the community for help from other users.
        </p>
      </div>
    </div>
  );
};

export default FAQPage;
