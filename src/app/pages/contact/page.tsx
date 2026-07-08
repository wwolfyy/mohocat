'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

export default function Contact() {
  // Submitting the form requires a logged-in 집사 (matches the intro copy).
  // Treat the auth-loading window as "checking" so the button doesn't flash enabled.
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const canSubmit = isAuthenticated && !authLoading;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard: submission is members-only (UI gate; not a security control).
    if (!canSubmit) return;
    setIsSubmitting(true);
    setStatusMessage('');
    setIsError(false);

    try {
      // Variant A: submit through the server route, which records the contact via the
      // Admin SDK and emails the admin. Attach the Firebase ID token so the route can
      // enforce the members-only gate server-side.
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      // Clear form
      setFormData({
        name: '',
        phone: '',
        email: '',
        message: '',
      });

      setStatusMessage('메시지가 전송되었습니다. 감사합니다!');
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsError(true);
      setStatusMessage('죄송합니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 relative" data-oid="tcd6of1">
      {/* Overlay for disabled state */}
      {/* <div
        className="absolute inset-0 bg-gray-100 bg-opacity-80 z-10 flex items-center justify-center rounded-lg"
        data-oid="m4ax7n0"
      >
        <div className="text-center" data-oid="895x7ax">
          <div className="text-2xl font-bold text-gray-600 mb-2" data-oid="rsam.g_">
            준비 중입니다
          </div>
        </div>
      </div> */}

      <div data-oid="8dwt2t:">
        <p className="text-sm text-center text-gray-500 mb-5" data-oid="c218kfo">
          고양이들 돌보기, 입양, 중성화를 통한 개체 수 조절 등에 동참을 원하시면 먼저{' '}
          <Link
            href="/login?tab=signup"
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            집사등록
          </Link>
          을 하신 후에 아래 서식을 작성해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" data-oid="01bl:61">
          {/* Name Input */}
          <div data-oid="llt4pcp">
            <label className="block text-sm text-gray-600 mb-1" data-oid="t:8er9_">
              이름
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              type="text"
              required
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-300 outline-none"
              data-oid="lsi4982"
            />
          </div>

          {/* Phone Input */}
          <div data-oid="dx-6hfb">
            <label className="block text-sm text-gray-600 mb-1" data-oid="8e3zidj">
              전화번호
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              type="tel"
              required
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-300 outline-none"
              data-oid="vyy-153"
            />
          </div>

          {/* Email Input */}
          <div data-oid=".xe0odv">
            <label className="block text-sm text-gray-600 mb-1" data-oid="epvftmp">
              이메일
            </label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-300 outline-none"
              data-oid="h9l8g-a"
            />
          </div>

          {/* Message Input */}
          <div data-oid="qmqqqx_">
            <label className="block text-sm text-gray-600 mb-1" data-oid="oorrh.t">
              메시지
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              required
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-300 outline-none"
              data-oid="oybfjtx"
            />
          </div>

          {/* Submit Button — members-only */}
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={cn(
              'w-full py-2 text-sm bg-gradient-to-r from-brand to-accent',
              'text-ink rounded-lg font-semibold hover:shadow-lg transition-all duration-200',
              (isSubmitting || !canSubmit) && 'opacity-50 cursor-not-allowed'
            )}
            data-oid="p6x6eai"
          >
            {isSubmitting ? '제출 중...' : '보내기'}
          </button>

          {/* Login prompt when logged out (hidden while auth is still resolving) */}
          {!authLoading && !isAuthenticated && (
            <p className="text-center text-sm text-gray-500">
              메시지를 보내려면 먼저{' '}
              <Link
                href="/login?tab=signup"
                className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                집사등록
              </Link>
              이 필요해요.
            </p>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={cn(
                'text-center mt-4 font-medium',
                isError ? 'text-red-600' : 'text-green-600'
              )}
              data-oid="_tbbgsc"
            >
              {statusMessage}
            </div>
          )}
        </form>

        {/* Reminder for router.push or links update */}
        {/* <div className="mt-4 text-center text-sm text-gray-500" data-oid="9_qk1_s">
          If you use router.push or links to this page elsewhere, update their paths to
          '/pages/contact'.
        </div> */}
      </div>
    </div>
  );
}
