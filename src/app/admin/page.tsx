"use client";

import { useState, useEffect } from "react";
import {
  getImageService,
  getVideoService,
  getCatService,
  getContactService,
  getPostService,
} from "@/services";

interface AdminStats {
  // Images stats
  totalImages: number;
  taggedImages: number;

  // Videos stats
  totalVideos: number;
  taggedVideos: number;

  // Other stats
  totalCats: number;
  totalContacts: number;
  totalPoints: number;

  // Posts stats (collections starting with "posts_")
  postsCollections: { name: string; count: number }[];
}

export default function AdminDashboard() {
  // Service references
  const imageService = getImageService();
  const videoService = getVideoService();
  const catService = getCatService();
  const contactService = getContactService();
  const postService = getPostService();

  const [stats, setStats] = useState<AdminStats>({
    totalImages: 0,
    taggedImages: 0,
    totalVideos: 0,
    taggedVideos: 0,
    totalCats: 0,
    totalContacts: 0,
    totalPoints: 0,
    postsCollections: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Posts collections configuration
  const [postsCollectionNames, setPostsCollectionNames] = useState<string>("");
  const [showPostsConfig, setShowPostsConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Data updater state
  const [dataUpdaterLoading, setDataUpdaterLoading] = useState(false);
  const [dataUpdaterMessage, setDataUpdaterMessage] = useState<string>("");

  // Load posts collection configuration from localStorage
  const loadPostsCollectionConfig = () => {
    try {
      const saved = localStorage.getItem("admin-posts-collections");
      if (saved) {
        setPostsCollectionNames(saved);
        return saved.split("\n").filter((name) => name.trim().length > 0);
      }
    } catch (error) {
      console.warn(
        "Failed to load posts collection config from localStorage:",
        error,
      );
    }

    // Default collections if nothing saved
    const defaultCollections = [
      "posts_main",
      "posts_feeding",
      "posts_announcements",
    ];

    setPostsCollectionNames(defaultCollections.join("\n"));
    return defaultCollections;
  };

  // Save posts collection configuration to localStorage
  const savePostsCollectionConfig = (configText: string) => {
    try {
      localStorage.setItem("admin-posts-collections", configText);
      setPostsCollectionNames(configText);
      return true;
    } catch (error) {
      console.error(
        "Failed to save posts collection config to localStorage:",
        error,
      );
      return false;
    }
  };

  // Get posts collections from user configuration
  const getConfiguredPostsCollections = async (collectionNames: string[]) => {
    const postsCollections: { name: string; count: number }[] = [];

    for (const collectionName of collectionNames) {
      try {
        // TODO: Replace with post service when collection-specific methods are available
        // For now, return placeholder data since we don't have collection-specific service methods
        postsCollections.push({
          name: collectionName,
          count: 0, // Placeholder until proper post service implementation
        });
      } catch (error) {
        console.warn(
          `Failed to get count for collection ${collectionName}:`,
          error,
        );
        postsCollections.push({
          name: collectionName,
          count: 0,
        });
      }
    }

    return postsCollections;
  };
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load posts collection configuration
        const configuredCollections = loadPostsCollectionConfig();

        // Fetch data using service layer
        const [
          allImages,
          allVideos,
          allCats,
          // Note: contacts and points don't have getAll methods in current service interfaces
          // We'll handle them separately with try-catch
        ] = await Promise.all([
          imageService.getAllImages(),
          videoService.getAllVideos(),
          catService.getAllCats(),
        ]);

        // Get contacts count (fallback to 0 if service doesn't support getAll)
        let totalContacts = 0;
        try {
          // TODO: Add getAllContacts method to IContactService interface
          // For now, this is a placeholder
          totalContacts = 0;
        } catch (error) {
          console.warn("Contacts count not available:", error);
          totalContacts = 0;
        }

        // Get points count from static API
        let totalPoints = 0;
        try {
          const pointsResponse = await fetch('/api/points');
          if (pointsResponse.ok) {
            const { points } = await pointsResponse.json();
            totalPoints = points.length;
          }
        } catch (error) {
          console.warn("Points count not available:", error);
          totalPoints = 0;
        }

        // Count tagged images and videos
        const taggedImagesCount = allImages.filter((image: any) => {
          return (
            image.tags && Array.isArray(image.tags) && image.tags.length > 0
          );
        }).length;

        const taggedVideosCount = allVideos.filter((video: any) => {
          return (
            video.tags && Array.isArray(video.tags) && video.tags.length > 0
          );
        }).length;

        // Get posts collections based on user configuration
        const postsCollections = await getConfiguredPostsCollections(
          configuredCollections,
        );

        setStats({
          totalImages: allImages.length,
          taggedImages: taggedImagesCount,
          totalVideos: allVideos.length,
          taggedVideos: taggedVideosCount,
          totalCats: allCats.length,
          totalContacts: totalContacts,
          totalPoints: totalPoints,
          postsCollections: postsCollections,
        });
      } catch (err: any) {
        console.error("Error fetching stats:", err);

        // Provide more specific error messages
        let errorMessage = "Failed to load statistics";
        if (err.code === "permission-denied") {
          errorMessage = "Permission denied - check Firestore rules";
        } else if (err.code === "unavailable") {
          errorMessage = "Firestore unavailable - check connection";
        } else if (err.message) {
          errorMessage = `Error: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Static data update functions
  const updateStaticData = async (dataType: 'cats' | 'points' | 'feeding-spots' | 'all') => {
    try {
      setDataUpdaterLoading(true);
      setDataUpdaterMessage(`Updating ${dataType} data...`);

      const response = await fetch('/api/admin/update-static-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataType }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Update failed');
      }

      setDataUpdaterMessage(`${result.message} ✅`);

      // Refresh stats after successful update
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Static data update failed:', error);
      setDataUpdaterMessage(`Update failed: ${error.message} ❌`);
    } finally {
      setDataUpdaterLoading(false);
    }
  };

  const updateCatsData = () => updateStaticData('cats');
  const updatePointsData = () => updateStaticData('points');
  const updateFeedingSpotsData = () => updateStaticData('feeding-spots');
  const updateAllStaticData = () => updateStaticData('all');

  return (
    <div
      style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}
      data-oid="3k7zs5."
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }} data-oid="jbo7lj3">
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "0.5rem",
          }}
          data-oid="7z5gd_x"
        >
          🐱 산냥이집냥이 관리자 페이지
        </h1>


        {/* Service Configuration Status */}
        {/* Removed service layer configuration box */}

        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem",
              color: "#dc2626",
            }}
            data-oid="93q-7rm"
          >
            ⚠️ {error}
          </div>
        )}

        {!error &&
          !loading &&
          stats.totalImages === 0 &&
          stats.totalVideos === 0 &&
          stats.totalCats === 0 &&
          stats.totalContacts === 0 &&
          stats.totalPoints === 0 && (
            <div
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "8px",
                padding: "1rem",
                marginTop: "1rem",
                color: "#92400e",
              }}
              data-oid="b-d56vv"
            >
              📊 No data found. Please ensure your database is properly configured.
            </div>
          )}
      </div>

      {/* Quick Stats - 6 Tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
        data-oid="p5es.xv"
      >
        {/* Images Tile */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="ky-c8ki"
        >
          <div
            style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
            data-oid="t2fw2li"
          >
            🖼️
          </div>
          <h3
            style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}
            data-oid="w_aicfh"
          >
            사진
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              margin: 0,
            }}
            data-oid="374zfaz"
          >
            {loading ? "Loading..." : stats.totalImages}
          </p>
          {!loading && stats.totalImages > 0 && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                margin: "0.25rem 0 0 0",
              }}
              data-oid="7nnuis:"
            >
              {stats.taggedImages} tagged
            </p>
          )}
        </div>

        {/* Videos Tile */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="5ago4y3"
        >
          <div
            style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
            data-oid="ce8998b"
          >
            🎥
          </div>
          <h3
            style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}
            data-oid="k83rzh3"
          >
            동영상
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              margin: 0,
            }}
            data-oid="87ak9e-"
          >
            {loading ? "Loading..." : stats.totalVideos}
          </p>
          {!loading && stats.totalVideos > 0 && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                margin: "0.25rem 0 0 0",
              }}
              data-oid="-b2z-.b"
            >
              {stats.taggedVideos} tagged
            </p>
          )}
        </div>

        {/* Cats Tile */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="34qlh1x"
        >
          <div
            style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
            data-oid="_952g1o"
          >
            🐱
          </div>
          <h3
            style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}
            data-oid="a:g.734"
          >
            고양이들
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              margin: 0,
            }}
            data-oid="-zikimc"
          >
            {loading ? "Loading..." : stats.totalCats}
          </p>
        </div>

        {/* Contacts Tile */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="2zm0gko"
        >
          <div
            style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
            data-oid="q6nqrq2"
          >
            📧
          </div>
          <h3
            style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}
            data-oid="3ct38kf"
          >
            회원
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              margin: 0,
            }}
            data-oid="1hvy0ga"
          >
            {loading ? "Loading..." : stats.totalContacts}
          </p>
        </div>

        {/* Points Tile */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="dxjicch"
        >
          <div
            style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
            data-oid="2_y7h0i"
          >
            �
          </div>
          <h3
            style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}
            data-oid="7ee3-5p"
          >
            지도상 거주지
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              margin: 0,
            }}
            data-oid="116q03m"
          >
            {loading ? "Loading..." : stats.totalPoints}
          </p>
        </div>

        {/* Posts Tile */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="f:4x5c1"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.5rem",
            }}
            data-oid="g2cx-mx"
          >
            <div style={{ fontSize: "2rem" }} data-oid=".bq-c12">
              📝
            </div>
            <button
              onClick={() => setShowPostsConfig(!showPostsConfig)}
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                color: "#374151",
                cursor: "pointer",
              }}
              title="Configure post collections"
              data-oid="mjr.6p6"
            >
              ⚙️ Config
            </button>
          </div>
          <h3
            style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}
            data-oid="x1.9aam"
          >
            게시물
          </h3>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              margin: 0,
            }}
            data-oid="0l.onvm"
          >
            {loading ? "Loading..." : stats.postsCollections.length}
          </div>
          {!loading && stats.postsCollections.length > 0 && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                margin: "0.25rem 0 0 0",
              }}
              data-oid="pt5p2ax"
            >
              {stats.postsCollections.map((collection) => (
                <div
                  key={collection.name}
                  style={{
                    margin: "0.125rem 0",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                  data-oid="o6qoz3w"
                >
                  <span data-oid="30ngnpc">
                    {collection.name.replace("posts_", "")}
                  </span>
                  <span style={{ fontWeight: "bold" }} data-oid="b.mqqdx">
                    {collection.count}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!loading && stats.postsCollections.length === 0 && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#ef4444",
                margin: "0.25rem 0 0 0",
              }}
              data-oid="592_023"
            >
              No collections configured
            </p>
          )}
        </div>
      </div>

      {/* Posts Collections Configuration Panel */}
      {showPostsConfig && (
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            marginBottom: "2rem",
          }}
          data-oid="k298t.3"
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            data-oid="iprgon-"
          >
            📝 Configure Posts Collections
          </h3>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.9rem",
              marginBottom: "1rem",
              lineHeight: "1.4",
            }}
            data-oid="kuff-oy"
          >
            Specify which Firestore collections should be considered "posts"
            collections. Enter one collection name per line. The dashboard will
            show document counts for each collection.
          </p>

          <div
            style={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "0.75rem",
              marginBottom: "1rem",
              fontSize: "0.8rem",
              color: "#374151",
            }}
            data-oid="xmzu2il"
          >
            <strong data-oid="l15b881">Example:</strong>
            <br data-oid="ve:1iv_" />
            <code
              style={{
                fontFamily: "monospace",
                backgroundColor: "#f3f4f6",
                padding: "0.125rem 0.25rem",
                borderRadius: "3px",
              }}
              data-oid="0mn:i:4"
            >
              posts_main
              <br data-oid="nocx.4s" />
              posts_feeding
              <br data-oid="-lijsx4" />
              posts_announcements
              <br data-oid="tdqtyew" />
              posts_events
            </code>
          </div>

          <div style={{ marginBottom: "1rem" }} data-oid="-koql1t">
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
              data-oid="0irran6"
            >
              Collection Names (one per line):
            </label>
            <textarea
              value={postsCollectionNames}
              onChange={(e) => setPostsCollectionNames(e.target.value)}
              placeholder="posts_main&#10;posts_feeding&#10;posts_announcements"
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.9rem",
                fontFamily: "monospace",
                resize: "vertical",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
              data-oid="lfo3yn_"
            />
          </div>

          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            data-oid="nmh_6rn"
          >
            <button
              onClick={async () => {
                setConfigLoading(true);
                setConfigSuccess(false);
                try {
                  const saved = savePostsCollectionConfig(postsCollectionNames);
                  if (!saved) {
                    throw new Error("Failed to save configuration");
                  }

                  // Re-fetch stats with new configuration
                  const collectionNames = postsCollectionNames
                    .split("\n")
                    .map((name) => name.trim())
                    .filter((name) => name.length > 0);

                  if (collectionNames.length === 0) {
                    throw new Error(
                      "Please specify at least one collection name",
                    );
                  }

                  const newPostsCollections =
                    await getConfiguredPostsCollections(collectionNames);

                  setStats((prev) => ({
                    ...prev,
                    postsCollections: newPostsCollections,
                  }));

                  setConfigSuccess(true);
                  setTimeout(() => {
                    setShowPostsConfig(false);
                    setConfigSuccess(false);
                  }, 1000);
                } catch (error) {
                  console.error(
                    "Failed to update posts collections config:",
                    error,
                  );
                  alert(
                    `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                  );
                } finally {
                  setConfigLoading(false);
                }
              }}
              disabled={configLoading}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: configLoading
                  ? "#9ca3af"
                  : configSuccess
                    ? "#10b981"
                    : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: configLoading ? "not-allowed" : "pointer",
              }}
              data-oid="gwcntf0"
            >
              {configLoading
                ? "Saving..."
                : configSuccess
                  ? "✓ Saved!"
                  : "Save & Refresh"}
            </button>

            <button
              onClick={() => {
                setShowPostsConfig(false);
                // Reset to saved config
                loadPostsCollectionConfig();
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              data-oid="daixp6:"
            >
              Cancel
            </button>

            <div
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                marginLeft: "auto",
              }}
              data-oid="ig7xvly"
            >
              Configuration saved to browser storage
            </div>
          </div>
        </div>
      )}

      {/* Static Data Management */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          🔄 Static Data Management
        </h3>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            lineHeight: "1.4",
          }}
        >
          Update static data files from Firebase collections. This improves performance by serving data from JSON files instead of making database queries.
        </p>

        {/* Status Message */}
        {dataUpdaterMessage && (
          <div
            style={{
              backgroundColor: dataUpdaterMessage.includes('❌') ? "#fef2f2" : "#f0fdf4",
              border: dataUpdaterMessage.includes('❌') ? "1px solid #fecaca" : "1px solid #bbf7d0",
              borderRadius: "6px",
              padding: "0.75rem",
              marginBottom: "1rem",
              color: dataUpdaterMessage.includes('❌') ? "#dc2626" : "#16a34a",
              fontSize: "0.9rem",
            }}
          >
            {dataUpdaterMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <button
            onClick={updateCatsData}
            disabled={dataUpdaterLoading}
            style={{
              backgroundColor: dataUpdaterLoading ? "#f3f4f6" : "#3b82f6",
              color: dataUpdaterLoading ? "#6b7280" : "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              cursor: dataUpdaterLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            🐱 Update Cats Data
          </button>

          <button
            onClick={updatePointsData}
            disabled={dataUpdaterLoading}
            style={{
              backgroundColor: dataUpdaterLoading ? "#f3f4f6" : "#10b981",
              color: dataUpdaterLoading ? "#6b7280" : "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              cursor: dataUpdaterLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            📍 Update Points Data
          </button>

          <button
            onClick={updateFeedingSpotsData}
            disabled={dataUpdaterLoading}
            style={{
              backgroundColor: dataUpdaterLoading ? "#f3f4f6" : "#f59e0b",
              color: dataUpdaterLoading ? "#6b7280" : "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              cursor: dataUpdaterLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            🍽️ Update Feeding Spots
          </button>

          <button
            onClick={updateAllStaticData}
            disabled={dataUpdaterLoading}
            style={{
              backgroundColor: dataUpdaterLoading ? "#f3f4f6" : "#8b5cf6",
              color: dataUpdaterLoading ? "#6b7280" : "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              cursor: dataUpdaterLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              gridColumn: "span 2",
            }}
          >
            {dataUpdaterLoading ? "🔄 Updating..." : "🚀 Update All Data"}
          </button>
        </div>

        <div
          style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "0.75rem",
            fontSize: "0.8rem",
            color: "#374151",
          }}
        >
          <strong>Note:</strong> Static data updates may take a few moments to complete. The page will refresh automatically after successful updates.
        </div>
      </div>

      {/* Main Actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
        data-oid=":k89egg"
      >
        <a
          href="/admin/tag-images"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            border: "1px solid #e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          data-oid="ravbkcp"
        >
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="46oikfo"
          >
            🖼️
          </div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
            data-oid="3durko6"
          >
            사진 관리
          </h3>
        </a>

        <a
          href="/admin/tag-videos"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            border: "1px solid #e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          data-oid="g9.filc"
        >
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="a8t8q.p"
          >
            🎥
          </div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
            data-oid="yndubm1"
          >
            동영상 관리
          </h3>
        </a>

        <a
          href="/admin/cats"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            border: "1px solid #e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          data-oid="catscms"
        >
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="catscms_icon"
          >
            🐱
          </div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
            data-oid="catscms_title"
          >
            고양이 관리
          </h3>
        </a>

        <a
          href="/admin/about-content"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            border: "1px solid #e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          data-oid="aboutcms"
        >
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="aboutcms_icon"
          >
            📝
          </div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
            data-oid="aboutcms_title"
          >
            소개 페이지 관리
          </h3>
        </a>
      </div>
    </div>
  );
}
