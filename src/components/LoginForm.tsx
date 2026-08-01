import React, { useState, Suspense } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import SocialLoginButton from '@/components/SocialLoginButton';
import KakaoLoginGuidanceModal from '@/components/auth/KakaoLoginGuidanceModal';
import PhoneLoginForm from '@/components/auth/PhoneLoginForm';
import { useRouter, useSearchParams } from 'next/navigation';
import UserNotFoundModal from '@/components/auth/UserNotFoundModal';
import EmailVerificationModal from '@/components/auth/EmailVerificationModal';
import PasswordResetModal from '@/components/auth/PasswordResetModal';
import { getPermissionService } from '@/services';
import { deleteImplicitlyCreatedAccount } from '@/lib/auth/deleteImplicitlyCreatedAccount';
import { strings } from '@/constants/strings';

const t = strings.login.form;

interface LoginFormProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
  onSwitchToSignup?: () => void; // Added prop to switch tab
}

const LoginFormContent: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onLoginError,
  onSwitchToSignup,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isEmailLoginLoading, setIsEmailLoginLoading] = useState(false);
  const [isUserNotFoundModalOpen, setIsUserNotFoundModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isKakaoGuidanceOpen, setIsKakaoGuidanceOpen] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);

  const permissionService = getPermissionService();

  const {
    signInWithKakao,
    isSigningInWithKakao,
    kakaoSignInError,
    kakaoSignInSuccess,
    signOut,
    sendEmailVerification,
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
        //
        // Phone and social sign-in MINT a Firebase Auth account as a side effect
        // of authenticating — before we get to decide whether they may join.
        // Signing out leaves that account behind holding PII (phone number, or
        // the Kakao email/닉네임) with no consent, no profile doc, and nothing
        // that would ever clean it up. So delete it here: we are declining to
        // make them a member, and the data has no basis to be retained (PIPA).
        //
        // ⚠️ The test is whether they ever CONSENTED, and the reliable marker is
        // a password credential — not which button they logged in with. Every
        // account here is phone-created: 집사등록 verifies the phone first (that
        // call creates the Auth user) and links email/password onto it after.
        // SignupForm gates both consent checkboxes before the SMS goes out, so
        // anyone holding a password reached the linking step and did agree; only
        // their profile doc failed to write, and that is resumable (re-running
        // 집사등록 with the same email+phone completes idempotently). Gating on the
        // login method instead would delete exactly those people whenever they
        // happened to sign in by phone.
        const consented = user.providerData.some((p) => p.providerId === 'password');
        if (!consented) {
          await deleteImplicitlyCreatedAccount(user);
        }
        await signOut();
      }
    } catch (err) {
      // A failed verification (blocked/denied/offline Firestore read) is NOT
      // proof the account is missing — so we must NOT sign the user out here.
      // The `else` branch above owns the only legitimate sign-out (a read that
      // definitively returned "no user doc"). Keep the session and surface a
      // retryable error instead of either logging out or silently proceeding.
      console.error('Error verifying user during sign-in:', err);
      setError(t.errors.verifyFailed);
      onLoginError?.(t.errors.verifyFailed);
      setIsEmailLoginLoading(false);
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
    const loginSuccessEvent = new Event('loginSuccess');
    window.dispatchEvent(loginSuccessEvent);
    onLoginSuccess?.();

    const storedRedirect = sessionStorage.getItem('loginRedirect');
    const finalRedirect = searchParams.get('redirect') || storedRedirect || '/';
    sessionStorage.removeItem('loginRedirect');

    router.push(finalRedirect);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsEmailLoginLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // After email login, check existence too?
      // Usually email/pass implies they registered, so record SHOULD exist.
      // But let's be consistent.
      handleCheckUser('email');
    } catch (err: any) {
      console.error('Error signing in:', err);
      const errorMessage =
        err.code === 'auth/invalid-credential'
          ? t.errors.invalidCredential
          : err.code === 'auth/user-not-found'
            ? t.errors.userNotFound
            : err.code === 'auth/wrong-password'
              ? t.errors.wrongPassword
              : t.errors.generic;

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
            alert(t.verificationSentAlert(auth.currentUser?.email || ''));
          } catch (e) {
            console.error(e);
            alert(t.verificationSendFailed);
          }
          // Strict Mode: After sending, sign out so they can't access app.
          setIsVerificationModalOpen(false);
          await signOut();
        }}
      />

      <PasswordResetModal
        isOpen={isPasswordResetModalOpen}
        onClose={() => setIsPasswordResetModalOpen(false)}
        email={email}
      />

      {/* Shared login-error banner — a failure in any top-level sign-in method
          (email or Kakao) surfaces here, not under the email form. Phone login
          keeps its own field-adjacent inline errors. */}
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

      {/* Social Login Section */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700">{t.socialTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.socialSubtitle}</p>
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
            {kakaoSignInSuccess && t.kakaoSuccess}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center justify-between">
        <div className="border-t border-gray-300 flex-grow"></div>
        <span className="px-4 text-sm text-gray-500">{t.or}</span>
        <div className="border-t border-gray-300 flex-grow"></div>
      </div>

      {/* Email/Password Login Section */}
      <form onSubmit={handleLogin} className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
          {t.emailSectionTitle}
        </h3>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t.emailLabel}</label>
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
            placeholder={t.emailPlaceholder}
            disabled={isSigningInWithKakao || isEmailLoginLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t.passwordLabel}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(
                'w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                'text-gray-900 placeholder-gray-500',
                'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500'
              )}
              placeholder={t.passwordPlaceholder}
              disabled={isSigningInWithKakao || isEmailLoginLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsPasswordResetModalOpen(true)}
            className="text-sm text-brand-700 hover:text-brand-800 hover:underline focus:outline-none"
          >
            {t.forgotPassword}
          </button>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSigningInWithKakao || isEmailLoginLoading}
          className="w-full hover:-translate-y-1"
        >
          {isEmailLoginLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2"></div>
              {t.submitting}
            </div>
          ) : (
            t.submit
          )}
        </Button>
      </form>

      {/* Divider for Phone Login */}
      <div className="flex items-center justify-between">
        <div className="border-t border-gray-300 flex-grow"></div>
        <span className="px-4 text-sm text-gray-500">{t.or}</span>
        <div className="border-t border-gray-300 flex-grow"></div>
      </div>

      {/* Phone Login Section (Alternative) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
          {t.phoneSectionTitle}
        </h3>
        <PhoneLoginForm
          onLoginSuccess={() => handleCheckUser('phone')}
          onLoginError={onLoginError}
        />
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-gray-500">{t.helpText}</p>
      </div>
    </div>
  );
};

const LoginForm: React.FC<LoginFormProps> = (props) => {
  return (
    <Suspense fallback={<div>{t.loadingForm}</div>}>
      <LoginFormContent {...props} />
    </Suspense>
  );
};

export default LoginForm;
