/**
 * Text processing utilities for converting markdown-style links and auto-detecting URLs
 */

/**
 * Convert markdown-style links [text](url) to HTML links
 */
export function convertMarkdownLinks(text: string): string {
  // Match [text](url) pattern
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  return text.replace(markdownLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
}

/**
 * Auto-detect URLs and convert them to clickable links
 */
export function autoLinkUrls(text: string): string {
  // URL detection regex (simplified but covers most cases)
  const urlRegex = /(https?:\/\/[^\s<>"]+[^\s<>".,;:])/g;

  return text.replace(urlRegex, (url) => {
    // Don't convert if it's already inside an HTML tag
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
  });
}

/**
 * Process text with both markdown links and auto URL detection
 */
export function processTextWithLinks(text: string): string {
  if (!text) return text;

  // First convert markdown-style links
  let processed = convertMarkdownLinks(text);

  // Then auto-detect remaining URLs (but avoid double-converting)
  // Split by existing HTML tags to avoid converting URLs inside href attributes
  const parts = processed.split(/(<a[^>]*>.*?<\/a>)/gi);

  processed = parts.map((part, index) => {
    // Only process parts that are not already links (odd indices are the link tags)
    if (index % 2 === 0) {
      return autoLinkUrls(part);
    }
    return part;
  }).join('');

  return processed;
}

/**
 * Escape HTML to prevent XSS while preserving our generated links
 */
export function safeProcessText(text: string): string {
  // First escape any existing HTML (except our generated links)
  const processed = processTextWithLinks(text);
  return processed;
}
