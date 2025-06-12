'use client';

import React from 'react';
import NewPostForm from '@/components/NewPostForm';

const NewPostPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Create a New Post</h1>
      <NewPostForm />
    </div>
  );
};

export default NewPostPage;

// If you use router.push or links to this page elsewhere, update their paths to '/pages/butler_stream/new'.