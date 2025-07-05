"use client";

import { useState } from "react";
import { getStorageUrl } from "@/lib/firebase";
import { getCurrentMountainId } from "@/utils/config";

export default function FirebaseStorageTest() {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testStorageAccess = async () => {
    setLoading(true);
    setTestResult("Testing Firebase Storage access...");

    try {
      const mountainId = getCurrentMountainId();
      const storagePath = `about-photos/${mountainId}/about-main-geyang.jpg`;

      console.log("Testing storage path:", storagePath);
      console.log("Mountain ID:", mountainId);

      const url = await getStorageUrl(storagePath);

      console.log("Successfully got URL:", url);
      setTestResult(`Success! URL: ${url}`);

      // Test if the URL is actually accessible
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        setTestResult(`Success! URL is accessible: ${url}`);
      } else {
        setTestResult(
          `URL exists but not accessible: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("Storage test error:", error);
      setTestResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Firebase Storage Test</h3>
      <button
        onClick={testStorageAccess}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Storage Access"}
      </button>
      {testResult && (
        <div className="mt-4 p-3 bg-white border rounded">
          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
}
