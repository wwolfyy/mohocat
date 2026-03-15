/**
 * Test examples for the date parsing functionality
 * This demonstrates how the date parsing works with different filename patterns
 */

import {
  parseRecordingDateFromTitle,
  formatDateForInput,
  formatDateTimeForInput,
} from './dateParser';

// Test cases that demonstrate the parsing patterns
const testFilenames = [
  '2024-03-15 14.30.45_catfeeding.mp4', // Pattern 1: yyyy-mm-dd hh.MM.ss
  '20240315_143045_catplay.mp4', // Pattern 2: yyyymmdd_hhMMss
  'video_2024-03-15_cats.mp4', // Pattern 3: yyyy-mm-dd (date only)
  'recording_20240315.mp4', // Pattern 4: yyyymmdd (date only)
  'random_video_name.mp4', // No date pattern - should return null
];

console.log('=== Date Parsing Test Results ===');

testFilenames.forEach((filename) => {
  const parsedDate = parseRecordingDateFromTitle(filename);
  if (parsedDate) {
    const dateFormatted = formatDateForInput(parsedDate);
    const dateTimeFormatted = formatDateTimeForInput(parsedDate);
    console.log(`✅ "${filename}"`);
    console.log(`   → Parsed: ${parsedDate.toISOString()}`);
    console.log(`   → Date input: ${dateFormatted}`);
    console.log(`   → DateTime input: ${dateTimeFormatted}`);
  } else {
    console.log(`❌ "${filename}" → No date found`);
  }
  console.log('');
});

export { testFilenames };
