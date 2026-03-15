'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { auth } from '@/services/firebase';
import { RecaptchaVerifier } from 'firebase/auth';
import { getPermissionService } from '@/services';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // Step state
  const [step, setStep] = useState<'details' | 'verify'>('details');

  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // Nickname
  const [phoneNumber, setPhoneNumber] = useState('');

  // Verification State
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    signInWithPhoneNumber,
    confirmPhoneLogin,
    linkEmailPassword,
    updateProfile,
    clearErrors,
    signOut,
  } = useAuth();
  const permissionService = getPermissionService();

  useEffect(() => {
    // Force sign out when entering signup page to avoid session pollution
    const initSignup = async () => {
      await signOut();
      clearErrors();
    };
    initSignup();

    // Initialize Recaptcha
    if (!recaptchaVerifierRef.current && auth) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'signup-recaptcha-container', {
          size: 'invisible',
        });
      } catch (err) {
        console.error('Failed to init recaptcha', err);
      }
    }
  }, [clearErrors, signOut]);

  const validateDetails = () => {
    if (!email || !password || !confirmPassword || !displayName || !phoneNumber) {
      return 'Please fill in all fields.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (phoneNumber.length < 10) {
      return 'Please enter a valid phone number.';
    }
    return null;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!recaptchaVerifierRef.current) throw new Error('Recaptcha not initialized');

      // Format phone number if needed (basic check)
      // Ensure phone number format (e.g., +82 10-1234-5678)
      let formattedPhone = phoneNumber.trim();
      // If not starting with + and looks like KR local 010... -> +8210... logic could be here
      // For now, assume user knows format or raw input works for test numbers

      const confirmation = await signInWithPhoneNumber(
        formattedPhone,
        recaptchaVerifierRef.current
      );
      setConfirmationResult(confirmation);
      setStep('verify');
    } catch (err: any) {
      console.error('Phone verification error:', err);
      setError(err.message || 'Failed to send verification code. Please check the number.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Verify Phone & Sign In (Creates User)
      const user = await confirmPhoneLogin(confirmationResult, verificationCode);
      if (!user) throw new Error('Verification failed.');

      // CRITICAL CHECK: If the user already has an email, it means this phone number
      // is already linked to an existing account. We MUST NOT proceed with "Signup"
      // because it would just overwrite/hijack the existing user's session.
      if (user.email) {
        // If the email matches what they typed, maybe it's a re-run?
        // But generally, if they are "Signing Up", they imply a NEW account.
        // If they own the account, they should Login.

        // Exception: If they are resuming an interrupted cleanup?
        // Safer to just block and say "Account exists".

        console.warn('Signup blocked: Phone number belongs to existing user', user.email);

        // We must sign out to prevent them from being logged into someone else's account
        // (or their own old account) when they intended to create a new one.
        // Although technically they just proved they own the phone number...
        // But for clarity:

        // Check if the email is the one they are trying to register?
        if (user.email === email) {
          // Edge case: They registered, got interrupted, and came back.
          // Maybe allow? But linkEmailPassword is idempotent now.
          // But if they are trying to register "j...gmail" and user is "r...gmail" -> BLOCK.
        }

        if (user.email !== email) {
          await signOut(); // Kick them out of the "wrong" account
          throw new Error(
            `This phone number is already linked to another account (${user.email}). Please log in with that email or use a different number.`
          );
        }

        // If emails match, we fall through (idempotent retry).
      }

      // 2. Link Email/Password
      await linkEmailPassword(email, password);

      // 3. Update Profile (Nickname)
      await updateProfile(displayName);

      // 5. Create Firestore Document (with FULL data)
      // We manually construct the user object effectively because the local 'user' object might be stale
      // But ensureUserExists reads from auth.currentUser internally?
      // No, it takes 'user' argument.
      // Let's construct a synthetic user object or fetch fresh one?
      // best is to pass the 'user' we got, but we updated profile (async).
      // Let's rely on ensureUserExists using the passed user object but we invoke it with data we know.
      // Actually ensureUserExists uses the passed user object's properties.
      // So we should construct a merging object or update the local user object reference.

      const freshUser = {
        ...user,
        displayName: displayName, // Explicitly set latest
        email: email, // Explicitly set latest
        phoneNumber: user.phoneNumber, // Should be set from phone auth
      };

      await permissionService.ensureUserExists(freshUser);

      // 5. Success & Redirect
      setIsSuccess(true);
      setTimeout(() => {
        router.push(redirectUrl);
      }, 2000);
    } catch (err: any) {
      console.error('Signup completion error:', err);
      setError(err.message || 'Failed to complete signup.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Account Created!</h3>
        <p className="text-gray-600">
          Welcome, {displayName}!<br />
          Redirecting you...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div id="signup-recaptcha-container"></div>

      {step === 'details' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname (Display Name)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="How should we call you?"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="name@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="******"
                minLength={6}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="******"
                minLength={6}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="+82 10-1234-5678"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              We will send a verification code to this number.
            </p>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 px-4 rounded-lg text-white font-medium transition-colors',
              'bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500',
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            )}
          >
            {isLoading ? 'Sending...' : 'Verify Phone & Continue'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleCompleteSignup} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm text-gray-600">
            <p>
              <strong>Name:</strong> {displayName}
            </p>
            <p>
              <strong>Email:</strong> {email}
            </p>
            <p>
              <strong>Phone:</strong> {phoneNumber}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 tracking-widest text-center text-lg"
              placeholder="123456"
              maxLength={6}
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 px-4 rounded-lg text-white font-medium transition-colors',
              'bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            )}
          >
            {isLoading ? 'creating Account...' : 'Complete Signup'}
          </button>

          <button
            type="button"
            onClick={() => setStep('details')}
            className="w-full text-sm text-gray-500 underline"
            disabled={isLoading}
          >
            Back to Details
          </button>
        </form>
      )}
    </div>
  );
}

export default function SignupForm() {
  return (
    <Suspense fallback={<div>Loading signup form...</div>}>
      <SignupFormContent />
    </Suspense>
  );
}
