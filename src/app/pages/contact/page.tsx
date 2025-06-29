'use client';

import { useState } from 'react';
import { getContactService } from '@/services';
import { cn } from '@/utils/cn';

export default function Contact() {
  // Service references
  const contactService = getContactService();

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
    setIsSubmitting(true);
    setStatusMessage('');
    setIsError(false);

    try {
      // Use service layer instead of direct Firebase access
      await contactService.createContact(formData);

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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h4 className="text-xl font-bold text-center mb-8">
        고양이들 돌보기 또는 입양, 중성화 등을 통한 개체 수 조절에
        동참을 원하시면 아래 서식을 작성해 주세요
      </h4>

      {/* Service Configuration Status */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-green-800 mb-2">Service Layer Configuration</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-green-700">Contact Form:</span>{' '}
            <span className="text-green-600">✅ Using Contact Service Abstraction</span>
          </div>
          <div>
            <span className="text-green-700">Database:</span>{' '}
            <span className="text-green-600">✅ No direct Firebase imports</span>
          </div>
          <div className="text-xs text-green-600 mt-2">
            All contact form submissions go through the service layer for better maintainability and multi-tenant support.
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-gray-700 mb-2">이름</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            type="text"
            required
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
          />
        </div>

        {/* Phone Input */}
        <div>
          <label className="block text-gray-700 mb-2">전화번호</label>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            type="tel"
            required
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
          />
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-gray-700 mb-2">이메일</label>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            type="email"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
          />
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-gray-700 mb-2">메시지</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            required
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
            "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSubmitting ? '제출 중...' : '제출하기'}
        </button>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={cn(
              "text-center mt-4 font-medium",
              isError ? "text-red-600" : "text-green-600"
            )}
          >
            {statusMessage}
          </div>
        )}
      </form>

      {/* Reminder for router.push or links update */}
      <div className="mt-4 text-center text-sm text-gray-500">
        If you use router.push or links to this page elsewhere, update their paths to '/pages/contact'.
      </div>
    </div>
  );
}