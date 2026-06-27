'use client';

import { useState, useEffect, useCallback } from 'react';
import { getContactService } from '@/services';
import type { Contact } from '@/types';

/** Render a Firestore Timestamp / Date / undefined as a localized Korean date-time. */
function formatCreatedAt(createdAt: Contact['createdAt']): string {
  if (!createdAt) return '-';
  const date =
    createdAt instanceof Date
      ? createdAt
      : 'seconds' in createdAt
        ? new Date(createdAt.seconds * 1000)
        : null;
  if (!date) return '-';
  return date.toLocaleString('ko-KR');
}

export default function ContactManagement() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await getContactService().getAllContacts();
      setContacts(all);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError('연락처를 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">연락처 관리</h3>
        <button
          onClick={loadContacts}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
      </div>

      {error && <div className="mb-4 text-sm font-medium text-red-600">{error}</div>}

      {!loading && !error && contacts.length === 0 && (
        <div className="py-12 text-center text-gray-500">아직 접수된 동참 신청이 없어요.</div>
      )}

      {contacts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 pr-4 font-medium">접수일</th>
                <th className="py-2 pr-4 font-medium">이름</th>
                <th className="py-2 pr-4 font-medium">전화번호</th>
                <th className="py-2 pr-4 font-medium">이메일</th>
                <th className="py-2 font-medium">메시지</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-500">
                    {formatCreatedAt(c.createdAt)}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-900">{c.name}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-700">{c.phone}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-700">{c.email || '-'}</td>
                  <td className="py-3 text-gray-700 whitespace-pre-wrap">{c.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
