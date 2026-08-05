'use client';

import { useEffect, useState } from 'react';
import { getFeedingSpotsService, FeedingSpot } from '@/services';
import { useMountain } from '@/components/MountainProvider';
import { freshnessColor, FRESHNESS_URGENT_HOURS } from '@/utils/feedingFreshness';

const FeedingSpotsList = () => {
  const [feedingSpots, setFeedingSpots] = useState<FeedingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountainId = useMountain();
  const feedingSpotsService = getFeedingSpotsService(mountainId);

  // Freshness colour: blue (just fed) → red (long overdue). The ramp itself lives
  // in `@/utils/feedingFreshness` so it can be contrast-tested; here we only decide
  // how to apply it. `null` = no visit on record, rendered muted rather than as a
  // point on the scale.
  const getColorForHours = (
    hoursAgo: number | null
  ): { className: string; style?: React.CSSProperties } => {
    const color = freshnessColor(hoursAgo);
    return color ? { className: '', style: { color } } : { className: 'text-gray-500' };
  };

  // Format hours ago text. The `!` is the non-colour urgency channel — it is what
  // a colour-blind operator reads, so it stays regardless of the ramp.
  const formatHoursAgo = (hoursAgo: number | null): string => {
    if (hoursAgo === null) return '';
    if (hoursAgo === 0) return '(방금 전)';
    if (hoursAgo === 1) return '(1시간 전)';

    const baseText = `(${hoursAgo}시간 전)`;
    const urgentMarker = hoursAgo >= FRESHNESS_URGENT_HOURS ? ' !' : '';

    return baseText + urgentMarker;
  };

  useEffect(() => {
    const fetchFeedingSpots = async () => {
      try {
        setLoading(true);
        setError(null);
        const spots = await feedingSpotsService.getAllFeedingSpots();
        setFeedingSpots(spots);
      } catch (err) {
        console.error('Error fetching feeding spots:', err);
        setError('급식소 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedingSpots();
  }, [feedingSpotsService]);

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">급식소 현황</h2>
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
          <p className="mt-2 text-gray-600">급식소 정보를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
        <h2 className="text-lg font-semibold mb-3 text-red-800">급식소 현황</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">급식소 현황</h2>
      {feedingSpots.length === 0 ? (
        <p className="text-gray-600 text-center py-4">급식소 정보가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                  급식소명
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                  최근 방문일
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                  집사
                </th>
              </tr>
            </thead>
            <tbody>
              {feedingSpots.map((spot) => {
                const colorConfig = getColorForHours(spot.hoursAgo);
                return (
                  <tr key={spot.id} className="hover:bg-gray-50">
                    <td
                      className={`px-4 py-2 text-sm border-b font-medium ${colorConfig.className}`}
                      style={colorConfig.style}
                    >
                      {spot.name}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm border-b ${colorConfig.className}`}
                      style={colorConfig.style}
                    >
                      <span>
                        {spot.last_attended || '정보 없음'}
                        {spot.hoursAgo !== null && (
                          <span className="ml-2 text-xs opacity-75">
                            {formatHoursAgo(spot.hoursAgo)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border-b">
                      {spot.last_attended_by || '정보 없음'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeedingSpotsList;
