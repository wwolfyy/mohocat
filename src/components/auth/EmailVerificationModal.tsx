import React from 'react';
import Modal from '@/components/ui/Modal';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  email: string;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  onSend,
  email,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify your Email" size="sm">
      <p className="text-sm text-gray-600">
        Your email address ({email}) is not verified yet. <br />
        Would you like us to send a verification link?
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          Later
        </button>
        <button
          onClick={onSend}
          className="rounded-lg bg-gradient-to-r from-brand to-accent px-4 py-2 text-sm font-semibold text-ink transition hover:shadow-md"
        >
          Send Verification
        </button>
      </div>
    </Modal>
  );
};

export default EmailVerificationModal;
