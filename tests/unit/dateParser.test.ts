/**
 * 촬영일 handling — parse, display, store.
 *
 * ⚠️ **These tests pin `TZ=Asia/Seoul` on purpose.** The bug they guard against
 * is invisible at UTC, where the offset is zero and a local↔UTC round trip
 * cancels out. CI runners are UTC, which is exactly how a date that displayed a
 * day early for every Korean user survived unnoticed. Asserting this suite at
 * the runner's default timezone would prove nothing — the same shape as the
 * fixture-realism lesson in `log/DEBUG_LOG.md` (2026-07-26).
 */
process.env.TZ = 'Asia/Seoul';

import { describe, it, expect } from 'vitest';
import {
  calendarDateToInstant,
  formatDateForInput,
  parseCreatedDateFromFilename,
  parseRecordingDateFromTitle,
} from '../../src/utils/dateParser';

describe('the timezone fixture itself', () => {
  it('really is running at KST (+09:00), or the rest of this file proves nothing', () => {
    expect(new Date(2026, 2, 15).getTimezoneOffset()).toBe(-540);
  });
});

describe('formatDateForInput — a calendar date survives the round trip', () => {
  it('returns the day as it reads locally, not the UTC instant', () => {
    // Local midnight in KST is 15:00Z the previous day; toISOString() would have
    // returned 2026-03-14 here. This is the regression.
    expect(formatDateForInput(new Date(2026, 2, 15))).toBe('2026-03-15');
  });

  it('round-trips every filename pattern back to the date written in the name', () => {
    const cases: Array<[string, string]> = [
      ['2026-03-15 산책.mp4', '2026-03-15'],
      ['2026-03-15 14.30.45.mp4', '2026-03-15'],
      ['VID_20260315_101530.mp4', '2026-03-15'],
      ['냥이 20260315.mp4', '2026-03-15'],
      // Just before midnight local — the case most likely to slip a day.
      ['2026-12-31 23.59.59.mp4', '2026-12-31'],
      // Start of a year and a leap day, where an off-by-one is loudest.
      ['2026-01-01 00.00.00.mp4', '2026-01-01'],
      ['2024-02-29 산책.mp4', '2024-02-29'],
    ];

    for (const [filename, expected] of cases) {
      const parsed = parseRecordingDateFromTitle(filename);
      expect(parsed, filename).not.toBeNull();
      expect(formatDateForInput(parsed as Date), filename).toBe(expected);
    }
  });

  it('pads single-digit months and days', () => {
    expect(formatDateForInput(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('treats video titles and image filenames identically', () => {
    const name = '2026-03-15 산책.mp4';
    expect(formatDateForInput(parseCreatedDateFromFilename(name) as Date)).toBe(
      formatDateForInput(parseRecordingDateFromTitle(name) as Date)
    );
  });
});

describe('calendarDateToInstant — one encoding at the storage boundary', () => {
  it('encodes the date as UTC midnight, matching what /admin/tag-videos writes', () => {
    expect(calendarDateToInstant('2026-03-15').toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('does not drift when the app reads it back for display', () => {
    // The full loop: filename → input value → stored instant → ISO date, which is
    // how the admin editor renders it. Every hop must show the same day.
    const parsed = parseRecordingDateFromTitle('2026-03-15 산책.mp4') as Date;
    const inputValue = formatDateForInput(parsed);
    const stored = calendarDateToInstant(inputValue);
    expect(stored.toISOString().split('T')[0]).toBe('2026-03-15');
  });

  it('rejects anything that is not a bare calendar date', () => {
    // Guards the trap underneath the original bug: new Date('2026-03-15') parses
    // as UTC while new Date('2026-03-15T00:00') parses as local, so a datetime
    // string reaching here would silently mean a different day.
    expect(() => calendarDateToInstant('2026-03-15T00:00')).toThrow(/YYYY-MM-DD/);
    expect(() => calendarDateToInstant('')).toThrow(/YYYY-MM-DD/);
    expect(() => calendarDateToInstant('15/03/2026')).toThrow(/YYYY-MM-DD/);
  });

  it('rejects a well-formed but impossible date', () => {
    expect(() => calendarDateToInstant('2026-02-31')).toThrow(/valid calendar date/);
  });
});
