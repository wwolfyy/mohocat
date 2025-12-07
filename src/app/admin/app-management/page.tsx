"use client";

import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import AboutContentEditor from "@/components/admin/AboutContentEditor";
import { useSearchParams } from 'next/navigation';

const AppManagementPage = () => {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<"about" | "faq" | "static-data" | "posts-config">("about");
    const [isInitialized, setIsInitialized] = useState(false);

    // Static data updater state
    const [dataUpdaterLoading, setDataUpdaterLoading] = useState(false);
    const [dataUpdaterMessage, setDataUpdaterMessage] = useState<string>("");

    // Posts collections configuration
    const [postsCollectionNames, setPostsCollectionNames] = useState<string>("");
    const [configLoading, setConfigLoading] = useState(false);
    const [configSuccess, setConfigSuccess] = useState(false);

    // Load posts collection configuration from localStorage
    const loadPostsCollectionConfig = () => {
        try {
            const saved = localStorage.getItem("admin-posts-collections");
            if (saved) {
                setPostsCollectionNames(saved);
                return saved.split("\n").filter((name) => name.trim().length > 0);
            }
        } catch (error) {
            console.warn("Failed to load posts collection config from localStorage:", error);
        }

        // Default collections if nothing saved
        const defaultCollections = ["posts_main", "posts_feeding", "posts_announcements"];
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
            console.error("Failed to save posts collection config to localStorage:", error);
            return false;
        }
    };

    // Check for tab parameter in URL on mount
    useEffect(() => {
        if (!isInitialized) {
            const tab = searchParams.get('tab');
            if (tab && (tab === "about" || tab === "faq" || tab === "static-data" || tab === "posts-config")) {
                setActiveTab(tab as typeof activeTab);
            }
            setIsInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load posts config when posts-config tab is active
    useEffect(() => {
        if (activeTab === "posts-config" && isInitialized) {
            loadPostsCollectionConfig();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isInitialized]);

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
        <div className="p-4">
            <h1 className="text-center text-2xl font-bold mb-6">
                App Management
            </h1>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab("about")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "about"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    소개페이지 관리
                </button>
                <button
                    onClick={() => setActiveTab("static-data")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "static-data"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    Static Data 관리
                </button>
                <button
                    onClick={() => setActiveTab("posts-config")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "posts-config"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    게시물 Collections 설정
                </button>
                <button
                    disabled
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors cursor-not-allowed opacity-50",
                        "border-transparent text-gray-400"
                    )}
                    title="FAQ 기능은 아직 구현되지 않았습니다."
                >
                    FAQ
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "about" && <AboutContentEditor />}

            {activeTab === "static-data" && (
                <div
                    style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
            )}

            {activeTab === "posts-config" && (
                <div
                    style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
                        📝 Configure Posts Collections
                    </h3>
                    <p
                        style={{
                            color: "#6b7280",
                            fontSize: "0.9rem",
                            marginBottom: "1rem",
                            lineHeight: "1.4",
                        }}
                    >
                        Specify which Firestore collections should be considered "posts" collections. Enter one collection name per line. The dashboard will show document counts for each collection.
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
                    >
                        <strong>Example:</strong>
                        <br />
                        <code
                            style={{
                                fontFamily: "monospace",
                                backgroundColor: "#f3f4f6",
                                padding: "0.125rem 0.25rem",
                                borderRadius: "3px",
                            }}
                        >
                            posts_main
                            <br />
                            posts_feeding
                            <br />
                            posts_announcements
                            <br />
                            posts_events
                        </code>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                                color: "#374151",
                                marginBottom: "0.5rem",
                            }}
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
                        />
                    </div>

                    <div
                        style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
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

                                    const collectionNames = postsCollectionNames
                                        .split("\n")
                                        .map((name) => name.trim())
                                        .filter((name) => name.length > 0);

                                    if (collectionNames.length === 0) {
                                        throw new Error("Please specify at least one collection name");
                                    }

                                    setConfigSuccess(true);
                                    setTimeout(() => {
                                        setConfigSuccess(false);
                                        alert("Configuration saved! The dashboard will reflect these changes on next load.");
                                    }, 500);
                                } catch (error) {
                                    console.error("Failed to update posts collections config:", error);
                                    alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                                } finally {
                                    setConfigLoading(false);
                                }
                            }}
                            disabled={configLoading}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: configLoading ? "#9ca3af" : configSuccess ? "#10b981" : "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                                cursor: configLoading ? "not-allowed" : "pointer",
                            }}
                        >
                            {configLoading ? "Saving..." : configSuccess ? "✓ Saved!" : "Save Configuration"}
                        </button>

                        <button
                            onClick={() => {
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
                        >
                            Reset to Saved
                        </button>

                        <div
                            style={{
                                fontSize: "0.8rem",
                                color: "#6b7280",
                                marginLeft: "auto",
                            }}
                        >
                            Configuration saved to browser storage
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppManagementPage;
