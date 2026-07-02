import React, { useState, useEffect, useCallback } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { isAdmin as checkIsAdmin } from '@/lib/auth/admin';
import { useAuth } from '@/hooks/useAuth';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import SocialLoginButton from '@/components/SocialLoginButton';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

interface AdminAuthProps {
  children: React.ReactNode;
}

// Sign an idle admin out of the CMS after this long with no interaction.
// Admin-only, idle (not absolute) — see FEATURE_MOD_LOG (session timeout).
const ADMIN_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
// Shared across admin tabs so an idle background tab doesn't sign out an active
// one (auth state is synced cross-tab via Firebase's localStorage persistence).
const ADMIN_IDLE_ACTIVITY_KEY = 'mohocat:admin:lastActivity';

export default function AdminAuth({ children }: AdminAuthProps) {
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  // Auth state comes from the single app-wide AuthProvider listener (via
  // useAuth) — AdminAuth no longer runs its own onAuthStateChanged subscription
  // (and thus no longer needs the old 10s init-timeout guard).
  const {
    user,
    loading: authLoading,
    signInWithKakao,
    isSigningInWithKakao,
    kakaoSignInError,
    kakaoSignInSuccess,
  } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSessionExpired(false);
    setIsLoggingIn(true);

    try {
      // On success, AuthProvider's listener updates `user` → this re-renders.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLoginError('');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Admin check — AdminAuth's own concern, layered on the shared auth state.
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  // Distinguishes "the check ran and said no" (false) from "the check couldn't
  // run" (a blocked/denied/offline Firestore read). The latter must NOT be
  // reported as "access denied" — it's unverified, and retryable.
  const [adminCheckFailed, setAdminCheckFailed] = useState(false);
  const [adminCheckNonce, setAdminCheckNonce] = useState(0);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminCheckFailed(false);
      setIsAdminLoading(false);
      return;
    }

    let cancelled = false;
    setIsAdminLoading(true);
    setAdminCheckFailed(false);
    (async () => {
      try {
        const adminStatus = await checkIsAdmin(user);
        if (!cancelled) setIsAdmin(adminStatus);
      } catch (error) {
        // Couldn't verify (not "not an admin") — surface a retry, don't deny.
        console.error('Error checking admin status:', error);
        if (!cancelled) {
          setIsAdmin(false);
          setAdminCheckFailed(true);
        }
      } finally {
        if (!cancelled) setIsAdminLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, adminCheckNonce]);

  // Idle session timeout — admin CMS only. Active only once an authenticated
  // admin is in the CMS; signs them out after inactivity and flags the notice.
  const handleIdleTimeout = useCallback(async () => {
    try {
      await signOut(auth);
      setSessionExpired(true);
    } catch (error) {
      // Match this file's fire-and-forget sign-out handling: log, don't rethrow
      // (re-raising from a background timer would just be an unhandled rejection).
      console.error('Idle timeout sign-out error:', error);
    }
  }, []);

  useIdleTimeout({
    timeoutMs: ADMIN_IDLE_TIMEOUT_MS,
    onTimeout: handleIdleTimeout,
    enabled: !!user && isAdmin,
    storageKey: ADMIN_IDLE_ACTIVITY_KEY,
  });

  // Auth still resolving (shared listener), or the admin check is in flight.
  if (authLoading || (user && isAdminLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🐱</div>
          <p className="text-gray-500">관리자 화면을 불러오고 있어요...</p>
        </div>
      </div>
    );
  }

  // Signed in, but the admin check couldn't complete (e.g. Firestore read
  // blocked by an extension / denied / offline). Not the same as "not an
  // admin" — offer a retry rather than a misleading access-denied.
  if (user && adminCheckFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="text-center max-w-md p-8 shadow-md">
          <div className="text-5xl mb-4">🔌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">권한을 확인하지 못했어요</h2>
          <p className="text-gray-500 mb-6">
            네트워크나 브라우저 확장 프로그램이 요청을 막고 있는지 확인한 뒤 다시 시도해 주세요.
          </p>

          <div className="flex flex-col items-center gap-4">
            <Button onClick={() => setAdminCheckNonce((n) => n + 1)}>다시 시도</Button>
            <Button variant="secondary" onClick={handleLogout}>
              로그아웃
            </Button>
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 메인 사이트로 돌아가기
            </a>
          </div>
        </Card>
      </div>
    );
  }

  // Signed in, but lacking admin privileges.
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="text-center max-w-md p-8 shadow-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-4">접근 권한이 없어요</h2>
          <p className="text-gray-500 mb-6">관리자 권한이 필요해요.</p>

          <div className="flex flex-col items-center gap-4">
            <Button variant="secondary" onClick={handleLogout}>
              로그아웃
            </Button>
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 메인 사이트로 돌아가기
            </a>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🐱</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">산냥이집냥이 관리자</h1>
            <p className="text-gray-600">계속하려면 로그인해 주세요</p>
          </div>

          {sessionExpired && (
            <Alert variant="warning" className="text-center mb-6">
              2시간 동안 활동이 없어 자동으로 로그아웃되었어요. 다시 로그인해 주세요.
            </Alert>
          )}

          <div className="space-y-6">
            {/* Social Login Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 text-center">다음으로 로그인</h2>

              <div className="space-y-3">
                <SocialLoginButton
                  provider="kakao"
                  onClick={signInWithKakao}
                  loading={isSigningInWithKakao}
                  size="md"
                  className="w-full"
                />
              </div>

              {/* Success Messages */}
              {kakaoSignInSuccess && (
                <Alert variant="success" className="text-center">
                  카카오톡으로 로그인했어요!
                </Alert>
              )}

              {/* Error Messages */}
              {(loginError || kakaoSignInError) && (
                <div className="space-y-2">
                  {loginError && <Alert variant="error">{loginError}</Alert>}
                  {kakaoSignInError && <Alert variant="error">{kakaoSignInError}</Alert>}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center justify-between">
              <div className="border-t border-gray-300 flex-grow"></div>
              <span className="px-4 text-sm text-gray-500">또는</span>
              <div className="border-t border-gray-300 flex-grow"></div>
            </div>

            {/* Email/Password Login */}
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="이메일 주소" htmlFor="admin-login-email">
                <Input
                  id="admin-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="이메일을 입력해 주세요"
                  disabled={isSigningInWithKakao}
                />
              </Field>

              <Field label="비밀번호" htmlFor="admin-login-password">
                <Input
                  id="admin-login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="비밀번호를 입력해 주세요"
                  disabled={isSigningInWithKakao}
                />
              </Field>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSigningInWithKakao || isLoggingIn}
              >
                {isLoggingIn ? '로그인 중...' : '이메일로 로그인'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin interface - user is authenticated and has admin privileges
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">산냥이집냥이 관리자</h1>
              <div className="text-sm text-gray-500">
                환영해요, {user.displayName || user.email}님
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="danger" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </div>
  );
}
