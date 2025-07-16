"use client";

import { useState, useEffect } from "react";

interface TokenInfo {
  source: 'environment' | 'firestore';
  token: string;
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
  envTokenInfo?: {
    issuedAt: string;
    status: string;
  };
  firestoreTokenInfo?: {
    issuedAt: string;
    status: string;
  };
}

export default function YouTubeAuthPanel() {
  const [authStatus, setAuthStatus] = useState<YouTubeAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/youtube-auth/status');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Failed to check YouTube auth status:', error);
      setAuthStatus({
        status: 'error',
        message: 'Failed to check authentication status',
        tokens: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);

      // Get the auth URL
      const response = await fetch('/api/admin/youtube-auth/auth-url');
      const { authUrl, error } = await response.json();

      if (error) {
        alert(`Error: ${error}`);
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
      setTimeout(() => {
        clearInterval(pollTimer);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        setRefreshing(false);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Failed to refresh YouTube token:', error);
      alert('Failed to start token refresh process');
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return '#10b981';
      case 'expired': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'not_configured': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'valid': return '✅';
      case 'expired': return '⚠️';
      case 'error': return '❌';
      case 'not_configured': return '⚙️';
      default: return '❓';
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
        hour12: false
      });

      return `${formattedDate} (${diffHours}시간 전)`;
    } catch (error) {
      return '날짜 불명';
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: '#374151',
      }}>
        🎬 YouTube API 토큰 관리
      </h3>

      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
          🔄 인증 상태 확인 중...
        </div>
      ) : authStatus ? (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: `1px solid ${getStatusColor(authStatus.status)}20`,
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {getStatusEmoji(authStatus.status)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: '500',
                color: getStatusColor(authStatus.status),
              }}>
                {authStatus.status === 'valid' ? 'YouTube API 토큰이 유효합니다' :
                 authStatus.status === 'expired' ? 'YouTube API 토큰이 만료되었습니다' :
                 authStatus.status === 'missing' ? 'YouTube API 토큰이 없습니다' :
                 authStatus.message}
              </div>

              {authStatus.status === 'valid' && (
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  marginTop: '0.5rem',
                }}>
                  {authStatus.envTokenInfo?.issuedAt && (
                    <div>
                      📅 토큰 발급: {formatDate(authStatus.envTokenInfo.issuedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}>
            <button
              onClick={handleRefreshToken}
              disabled={refreshing}
              style={{
                backgroundColor: refreshing ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {refreshing ? '🔄 처리 중...' : '🔄 토큰 갱신'}
            </button>

            <button
              onClick={checkAuthStatus}
              disabled={loading}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '확인 중...' : '상태 새로고침'}
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#4b5563',
          }}>
            <strong>📝 사용법:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
              <li>토큰이 만료되면 "토큰 갱신" 버튼을 클릭하세요</li>
              <li>새 창이 열리면 Google 계정으로 로그인하세요</li>
              <li>승인 후 창이 자동으로 닫히면 완료됩니다</li>
              <li>토큰은 약 7-14일간 유효합니다</li>
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#ef4444' }}>
          ❌ 인증 상태를 확인할 수 없습니다
        </div>
      )}
    </div>
  );
}
