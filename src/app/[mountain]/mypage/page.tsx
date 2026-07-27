'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMountain } from '@/components/MountainProvider';
import { isAdmin as checkIsAdmin } from '@/lib/auth/admin';
import { auth } from '@/services/firebase';
import { RecaptchaVerifier } from 'firebase/auth';
import PasswordResetModal from '@/components/auth/PasswordResetModal';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { strings } from '@/constants/strings';

const t = strings.mypage;

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
    signInWithPhoneNumber,
  } = useAuth();

  const mountainId = useMountain();

  // Track whether this session was ever authenticated here, so the guard can tell
  // a logout (was signed in → send to the landing page) from a direct logged-out
  // visit (never signed in → send to the login page). Covers logout via the
  // in-page button AND the top-nav modal, since both just flip the auth state.
  const wasAuthedRef = useRef(false);
  useEffect(() => {
    if (user) wasAuthedRef.current = true;
  }, [user]);

  // Redirect once unauthenticated. Driven off the auth state (not off awaiting
  // signOut), so it also covers logging out from the top-nav modal. A client
  // `router.replace` here proved unreliable — after the auth context flips to
  // null the App Router transition didn't commit and the page stayed stuck on its
  // `!user` spinner — so we do a full-page navigation, which always commits and
  // cleanly drops any signed-in client state.
  useEffect(() => {
    if (!loading && !user) {
      window.location.replace(wasAuthedRef.current ? '/' : '/login');
    }
  }, [user, loading]);

  // Show the CMS shortcut only to members who would actually get in. Uses the
  // very check the admin gate uses (`isAdmin`, on the active mountain), so the
  // link can't drift away from what AdminAuth allows.
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setCanAccessAdmin(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const allowed = await checkIsAdmin(user, mountainId);
        if (!cancelled) setCanAccessAdmin(allowed);
      } catch (error) {
        // `isAdmin` re-raises when the permission read fails (blocked/offline).
        // This is only a shortcut, so log it and leave the link hidden rather
        // than offering an entry point we couldn't verify — /admin is still
        // reachable directly, and it has its own retry UI for this case.
        console.error('Admin access check failed on mypage:', error);
        if (!cancelled) setCanAccessAdmin(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, mountainId]);

  const handleSignOut = async () => {
    try {
      await signOut(); // auth listener flips user→null → the effect redirects
    } catch (e) {
      console.error('Sign out failed:', e);
    }
  };

  // --- State for Edit Modes ---
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailStep, setEmailStep] = useState<'password-reauth' | 'input-new' | 'verification-sent'>(
    'password-reauth'
  );
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
            size: 'invisible',
          });
        } catch (err) {
          console.error('Recaptcha init error', err);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
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
      alert(t.profile.nicknameUpdated);
    } catch (e: any) {
      alert(t.profile.nicknameUpdateFailed(e.message));
    }
  };

  // 2. Email
  const handleEmailReauth = async () => {
    try {
      await reauthenticateWithType('password', { password: emailPassword });
      setEmailStep('input-new');
    } catch (e: any) {
      alert(t.profile.reauthFailed(e.message));
    }
  };

  const handleSendEmailVerification = async () => {
    if (!newEmail) return;
    try {
      await verifyBeforeUpdateEmail(newEmail);
      setEmailStep('verification-sent');
      alert(t.profile.emailVerificationSentAlert(newEmail));
    } catch (e: any) {
      alert(t.profile.emailVerificationFailed(e.message));
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
      alert(t.profile.phoneCodeFailed(e.message));
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
      alert(t.profile.phoneUpdated);
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        alert(t.profile.phoneRequiresRecentLogin);
      } else {
        alert(t.profile.phoneUpdateFailed(e.message));
      }
    }
  };

  // 4. Linked Accounts
  const isKakaoLinked =
    linkedProviders.includes('https://kakao.com') || linkedProviders.includes('oidc.kakao');

  const toggleKakao = async () => {
    try {
      if (isKakaoLinked) {
        if (confirm(t.linkedAccounts.disconnectConfirm)) {
          await unlinkProvider('oidc.kakao'); // Try oidc first
          // If failed, maybe try checking 'https://kakao.com'? But our service handles id.
        }
      } else {
        await linkKakaoProvider();
      }
    } catch (e: any) {
      console.error(e);
      // Alert handled by hook? No hook sets error state.
      alert(t.linkedAccounts.operationFailed(e.message));
    }
  };

  // 5. Withdraw (탈퇴) — hard-delete via the Admin SDK route, then sign out.
  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await signOut(); // auth listener flips user→null → the effect redirects home
    } catch (e: any) {
      console.error('Withdrawal failed:', e);
      alert(t.withdraw.failed(e.message));
      setIsWithdrawing(false);
      setIsWithdrawModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t.profile.heading}</h2>

        {/* Nickname */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">{t.profile.nicknameLabel}</label>
          {editingNickname ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingNickname(false)}
                  className="px-3 py-1.5 text-sm text-gray-500"
                >
                  {strings.common.cancel}
                </button>
                <Button variant="primary" size="sm" onClick={handleUpdateNickname}>
                  {strings.common.save}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-medium">
                {user.displayName || t.profile.noNickname}
              </span>
              <button onClick={() => setEditingNickname(true)} className="text-brand-700 text-sm">
                {t.profile.edit}
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">{t.profile.emailLabel}</label>
          {editingEmail ? (
            <div className="bg-gray-50 p-3 rounded-lg">
              {emailStep === 'password-reauth' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">{t.profile.passwordReauthPrompt}</p>
                  <input
                    type="password"
                    placeholder={t.profile.currentPasswordPlaceholder}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingEmail(false)}
                      className="px-3 py-1.5 text-sm text-gray-500"
                    >
                      {strings.common.cancel}
                    </button>
                    <Button variant="primary" size="sm" onClick={handleEmailReauth}>
                      {strings.common.confirm}
                    </Button>
                  </div>
                </div>
              )}
              {emailStep === 'input-new' && (
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder={t.profile.newEmailPlaceholder}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={handleSendEmailVerification}
                  >
                    {t.profile.sendVerification}
                  </Button>
                </div>
              )}
              {emailStep === 'verification-sent' && (
                <div className="text-center">
                  <p className="text-green-600 text-sm mb-2">{t.profile.emailVerificationSent}</p>
                  <button
                    onClick={() => setEditingEmail(false)}
                    className="text-gray-500 text-sm underline"
                  >
                    {strings.common.close}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-900">{user.email || t.profile.noEmail}</span>
              {/* Only allow email edit if we have password provider?
                        If Kakaotalk user, they might not have password.
                        Reauth flow needs type detection.
                        For now assume Password user or handle error. */}
              <button
                onClick={() => {
                  setEditingEmail(true);
                  setEmailStep('password-reauth');
                }}
                className="text-brand-700 text-sm"
              >
                {t.profile.change}
              </button>
            </div>
          )}
        </div>

        {/* Password Change Link */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">{t.profile.passwordLabel}</label>
          <div className="flex justify-between items-center">
            <span className="text-gray-900">********</span>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="text-brand-700 text-sm hover:underline"
            >
              {t.profile.resetPassword}
            </button>
          </div>
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">{t.profile.phoneLabel}</label>
          {editingPhone ? (
            <div className="bg-gray-50 p-3 rounded-lg">
              {/* Dedicated empty container for Recaptcha */}
              <div id="update-phone-recaptcha"></div>

              {phoneStep === 'input-new' && (
                <div className="space-y-2">
                  <input
                    type="tel"
                    placeholder={t.profile.newPhonePlaceholder}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingPhone(false)}
                      className="px-3 py-1.5 text-sm text-gray-500"
                    >
                      {strings.common.cancel}
                    </button>
                    <Button variant="primary" size="sm" onClick={handleSendPhoneCode}>
                      {t.profile.sendSms}
                    </Button>
                  </div>
                </div>
              )}
              {phoneStep === 'verify-new' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={t.profile.codePlaceholder}
                    value={phoneVerificationCode}
                    onChange={(e) => setPhoneVerificationCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-center tracking-widest"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={handleUpdatePhone}
                  >
                    {t.profile.verifyAndUpdate}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-900">{user.phoneNumber || t.profile.noPhone}</span>
              <button
                onClick={() => {
                  setEditingPhone(true);
                  setPhoneStep('input-new');
                }}
                className="text-brand-700 text-sm"
              >
                {t.profile.change}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Linked Accounts */}
      <section className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t.linkedAccounts.heading}</h2>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FEE500] rounded-full flex items-center justify-center">
              {/* Kakao vendor logo glyph — left as-is (logo, not copy) */}
              <span className="font-bold text-black text-xs">TALK</span>
            </div>
            <div>
              <p className="font-medium">{t.linkedAccounts.kakaoName}</p>
              <p className="text-xs text-gray-500">
                {isKakaoLinked ? t.linkedAccounts.connected : t.linkedAccounts.notConnected}
              </p>
            </div>
          </div>
          <button
            onClick={toggleKakao}
            disabled={isLinkingKakao || isUnlinkingProvider}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isKakaoLinked
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-[#FEE500] text-black hover:bg-[#FDD835]'
            }`}
          >
            {isLinkingKakao || isUnlinkingProvider
              ? t.linkedAccounts.processing
              : isKakaoLinked
                ? t.linkedAccounts.disconnect
                : t.linkedAccounts.connect}
          </button>
        </div>
      </section>

      {/* Admin CMS shortcut — only for members with admin access on this mountain. */}
      {canAccessAdmin && (
        <section className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">{t.admin.heading}</h2>
          <p className="text-sm text-gray-500 mb-4">{t.admin.description}</p>
          <a
            href="/admin"
            className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-3 font-bold text-ink transition-all hover:shadow-lg"
          >
            {t.admin.link}
          </a>
        </section>
      )}

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full bg-gray-100 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
      >
        {t.signOut}
      </button>

      {/* Withdraw (탈퇴) — quiet, low-emphasis entry point; the confirm modal
          carries the destructive warning. */}
      <div className="text-center">
        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className="text-sm text-gray-400 underline underline-offset-2 hover:text-red-600"
        >
          {t.withdraw.button}
        </button>
      </div>

      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        email={user?.email || ''}
      />

      {isWithdrawModalOpen && (
        <Modal
          isOpen={isWithdrawModalOpen}
          onClose={() => !isWithdrawing && setIsWithdrawModalOpen(false)}
          title={t.withdraw.confirmTitle}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-600">{t.withdraw.confirmBody}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                disabled={isWithdrawing}
                className="px-4 py-2 text-sm text-gray-500 disabled:opacity-50"
              >
                {t.withdraw.cancel}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isWithdrawing ? t.withdraw.processing : t.withdraw.confirm}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
