/**
 * Utility functions to parse recording/creation dates from video titles and
 * image filenames. Extracted from the admin media tagging pages for reuse in
 * post creation forms; both parsers share the same pattern set.
 */

const parseDateFromText = (text: string, sourceLabel: string): Date | null => {
  try {
    // Pattern 1: yyyy-mm-dd hh.MM.ss (with spaces or special chars around)
    const pattern1 = /(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})/;
    const match1 = text.match(pattern1);

    if (match1) {
      const dateTimeStr = match1[1];
      // Convert format: "2024-03-15 14.30.45" -> "2024-03-15T14:30:45"
      const isoFormat = dateTimeStr.replace(/\s+/, 'T').replace(/\./g, ':');
      const date = new Date(isoFormat);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Pattern 2: yyyymmdd_hhMMss (with spaces or special chars around)
    const pattern2 = /(\d{8}_\d{6})/;
    const match2 = text.match(pattern2);

    if (match2) {
      const dateTimeStr = match2[1];
      // Convert format: "20240315_143045" -> "2024-03-15T14:30:45"
      const year = dateTimeStr.substring(0, 4);
      const month = dateTimeStr.substring(4, 6);
      const day = dateTimeStr.substring(6, 8);
      const hour = dateTimeStr.substring(9, 11);
      const minute = dateTimeStr.substring(11, 13);
      const second = dateTimeStr.substring(13, 15);

      const isoFormat = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      const date = new Date(isoFormat);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Additional pattern: yyyy-mm-dd (date only, no time)
    const pattern3 = /(\d{4}-\d{2}-\d{2})/;
    const match3 = text.match(pattern3);

    if (match3) {
      const dateStr = match3[1];
      const date = new Date(dateStr + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Additional pattern: yyyymmdd (date only, no time)
    const pattern4 = /(\d{8})/;
    const match4 = text.match(pattern4);

    if (match4) {
      const dateStr = match4[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);

      const isoFormat = `${year}-${month}-${day}T00:00:00`;
      const date = new Date(isoFormat);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Error parsing date from ${sourceLabel} "${text}":`, error);
    return null;
  }
};

export const parseRecordingDateFromTitle = (title: string): Date | null =>
  parseDateFromText(title, 'video title');

export const parseCreatedDateFromFilename = (filename: string): Date | null =>
  parseDateFromText(filename, 'filename');

/**
 * Converts a Date to the YYYY-MM-DD an HTML date input expects, reading the
 * date **as it reads on the local wall clock**.
 *
 * ⚠️ It must not use `toISOString()`. A filename carries a *calendar date* —
 * a day, with no instant and no timezone — and the parsers above build it with
 * `new Date('…T00:00:00')`, which JS reads as **local** midnight. Serializing
 * that through `toISOString()` converts to **UTC**, and the two conversions do
 * not cancel: east of Greenwich the date lands a day early (KST: `2026-03-15`
 * displayed as `2026-03-14`), west of it a day late. It reads correctly at
 * UTC only — which is why CI never caught it and every Korean user saw it.
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Turns a `YYYY-MM-DD` calendar date into the instant stored for it: **UTC
 * midnight of that date**.
 *
 * Firestore Timestamps and YouTube's `recordingDate` are instants, so a
 * calendar date has to be encoded as one. UTC midnight is the convention the
 * admin editor already writes (`tag-videos/page.tsx`), and it is what makes the
 * date read back identically everywhere — in the app, in the Firebase console,
 * in an export. Local midnight would store the *previous* day in UTC for
 * anyone east of Greenwich.
 *
 * Explicit rather than leaning on `new Date(str)`, whose rule flips on the
 * input's shape: a bare `'2026-03-15'` parses as UTC, `'2026-03-15T00:00'` as
 * local. That inconsistency is the root of the bug this replaced.
 */
export const calendarDateToInstant = (calendarDate: string): Date => {
  const match = calendarDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Expected a YYYY-MM-DD calendar date, got: "${calendarDate}"`);
  }

  const [, year, month, day] = match;
  const instant = new Date(`${calendarDate}T00:00:00.000Z`);

  // ⚠️ Verify the components survived. An impossible date does not produce
  // NaN — JS rolls it over silently (2026-02-31 becomes 2026-03-03), which is
  // precisely the kind of quietly-wrong value this module exists to stop.
  const roundTrips =
    instant.getUTCFullYear() === Number(year) &&
    instant.getUTCMonth() + 1 === Number(month) &&
    instant.getUTCDate() === Number(day);

  if (isNaN(instant.getTime()) || !roundTrips) {
    throw new Error(`Not a valid calendar date: "${calendarDate}"`);
  }
  return instant;
};
