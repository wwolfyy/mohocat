"use client";

import React from "react";
import NewPostForm from "@/components/NewPostForm";

const NewPostPage = () => {
  return (
    <div className="p-4" data-oid="qvvqsgw">
      <h1 className="text-center text-2xl font-bold mb-4" data-oid="01xkqxf">
        새글 작성
      </h1>
      <NewPostForm data-oid="i9344cf" />
    </div>
  );
};

export default NewPostPage;

// If you use router.push or links to this page elsewhere, update their paths to '/pages/butler_stream/new'.
