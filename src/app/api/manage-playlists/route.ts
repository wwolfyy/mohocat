import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeOAuthConfig, getYouTubeChannelId } from '@/utils/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId') || getYouTubeChannelId();

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get YouTube OAuth configuration from centralized config
    const youtubeOAuth = getYouTubeOAuthConfig();
    if (!youtubeOAuth) {
      return NextResponse.json(
        {
          error: 'YouTube OAuth credentials not configured',
        },
        { status: 500 }
      );
    }

    // Set up OAuth2 client for authenticated requests
    const oauth2Client = new google.auth.OAuth2(
      youtubeOAuth.clientId,
      youtubeOAuth.clientSecret,
      youtubeOAuth.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: youtubeOAuth.refreshToken,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Fetching playlists for channel:', channelId);

    // Fetch all playlists from the channel
    const playlistsResponse = await youtube.playlists.list({
      part: ['snippet', 'contentDetails', 'status'],
      channelId: channelId,
      maxResults: 50,
    });

    const playlists = playlistsResponse.data.items || [];

    console.log(`Found ${playlists.length} playlists`);

    // Format playlists for frontend use
    const formattedPlaylists = playlists.map((playlist: any) => ({
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description || '',
      thumbnailUrl:
        playlist.snippet.thumbnails?.medium?.url || playlist.snippet.thumbnails?.default?.url,
      itemCount: playlist.contentDetails.itemCount || 0,
      privacy: playlist.status.privacyStatus || 'private',
      publishedAt: playlist.snippet.publishedAt,
    }));

    return NextResponse.json({
      success: true,
      playlists: formattedPlaylists,
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch playlists',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, videoId, playlistId, playlistIds } = await request.json();

    // Get YouTube OAuth configuration from centralized config
    const youtubeOAuth = getYouTubeOAuthConfig();
    if (!youtubeOAuth) {
      return NextResponse.json(
        {
          error: 'YouTube OAuth credentials not configured',
        },
        { status: 500 }
      );
    }

    // Set up OAuth2 client for authenticated requests
    const oauth2Client = new google.auth.OAuth2(
      youtubeOAuth.clientId,
      youtubeOAuth.clientSecret,
      youtubeOAuth.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: youtubeOAuth.refreshToken,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Playlist management action:', action, { videoId, playlistId, playlistIds });

    switch (action) {
      case 'add_to_playlist':
        if (!videoId || !playlistId) {
          return NextResponse.json(
            { error: 'videoId and playlistId are required for add_to_playlist' },
            { status: 400 }
          );
        }

        const addResult = await youtube.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId,
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Video added to playlist successfully',
          playlistItemId: addResult.data.id,
        });

      case 'remove_from_playlist':
        if (!playlistId || !videoId) {
          return NextResponse.json(
            { error: 'playlistId and videoId are required for remove_from_playlist' },
            { status: 400 }
          );
        }

        // First, find the playlist item ID
        const playlistItemsResponse = await youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: playlistId,
          maxResults: 50,
        });

        const playlistItem = playlistItemsResponse.data.items?.find(
          (item: any) => item.snippet?.resourceId?.videoId === videoId
        );

        if (!playlistItem) {
          return NextResponse.json({ error: 'Video not found in playlist' }, { status: 404 });
        }

        await youtube.playlistItems.delete({
          id: playlistItem.id!,
        });

        return NextResponse.json({
          success: true,
          message: 'Video removed from playlist successfully',
        });

      case 'batch_update_playlists':
        if (!videoId || !Array.isArray(playlistIds)) {
          return NextResponse.json(
            { error: 'videoId and playlistIds array are required for batch_update_playlists' },
            { status: 400 }
          );
        }

        // First, get current playlists for the video
        const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
        if (!channelId) {
          return NextResponse.json({ error: 'Channel ID not configured' }, { status: 500 });
        }

        const currentPlaylistsResponse = await youtube.playlists.list({
          part: ['snippet'],
          channelId: channelId,
          maxResults: 50,
        });

        const allPlaylists = currentPlaylistsResponse.data.items || []; // Find which playlists currently contain this video
        const currentVideoPlaylists: string[] = [];
        for (const playlist of allPlaylists) {
          const itemsResponse = await youtube.playlistItems.list({
            part: ['snippet'],
            playlistId: playlist.id!,
            maxResults: 50,
          });

          const containsVideo = itemsResponse.data.items?.some(
            (item: any) => item.snippet?.resourceId?.videoId === videoId
          );
          if (containsVideo) {
            currentVideoPlaylists.push(playlist.id!);
          }
        }

        console.log(`Video ${videoId} currently in playlists:`, currentVideoPlaylists);
        console.log(`Target playlists:`, playlistIds);

        // Determine what to add and remove
        const playlistsToAdd = playlistIds.filter(
          (id: string) => !currentVideoPlaylists.includes(id)
        );
        const playlistsToRemove = currentVideoPlaylists.filter((id) => !playlistIds.includes(id));

        const results = [];

        // Add to new playlists
        for (const playlistId of playlistsToAdd) {
          try {
            await youtube.playlistItems.insert({
              part: ['snippet'],
              requestBody: {
                snippet: {
                  playlistId: playlistId,
                  resourceId: {
                    kind: 'youtube#video',
                    videoId: videoId,
                  },
                },
              },
            });
            results.push({ action: 'added', playlistId, success: true });
          } catch (error) {
            results.push({
              action: 'added',
              playlistId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Remove from old playlists
        for (const playlistId of playlistsToRemove) {
          try {
            // Find the playlist item ID
            const itemsResponse = await youtube.playlistItems.list({
              part: ['snippet'],
              playlistId: playlistId,
              maxResults: 50,
            });

            const playlistItem = itemsResponse.data.items?.find(
              (item: any) => item.snippet?.resourceId?.videoId === videoId
            );

            if (playlistItem) {
              await youtube.playlistItems.delete({
                id: playlistItem.id!,
              });
              results.push({ action: 'removed', playlistId, success: true });
            }
          } catch (error) {
            results.push({
              action: 'removed',
              playlistId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Playlist batch update completed',
          results,
          summary: {
            added: results.filter((r) => r.action === 'added' && r.success).length,
            removed: results.filter((r) => r.action === 'removed' && r.success).length,
            failed: results.filter((r) => !r.success).length,
          },
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing playlists:', error);
    return NextResponse.json(
      {
        error: 'Failed to manage playlists',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
