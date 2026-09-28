// ============================================================================
// SafeHtmlContent — Renders sanitized HTML safely
// Only renders HTML if the input actually contains HTML tags (TipTap output).
// Plain text falls back to normal string rendering.
// ============================================================================

import React from 'react';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
  's', 'strike', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code', 'div', 'span',
]);

const ALLOWED_ATTRS = new Set(['class', 'style']);

function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Strip script/iframe/object/embed/form tags entirely
  let cleaned = input.replace(/<(script|iframe|object|embed|form|input|textarea|button|select)[^>]*>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<(script|iframe|object|embed|form|input|textarea|button|select)[^>]*\/?>/gi, '');

  // Strip event handlers and javascript: URLs
  cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+on\w+='[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+on\w+=[^\s>]+/gi, '');
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/data:text\/html/gi, '');

  // Parse and filter through DOMParser
  try {
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
        return document.createTextNode(el.textContent || '');
      }

      const safe = document.createElement(tag);
      Array.from(el.attributes).forEach(attr => {
        if (ALLOWED_ATTRS.has(attr.name)) {
          if (attr.name === 'style') {
            const safeStyles = attr.value.split(';').filter(s => {
              const prop = s.trim().split(':')[0]?.trim().toLowerCase();
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
  } catch {
    // Fallback: strip all tags if DOMParser fails
    return cleaned.replace(/<[^>]+>/g, '');
  }
}

/** Returns true if string contains HTML tags (TipTap output) */
function containsHtml(input: string): boolean {
  return /<[a-z][\s\S]*>/i.test(input);
}

interface SafeHtmlContentProps {
  html: string;
  className?: string;
}

export const SafeHtmlContent: React.FC<SafeHtmlContentProps> = ({ html, className }) => {
  if (!html) return <span className="text-muted-foreground italic text-sm">—</span>;

  // If no HTML tags, render as plain text with whitespace preservation
  if (!containsHtml(html)) {
    return (
      <div className={`text-foreground whitespace-pre-wrap text-sm leading-relaxed ${className || ''}`}>
        {html}
      </div>
    );
  }

  // Sanitize and render as HTML
  const sanitized = sanitizeHtml(html);
  return (
    <div
      className={`prose prose-sm max-w-none text-foreground text-sm leading-relaxed ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

export default SafeHtmlContent;
