/**
 * Utility function to parse recording dates from video titles
 * Extracted from admin video tagging page for reuse in post creation forms
 */

export const parseRecordingDateFromTitle = (title: string): Date | null => {
  try {
    // Pattern 1: yyyy-mm-dd hh.MM.ss (with spaces or special chars around)
    const pattern1 = /(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})/;
    const match1 = title.match(pattern1);

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
    const match2 = title.match(pattern2);

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
    const match3 = title.match(pattern3);

    if (match3) {
      const dateStr = match3[1];
      const date = new Date(dateStr + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Additional pattern: yyyymmdd (date only, no time)
    const pattern4 = /(\d{8})/;
    const match4 = title.match(pattern4);

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
    console.warn(`Error parsing date from video title "${title}":`, error);
    return null;
  }
};

/**
 * Converts a Date object to YYYY-MM-DD format for HTML date inputs
 */
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Converts a Date object to YYYY-MM-DDTHH:MM format for HTML datetime-local inputs
 */
export const formatDateTimeForInput = (date: Date): string => {
  // Get ISO string and remove seconds and milliseconds
  const isoString = date.toISOString();
  return isoString.slice(0, 16); // "YYYY-MM-DDTHH:MM"
};
