import React from 'react';

interface EmailVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: () => void;
    email: string;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ isOpen, onClose, onSend, email }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
                <h3 className="text-lg font-bold mb-2">Verify your Email</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Your email address ({email}) is not verified yet. <br />
                    Would you like us to send a verification link?
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700"
                    >
                        Later
                    </button>
                    <button
                        onClick={onSend}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                        Send Verification
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationModal;
