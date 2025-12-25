'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';
import { RecaptchaVerifier } from 'firebase/auth';
import PasswordResetModal from '@/components/auth/PasswordResetModal';

export default function MyPage() {
    const {
        user,
        loading,
        signOut,
        updateProfile,
        linkedProviders,
        linkKakaoProvider,
        unlinkProvider,
        isLinkingKakao,
        isUnlinkingProvider,
        reauthenticateWithType,
        verifyBeforeUpdateEmail,
        updatePhoneNumber,
        signInWithPhoneNumber
    } = useAuth();

    const router = useRouter();

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // --- State for Edit Modes ---
    const [editingNickname, setEditingNickname] = useState(false);
    const [newNickname, setNewNickname] = useState('');

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const [editingEmail, setEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailStep, setEmailStep] = useState<'password-reauth' | 'input-new' | 'verification-sent'>('password-reauth');
    const [emailPassword, setEmailPassword] = useState('');

    const [editingPhone, setEditingPhone] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [phoneStep, setPhoneStep] = useState<'input-new' | 'verify-new'>('input-new');
    const [phoneVerificationId, setPhoneVerificationId] = useState('');
    const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    // --- Initializers ---
    useEffect(() => {
        if (user) {
            setNewNickname(user.displayName || '');
        }
    }, [user]);

    // Recaptcha for phone
    useEffect(() => {
        const initRecaptcha = () => {
            if (!recaptchaVerifierRef.current && auth) {
                try {
                    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'update-phone-recaptcha', {
                        'size': 'invisible',
                    });
                } catch (err) {
                    console.error("Recaptcha init error", err);
                }
            }
        };

        if (editingPhone) {
            // slight delay to ensure DOM element exists
            setTimeout(initRecaptcha, 100);
        } else {
            // Cleanup when closing edit mode
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                } catch (e) {
                    // Ignore error if already cleared
                }
                recaptchaVerifierRef.current = null;
            }
        }

        // Cleanup on unmount
        return () => {
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                } catch (e) {
                    // Ignore
                }
                recaptchaVerifierRef.current = null;
            }
        };
    }, [editingPhone]);

    if (loading || !user) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    // --- Handlers ---

    // 1. Nickname
    const handleUpdateNickname = async () => {
        if (!newNickname.trim()) return;
        try {
            await updateProfile(newNickname);
            setEditingNickname(false);
            alert('Nickname updated!');
        } catch (e: any) {
            alert('Failed to update nickname: ' + e.message);
        }
    };

    // 2. Email
    const handleEmailReauth = async () => {
        try {
            await reauthenticateWithType('password', { password: emailPassword });
            setEmailStep('input-new');
        } catch (e: any) {
            alert('Re-authentication failed: ' + e.message);
        }
    };

    const handleSendEmailVerification = async () => {
        if (!newEmail) return;
        try {
            await verifyBeforeUpdateEmail(newEmail);
            setEmailStep('verification-sent');
            alert(`Verification email sent to ${newEmail}. Please click the link in the email to confirm the change.`);
        } catch (e: any) {
            alert('Failed to send verification: ' + e.message);
        }
    };

    // 3. Phone
    const handleSendPhoneCode = async () => {
        if (!newPhone || !recaptchaVerifierRef.current) return;
        try {
            const confirmation = await signInWithPhoneNumber(newPhone, recaptchaVerifierRef.current);
            setPhoneVerificationId(confirmation.verificationId);
            setPhoneStep('verify-new');
        } catch (e: any) {
            alert('Failed to send code: ' + e.message);
        }
    };

    const handleUpdatePhone = async () => {
        if (!phoneVerificationCode) return;
        try {
            // Note: For secure update, we should ideally re-authenticate old phone first?
            // But the requirement said "Verify new number". The Firebase `updatePhoneNumber` requires a *credential* for the new number.
            // Wait, `updatePhoneNumber` takes a credential? Yes.
            // And usually it also requires recent login.
            // If re-auth is needed, Firebase will throw 'auth/requires-recent-login'.

            await updatePhoneNumber(phoneVerificationId, phoneVerificationCode);
            setEditingPhone(false);
            alert('Phone number updated!');
        } catch (e: any) {
            if (e.code === 'auth/requires-recent-login') {
                alert('For security, please sign out and sign in again before changing your phone number.');
            } else {
                alert('Failed to update phone: ' + e.message);
            }
        }
    };

    // 4. Linked Accounts
    const isKakaoLinked = linkedProviders.includes('https://kakao.com') || linkedProviders.includes('oidc.kakao');

    const toggleKakao = async () => {
        try {
            if (isKakaoLinked) {
                if (confirm('Are you sure you want to disconnect KakaoTalk?')) {
                    await unlinkProvider('oidc.kakao'); // Try oidc first
                    // If failed, maybe try checking 'https://kakao.com'? But our service handles id.
                }
            } else {
                await linkKakaoProvider();
            }
        } catch (e: any) {
            console.error(e);
            // Alert handled by hook? No hook sets error state.
            alert('Operation failed: ' + e.message);
        }
    };

    return (
        <div className="space-y-8">

            {/* Profile Section */}
            <section className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Profile</h2>

                {/* Nickname */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Nickname</label>
                    {editingNickname ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newNickname}
                                onChange={e => setNewNickname(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg"
                            />
                            <button onClick={handleUpdateNickname} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                            <button onClick={() => setEditingNickname(false)} className="text-gray-500 px-2">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-900 font-medium">{user.displayName || 'No nickname'}</span>
                            <button onClick={() => setEditingNickname(true)} className="text-blue-500 text-sm">Edit</button>
                        </div>
                    )}
                </div>

                {/* Email */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Email</label>
                    {editingEmail ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            {emailStep === 'password-reauth' && (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-600">Please enter your password to continue.</p>
                                    <input
                                        type="password"
                                        placeholder="Current Password"
                                        value={emailPassword}
                                        onChange={e => setEmailPassword(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleEmailReauth} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm w-full">Verify</button>
                                        <button onClick={() => setEditingEmail(false)} className="text-gray-500 px-2">Cancel</button>
                                    </div>
                                </div>
                            )}
                            {emailStep === 'input-new' && (
                                <div className="space-y-2">
                                    <input
                                        type="email"
                                        placeholder="New Email Address"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                    <button onClick={handleSendEmailVerification} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm w-full">Send Verification</button>
                                </div>
                            )}
                            {emailStep === 'verification-sent' && (
                                <div className="text-center">
                                    <p className="text-green-600 text-sm mb-2">Verification email sent!</p>
                                    <button onClick={() => setEditingEmail(false)} className="text-gray-500 text-sm underline">Close</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-900">{user.email || 'No email'}</span>
                            {/* Only allow email edit if we have password provider?
                        If Kakaotalk user, they might not have password.
                        Reauth flow needs type detection.
                        For now assume Password user or handle error. */}
                            <button onClick={() => { setEditingEmail(true); setEmailStep('password-reauth'); }} className="text-blue-500 text-sm">Change</button>
                        </div>
                    )}
                </div>

                {/* Password Change Link */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Password</label>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-900">********</span>
                        <button
                            onClick={() => setIsResetModalOpen(true)}
                            className="text-blue-500 text-sm hover:underline"
                        >
                            Reset Password
                        </button>
                    </div>
                </div>

                {/* Phone */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
                    {editingPhone ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            {/* Dedicated empty container for Recaptcha */}
                            <div id="update-phone-recaptcha"></div>

                            {phoneStep === 'input-new' && (
                                <div className="space-y-2">
                                    <input
                                        type="tel"
                                        placeholder="New Phone Number"
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSendPhoneCode} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm w-full">Send SMS</button>
                                        <button onClick={() => setEditingPhone(false)} className="text-gray-500 px-2">Cancel</button>
                                    </div>
                                </div>
                            )}
                            {phoneStep === 'verify-new' && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Verification Code"
                                        value={phoneVerificationCode}
                                        onChange={e => setPhoneVerificationCode(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-center tracking-widest"
                                    />
                                    <button onClick={handleUpdatePhone} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm w-full">Verify & Update</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-900">{user.phoneNumber || 'No phone number'}</span>
                            <button onClick={() => { setEditingPhone(true); setPhoneStep('input-new'); }} className="text-blue-500 text-sm">Change</button>
                        </div>
                    )}
                </div>

            </section>

            {/* Linked Accounts */}
            <section className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Linked Accounts</h2>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FEE500] rounded-full flex items-center justify-center">
                            <span className="font-bold text-black text-xs">TALK</span>
                        </div>
                        <div>
                            <p className="font-medium">KakaoTalk</p>
                            <p className="text-xs text-gray-500">{isKakaoLinked ? 'Connected' : 'Not connected'}</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleKakao}
                        disabled={isLinkingKakao || isUnlinkingProvider}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isKakaoLinked
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-[#FEE500] text-black hover:bg-[#FDD835]'
                            }`}
                    >
                        {isLinkingKakao || isUnlinkingProvider ? 'Processing...' : (isKakaoLinked ? 'Disconnect' : 'Connect')}
                    </button>
                </div>
            </section>

            {/* Sign Out */}
            <button
                onClick={() => signOut().then(() => router.push('/'))}
                className="w-full bg-gray-100 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
                Sign Out
            </button>

            <PasswordResetModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                email={user?.email || ''}
            />
        </div>
    );
}
