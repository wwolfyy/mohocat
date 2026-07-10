import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { strings } from '@/constants/strings';

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
    <Modal isOpen={isOpen} onClose={onClose} title={strings.auth.emailVerification.title} size="sm">
      <p className="text-sm text-gray-600">{strings.auth.emailVerification.body(email)}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          {strings.auth.emailVerification.later}
        </button>
        <Button size="sm" onClick={onSend}>
          {strings.auth.emailVerification.send}
        </Button>
      </div>
    </Modal>
  );
};

export default EmailVerificationModal;
