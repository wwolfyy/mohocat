// Helper function to parse YouTube's ISO 8601 duration format (e.g., "PT4M13S") to seconds
export const parseYouTubeDuration = (duration: string): number => {
  if (!duration) return 0;

  // Match PT[hours]H[minutes]M[seconds]S format
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
};

// Helper function to format duration from seconds to mm:ss or hh:mm:ss
export const formatDuration = (durationInput?: number | string): string => {
  let seconds: number;

  if (typeof durationInput === 'string') {
    // If it's a YouTube ISO 8601 format, parse it
    seconds = parseYouTubeDuration(durationInput);
  } else if (typeof durationInput === 'number') {
    seconds = durationInput;
  } else {
    return '00:00';
  }

  if (!seconds || seconds <= 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

// Helper function specifically for seconds input (for admin components)
export const formatDurationFromSeconds = (seconds: number): string => {
  if (!seconds) return 'Unknown';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
