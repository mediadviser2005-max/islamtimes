const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'span',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'font',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

const VOID_TAGS = new Set(['br', 'img', 'hr']);

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'text-align',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'direction',
  'width',
  'max-width',
  'border',
  'border-collapse',
  'padding',
  'margin',
]);

function isSafeUrl(raw: string, allowDataImage = false): boolean {
  const val = raw.trim();
  if (!val) return false;
  if (val.startsWith('/') && !val.startsWith('//')) return true;
  if (val.startsWith('#')) return true;
  const lower = val.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('mailto:')) {
    return true;
  }
  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(val)) {
    return true;
  }
  return false;
}

function sanitizeStyle(rawStyle: string): string {
  const parts = rawStyle.split(';');
  const safe: string[] = [];
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const val = part.slice(colonIdx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop) || !val) continue;
    if (/expression|javascript:|url\s*\(|@import/i.test(val)) continue;
    safe.push(`${prop}: ${val}`);
  }
  return safe.join('; ');
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return '';

  // Remove dangerous block elements along with their content
  let cleaned = html
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|meta|link)\b[^>]*\/?>/gi, '');

  // Filter tags and attributes using an explicit allowlist
  cleaned = cleaned.replace(/<\s*(\/?)\s*([a-zA-Z0-9-]+)([^>]*)>/g, (_full, slash: string, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }
    if (slash) {
      return VOID_TAGS.has(tag) ? '' : `</${tag}>`;
    }

    const attrsOut: string[] = [];
    const attrRegex = /([a-zA-Z0-9:-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let match: RegExpExecArray | null;

    let hasHref = false;
    while ((match = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = match[1].toLowerCase();
      const attrVal = match[2] ?? match[3] ?? match[4] ?? '';

      if (attrName.startsWith('on')) continue;

      if (attrName === 'style') {
        const safeStyle = sanitizeStyle(attrVal);
        if (safeStyle) attrsOut.push(`style="${escapeAttr(safeStyle)}"`);
      } else if (attrName === 'dir' && (attrVal === 'rtl' || attrVal === 'ltr' || attrVal === 'auto')) {
        attrsOut.push(`dir="${attrVal}"`);
      } else if (attrName === 'align' && /^(left|right|center|justify)$/i.test(attrVal)) {
        attrsOut.push(`align="${attrVal.toLowerCase()}"`);
      } else if (tag === 'a' && attrName === 'id' && /^[a-zA-Z0-9_-]+$/.test(attrVal)) {
        attrsOut.push(`id="${attrVal}"`);
      } else if (tag === 'a' && attrName === 'href') {
        if (isSafeUrl(attrVal, false)) {
          attrsOut.push(`href="${escapeAttr(attrVal.trim())}"`);
          hasHref = true;
        }
      } else if (tag === 'img' && attrName === 'src') {
        if (isSafeUrl(attrVal, true)) {
          attrsOut.push(`src="${escapeAttr(attrVal.trim())}"`);
        }
      } else if (tag === 'img' && (attrName === 'alt' || attrName === 'title')) {
        attrsOut.push(`${attrName}="${escapeAttr(attrVal)}"`);
      } else if ((tag === 'td' || tag === 'th') && (attrName === 'colspan' || attrName === 'rowspan')) {
        if (/^\d+$/.test(attrVal)) attrsOut.push(`${attrName}="${attrVal}"`);
      } else if (tag === 'font' && (attrName === 'color' || attrName === 'size')) {
        if (!/expression|javascript:|url\s*\(/i.test(attrVal)) {
          attrsOut.push(`${attrName}="${escapeAttr(attrVal)}"`);
        }
      }
    }

    if (tag === 'a' && hasHref) {
      attrsOut.push('target="_blank"', 'rel="noopener noreferrer"');
    }

    const attrStr = attrsOut.length > 0 ? ` ${attrsOut.join(' ')}` : '';
    return VOID_TAGS.has(tag) ? `<${tag}${attrStr} />` : `<${tag}${attrStr}>`;
  });

  return cleaned.trim();
}

export function isRichHtml(text: string): boolean {
  return /<\/?(p|div|span|strong|b|em|i|u|s|strike|sub|sup|h[1-4]|blockquote|ul|ol|li|a|img|br|hr|font|table|thead|tbody|tr|th|td)\b/i.test(
    text
  );
}

export function stripHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-4]|li|blockquote|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasRichBodyContent(html: string): boolean {
  if (!html) return false;
  if (/<img\b[^>]+src\s*=/i.test(html)) return true;
  return stripHtmlToText(html).length > 0;
}

export function normalizeSitePlainText(raw: string, singleLine = true): string {
  if (!raw) return '';
  const maybeStripped = /<[^>]+>/.test(raw) ? stripHtmlToText(raw) : raw;
  let cleaned = maybeStripped
    .replace(/\u00a0/g, ' ')
    .replace(/[\ufeff\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');

  if (singleLine) {
    cleaned = cleaned.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');
  } else {
    cleaned = cleaned
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t+/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }
  return cleaned.trim();
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const BLOCK_TAGS_ON_PASTE = new Set([
  'p',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'aside',
  'main',
  'nav',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'address',
  'figure',
  'figcaption',
  'blockquote',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'hr',
]);

const DROP_TAGS_ON_PASTE = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'meta',
  'link',
  'title',
  'head',
  'xml',
]);

function cleanClipboardText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\ufeff\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
}

function hasDirectOrDescendantBlock(el: Element): boolean {
  for (const child of Array.from(el.children)) {
    const tag = child.tagName.toLowerCase();
    if (BLOCK_TAGS_ON_PASTE.has(tag)) return true;
    if (hasDirectOrDescendantBlock(child)) return true;
  }
  return false;
}

function serializeNormalizedNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtmlText(cleanClipboardText(node.textContent || ''));
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (DROP_TAGS_ON_PASTE.has(tag) || tag.includes(':')) {
    return '';
  }

  if (tag === 'br') {
    return '<br />';
  }
  if (tag === 'hr') {
    return '<hr />';
  }
  if (tag === 'img') {
    const src = el.getAttribute('src') || '';
    if (!isSafeUrl(src, true)) return '';
    const alt = escapeAttr(cleanClipboardText(el.getAttribute('alt') || 'تصویر'));
    return `<img src="${escapeAttr(src.trim())}" alt="${alt}" />`;
  }

  const innerHtml = Array.from(el.childNodes).map(serializeNormalizedNode).join('');

  if (tag === 'a') {
    const href = (el.getAttribute('href') || '').trim();
    if (href && isSafeUrl(href, false)) {
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${innerHtml}</a>`;
    }
    return innerHtml;
  }

  if (tag === 'ul' || tag === 'ol') {
    return innerHtml.trim() ? `<${tag}>${innerHtml}</${tag}>` : '';
  }
  if (tag === 'li') {
    return innerHtml.trim() ? `<li>${innerHtml.trim()}</li>` : '';
  }
  if (tag === 'blockquote') {
    return innerHtml.trim() ? `<blockquote>${innerHtml.trim()}</blockquote>` : '';
  }
  if (tag === 'table') {
    return innerHtml.trim() ? `<table dir="rtl">${innerHtml}</table>` : '';
  }
  if (tag === 'thead' || tag === 'tbody' || tag === 'tr') {
    return innerHtml.trim() ? `<${tag}>${innerHtml}</${tag}>` : '';
  }
  if (tag === 'tfoot') {
    return innerHtml.trim() ? `<tbody>${innerHtml}</tbody>` : '';
  }
  if (tag === 'th' || tag === 'td') {
    const attrs: string[] = [];
    const colspan = el.getAttribute('colspan');
    const rowspan = el.getAttribute('rowspan');
    if (colspan && /^\d+$/.test(colspan)) attrs.push(`colspan="${colspan}"`);
    if (rowspan && /^\d+$/.test(rowspan)) attrs.push(`rowspan="${rowspan}"`);
    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    return `<${tag}${attrStr}>${innerHtml.trim() || '&nbsp;'}</${tag}>`;
  }

  if (/^(p|div|section|article|header|footer|aside|main|nav|h[1-6]|pre|address|figure|figcaption)$/.test(tag)) {
    const trimmed = innerHtml.trim();
    if (!trimmed) return '';
    if (hasDirectOrDescendantBlock(el)) {
      return innerHtml;
    }
    return `<p>${trimmed}</p>`;
  }

  // Unwrap all external inline formatting tags (span, font, b, strong, i, em, u, s, mark, etc.)
  // so pasted text automatically inherits the site's fixed font family, size, weight, and color.
  return innerHtml;
}

export function normalizePastedHtmlToSiteDefault(html: string, plainText = ''): string {
  const cleanedRawHtml = (html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:o|w|m|v):[^>]*>/gi, '')
    .trim();

  if (cleanedRawHtml && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(cleanedRawHtml, 'text/html');
      const result = Array.from(doc.body.childNodes)
        .map(serializeNormalizedNode)
        .join('')
        .replace(/(<p>\s*(?:<br\s*\/?>)?\s*<\/p>){2,}/gi, '')
        .trim();

      if (result) {
        // If the normalized result is a single <p>...</p> with no inner structural breaks,
        // unwrap it so mid-sentence paste flows seamlessly inside the current paragraph.
        const singleParagraphMatch = result.match(/^<p>([\s\S]*)<\/p>$/i);
        if (
          singleParagraphMatch &&
          !/<\/?(p|div|ul|ol|li|blockquote|table|h[1-6]|img|hr|br)\b/i.test(singleParagraphMatch[1])
        ) {
          return singleParagraphMatch[1].trim();
        }
        return result;
      }
    } catch {
      // Fallback to plain text normalization below
    }
  }

  const cleanText = cleanClipboardText(plainText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleanText.trim()) return '';

  const lines = cleanText.split('\n').map((l) => l.replace(/[ \t]{2,}/g, ' ').trim());
  const nonEmptyLines = lines.filter(Boolean);
  if (nonEmptyLines.length === 0) return '';

  if (nonEmptyLines.length === 1) {
    return escapeHtmlText(nonEmptyLines[0]);
  }

  return nonEmptyLines.map((line) => `<p>${escapeHtmlText(line)}</p>`).join('');
}

