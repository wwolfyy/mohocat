/**
 * POST /api/account/delete — member self-service account withdrawal (탈퇴).
 *
 * Data-subject deletion right (PIPA). Runs server-side via the Admin SDK so it
 * can delete the caller's own `users/{uid}` doc (client rules forbid that) and
 * their Firebase Auth account without the reauth friction of the client-SDK
 * `deleteUser()`. Auth is proven by the caller's own Firebase ID token — a user
 * can only ever delete themselves (the uid comes from the verified token, never
 * the request body).
 *
 * Immediate hard-delete: erases the account PII (email/phone/닉네임) at once, per
 * the privacy policy §3 retention clause ("탈퇴 시 지체 없이 파기"). Authored posts
 * are content, not account PII, and are left in place.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

const USERS_COLLECTION = 'users';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller's Firebase ID token; the uid to delete is taken from
    //    the token, so a caller can only delete their own account.
    const authHeader = request.headers.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(match[1]);
      uid = decoded.uid;
    } catch (error) {
      console.error('Account deletion: ID token verification failed');
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // 2. Delete the Firestore user doc (the PII holder), then the Auth account.
    //    Doc first: if the Auth delete fails we haven't orphaned an auth account
    //    that can no longer reach its own doc.
    await db.collection(USERS_COLLECTION).doc(uid).delete();
    await auth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json({ success: false, error: 'Deletion failed' }, { status: 500 });
  }
}
