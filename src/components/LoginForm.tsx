import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebase";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import SocialLoginButton from "@/components/SocialLoginButton";
import KakaoTalkAuthOptions from "@/components/KakaoTalkAuthOptions";

interface LoginFormProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onLoginError
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isEmailLoginLoading, setIsEmailLoginLoading] = useState(false);

  const {
    signInWithGoogle,
    signInWithKakao,
    isSigningInWithGoogle,
    isSigningInWithKakao,
    googleSignInError,
    kakaoSignInError,
    googleSignInSuccess,
    kakaoSignInSuccess,
  } = useAuth();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsEmailLoginLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      
      // Emit custom event for login success
      const loginSuccessEvent = new Event("loginSuccess");
      window.dispatchEvent(loginSuccessEvent);
      
      onLoginSuccess?.();
    } catch (err: any) {
      console.error("Error signing in:", err);
      const errorMessage = err.code === 'auth/invalid-credential'
        ? "Invalid email or password. Please check your credentials."
        : err.code === 'auth/user-not-found'
        ? "No user found with this email address."
        : err.code === 'auth/wrong-password'
        ? "Incorrect password. Please try again."
        : "Failed to login. Please check your credentials.";
      
      setError(errorMessage);
      onLoginError?.(errorMessage);
    } finally {
      setIsEmailLoginLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Social Login Section */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700">Sign in with</h2>
          <p className="text-sm text-gray-500 mt-1">Choose your preferred authentication method</p>
        </div>
        
        <div className="space-y-3">
          <SocialLoginButton
            provider="google"
            onClick={signInWithGoogle}
            loading={isSigningInWithGoogle}
            disabled={isEmailLoginLoading}
          />
          
          {/* KakaoTalk Authentication Options */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <KakaoTalkAuthOptions
              onAuthSuccess={() => {
                // Emit custom event for login success
                const loginSuccessEvent = new Event("loginSuccess");
                window.dispatchEvent(loginSuccessEvent);
                onLoginSuccess?.();
              }}
              onAuthError={(error) => {
                console.error("KakaoTalk authentication error:", error);
                onLoginError?.(error);
              }}
            />
          </div>
        </div>

        {/* Social Login Success Messages */}
        {(googleSignInSuccess || kakaoSignInSuccess) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm text-center">
              {googleSignInSuccess && "Successfully signed in with Google!"}
              {kakaoSignInSuccess && "Successfully signed in with Kakaotalk!"}
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center justify-between">
        <div className="border-t border-gray-300 flex-grow"></div>
        <span className="px-4 text-sm text-gray-500">or</span>
        <div className="border-t border-gray-300 flex-grow"></div>
      </div>

      {/* Email/Password Login Section */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
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
            placeholder="Enter your email address"
            disabled={isSigningInWithGoogle || isSigningInWithKakao}
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
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

        {/* Error Messages */}
        {(error || googleSignInError || kakaoSignInError) && (
          <div className="space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
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

        <button
          type="submit"
          disabled={isSigningInWithGoogle || isSigningInWithKakao || isEmailLoginLoading}
          className={cn(
            "w-full py-3 rounded-lg font-bold transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            "bg-gradient-to-r from-yellow-400 to-orange-300 text-black",
            "hover:shadow-lg hover:-translate-y-1",
            "focus:ring-yellow-500",
            {
              "opacity-50 cursor-not-allowed": isSigningInWithGoogle || isSigningInWithKakao || isEmailLoginLoading,
              "cursor-pointer": !isSigningInWithGoogle && !isSigningInWithKakao && !isEmailLoginLoading,
            }
          )}
        >
          {isEmailLoginLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </div>
          ) : (
            "Sign In with Email"
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Having trouble signing in? Contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
