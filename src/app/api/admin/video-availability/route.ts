import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase-admin';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getYouTubeOAuthCredentials } from '@/lib/youtube/credentials';

/**
 * Reconcile `cat_videos` against what actually exists on YouTube, and record the
 * verdict on each record as `youtubeStatus`.
 *
 * 🐛 **Why (2026-08-01, owner-reported).** Videos deleted on YouTube kept showing
 * in the public 영상첩 as dead grey tiles. `syncVideos` only ever computes
 * *YouTube minus Firestore* and imports the difference — nothing computes the
 * reverse, so a record outlives its video forever.
 *
 * 🔑 **Why this asks with the OWNER's OAuth credential rather than the public API
 * key, and why that is the whole point of the route.** The channel listing the
 * sync uses is fetched with the API key, and a video made **private** disappears
 * from it exactly like a deleted one. Pruning on absence from that listing would
 * therefore destroy a record — and with it the cat tags, 설명 and playlist
 * membership that the tagging queue exists to produce — the moment somebody flips
 * a video to private, an action that destroys nothing on YouTube's side. Asked
 * with the owner credential, YouTube distinguishes the two: a private video comes
 * back with `privacyStatus: 'private'`, a deleted one does not come back at all.
 *
 * ⚠️ **This route never deletes.** It only labels. Deletion stays a human decision
 * in the CMS — see the 삭제 action on /admin/tag-videos.
 */

/** `videos.list` accepts up to 50 ids per call. */
const ID_BATCH_SIZE = 50;

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export async function POST(request: NextRequest) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const youtubeOAuth = await getYouTubeOAuthCredentials();
    if (!youtubeOAuth) {
      return NextResponse.json(
        { error: 'YouTube OAuth credentials not configured' },
        { status: 500 }
      );
    }

    const snapshot = await db
      .collection('cat_videos')
      .where('mountainId', '==', authz.mountainId)
      .get();

    // Only YouTube-hosted records have anything to reconcile.
    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, youtubeId: doc.data().youtubeId as string | undefined }))
      .filter((r): r is { id: string; youtubeId: string } => Boolean(r.youtubeId));

    if (records.length === 0) {
      return NextResponse.json({ checked: 0, available: 0, private: 0, missing: 0, changed: 0 });
    }

    const oauth2Client = new google.auth.OAuth2(
      youtubeOAuth.clientId,
      youtubeOAuth.clientSecret,
      youtubeOAuth.redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: youtubeOAuth.refreshToken });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // id → privacyStatus for everything YouTube still knows about.
    const privacyById = new Map<string, string>();
    const ids = records.map((r) => r.youtubeId);

    for (const batch of chunk(ids, ID_BATCH_SIZE)) {
      const response = await youtube.videos.list({ part: ['status'], id: batch });
      for (const item of response.data.items || []) {
        if (item.id) privacyById.set(item.id, item.status?.privacyStatus || 'public');
      }
    }

    // 🚨 Safety valve. If YouTube acknowledged *nothing*, the likely cause is a
    // credential, scope or quota failure — not that the whole channel was
    // deleted. Flagging every record would empty the public album in one call,
    // so refuse instead of writing.
    if (privacyById.size === 0) {
      console.error(
        `Video availability check: YouTube returned no items for ${ids.length} ids — refusing to flag everything`
      );
      return NextResponse.json(
        {
          error:
            'YouTube가 어떤 영상도 확인해 주지 않았어요. 인증이나 할당량 문제일 수 있어 아무것도 바꾸지 않았어요.',
        },
        { status: 502 }
      );
    }

    const statusOf = (youtubeId: string): 'available' | 'private' | 'missing' => {
      const privacy = privacyById.get(youtubeId);
      if (!privacy) return 'missing';
      return privacy === 'private' ? 'private' : 'available';
    };

    const counts = { available: 0, private: 0, missing: 0 };
    const changedIds: string[] = [];
    const checkedAt = new Date();

    // Write only where the verdict actually changed — a no-op sync should not
    // touch 20 documents.
    const writer = db.batch();
    snapshot.docs.forEach((doc) => {
      const youtubeId = doc.data().youtubeId as string | undefined;
      if (!youtubeId) return;

      const status = statusOf(youtubeId);
      counts[status] += 1;

      if (doc.data().youtubeStatus !== status) {
        changedIds.push(doc.id);
        writer.update(doc.ref, { youtubeStatus: status, youtubeCheckedAt: checkedAt });
      }
    });

    if (changedIds.length > 0) await writer.commit();

    console.log(
      `Video availability: ${counts.available} available, ${counts.private} private, ${counts.missing} missing (${changedIds.length} records updated)`
    );

    return NextResponse.json({
      checked: records.length,
      ...counts,
      changed: changedIds.length,
    });
  } catch (error) {
    console.error('Error checking video availability:', error);
    throw error;
  }
}
