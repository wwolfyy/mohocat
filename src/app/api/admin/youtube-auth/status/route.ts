import { NextResponse } from 'next/server';
import { getYouTubeOAuthConfig } from '@/utils/config';
import { google } from 'googleapis';
import { db } from '@/lib/firebase-admin';

interface TokenInfo {
  source: 'environment' | 'firestore';
  token: string;
  isValid: boolean;
  expiresAt: string | null;
  updatedAt?: string;
  error?: string;
}

export async function GET() {
  try {
    const oauthConfig = getYouTubeOAuthConfig();

    if (!oauthConfig) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'YouTube OAuth not configured',
        tokens: [],
      });
    }

    const tokens: TokenInfo[] = [];
    let firestoreTokenData: any = null;

    // First, try to get Firestore token data to use its timestamp
    try {
      const authDoc = await db.collection('admin_config').doc('youtube_auth').get();

      if (authDoc.exists) {
        firestoreTokenData = authDoc.data();
      }
    } catch (error) {
      console.error('Failed to get Firestore token data:', error);
    }

    // Check environment token
    if (oauthConfig.refreshToken) {
      const envTokenInfo = await checkToken(oauthConfig, 'environment');
      // Use Firestore token's updatedAt if available, since they should be the same token
      if (firestoreTokenData?.updatedAt) {
        envTokenInfo.updatedAt = firestoreTokenData.updatedAt;
      } else {
        envTokenInfo.updatedAt = '환경변수 (발급일 불명)';
      }
      tokens.push(envTokenInfo);
    }

    // Check Firestore token
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

    // Find specific token info for UI
    const envToken = tokens.find((t) => t.source === 'environment');
    const firestoreToken = tokens.find((t) => t.source === 'firestore');

    return NextResponse.json({
      status: hasValidToken ? 'valid' : tokens.length > 0 ? 'expired' : 'not_configured',
      message: hasValidToken
        ? `${validTokens.length}개의 유효한 토큰 (${validTokens.map((t) => t.source).join(', ')})`
        : tokens.length > 0
          ? '모든 토큰이 만료됨'
          : '토큰이 설정되지 않음',
      tokens,
      expiresAt: validTokens.length > 0 ? validTokens[0].expiresAt : null,
      envTokenInfo: envToken
        ? {
            issuedAt: envToken.updatedAt || '환경변수 (발급일 불명)',
            status: envToken.isValid ? 'valid' : 'expired',
          }
        : undefined,
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

async function checkToken(
  oauthConfig: any,
  source: 'environment' | 'firestore'
): Promise<TokenInfo> {
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
