'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';

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
              {/* Kakao vendor color — must stay #FEE500 with dark text. */}
              <button
                onClick={() => setStep('check-link')}
                className="w-full rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#FDD835] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Proceed
              </button>
              <button
                onClick={handleClose}
                className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                className="w-full rounded-lg bg-gradient-to-r from-brand to-accent px-4 py-2 text-sm font-semibold text-ink transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
              >
                Yes, I have
              </button>
              <button
                onClick={() => setStep('guidance')}
                className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                className="w-full rounded-lg bg-gradient-to-r from-brand to-accent px-4 py-2 text-sm font-semibold text-ink transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
              >
                Got it
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      {renderContent()}
    </Modal>
  );
}
