import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks while preserving formatting
 */
export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  
  // Configure DOMPurify to allow common formatting tags and attributes
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'style', 'class',
      'align', 'color', 'background-color'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  };

  return DOMPurify.sanitize(html, config);
};

/**
 * Strip all HTML tags and return plain text
 */
export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  
  // Create a temporary div element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Truncate HTML content while preserving tags
 */
export const truncateHtml = (html: string | undefined | null, maxLength: number = 150): string => {
  if (!html) return '';
  
  const plainText = stripHtml(html);
  
  if (plainText.length <= maxLength) {
    return html;
  }
  
  // If we need to truncate, return truncated plain text with ellipsis
  return plainText.substring(0, maxLength) + '...';
};

/**
 * Check if HTML content is empty (no text content)
 */
export const isHtmlEmpty = (html: string | undefined | null): boolean => {
  if (!html) return true;
  
  const plainText = stripHtml(html).trim();
  return plainText.length === 0;
};
