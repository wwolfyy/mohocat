import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getStoredRefreshToken, getYouTubeOAuthClient } from '@/lib/youtube/credentials';

interface TokenInfo {
  source: 'firestore';
  token: string;
  isValid: boolean;
  expiresAt: string | null;
  updatedAt?: string;
  error?: string;
}

// Gated: the response includes the YouTube OAuth refresh token (a secret), so this must
// never be world-readable. Require manage-video.
export async function GET(request: Request) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  try {
    // Client identity only — the stored token is checked separately below. There is
    // exactly one token source now (Firestore); the env token this route used to report
    // alongside it was removed with the fallback (DEBUG_LOG 2026-07-26).
    const oauthConfig = getYouTubeOAuthClient();

    if (!oauthConfig) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'YouTube OAuth not configured',
        tokens: [],
      });
    }

    const tokens: TokenInfo[] = [];
    let firestoreTokenData: Awaited<ReturnType<typeof getStoredRefreshToken>> = null;

    // A read failure leaves this reporting "no token" rather than failing the whole
    // status check — a diagnostics panel is more useful degraded than absent, and the
    // logged error says which it is.
    try {
      firestoreTokenData = await getStoredRefreshToken();
    } catch (error) {
      console.error('Failed to get Firestore token data:', error);
    }

    if (firestoreTokenData?.refreshToken) {
      const firestoreConfig = {
        ...oauthConfig,
        refreshToken: firestoreTokenData.refreshToken,
      };
      const firestoreTokenInfo = await checkToken(firestoreConfig, 'firestore');
      firestoreTokenInfo.updatedAt = firestoreTokenData.updatedAt;
      tokens.push(firestoreTokenInfo);
    }

    // Determine overall status
    const validTokens = tokens.filter((t) => t.isValid);
    const hasValidToken = validTokens.length > 0;

    const firestoreToken = tokens.find((t) => t.source === 'firestore');

    // Never send the raw refresh token (a secret) to the client. The UI only needs each
    // token's source/validity/expiry, not its value.
    const safeTokens = tokens.map(({ token, ...rest }) => rest);

    return NextResponse.json({
      status: hasValidToken ? 'valid' : tokens.length > 0 ? 'expired' : 'not_configured',
      message: hasValidToken
        ? '유효한 토큰이 있습니다'
        : tokens.length > 0
          ? '토큰이 만료됨'
          : '토큰이 설정되지 않음',
      tokens: safeTokens,
      expiresAt: validTokens.length > 0 ? validTokens[0].expiresAt : null,
      firestoreTokenInfo: firestoreToken
        ? {
            issuedAt: firestoreToken.updatedAt || 'Firestore (발급일 불명)',
            status: firestoreToken.isValid ? 'valid' : 'expired',
          }
        : undefined,
    });
  } catch (error) {
    console.error('YouTube auth status check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check token status',
        error: error instanceof Error ? error.message : 'Unknown error',
        tokens: [],
      },
      { status: 500 }
    );
  }
}

async function checkToken(oauthConfig: any, source: 'firestore'): Promise<TokenInfo> {
  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: oauthConfig.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      source,
      token: oauthConfig.refreshToken,
      isValid: true,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
    };
  } catch (error) {
    return {
      source,
      token: oauthConfig.refreshToken,
      isValid: false,
      expiresAt: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
