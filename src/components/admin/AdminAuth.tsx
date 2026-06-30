import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { isAdmin as checkIsAdmin } from '@/lib/auth/admin';
import { useAuth } from '@/hooks/useAuth';
import SocialLoginButton from '@/components/SocialLoginButton';
import Button from '@/components/admin/ui/Button';
import Card from '@/components/admin/ui/Card';
import { cn } from '@/utils/cn';

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    let cancelled = false;
    setIsAdminLoading(true);
    (async () => {
      try {
        const adminStatus = await checkIsAdmin(user);
        if (!cancelled) setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setIsAdminLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

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
              {/* Success Messages */}
              {kakaoSignInSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm text-center">카카오톡으로 로그인했어요!</p>
                </div>
              )}

              {/* Error Messages */}
              {(loginError || kakaoSignInError) && (
                <div className="space-y-2">
                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{loginError}</p>
                    </div>
                  )}
                  {kakaoSignInError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{kakaoSignInError}</p>
                    </div>
                  )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 주소</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                    'text-gray-900 placeholder-gray-500',
                    'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500'
                  )}
                  placeholder="이메일을 입력해 주세요"
                  disabled={isSigningInWithKakao}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                    'text-gray-900 placeholder-gray-500',
                    'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500'
                  )}
                  placeholder="비밀번호를 입력해 주세요"
                  disabled={isSigningInWithKakao}
                />
              </div>

              <button
                type="submit"
                disabled={isSigningInWithKakao || isLoggingIn}
                className={cn(
                  'w-full py-3 rounded-lg font-bold transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  'bg-gradient-to-r from-yellow-400 to-orange-300 text-black',
                  'hover:shadow-lg hover:-translate-y-1',
                  'focus:ring-yellow-500',
                  {
                    'opacity-50 cursor-not-allowed': isSigningInWithKakao || isLoggingIn,
                    'cursor-pointer': !isSigningInWithKakao && !isLoggingIn,
                  }
                )}
              >
                {isLoggingIn ? '로그인 중...' : '이메일로 로그인'}
              </button>
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
