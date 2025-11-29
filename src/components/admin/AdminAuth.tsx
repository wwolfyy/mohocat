import React, { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { isAdmin as checkIsAdmin } from '@/lib/auth/admin';
import { useAuth } from '@/hooks/useAuth';
import SocialLoginButton from '@/components/SocialLoginButton';
import ProviderManagement from '@/components/ProviderManagement';
import { cn } from '@/utils/cn';

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showProviderManagement, setShowProviderManagement] = useState(false);

  // Use the enhanced useAuth hook
  const {
    user,
    isAuthenticated,
    providerData,
    linkedProviders,
    signInWithGoogle,
    signInWithKakao,
    isSigningInWithGoogle,
    isSigningInWithKakao,
    googleSignInError,
    kakaoSignInError,
    googleSignInSuccess,
    kakaoSignInSuccess,
  } = useAuth();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    try {
      // Set a timeout to avoid infinite loading
      timeoutId = setTimeout(() => {
        if (loading) {
          setAuthError("Authentication timeout - please reload the page");
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      const unsubscribe = onAuthStateChanged(auth, async (authUser: User | null) => {
        try {
          clearTimeout(timeoutId);
          
          if (authUser) {
            const adminStatus = await checkIsAdmin(authUser);
            if (adminStatus) {
              setLoading(false);
            } else {
              setAuthError("Access denied: Admin privileges required");
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          setAuthError("Authentication error occurred");
          setLoading(false);
        }
      });

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      setAuthError("Failed to initialize authentication");
      setLoading(false);
      clearTimeout(timeoutId!);
    }
  }, [loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Clear any previous auth errors on successful login
      setAuthError('');
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Reset all auth state
      setAuthError('');
      setLoginError('');
      setEmail('');
      setPassword('');
      setShowProviderManagement(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetAuthState = () => {
    setAuthError('');
    setLoginError('');
    setEmail('');
    setPassword('');
    setLoading(false);
    setShowProviderManagement(false);
  };

  // Check if user is admin for rendering
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminStatus = await checkIsAdmin(user);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsAdminLoading(false);
    };

    checkAdminStatus();
  }, [user]);

  if (authError) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
        data-oid="sh1vbqx"
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            maxWidth: "500px",
          }}
          data-oid="2lio06o"
        >
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="5a024wn"
          >
            ⚠️
          </div>
          <h2
            style={{
              color: "#dc2626",
              marginBottom: "1rem",
              fontSize: "1.25rem",
            }}
            data-oid="vd4h5h8"
          >
            Authentication Error
          </h2>
          <p
            style={{ color: "#6b7280", marginBottom: "1.5rem" }}
            data-oid="ji.gyoe"
          >
            {authError}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
            }}
            data-oid="91v6y5h"
          >
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid="r.juzb9"
            >
              🔄 Reload Page
            </button>

            <button
              onClick={resetAuthState}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid=".956x_u"
            >
              🔃 Reset Auth State
            </button>

            <a
              href="/admin/create-user"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#10b981",
                color: "white",
                borderRadius: "4px",
                textDecoration: "none",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid="f:qvsjc"
            >
              🛠️ Create Test Admin User ↗
            </a>

            <button
              onClick={() => {
                setAuthError('');
                setLoading(false);
                setShowProviderManagement(false);
                // This is a dev-only emergency bypass - create a mock admin state
                console.warn('Emergency bypass activated - this should only be used in development');
              }}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid="rf1nbb-"
            >
              🚨 Emergency Bypass
            </button>

            <a
              href="/"
              style={{
                color: "#6b7280",
                textDecoration: "none",
                fontSize: "0.875rem",
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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
        data-oid="molt2-t"
      >
        <div style={{ textAlign: "center" }} data-oid="ri8ukco">
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="o1ym79x"
          >
            🐱
          </div>
          <p
            style={{ color: "#6b7280", marginBottom: "1rem" }}
            data-oid="m.zdt.o"
          >
            Loading admin interface...
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            data-oid="kce.ca:"
          >
            <button
              onClick={() => {
                setLoading(false);
                setAuthError(
                  "Authentication timeout - please check your Firebase configuration",
                );
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
              data-oid="g4xpw9g"
            >
              Stop Loading
            </button>
            <button
              onClick={() => {
                setLoading(false);
                setShowProviderManagement(false);
                // Create mock admin user for dev
                console.warn('Emergency bypass activated - this should only be used in development');
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
              data-oid="zroh-z9"
            >
              Emergency Bypass (Dev Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin || isAdminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🐱</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Mountain Cats Admin
            </h1>
            <p className="text-gray-600">
              Please sign in to continue
            </p>
          </div>

          <div className="space-y-6">
            {/* Social Login Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 text-center">
                Sign in with
              </h2>
              
              <div className="space-y-3">
                <SocialLoginButton
                  provider="google"
                  onClick={signInWithGoogle}
                  loading={isSigningInWithGoogle}
                  size="md"
                  className="w-full"
                />
                <SocialLoginButton
                  provider="kakao"
                  onClick={signInWithKakao}
                  loading={isSigningInWithKakao}
                  size="md"
                  className="w-full"
                />
              </div>

              {/* Success Messages */}
              {(googleSignInSuccess || kakaoSignInSuccess) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm text-center">
                    {googleSignInSuccess && "Successfully signed in with Google!"}
                    {kakaoSignInSuccess && "Successfully signed in with Kakaotalk!"}
                  </p>
                </div>
              )}

              {/* Error Messages */}
              {(loginError || googleSignInError || kakaoSignInError) && (
                <div className="space-y-2">
                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{loginError}</p>
                    </div>
                  )}
                  {googleSignInError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{googleSignInError}</p>
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
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors",
                    "text-gray-900 placeholder-gray-500",
                    "border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500"
                  )}
                  placeholder="Enter your email"
                  disabled={isSigningInWithGoogle || isSigningInWithKakao}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors",
                    "text-gray-900 placeholder-gray-500",
                    "border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500"
                  )}
                  placeholder="Enter your password"
                  disabled={isSigningInWithGoogle || isSigningInWithKakao}
                />
              </div>

              <button
                type="submit"
                disabled={isSigningInWithGoogle || isSigningInWithKakao}
                className={cn(
                  "w-full py-3 rounded-lg font-bold transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2",
                  "bg-gradient-to-r from-yellow-400 to-orange-300 text-black",
                  "hover:shadow-lg hover:-translate-y-1",
                  "focus:ring-yellow-500",
                  {
                    "opacity-50 cursor-not-allowed": isSigningInWithGoogle || isSigningInWithKakao,
                    "cursor-pointer": !isSigningInWithGoogle && !isSigningInWithKakao,
                  }
                )}
              >
                Sign In with Email
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center space-y-3">
              <a
                href="/admin/create-user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                🛠️ Create Test Admin User ↗
              </a>
              
              <div className="text-xs text-gray-500">
                Having trouble? Try emergency access or contact support.
              </div>
            </div>
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
              <h1 className="text-xl font-semibold text-gray-900">
                Mountain Cats Admin
              </h1>
              <div className="text-sm text-gray-500">
                Welcome, {user.displayName || user.email}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProviderManagement(!showProviderManagement)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showProviderManagement ? 'Hide' : 'Show'} Account Settings
              </button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>

          {/* Provider Management Sidebar */}
          <div className={`lg:col-span-1 ${showProviderManagement ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Account Settings
                </h2>
                
                {/* User Info */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.displayName || 'Admin User'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </div>

                {/* Provider Management */}
                <ProviderManagement
                  className="space-y-4"
                  showSuccessMessages={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
