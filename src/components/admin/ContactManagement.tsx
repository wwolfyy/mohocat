'use client';

import { useState, useEffect, useCallback } from 'react';
import { getContactService } from '@/services';
import type { Contact } from '@/types';
import { adminStrings } from '@/constants/adminStrings';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useMountain } from '@/components/MountainProvider';

const { contacts: t, common } = adminStrings;

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

/**
 * The 알림 cell — whether the admin notification email for this contact actually sent.
 *
 * 🔑 **Three states, not two.** `false` is a known failure and is the only one worth
 * shouting about; `true` is the ordinary case and stays quiet; `undefined` means the
 * record predates the field, and rendering that as a failure would invent history —
 * every contact in the collection today is `undefined`.
 *
 * ⚠️ **`false` never means the submission was lost.** `/api/contact` writes the contact
 * before it attempts the email, so a failed notification is a missing *ping*, not a
 * missing record — hence 저장되어 있어요 in the hint.
 *
 * Status hue, not brand: `design.md` §Colors keeps warning distinct from `brand`.
 */
function NotifiedCell({ notified }: { notified?: boolean }) {
  if (notified === false) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200"
        title={t.notified.failedHint}
      >
        {t.notified.failed}
      </span>
    );
  }
  if (notified === true) {
    return <span className="text-xs text-gray-500">{t.notified.sent}</span>;
  }
  return (
    <span className="text-xs text-gray-400" title={t.notified.unknownHint}>
      {t.notified.unknown}
    </span>
  );
}

export default function ContactManagement() {
  const mountainId = useMountain();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await getContactService(mountainId).getAllContacts();
      setContacts(all);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [mountainId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{t.title}</h3>
        <Button variant="secondary" size="sm" onClick={loadContacts} disabled={loading}>
          {loading ? common.loading : common.refresh}
        </Button>
      </div>

      {error && <div className="mb-4 text-sm font-medium text-red-600">{error}</div>}

      {!loading && !error && contacts.length === 0 && (
        <div className="py-12 text-center text-gray-500">{t.empty}</div>
      )}

      {contacts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 pr-4 font-medium">{t.columns.createdAt}</th>
                <th className="py-2 pr-4 font-medium">{t.columns.name}</th>
                <th className="py-2 pr-4 font-medium">{t.columns.phone}</th>
                <th className="py-2 pr-4 font-medium">{t.columns.email}</th>
                <th className="py-2 pr-4 font-medium">{t.columns.notified}</th>
                <th className="py-2 font-medium">{t.columns.message}</th>
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
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <NotifiedCell notified={c.notified} />
                  </td>
                  <td className="py-3 text-gray-700 whitespace-pre-wrap">{c.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
