import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { isAdmin as checkIsAdmin } from '@/lib/auth/admin';
import { useAuth } from '@/hooks/useAuth';
import SocialLoginButton from '@/components/SocialLoginButton';
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
        }}
        data-oid="molt2-t"
      >
        <div style={{ textAlign: 'center' }} data-oid="ri8ukco">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }} data-oid="o1ym79x">
            🐱
          </div>
          <p style={{ color: '#6b7280' }} data-oid="m.zdt.o">
            Loading admin interface...
          </p>
        </div>
      </div>
    );
  }

  // Signed in, but lacking admin privileges.
  if (user && !isAdmin) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
        }}
        data-oid="sh1vbqx"
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px',
          }}
          data-oid="2lio06o"
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }} data-oid="5a024wn">
            ⚠️
          </div>
          <h2
            style={{
              color: '#dc2626',
              marginBottom: '1rem',
              fontSize: '1.25rem',
            }}
            data-oid="vd4h5h8"
          >
            Access denied
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }} data-oid="ji.gyoe">
            Access denied: Admin privileges required
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center',
            }}
            data-oid="91v6y5h"
          >
            <button
              onClick={handleLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
              }}
              data-oid=".956x_u"
            >
              Sign out
            </button>

            <a
              href="/"
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
              data-oid="v5-up.c"
            >
              ← Back to main site
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🐱</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mountain Cats Admin</h1>
            <p className="text-gray-600">Please sign in to continue</p>
          </div>

          <div className="space-y-6">
            {/* Social Login Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 text-center">Sign in with</h2>

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
                  <p className="text-green-700 text-sm text-center">
                    Successfully signed in with Kakaotalk!
                  </p>
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
              <span className="px-4 text-sm text-gray-500">or</span>
              <div className="border-t border-gray-300 flex-grow"></div>
            </div>

            {/* Email/Password Login */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
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
                  placeholder="Enter your email"
                  disabled={isSigningInWithKakao}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
                  placeholder="Enter your password"
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
                {isLoggingIn ? 'Signing in...' : 'Sign In with Email'}
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
              <h1 className="text-xl font-semibold text-gray-900">Mountain Cats Admin</h1>
              <div className="text-sm text-gray-500">Welcome, {user.displayName || user.email}</div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </div>
  );
}
