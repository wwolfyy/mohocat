const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  recordingDate?: string; // Recording date from YouTube metadata
  duration?: string;
  videoUrl: string;
  channelTitle: string;
}

// Fetch videos from your YouTube channel
export const fetchChannelVideos = async (channelId?: string, maxResults: number = 50): Promise<YouTubeVideo[]> => {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    throw new Error('YouTube API key not configured. Please set NEXT_PUBLIC_YOUTUBE_API_KEY in your .env.local file.');
  }

  const targetChannelId = channelId || YOUTUBE_CHANNEL_ID;
  if (!targetChannelId) {
    console.error('YouTube channel ID not specified');
    throw new Error('YouTube channel ID not specified. Please set NEXT_PUBLIC_YOUTUBE_CHANNEL_ID in your .env.local file.');
  }

  try {
    console.log(`Fetching videos from channel: ${targetChannelId}`);

    // First, get the uploads playlist ID for the channel
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${targetChannelId}&key=${YOUTUBE_API_KEY}`
    );

    if (!channelResponse.ok) {
      throw new Error(`Failed to fetch channel info: ${channelResponse.status} ${channelResponse.statusText}`);
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found or has no content');
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist for this channel');
    }

    console.log(`Found uploads playlist: ${uploadsPlaylistId}`);

    // Get videos from the uploads playlist
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );

    if (!playlistResponse.ok) {
      throw new Error(`Failed to fetch playlist items: ${playlistResponse.status} ${playlistResponse.statusText}`);
    }

    const playlistData = await playlistResponse.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      console.log('No videos found in channel');
      return [];
    }

    const videoIds = playlistData.items
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return [];
    }

    console.log(`Found ${videoIds.length} videos, fetching details...`);    // Get detailed video information including duration and recording details
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,recordingDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error(`Failed to fetch video details: ${videosResponse.status} ${videosResponse.statusText}`);
    }

    const videosData = await videosResponse.json();

    const videos = videosData.items?.map((video: any) => ({
      id: video.id,
      title: video.snippet?.title || 'Untitled',
      description: video.snippet?.description || '',
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url ||
                    `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
      publishedAt: video.snippet?.publishedAt || '',
      recordingDate: video.recordingDetails?.recordingDate || undefined,
      duration: video.contentDetails?.duration || undefined,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      channelTitle: video.snippet?.channelTitle || '',
    })) || [];

    console.log(`Successfully fetched ${videos.length} videos from channel`);
    return videos;

  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    throw error;
  }
};

export const searchYouTubeVideos = async (query: string, maxResults: number = 25): Promise<YouTubeVideo[]> => {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    console.log(`Searching for videos with query: "${query}"`);

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&channelId=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
    );

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return [];
    }

    // Get detailed video information
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error(`Failed to fetch video details: ${videosResponse.status} ${videosResponse.statusText}`);
    }

    const videosData = await videosResponse.json();

    const videos = videosData.items?.map((video: any) => ({
      id: video.id,
      title: video.snippet?.title || 'Untitled',
      description: video.snippet?.description || '',
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url ||
                    `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
      publishedAt: video.snippet?.publishedAt || '',
      duration: video.contentDetails?.duration || undefined,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      channelTitle: video.snippet?.channelTitle || '',
    })) || [];

    console.log(`Found ${videos.length} videos matching search query`);
    return videos;

  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    throw error;
  }
};

// Simplified upload function
export const uploadVideoToYouTube = async (videoFile: string, title: string, description: string) => {
  throw new Error('YouTube upload functionality requires OAuth configuration and is not currently supported');
};