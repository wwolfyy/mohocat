'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

interface PhoneLoginFormProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}

const PhoneLoginForm: React.FC<PhoneLoginFormProps> = ({ onLoginSuccess, onLoginError }) => {
  // UI State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const { signInWithPhoneNumber, confirmPhoneLogin } = useAuth();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaInstanceRef = useRef<RecaptchaVerifier | null>(null);

  // Initialize Recaptcha (only once)
  useEffect(() => {
    // Ensure container exists and we haven't initialized yet
    if (recaptchaContainerRef.current && !recaptchaInstanceRef.current && auth) {
      try {
        // Pass the DOM element directly instead of ID to avoid recycling issues
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
          callback: (response: any) => {
            console.log('Recaptcha verified');
          },
          'expired-callback': () => {
            setError('Recaptcha expired. Please try again.');
          },
        });

        recaptchaInstanceRef.current = verifier;

        verifier.render().catch((e) => {
          if (e.code !== 'auth/network-request-failed') {
            console.warn('Recaptcha render failed or cancelled:', e);
          }
        });
      } catch (err) {
        console.error('Failed to init recaptcha', err);
      }
    }

    return () => {
      if (recaptchaInstanceRef.current) {
        try {
          recaptchaInstanceRef.current.clear();
        } catch (e) {
          // Ignore clear errors
        }
        recaptchaInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number.');
      setIsLoading(false);
      return;
    }

    try {
      // Ensure phone number format (e.g., +82 10-1234-5678)
      // Simple formatting attempt if user enters raw number (assuming KR)
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        // Default to KR if no country code? Or just assume user types it?
        // Let's simpler: require user to type country code or handle UI later.
        // For testing, just pass as is.
      }

      if (!recaptchaInstanceRef.current) throw new Error('Recaptcha not initialized');

      const confirmation = await signInWithPhoneNumber(
        formattedPhone,
        recaptchaInstanceRef.current
      );
      setConfirmationResult(confirmation);
      setStep('code');
    } catch (err: any) {
      console.error('Phone sign-in error', err);
      // Nice error messages
      if (err.code === 'auth/invalid-phone-number') {
        setError('The phone number is invalid.');
      } else if (err.code === 'auth/missing-phone-number') {
        setError('Phone number is missing.');
      } else if (err.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Please try again later.');
      } else {
        // Handle "already rendered" specifically if it leaks through?
        setError(err.message || 'Failed to send verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      setIsLoading(false);
      return;
    }

    try {
      await confirmPhoneLogin(confirmationResult, verificationCode);
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Verification error', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid verification code.');
      } else {
        setError(err.message || 'Failed to verify code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recaptcha Container (Invisible) */}
      <div ref={recaptchaContainerRef} id="recaptcha-container"></div>

      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+82 10-1234-5678"
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                'text-gray-900 placeholder-gray-500',
                'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500'
              )}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Test number: +1 650-555-1234 (Code: 123456)
            </p>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 rounded-lg font-bold transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'bg-gradient-to-r from-yellow-400 to-orange-300 text-black',
              'hover:shadow-lg hover:-translate-y-1',
              'focus:ring-yellow-500',
              { 'opacity-50 cursor-not-allowed': isLoading }
            )}
          >
            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                'text-gray-900 placeholder-gray-500',
                'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500',
                'tracking-widest text-center text-lg'
              )}
              disabled={isLoading}
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 rounded-lg font-bold transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'bg-gradient-to-r from-yellow-400 to-orange-300 text-black',
              'hover:shadow-lg hover:-translate-y-1',
              'focus:ring-yellow-500',
              { 'opacity-50 cursor-not-allowed': isLoading }
            )}
          >
            {isLoading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setError('');
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
            disabled={isLoading}
          >
            Back to Phone Number
          </button>
        </form>
      )}
    </div>
  );
};

export default PhoneLoginForm;
