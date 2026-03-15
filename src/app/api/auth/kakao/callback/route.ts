import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/services/firebase';

/**
 * KakaoTalk OAuth Callback Handler
 *
 * This endpoint handles the OAuth callback from KakaoTalk after user authorization.
 * It exchanges the authorization code for Firebase credentials.
 *
 * Reference: https://developers.kakao.com/docs/latest/kakaologin/rest-api
 */

export async function GET(request: NextRequest) {
  try {
    console.log('=== KAKAOTALK CALLBACK HANDLER ===');

    // Extract authorization code from query parameters
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('Callback received with code:', code ? '***PRESENT***' : '***MISSING***');
    console.log('State parameter:', state || '***NOT_PROVIDED***');

    if (!code) {
      console.error('No authorization code received');
      return new NextResponse('No authorization code provided', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // For Firebase OpenID Connect, we need to redirect to Firebase's auth handler
    // This is handled automatically by Firebase when using signInWithPopup/redirect
    // The callback should redirect to the main auth handler

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const firebaseAuthHandler = `${baseUrl}/__/auth/handler?code=${code}${state ? `&state=${state}` : ''}`;

    console.log('Redirecting to Firebase auth handler:', firebaseAuthHandler);

    return NextResponse.redirect(firebaseAuthHandler);
  } catch (error) {
    console.error('KakaoTalk callback error:', error);
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
