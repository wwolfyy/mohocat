import { google } from 'googleapis';

const youtube = google.youtube('v3');

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;

export const uploadVideoToYouTube = async (videoFile: string, title: string, description: string) => {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/youtube.upload'],
  });

  const youtubeClient = await auth.getClient();

  const request = {
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title,
        description,
        channelId: YOUTUBE_CHANNEL_ID,
      },
      status: {
        privacyStatus: 'public',
      },
    },
    media: {
      body: fs.createReadStream(videoFile),
    },
    auth: youtubeClient,
  };

  try {
    const response = await youtube.videos.insert(request);
    return response.data;
  } catch (error) {
    console.error('Error uploading video to YouTube:', error);
    throw error;
  }
};