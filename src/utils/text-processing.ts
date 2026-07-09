/**
 * Text processing utilities for converting markdown-style links and auto-detecting URLs
 */

/**
 * Convert markdown-style links [text](url) to HTML links
 */
export function convertMarkdownLinks(text: string): string {
  // Match [text](url) pattern
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  return text.replace(
    markdownLinkRegex,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
  );
}

/**
 * Convert cat modal links [catmodal:name] to clickable spans
 */
export function convertCatModalLinks(text: string): string {
  // Match [catmodal:name] pattern
  const catModalLinkRegex = /\[catmodal:([^\]]+)\]/g;
  return text.replace(
    catModalLinkRegex,
    '<span class="cat-modal-link text-blue-600 hover:text-blue-800 underline cursor-pointer" data-cat-name="$1">$1</span>'
  );
}

/**
 * Convert inline image links [img:label](url) to clickable spans that open the
 * image in the in-app Lightbox (handled by `useMediaLinks`). The URL lives in a
 * data attribute so the auto-URL linker never touches it.
 */
export function convertImageLinks(text: string): string {
  const imageLinkRegex = /\[img:([^\]]+)\]\(([^)]+)\)/g;
  return text.replace(
    imageLinkRegex,
    '<span class="cat-image-link text-blue-600 hover:text-blue-800 underline cursor-pointer" data-media-url="$2">$1</span>'
  );
}

/**
 * Convert inline video links [video:label](url) to clickable spans that open the
 * video in the in-app VideoPlayer (YouTube or Storage, auto-detected).
 */
export function convertVideoLinks(text: string): string {
  const videoLinkRegex = /\[video:([^\]]+)\]\(([^)]+)\)/g;
  return text.replace(
    videoLinkRegex,
    '<span class="cat-video-link text-blue-600 hover:text-blue-800 underline cursor-pointer" data-media-url="$2">$1</span>'
  );
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
 * Process text with markdown links, cat modal links, and auto URL detection
 */
export function processTextWithLinks(text: string): string {
  if (!text) return text;

  // Convert the specific bracketed tokens FIRST, before the generic markdown-link
  // converter: [catmodal:name], [img:label](url) and [video:label](url) all share
  // the [label](url) shape, so the generic converter would otherwise capture them
  // as broken <a> links instead of the intended interactive spans.
  let processed = convertCatModalLinks(text);
  processed = convertImageLinks(processed);
  processed = convertVideoLinks(processed);

  // Then convert markdown-style links
  processed = convertMarkdownLinks(processed);

  // Then auto-detect remaining URLs (but avoid double-converting)
  // Split by existing HTML tags to avoid converting URLs inside href attributes
  const parts = processed.split(/(<a[^>]*>.*?<\/a>|<span[^>]*>.*?<\/span>)/gi);

  processed = parts
    .map((part, index) => {
      // Only process parts that are not already links or spans (odd indices are the tags)
      if (index % 2 === 0) {
        return autoLinkUrls(part);
      }
      return part;
    })
    .join('');

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
