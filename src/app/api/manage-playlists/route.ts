import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId') || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    console.log('Fetching playlists for channel:', channelId);

    // Fetch all playlists from the channel
    const playlistsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&channelId=${channelId}&key=${YOUTUBE_API_KEY}&maxResults=50`
    );

    if (!playlistsResponse.ok) {
      throw new Error(`Failed to fetch playlists: ${playlistsResponse.status} ${playlistsResponse.statusText}`);
    }

    const playlistsData = await playlistsResponse.json();
    const playlists = playlistsData.items || [];

    console.log(`Found ${playlists.length} playlists`);

    // Format playlists for frontend use
    const formattedPlaylists = playlists.map((playlist: any) => ({
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description || '',
      thumbnailUrl: playlist.snippet.thumbnails?.medium?.url || playlist.snippet.thumbnails?.default?.url,
      itemCount: playlist.contentDetails.itemCount || 0,
      privacy: playlist.status.privacyStatus || 'private',
      publishedAt: playlist.snippet.publishedAt,
    }));

    return NextResponse.json({
      success: true,
      playlists: formattedPlaylists
    });

  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, videoId, playlistId, playlistIds } = await request.json();

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    console.log('Playlist management action:', action, { videoId, playlistId, playlistIds });

    switch (action) {
      case 'add_to_playlist':
        if (!videoId || !playlistId) {
          return NextResponse.json({ error: 'videoId and playlistId are required for add_to_playlist' }, { status: 400 });
        }

        const addResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${YOUTUBE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              snippet: {
                playlistId: playlistId,
                resourceId: {
                  kind: 'youtube#video',
                  videoId: videoId
                }
              }
            })
          }
        );

        if (!addResponse.ok) {
          const errorData = await addResponse.json();
          throw new Error(`Failed to add video to playlist: ${errorData.error?.message || 'Unknown error'}`);
        }

        const addResult = await addResponse.json();
        return NextResponse.json({
          success: true,
          message: 'Video added to playlist successfully',
          playlistItemId: addResult.id
        });

      case 'remove_from_playlist':
        if (!playlistId) {
          return NextResponse.json({ error: 'playlistId is required for remove_from_playlist' }, { status: 400 });
        }

        // First, find the playlist item ID
        const playlistItemsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}&maxResults=50`
        );

        if (!playlistItemsResponse.ok) {
          throw new Error('Failed to fetch playlist items');
        }

        const playlistItemsData = await playlistItemsResponse.json();
        const playlistItem = playlistItemsData.items?.find((item: any) =>
          item.snippet?.resourceId?.videoId === videoId
        );

        if (!playlistItem) {
          return NextResponse.json({ error: 'Video not found in playlist' }, { status: 404 });
        }

        const removeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItem.id}&key=${YOUTUBE_API_KEY}`,
          { method: 'DELETE' }
        );

        if (!removeResponse.ok) {
          const errorData = await removeResponse.json();
          throw new Error(`Failed to remove video from playlist: ${errorData.error?.message || 'Unknown error'}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Video removed from playlist successfully'
        });

      case 'batch_update_playlists':
        if (!videoId || !Array.isArray(playlistIds)) {
          return NextResponse.json({ error: 'videoId and playlistIds array are required for batch_update_playlists' }, { status: 400 });
        }

        // First, get current playlists for the video
        const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
        if (!channelId) {
          return NextResponse.json({ error: 'Channel ID not configured' }, { status: 500 });
        }

        const currentPlaylistsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&key=${YOUTUBE_API_KEY}&maxResults=50`
        );

        if (!currentPlaylistsResponse.ok) {
          throw new Error('Failed to fetch channel playlists');
        }

        const currentPlaylistsData = await currentPlaylistsResponse.json();
        const allPlaylists = currentPlaylistsData.items || [];        // Find which playlists currently contain this video
        const currentVideoPlaylists: string[] = [];
        for (const playlist of allPlaylists) {
          const itemsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlist.id}&key=${YOUTUBE_API_KEY}&maxResults=50`
          );

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            const containsVideo = itemsData.items?.some((item: any) =>
              item.snippet?.resourceId?.videoId === videoId
            );
            if (containsVideo) {
              currentVideoPlaylists.push(playlist.id);
            }
          }
        }

        console.log(`Video ${videoId} currently in playlists:`, currentVideoPlaylists);
        console.log(`Target playlists:`, playlistIds);

        // Determine what to add and remove
        const playlistsToAdd = playlistIds.filter((id: string) => !currentVideoPlaylists.includes(id));
        const playlistsToRemove = currentVideoPlaylists.filter(id => !playlistIds.includes(id));

        const results = [];

        // Add to new playlists
        for (const playlistId of playlistsToAdd) {
          try {
            const addResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${YOUTUBE_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  snippet: {
                    playlistId: playlistId,
                    resourceId: {
                      kind: 'youtube#video',
                      videoId: videoId
                    }
                  }
                })
              }
            );

            if (addResponse.ok) {
              results.push({ action: 'added', playlistId, success: true });
            } else {
              const errorData = await addResponse.json();
              results.push({ action: 'added', playlistId, success: false, error: errorData.error?.message });
            }
          } catch (error) {
            results.push({ action: 'added', playlistId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        // Remove from old playlists
        for (const playlistId of playlistsToRemove) {
          try {
            // Find the playlist item ID
            const itemsResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}&maxResults=50`
            );

            if (itemsResponse.ok) {
              const itemsData = await itemsResponse.json();
              const playlistItem = itemsData.items?.find((item: any) =>
                item.snippet?.resourceId?.videoId === videoId
              );

              if (playlistItem) {
                const removeResponse = await fetch(
                  `https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItem.id}&key=${YOUTUBE_API_KEY}`,
                  { method: 'DELETE' }
                );

                if (removeResponse.ok) {
                  results.push({ action: 'removed', playlistId, success: true });
                } else {
                  const errorData = await removeResponse.json();
                  results.push({ action: 'removed', playlistId, success: false, error: errorData.error?.message });
                }
              }
            }
          } catch (error) {
            results.push({ action: 'removed', playlistId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Playlist batch update completed',
          results,
          summary: {
            added: results.filter(r => r.action === 'added' && r.success).length,
            removed: results.filter(r => r.action === 'removed' && r.success).length,
            failed: results.filter(r => !r.success).length
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error managing playlists:', error);
    return NextResponse.json(
      { error: 'Failed to manage playlists', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
