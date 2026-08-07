/**
 * Unit coverage for the shared client-side authorship test (§10q, 2026-08-04).
 *
 * 🔑 It exists to keep `PostList` and `ReplyItem` from drifting apart, and both from
 * drifting away from `firestore.rules`'s `isPostAuthor()`. The rules are the actual
 * boundary; this decides whether 수정 / 삭제 is offered, and an affordance the
 * database then refuses is a worse experience than no affordance at all.
 */
import { describe, it, expect } from 'vitest';
import { isAuthoredBy } from '@/utils/postAuthor';

const user = { uid: 'uid-1', email: 'me@example.com' };

describe('isAuthoredBy — the authorUid era', () => {
  it('matches on uid', () => {
    expect(isAuthoredBy({ authorUid: 'uid-1' }, user)).toBe(true);
  });

  it("does not match someone else's uid", () => {
    expect(isAuthoredBy({ authorUid: 'uid-2' }, user)).toBe(false);
  });

  it('ignores the email once authorUid is present', () => {
    // The rules make the legacy fallback unreachable for the same reason: a
    // `username` that no longer identifies anyone must not re-open a document.
    expect(isAuthoredBy({ authorUid: 'uid-2', username: 'me@example.com' }, user)).toBe(false);
  });
});

describe('isAuthoredBy — the legacy era', () => {
  it('falls back to the recorded email when there is no authorUid', () => {
    expect(isAuthoredBy({ username: 'me@example.com' }, user)).toBe(true);
  });

  it('does not match a different email', () => {
    expect(isAuthoredBy({ username: 'someone@example.com' }, user)).toBe(false);
  });

  it('never matches two empties against each other', () => {
    // The trap: `undefined === undefined` would hand every author-less document to
    // every account without an email.
    expect(isAuthoredBy({}, { uid: 'uid-1' })).toBe(false);
    expect(isAuthoredBy({ username: '' }, { uid: 'uid-1', email: '' })).toBe(false);
    expect(isAuthoredBy({}, user)).toBe(false);
  });

  it('does not match the legacy admin address, which belongs to no account', () => {
    expect(isAuthoredBy({ username: 'admin@mtcat.com' }, user)).toBe(false);
  });
});

describe('isAuthoredBy — signed out', () => {
  it('is false for a null or undefined user', () => {
    expect(isAuthoredBy({ authorUid: 'uid-1' }, null)).toBe(false);
    expect(isAuthoredBy({ authorUid: 'uid-1' }, undefined)).toBe(false);
  });

  it('is false for a null document', () => {
    expect(isAuthoredBy(null, user)).toBe(false);
  });
});
