'use client';

import { useState } from 'react';

export default function DiagnoseMediaPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      // Test all our debug endpoints
      const [mediaTest, tagTest] = await Promise.all([
        fetch('/api/test-media').then(r => r.json()),
        fetch('/api/debug-tags').then(r => r.json())
      ]);

      setResults({
        mediaTest,
        tagTest
      });
    } catch (error) {
      setResults({
        error: error?.toString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Media Collections Diagnosis</h1>

      <button
        onClick={runDiagnosis}
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-3 rounded disabled:opacity-50"
      >
        {loading ? 'Running Diagnosis...' : 'Run Full Diagnosis'}
      </button>

      {results && (
        <div className="mt-6 space-y-6">
          <div className="border p-4 rounded">
            <h2 className="font-bold mb-2">Media Service Test:</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(results.mediaTest, null, 2)}
            </pre>
          </div>

          <div className="border p-4 rounded">
            <h2 className="font-bold mb-2">Tag Matching Test:</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(results.tagTest, null, 2)}
            </pre>
          </div>

          {results.tagTest?.debug?.tagMatches && (
            <div className="border p-4 rounded">
              <h2 className="font-bold mb-2">Analysis:</h2>
              <div className="space-y-2">
                {results.tagTest.debug.tagMatches.map((match: any, index: number) => (
                  <div key={index} className="text-sm">
                    <strong>{match.catName}</strong>:
                    Images: {match.hasImageMatch ? '✅' : '❌'},
                    Videos: {match.hasVideoMatch ? '✅' : '❌'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
