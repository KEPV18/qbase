// ============================================================================
// QBase — XSS Sanitization Utilities
// Safe rendering of user-generated content (form_data, wysiwyg, etc.)
// No dangerouslySetInnerHTML anywhere. All values escape-then-render.
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS injection.
 * This is a pure JS approach — no DOMPurify needed for simple text values.
 * Use sanitizeHtml() below for rich-text (TipTap HTML) that is allowed
 * to contain safe markup like <b>, <i>, <ul>, <p>.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip ALL HTML tags — returns plain text only.
 * Use this for search previews, tooltips, table cells, and anywhere
 * HTML rendering is not intentional.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  // Remove script/style tags first (defense in depth)
  let cleaned = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove all remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Decode common entities
  cleaned = cleaned.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return cleaned.trim();
}

/**
 * Lightweight HTML sanitizer — allows ONLY safe TipTap-generated tags.
 * Any unexpected tag or attribute is stripped.
 *
 * Allowed tags: p, br, ul, ol, li, strong, b, em, i, u, s, strike,
 *               h1-h6, blockquote, pre, code, div, span
 * Allowed attributes: class, style (very limited)
 *
 * Use this when rendering RichTextField (TipTap) output.
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
  's', 'strike', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code', 'div', 'span',
]);

const ALLOWED_ATTRS = new Set(['class', 'style']);

export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // First: strip dangerous tags entirely (script, iframe, object, embed, etc.)
  let cleaned = input.replace(/<(script|iframe|object|embed|form|input|textarea|button|select)[^>]*>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<(script|iframe|object|embed|form|input|textarea|button|select)[^>]*\/?>/gi, '');

  // Second: strip event handlers and javascript: URLs from any tag
  cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+on\w+='[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+on\w+=[^\s>]+/gi, '');
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/data:text\/html/gi, '');

  // Third: parse and filter allowed tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${cleaned}</div>`, 'text/html');
  const root = doc.body.firstChild as HTMLElement;
  if (!root) return '';

  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed tag with its text content
      return document.createTextNode(el.textContent || '');
    }

    const safe = document.createElement(tag);
    Array.from(el.attributes).forEach(attr => {
      if (ALLOWED_ATTRS.has(attr.name)) {
        // Extra validation for style attribute: block dangerous CSS
        if (attr.name === 'style') {
          const safeStyles = attr.value.split(';').filter(s => {
            const prop = s.trim().split(':')[0]?.trim().toLowerCase();
            // Block expression, behavior, binding, javascript
            return prop && !/expression|behavior|javascript|binding/.test(prop);
          }).join(';');
          if (safeStyles) safe.setAttribute('style', safeStyles);
        } else {
          safe.setAttribute(attr.name, attr.value);
        }
      }
    });

    Array.from(el.childNodes).forEach(child => {
      const sanitized = sanitizeNode(child);
      if (sanitized) safe.appendChild(sanitized);
    });

    return safe;
  }

  const result = document.createElement('div');
  Array.from(root.childNodes).forEach(child => {
    const sanitized = sanitizeNode(child);
    if (sanitized) result.appendChild(sanitized);
  });

  return result.innerHTML;
}

/**
 * React-safe value formatter — never renders raw HTML.
 * Returns a plain string. Callers should render inside a <span> or <div>.
 */
export function safeValue(input: unknown): string {
  if (input === undefined || input === null) return '';
  if (typeof input === 'string') return stripHtml(input);
  if (typeof input === 'number') return String(input);
  if (typeof input === 'boolean') return input ? 'Yes' : 'No';
  if (Array.isArray(input)) return input.map(v => safeValue(v)).join(', ');
  return stripHtml(String(input));
}
