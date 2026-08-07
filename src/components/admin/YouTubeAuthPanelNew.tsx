'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authHeader } from '@/lib/auth/authHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useDialog } from '@/components/ui/useDialog';

interface TokenInfo {
  source: 'firestore';
  // The raw refresh token is deliberately NOT returned by /api/admin/youtube-auth/status
  // (it's a secret); the client only needs source/validity/expiry.
  isValid: boolean;
  expiresAt: string | null;
  updatedAt?: string;
  error?: string;
}

interface YouTubeAuthStatus {
  status: 'not_configured' | 'valid' | 'expired' | 'error' | 'missing';
  message: string;
  tokens: TokenInfo[];
  expiresAt?: string | null;
  firestoreTokenInfo?: {
    issuedAt: string;
    status: string;
  };
}

/**
 * Status colors as Tailwind utilities rather than raw hex. These are STATUS hues,
 * not brand ones — `docs/design/design.md` §Colors keeps warning/error/success
 * "distinct from `brand`", so they must never adopt the brand token; the hygiene
 * here is only about the hex duplication, not the hue.
 *
 * Full literal class strings so Tailwind's content scanner sees them (a template
 * like `text-${hue}-500` is invisible to it and gets purged).
 *
 * The border uses the `/20` opacity modifier, which is what the previous
 * `${hex}33` suffix meant (0x33 = 51/255 = 0.2) — pixel-identical.
 */
const STATUS_CLASSES: Record<string, { text: string; border: string }> = {
  valid: { text: 'text-emerald-500', border: 'border-emerald-500/20' },
  expired: { text: 'text-amber-500', border: 'border-amber-500/20' },
  error: { text: 'text-red-500', border: 'border-red-500/20' },
  not_configured: { text: 'text-gray-500', border: 'border-gray-500/20' },
};

// `missing` has no entry of its own and falls through to the neutral default,
// exactly as the previous hex map did.
const getStatusClasses = (status: string) =>
  STATUS_CLASSES[status] ?? STATUS_CLASSES.not_configured;

export default function YouTubeAuthPanel() {
  const { user } = useAuth();
  const [authStatus, setAuthStatus] = useState<YouTubeAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Shared Modal-based alert (replaces the native dialogs — P6.1 / colour plan
  // Phase 5 F5). `dialog.element` is rendered at the end of this component.
  const dialog = useDialog();

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/youtube-auth/status', {
        headers: await authHeader(user),
      });
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Failed to check YouTube auth status:', error);
      setAuthStatus({
        status: 'error',
        message: '인증 상태를 확인하지 못했어요',
        tokens: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);

      // Get the auth URL
      const response = await fetch('/api/admin/youtube-auth/auth-url', {
        headers: await authHeader(user),
      });
      const { authUrl, error } = await response.json();

      if (error) {
        await dialog.alert(`오류: ${error}`);
        return;
      }

      // Open the auth URL in a new window
      const authWindow = window.open(
        authUrl,
        'youtube-auth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Poll for window closure
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          // Refresh the auth status after window closes
          setTimeout(() => {
            checkAuthStatus();
            setRefreshing(false);
          }, 1000);
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(
        () => {
          clearInterval(pollTimer);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          setRefreshing(false);
        },
        5 * 60 * 1000
      );
    } catch (error) {
      console.error('Failed to refresh YouTube token:', error);
      // Clear the spinner BEFORE awaiting: the native alert() this replaces
      // blocked the whole page, so the ordering was invisible; the Modal one
      // does not, and leaving it until dismissal would strand the button in
      // its "갱신 중" state behind the dialog.
      setRefreshing(false);
      await dialog.alert('토큰 갱신을 시작하지 못했어요');
    }
  };

  useEffect(() => {
    // Wait for auth — the status route is gated and needs the caller's ID token.
    if (user) checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'valid':
        return '✅';
      case 'expired':
        return '⚠️';
      case 'error':
        return '❌';
      case 'not_configured':
        return '⚙️';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;

    // Handle special messages that aren't dates
    if (dateString.includes('환경변수') || dateString.includes('불명')) {
      return dateString;
    }

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      const formattedDate = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return `${formattedDate} (${diffHours}시간 전)`;
    } catch (error) {
      return '날짜 불명';
    }
  };

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">🎬 YouTube API 토큰 관리</h3>

      {loading ? (
        <div className="p-4 text-center text-gray-500">🔄 인증 상태 확인 중...</div>
      ) : authStatus ? (
        <div>
          <div
            className={`flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-md border ${getStatusClasses(authStatus.status).border}`}
          >
            <span className="text-xl">{getStatusEmoji(authStatus.status)}</span>
            <div className="flex-1">
              <div className={`font-medium ${getStatusClasses(authStatus.status).text}`}>
                {authStatus.status === 'valid'
                  ? 'YouTube API 토큰이 유효합니다'
                  : authStatus.status === 'expired'
                    ? 'YouTube API 토큰이 만료되었습니다'
                    : authStatus.status === 'missing'
                      ? 'YouTube API 토큰이 없습니다'
                      : authStatus.message}
              </div>

              {authStatus.status === 'valid' && (
                <div className="text-sm text-gray-500 mt-2">
                  {authStatus.firestoreTokenInfo?.issuedAt && (
                    <div>📅 토큰 발급: {formatDate(authStatus.firestoreTokenInfo.issuedAt)}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Button size="sm" onClick={handleRefreshToken} disabled={refreshing}>
              {refreshing ? '🔄 처리 중...' : '🔄 토큰 갱신'}
            </Button>

            <Button variant="secondary" size="sm" onClick={checkAuthStatus} disabled={loading}>
              {loading ? '확인 중...' : '상태 새로고침'}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-600">
            <strong>📝 사용법:</strong>
            <ul className="list-disc my-2 pl-4">
              <li>토큰이 만료되면 "토큰 갱신" 버튼을 클릭하세요</li>
              <li>새 창이 열리면 Google 계정으로 로그인하세요</li>
              <li>승인 후 창이 자동으로 닫히면 완료됩니다</li>
              <li>토큰은 약 7-14일간 유효합니다</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-red-500">❌ 인증 상태를 확인할 수 없습니다</div>
      )}
      {dialog.element}
    </Card>
  );
}
