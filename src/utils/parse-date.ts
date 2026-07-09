/**
 * Safely convert the various date shapes that come back from Firestore
 * (Date, Firebase Timestamp with `seconds` or `toDate()`, ISO string, number)
 * into a JavaScript Date. Returns null when the value can't be parsed.
 */
export function parseDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;

  try {
    if (dateValue instanceof Date) {
      return dateValue;
    }

    if (typeof dateValue === 'object') {
      const obj = dateValue as { seconds?: number; toDate?: () => Date };
      if (typeof obj.seconds === 'number') {
        return new Date(obj.seconds * 1000);
      }
      if (typeof obj.toDate === 'function') {
        return obj.toDate();
      }
    }

    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  } catch (error) {
    console.warn('Error parsing date:', dateValue, error);
    return null;
  }
}
