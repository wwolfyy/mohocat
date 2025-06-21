import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { videoId, updates } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Updating YouTube video:', videoId, 'with updates:', updates);

    // First, get the current video data to preserve fields we're not updating
    const getResponse = await youtube.videos.list({
      part: ['snippet', 'recordingDetails'],
      id: [videoId],
    });

    if (!getResponse.data.items || getResponse.data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const currentVideo = getResponse.data.items[0];
    const currentSnippet = currentVideo.snippet;

    // Build the update object, preserving existing values for fields we're not updating
    const updateData: any = {
      id: videoId,
      snippet: {
        title: updates.title !== undefined ? updates.title : currentSnippet?.title,
        description: updates.description !== undefined ? updates.description : currentSnippet?.description,
        tags: updates.tags !== undefined ? updates.tags : currentSnippet?.tags,
        categoryId: currentSnippet?.categoryId,
        defaultLanguage: currentSnippet?.defaultLanguage,
        defaultAudioLanguage: currentSnippet?.defaultAudioLanguage,
      },
    };

    // Handle recording date if provided
    if (updates.recordingDate !== undefined) {
      updateData.recordingDetails = {
        recordingDate: updates.recordingDate,
      };
    }

    // Determine which parts to update
    const parts = ['snippet'];
    if (updates.recordingDate !== undefined) {
      parts.push('recordingDetails');
    }

    console.log('Calling YouTube API to update video with data:', updateData);

    // Update the video
    const updateResponse = await youtube.videos.update({
      part: parts,
      requestBody: updateData,
    });

    if (!updateResponse.data) {
      throw new Error('YouTube API returned no data');
    }

    console.log('✅ Successfully updated YouTube video:', videoId);

    return NextResponse.json({
      success: true,
      videoId: videoId,
      updatedFields: Object.keys(updates),
      data: updateResponse.data,
    });

  } catch (error) {
    console.error('Error updating YouTube video:', error);

    let errorMessage = 'Failed to update YouTube video';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific YouTube API errors
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'YouTube authentication failed. Please refresh your access token.';
        statusCode = 401;
      } else if (error.message.includes('quotaExceeded')) {
        errorMessage = 'YouTube API quota exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('forbidden')) {
        errorMessage = 'Insufficient permissions to update this video.';
        statusCode = 403;
      } else if (error.message.includes('notFound')) {
        errorMessage = 'Video not found or not accessible.';
        statusCode = 404;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: statusCode });
  }
}
