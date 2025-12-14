import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebase";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import SocialLoginButton from "@/components/SocialLoginButton";
import KakaoLoginGuidanceModal from "@/components/auth/KakaoLoginGuidanceModal";
import PhoneLoginForm from "@/components/auth/PhoneLoginForm";
import { useRouter, useSearchParams } from 'next/navigation';
import UserNotFoundModal from "@/components/auth/UserNotFoundModal";
import EmailVerificationModal from "@/components/auth/EmailVerificationModal";
import { getPermissionService } from "@/services";

interface LoginFormProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
  onSwitchToSignup?: () => void; // Added prop to switch tab
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onLoginError,
  onSwitchToSignup
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isEmailLoginLoading, setIsEmailLoginLoading] = useState(false);
  const [isUserNotFoundModalOpen, setIsUserNotFoundModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isKakaoGuidanceOpen, setIsKakaoGuidanceOpen] = useState(false);

  const permissionService = getPermissionService();

  const {
    signInWithKakao,
    isSigningInWithKakao,
    kakaoSignInError,
    kakaoSignInSuccess,
    signOut,
    sendEmailVerification
  } = useAuth();

  React.useEffect(() => {
    if (kakaoSignInSuccess) {
      handleCheckUser();
    }
  }, [kakaoSignInSuccess]);

  const handleCheckUser = async (method: 'email' | 'phone' | 'social' = 'social') => {
    let user = auth.currentUser;
    if (!user) return;

    try {
      // Force reload to get latest emailVerified status
      await user.reload();
      user = auth.currentUser; // Get refreshed object
      if (!user) return;

      // Check if user exists in Firestore
      const exists = await permissionService.checkUserExists(user.uid);

      if (exists) {
        // Check verification status
        // Skip check if logging in via phone
        if (method !== 'phone' && !user.emailVerified && user.email) {
          setIsVerificationModalOpen(true);
          setIsEmailLoginLoading(false);
          return;
        }

        // If verified, verify we have it synced in Firestore
        // We can just call ensureUserExists which checks and updates harmlessly
        // This ensures the TRUE status is propagated
        await permissionService.ensureUserExists(user);

        // Proceed as normal
        handleSuccess();
      } else {
        // User not found in Firestore -> Show Modal
        setIsUserNotFoundModalOpen(true);
        // Requirement: Do not allow account creation via Google/Kakao implicitly.
        await signOut();
      }
    } catch (err) {
      console.error("Error checking user existence:", err);
      // Fallback: assume success or show error?
      // Generous fallback: let them in. Strict: Block.
      handleSuccess();
    }
  };

  React.useEffect(() => {
    const url = searchParams.get('redirect');
    if (url) {
      sessionStorage.setItem('loginRedirect', url);
    }
  }, [searchParams]);

  const handleSuccess = () => {
    // Emit custom event for login success
    const loginSuccessEvent = new Event("loginSuccess");
    window.dispatchEvent(loginSuccessEvent);
    onLoginSuccess?.();

    const storedRedirect = sessionStorage.getItem('loginRedirect');
    const finalRedirect = searchParams.get('redirect') || storedRedirect || '/';
    sessionStorage.removeItem('loginRedirect');

    router.push(finalRedirect);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsEmailLoginLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      // After email login, check existence too?
      // Usually email/pass implies they registered, so record SHOULD exist.
      // But let's be consistent.
      handleCheckUser('email');
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
      setIsEmailLoginLoading(false); // Only set false on error, success handles redirect
    }
  };


  return (
    <div className="space-y-6">
      <UserNotFoundModal
        isOpen={isUserNotFoundModalOpen}
        onClose={async () => {
          setIsUserNotFoundModalOpen(false);
          await signOut(); // Sign out if they close (reject creation)
          setIsEmailLoginLoading(false);
        }}
        onCreateAccount={async () => {
          setIsUserNotFoundModalOpen(false);
          // If we want to carry over the social login to signup, we'd need to pass it.
          // But for now, simple flow: Redirect to signup tab.
          // If we simply switch tab, they are still logged in (firebase auth).
          // SignupForm checks 'auth.currentUser' for linking?
          // SignupForm is designed for:
          // 1. Phone Auth -> Link Email.
          // If they come from Google, we might need a different flow "Complete Profile".
          // The user request says "prompt the visitor to create an account... link to account creation page".
          // We can just switch tabs.

          // IMPORTANT: SignupForm currently expects Phone Auth as step 1.
          // If they are logged in via Google, SignupForm might get confused or we need to adapt it.
          // "Refine signup: ... Atomic creation flow" was built around Phone -> Email.
          // If we strictly follow "Prompt to create account", maybe we just sign them out and send them to signup tab.

          await signOut();
          if (onSwitchToSignup) {
            onSwitchToSignup();
          } else {
            // Fallback if no callback
            router.push('/login?tab=signup');
          }
        }}
      />

      <EmailVerificationModal
        isOpen={isVerificationModalOpen}
        email={auth.currentUser?.email || ''}
        onClose={async () => {
          setIsVerificationModalOpen(false);
          // Strict Mode: If they cancel/close, we sign them out.
          // "User should not be signed in at this stage."
          await signOut();
        }}
        onSend={async () => {
          try {
            await sendEmailVerification();
            alert(`Verification email sent to ${auth.currentUser?.email}! Please check your email and log in again.`);
          } catch (e) {
            console.error(e);
            alert("Failed to send verification email.");
          }
          // Strict Mode: After sending, sign out so they can't access app.
          setIsVerificationModalOpen(false);
          await signOut();
        }}
      />

      {/* Social Login Section */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700">Sign in with</h2>
          <p className="text-sm text-gray-500 mt-1">Choose your preferred authentication method</p>
        </div>

        {/* KakaoTalk Authentication Options */}
        <div className="border-t border-gray-200 pt-4 mt-4">

          {/* KakaoTalk Authentication Options */}
          <div className="mt-4">
            <SocialLoginButton
              provider="kakao"
              onClick={() => setIsKakaoGuidanceOpen(true)}
              loading={isSigningInWithKakao}
              size="md"
              className="w-full"
            />
          </div>

          <KakaoLoginGuidanceModal
            isOpen={isKakaoGuidanceOpen}
            onClose={() => setIsKakaoGuidanceOpen(false)}
            onConfirm={() => {
              setIsKakaoGuidanceOpen(false);
              signInWithKakao();
            }}
          />
        </div>

        {/* Social Login Success Messages */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-700 text-sm text-center">
            {kakaoSignInSuccess && "Successfully signed in with Kakaotalk!"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center justify-between">
        <div className="border-t border-gray-300 flex-grow"></div>
        <span className="px-4 text-sm text-gray-500">or</span>
        <div className="border-t border-gray-300 flex-grow"></div>
      </div>

      {/* Email/Password Login Section */}
      <form onSubmit={handleLogin} className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
          Log in with email
        </h3>
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
            disabled={isSigningInWithKakao || isEmailLoginLoading}
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
            disabled={isSigningInWithKakao || isEmailLoginLoading}
          />
        </div>

        {/* Error Messages */}
        {(error || kakaoSignInError) && (
          <div className="space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
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
          disabled={isSigningInWithKakao || isEmailLoginLoading}
          className={cn(
            "w-full py-3 rounded-lg font-bold transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            "bg-gradient-to-r from-yellow-400 to-orange-300 text-black",
            "hover:shadow-lg hover:-translate-y-1",
            "focus:ring-yellow-500",
            {
              "opacity-50 cursor-not-allowed": isSigningInWithKakao || isEmailLoginLoading,
              "cursor-pointer": !isSigningInWithKakao && !isEmailLoginLoading,
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

      {/* Divider for Phone Login */}
      <div className="flex items-center justify-between">
        <div className="border-t border-gray-300 flex-grow"></div>
        <span className="px-4 text-sm text-gray-500">or</span>
        <div className="border-t border-gray-300 flex-grow"></div>
      </div>

      {/* Phone Login Section (Alternative) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
          Log in with phone
        </h3>
        <PhoneLoginForm
          onLoginSuccess={() => handleCheckUser('phone')}
          onLoginError={onLoginError}
        />
      </div>

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
