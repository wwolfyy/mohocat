import { getYouTubeApiKey, getMountainConfig } from '@/utils/config';

// Get YouTube configuration from the centralized config system
const getYouTubeConfig = () => {
  const config = getMountainConfig();
  return {
    apiKey: getYouTubeApiKey(),
    channelId: config.social.youtubeChannelId || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID
  };
};

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

// Fetch videos from your YouTube channel with pagination support
export const fetchChannelVideos = async (channelId?: string, maxResults: number = 500): Promise<YouTubeVideo[]> => {
  const { apiKey, channelId: defaultChannelId } = getYouTubeConfig();

  if (!apiKey) {
    console.error('YouTube API key not configured');
    throw new Error('YouTube API key not configured. Please set NEXT_PUBLIC_YOUTUBE_API_KEY in your .env.local file.');
  }

  const targetChannelId = channelId || defaultChannelId;
  if (!targetChannelId) {
    console.error('YouTube channel ID not specified');
    throw new Error('YouTube channel ID not specified. Please set NEXT_PUBLIC_YOUTUBE_CHANNEL_ID in your .env.local file.');
  }

  try {
    console.log(`Fetching videos from channel: ${targetChannelId} (max: ${maxResults})`);

    // First, get the uploads playlist ID for the channel
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${targetChannelId}&key=${apiKey}`
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

    // Fetch all videos using pagination
    const allVideoIds: string[] = [];
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;
    const maxPageSize = 50; // YouTube API max per page

    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}${nextPageToken ? ` (token: ${nextPageToken.substring(0, 10)}...)` : ''}`);      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('playlistId', uploadsPlaylistId);
      url.searchParams.set('maxResults', Math.min(maxPageSize, maxResults - allVideoIds.length).toString());
      url.searchParams.set('key', apiKey);
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken);
      }

      const playlistResponse = await fetch(url.toString());

      if (!playlistResponse.ok) {
        throw new Error(`Failed to fetch playlist items (page ${pageCount}): ${playlistResponse.status} ${playlistResponse.statusText}`);
      }

      const playlistData = await playlistResponse.json();

      if (!playlistData.items || playlistData.items.length === 0) {
        console.log(`No more videos found on page ${pageCount}`);
        break;
      }

      const pageVideoIds = playlistData.items
        .map((item: any) => item.snippet?.resourceId?.videoId)
        .filter(Boolean);

      allVideoIds.push(...pageVideoIds);
      console.log(`Page ${pageCount}: Found ${pageVideoIds.length} videos (total: ${allVideoIds.length})`);

      nextPageToken = playlistData.nextPageToken;

      // Stop if we've reached the maxResults limit or there's no next page
      if (allVideoIds.length >= maxResults || !nextPageToken) {
        break;
      }
    } while (nextPageToken && allVideoIds.length < maxResults);

    if (allVideoIds.length === 0) {
      console.log('No videos found in channel');
      return [];
    }

    console.log(`Found ${allVideoIds.length} total videos across ${pageCount} pages, fetching details...`);

    // Get detailed video information in batches (YouTube API allows max 50 IDs per request)
    const batchSize = 50;
    const allVideos: YouTubeVideo[] = [];

    for (let i = 0; i < allVideoIds.length; i += batchSize) {
      const batchIds = allVideoIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allVideoIds.length / batchSize);

      console.log(`Fetching video details batch ${batchNumber}/${totalBatches} (${batchIds.length} videos)`);      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,recordingDetails&id=${batchIds.join(',')}&key=${apiKey}`
      );

      if (!videosResponse.ok) {
        throw new Error(`Failed to fetch video details for batch ${batchNumber}: ${videosResponse.status} ${videosResponse.statusText}`);
      }

      const videosData = await videosResponse.json();

      const batchVideos = videosData.items?.map((video: any) => ({
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

      allVideos.push(...batchVideos);
      console.log(`Batch ${batchNumber} complete: ${batchVideos.length} videos processed (total: ${allVideos.length})`);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < allVideoIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully fetched details for ${allVideos.length} videos from channel`);
    return allVideos;

  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    throw error;
  }
};

export const searchYouTubeVideos = async (query: string, maxResults: number = 25): Promise<YouTubeVideo[]> => {
  const { apiKey, channelId: defaultChannelId } = getYouTubeConfig();

  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  try {
    console.log(`Searching for videos with query: "${query}"`);

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&channelId=${defaultChannelId}&key=${apiKey}`
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
    }    // Get detailed video information
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`
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