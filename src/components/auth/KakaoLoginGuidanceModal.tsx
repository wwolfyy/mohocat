'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface KakaoLoginGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

type ModalStep = 'initial' | 'check-link' | 'guidance';

export default function KakaoLoginGuidanceModal({
  isOpen,
  onClose,
  onConfirm,
}: KakaoLoginGuidanceModalProps) {
  const [step, setStep] = useState<ModalStep>('initial');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('initial');
    onClose();
  };

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Login Requirement</h3>
            <p className="text-sm text-gray-500">
              To log in with KakaoTalk, you must first have an account with us and have linked your
              KakaoTalk account to it.
            </p>
            <div className="flex flex-col space-y-2 mt-4">
              <button
                onClick={() => setStep('check-link')}
                className={cn(
                  'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black',
                  'bg-[#FEE500] hover:bg-[#FDD835] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'
                )}
              >
                Proceed
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'check-link':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Account Check</h3>
            <p className="text-sm text-gray-500">
              Have you already linked your KakaoTalk account to your user account?
            </p>
            <div className="flex flex-col space-y-2 mt-4">
              <button
                onClick={() => {
                  handleClose();
                  onConfirm();
                }}
                className={cn(
                  'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                  'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                )}
              >
                Yes, I have
              </button>
              <button
                onClick={() => setStep('guidance')}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                No, I haven't
              </button>
            </div>
          </div>
        );

      case 'guidance':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <span className="text-2xl">ℹ️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">How to Link Account</h3>
            <p className="text-sm text-gray-500">
              Please log in with Email or Phone first. Then go to{' '}
              <strong>Settings &gt; Account</strong> to link your KakaoTalk account.
            </p>
            <div className="mt-4">
              <button
                onClick={handleClose}
                className={cn(
                  'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                  'bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                )}
              >
                Got it
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl relative animate-fadeIn">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {renderContent()}
      </div>
    </div>
  );
}
