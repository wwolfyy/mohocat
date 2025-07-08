import React from "react";
import { getAdminFeedingSpotsService } from "@/services/feeding-spots-admin-service";
import FeedingSpotsList from "@/components/FeedingSpotsList";
import ButlerStreamClient from "@/components/ButlerStreamClient";

const ButlerStream = async () => {
  return (
    <div className="p-4" data-oid="z5x374l">
      <h1
        className="text-center text-2xl font-bold mb-4 mx-auto"
        data-oid=".pbn:qr"
      >
        급식현황
      </h1>

      <FeedingSpotsList />

      <ButlerStreamClient />
    </div>
  );
};

export default ButlerStream;
