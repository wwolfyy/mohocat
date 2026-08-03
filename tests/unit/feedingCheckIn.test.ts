/**
 * Unit coverage for the 급식현황 check-in confirmation (2026-08-04).
 *
 * 🔑 This is the only automated cover the spot list has. The e2e harness cannot
 * reach it: `scripts/test/seed-emulators.mjs` seeds no `feeding_spots`, so the
 * composer always renders 급식소 정보가 없습니다 there and the dialog always takes
 * the empty branch. The listing — the part that lets an author catch a mis-tick
 * before an unrecoverable write — is asserted here.
 */
import { describe, it, expect } from 'vitest';
import {
  buildFeedingCheckInConfirmMessage,
  formatVisitTimeForDisplay,
} from '@/utils/feedingCheckIn';

const spots = [
  { id: 1, name: '정상 급식소' },
  { id: 2, name: '약수터 급식소' },
  { id: 3, name: '주차장 급식소' },
];

describe('buildFeedingCheckInConfirmMessage', () => {
  it('names every ticked spot, and only those', () => {
    const message = buildFeedingCheckInConfirmMessage(spots, new Set([1, 3]), '2026-08-04T14:00');

    expect(message).toContain('· 정상 급식소');
    expect(message).toContain('· 주차장 급식소');
    expect(message).not.toContain('약수터 급식소');
  });

  it('counts the ticked spots and shows the visit time', () => {
    const message = buildFeedingCheckInConfirmMessage(spots, new Set([1, 3]), '2026-08-04T14:00');

    expect(message).toContain('아래 급식소 2곳의 최근 방문 기록이 바뀌어요.');
    expect(message).toContain('방문 시간: 2026년 8월 4일 14:00');
  });

  it('warns that the change cannot be undone', () => {
    const message = buildFeedingCheckInConfirmMessage(spots, new Set([2]), '2026-08-04T14:00');
    expect(message).toContain('되돌릴 수 없어요');
  });

  it('lists spots in the order they are shown, not the order they were ticked', () => {
    // The checkboxes render in `feedingSpots` order (the service reads them
    // ordered by id); a dialog in click order would be a different list to
    // proof-read than the one the author just filled in.
    const message = buildFeedingCheckInConfirmMessage(
      spots,
      new Set([3, 1, 2]),
      '2026-08-04T14:00'
    );

    expect(message.indexOf('정상 급식소')).toBeLessThan(message.indexOf('약수터 급식소'));
    expect(message.indexOf('약수터 급식소')).toBeLessThan(message.indexOf('주차장 급식소'));
  });

  it('ignores a checked id that no longer matches a spot', () => {
    const message = buildFeedingCheckInConfirmMessage(spots, new Set([1, 99]), '2026-08-04T14:00');
    expect(message).toContain('아래 급식소 1곳');
  });

  describe('when nothing is ticked', () => {
    it('says so instead of warning about a write that will not happen', () => {
      const message = buildFeedingCheckInConfirmMessage(spots, new Set(), '2026-08-04T14:00');

      expect(message).toBe('선택한 급식소가 없어요. 급식소 방문 기록은 그대로 두고 글만 올릴까요?');
      expect(message).not.toContain('되돌릴 수 없어요');
    });

    it('takes the same branch when the mountain has no spots at all', () => {
      const message = buildFeedingCheckInConfirmMessage([], new Set([1]), '2026-08-04T14:00');
      expect(message).toContain('선택한 급식소가 없어요');
    });
  });
});

describe('formatVisitTimeForDisplay', () => {
  it('reads the datetime-local components literally', () => {
    // ⚠️ No Date round-trip: parsing `2026-08-04T14:00` and reformatting would
    // reinterpret it in the browser's zone, so a KST user could be shown an
    // hour other than the one sitting in the input beside the dialog.
    expect(formatVisitTimeForDisplay('2026-08-04T14:00')).toBe('2026년 8월 4일 14:00');
  });

  it('strips the leading zeros from month and day, but not from the clock', () => {
    expect(formatVisitTimeForDisplay('2026-01-05T09:30')).toBe('2026년 1월 5일 09:30');
  });

  it('tolerates the seconds some browsers append', () => {
    expect(formatVisitTimeForDisplay('2026-08-04T14:00:00')).toBe('2026년 8월 4일 14:00');
  });

  it('passes an unparseable value through rather than dropping the line', () => {
    expect(formatVisitTimeForDisplay('')).toBe('');
    expect(formatVisitTimeForDisplay('나중에')).toBe('나중에');
  });
});
