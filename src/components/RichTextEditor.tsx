import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Clipboard,
  ClipboardType,
  Code2,
  Copy,
  Eraser,
  Eye,
  FileText,
  Flag,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Omega,
  Palette,
  Quote,
  Redo2,
  Replace,
  Scissors,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Underline,
  Undo2,
  Unlink,
  X,
} from 'lucide-react';
import { normalizePastedHtmlToSiteDefault, sanitizeRichHtml } from '../lib/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<{ url: string; name: string }>;
  placeholder?: string;
}

const TEXT_COLORS = [
  { label: 'مشکی', value: '#1c1917' },
  { label: 'قرمز خبری', value: '#d41a24' },
  { label: 'آبی تیره', value: '#0b5e85' },
  { label: 'سبز', value: '#15803d' },
  { label: 'نارنجی', value: '#d97706' },
  { label: 'بنفش', value: '#7e22ce' },
  { label: 'خاکستری', value: '#525252' },
];

const HIGHLIGHT_COLORS = [
  { label: 'بدون هایلایت', value: 'transparent' },
  { label: 'زرد', value: '#fef08a' },
  { label: 'آبی روشن', value: '#bae6fd' },
  { label: 'سبز روشن', value: '#bbf7d0' },
  { label: 'صورتی روشن', value: '#fecdd3' },
  { label: 'طوسی روشن', value: '#e5e5e5' },
];

const SPECIAL_CHARS = [
  '«', '»', '—', '–', '…', '•', '★', '✓', '✕', '©',
  '®', '™', '€', '£', '¥', '§', '¶', '°', '٪', '±',
  '×', '÷', '≠', '≈', '≤', '≥', '←', '→', '↑', '↓',
];

export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  placeholder = 'متن مطلب را اینجا بنویسید یا ویرایش کنید...',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isInternalChangeRef = useRef(false);

  const [sourceMode, setSourceMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const [activePopover, setActivePopover] = useState<
    null | 'color' | 'highlight' | 'link' | 'anchor' | 'image' | 'table' | 'special' | 'find' | 'pasteWord'
  >(null);

  const [customTextColor, setCustomTextColor] = useState('#d41a24');
  const [customHighlightColor, setCustomHighlightColor] = useState('#fef08a');

  // Link dialog state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [selectedTextPreview, setSelectedTextPreview] = useState('');

  // Anchor state
  const [anchorName, setAnchorName] = useState('');

  // Image dialog state
  const [inlineImageUrl, setInlineImageUrl] = useState('');
  const [inlineImageAlt, setInlineImageAlt] = useState('');
  const [inlineImageWidth, setInlineImageWidth] = useState('100%');
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);

  // Table dialog state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);

  // Find & Replace state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Paste from Word / Plain text fallback box
  const [pasteModeType, setPasteModeType] = useState<'plain' | 'word'>('word');
  const [pasteBuffer, setPasteBuffer] = useState('');

  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorStatus, setEditorStatus] = useState<string | null>(null);

  // Sync external value changes (e.g., resetArticleForm) into contentEditable
  useEffect(() => {
    if (sourceMode || previewMode) return;
    const el = editorRef.current;
    if (!el) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value, sourceMode, previewMode]);

  const showNotice = (msg: string) => {
    setEditorStatus(msg);
    setTimeout(() => {
      setEditorStatus((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChangeRef.current = true;
    onChange(el.innerHTML);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const runCmd = (command: string, val?: string) => {
    if (sourceMode || previewMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    saveSelection();
    emitChange();
  };

  const insertHtmlOrNodeAtCursor = (node: Node) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current?.appendChild(node);
    }
    saveSelection();
    emitChange();
  };

  const handleOpenPopover = (
    target: 'color' | 'highlight' | 'link' | 'anchor' | 'image' | 'table' | 'special' | 'find' | 'pasteWord'
  ) => {
    setEditorError(null);
    saveSelection();
    if (target === 'link') {
      const text = savedRangeRef.current?.toString().trim() || '';
      setSelectedTextPreview(text);
      setLinkText(text);
      setLinkUrl('');
    } else if (target === 'anchor') {
      setAnchorName('');
    } else if (target === 'image') {
      setInlineImageUrl('');
      setInlineImageAlt('');
      setInlineImageWidth('100%');
    } else if (target === 'pasteWord') {
      setPasteBuffer('');
    }
    setActivePopover((prev) => (prev === target ? null : target));
  };

  const handleApplyColor = (color: string) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    saveSelection();
    emitChange();
    setActivePopover(null);
  };

  const handleApplyHighlight = (color: string) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, color);
    saveSelection();
    emitChange();
    setActivePopover(null);
  };

  const normalizeHref = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleInsertLink = () => {
    const href = normalizeHref(linkUrl);
    if (!href) {
      setEditorError('لطفاً نشانی لینک را وارد کنید.');
      return;
    }

    restoreSelection();
    const sel = window.getSelection();
    const hasSelectedRange = Boolean(
      savedRangeRef.current && savedRangeRef.current.toString().trim().length > 0
    );

    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    if (hasSelectedRange && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const fragment = range.extractContents();
      anchor.appendChild(fragment);
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      anchor.textContent = linkText.trim() || href;
      insertHtmlOrNodeAtCursor(anchor);
    }

    saveSelection();
    emitChange();
    setActivePopover(null);
    setLinkUrl('');
    setLinkText('');
    setSelectedTextPreview('');
  };

  const handleInsertAnchor = () => {
    const cleanId = anchorName.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) {
      setEditorError('نام لنگر باید شامل حروف انگلیسی یا عدد باشد.');
      return;
    }
    const a = document.createElement('a');
    a.id = cleanId;
    a.textContent = `⚓ ${cleanId}`;
    a.style.color = '#0b5e85';
    insertHtmlOrNodeAtCursor(a);
    setActivePopover(null);
  };

  const insertImageAtCursor = (src: string, altText: string) => {
    restoreSelection();
    const img = document.createElement('img');
    img.src = src;
    img.alt = altText || 'تصویر داخل متن';
    if (inlineImageWidth && inlineImageWidth !== 'auto') {
      img.style.width = inlineImageWidth;
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const spacer = document.createElement('p');
      spacer.appendChild(document.createElement('br'));
      range.insertNode(spacer);
      range.insertNode(img);
      range.setStart(spacer, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current?.appendChild(img);
    }

    saveSelection();
    emitChange();
  };

  const handleInsertImageByUrl = () => {
    const cleanUrl = inlineImageUrl.trim();
    if (!cleanUrl) {
      setEditorError('لطفاً نشانی تصویر را وارد کنید یا فایلی را آپلود نمایید.');
      return;
    }
    insertImageAtCursor(cleanUrl, inlineImageAlt.trim());
    setActivePopover(null);
    setInlineImageUrl('');
    setInlineImageAlt('');
  };

  const handleUploadInlineImage = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setEditorError(null);
    setUploadingInlineImage(true);
    try {
      const uploaded = await onUploadImage(files[0]);
      insertImageAtCursor(uploaded.url, inlineImageAlt.trim() || uploaded.name);
      setActivePopover(null);
      setInlineImageUrl('');
      setInlineImageAlt('');
    } catch (err: unknown) {
      setEditorError(err instanceof Error ? err.message : 'آپلود تصویر داخل متن ناموفق بود.');
    } finally {
      setUploadingInlineImage(false);
    }
  };

  const handleInsertTable = () => {
    const rows = Math.max(1, Math.min(20, tableRows));
    const cols = Math.max(1, Math.min(12, tableCols));

    const table = document.createElement('table');
    table.dir = 'rtl';

    if (tableHasHeader) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        th.textContent = `ستون ${c + 1}`;
        tr.appendChild(th);
      }
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    const tbody = document.createElement('tbody');
    const bodyRows = tableHasHeader ? Math.max(1, rows - 1) : rows;
    for (let r = 0; r < bodyRows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const wrapper = document.createDocumentFragment();
    wrapper.appendChild(table);
    const afterP = document.createElement('p');
    afterP.appendChild(document.createElement('br'));
    wrapper.appendChild(afterP);

    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(wrapper);
      range.setStart(afterP, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current?.appendChild(wrapper);
    }
    saveSelection();
    emitChange();
    setActivePopover(null);
  };

  const handleInsertSpecialChar = (ch: string) => {
    insertHtmlOrNodeAtCursor(document.createTextNode(ch));
    setActivePopover(null);
  };

  const handleConvertDigitsToPersian = () => {
    if (sourceMode) {
      // Only convert text outside tags when in source mode
      const converted = value.replace(/(>[^<]*<)|(^[^<]+)|([^>]+$)/g, (seg) =>
        seg.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
      );
      onChange(converted);
      showNotice('اعداد متن به فارسی (۰ تا ۹) تبدیل شدند.');
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeValue) {
        node.nodeValue = node.nodeValue.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
      }
    }
    emitChange();
    showNotice('اعداد متن به فارسی (۰ تا ۹) تبدیل شدند.');
  };

  const insertNormalizedPasteHtml = (normalizedHtml: string, noticeMsg: string) => {
    if (!normalizedHtml) return;
    restoreSelection();
    document.execCommand('insertHTML', false, normalizedHtml);
    saveSelection();
    emitChange();
    showNotice(noticeMsg);
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (sourceMode || previewMode) return;
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html') || '';
    const text = e.clipboardData?.getData('text/plain') || '';
    const normalized = normalizePastedHtmlToSiteDefault(html, text);
    if (!normalized) return;
    document.execCommand('insertHTML', false, normalized);
    saveSelection();
    emitChange();
    showNotice('متن با قلم و اندازه پیش‌فرض سایت همسان‌سازی شد.');
  };

  const handleClipboardPaste = async (mode: 'normal' | 'plain' | 'word') => {
    try {
      if (mode === 'plain' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const normalized = normalizePastedHtmlToSiteDefault('', text);
        if (normalized) {
          insertNormalizedPasteHtml(normalized, 'متن با قلم و اندازه پیش‌فرض سایت چسبانده شد.');
          return;
        }
      } else if ((mode === 'word' || mode === 'normal') && navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        let html = '';
        let plain = '';
        for (const item of items) {
          if (!html && item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            html = await blob.text();
          }
          if (!plain && item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            plain = await blob.text();
          }
        }
        const normalized = normalizePastedHtmlToSiteDefault(html, plain);
        if (normalized) {
          insertNormalizedPasteHtml(normalized, 'متن با قلم و اندازه پیش‌فرض سایت همسان‌سازی شد.');
          return;
        }
      } else if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const normalized = normalizePastedHtmlToSiteDefault('', text);
        if (normalized) {
          insertNormalizedPasteHtml(normalized, 'متن با قلم و اندازه پیش‌فرض سایت چسبانده شد.');
          return;
        }
      }
    } catch {
      // Clipboard API permission blocked in iframe; open fallback paste box
    }
    setPasteModeType(mode === 'plain' ? 'plain' : 'word');
    handleOpenPopover('pasteWord');
  };

  const handleApplyFallbackPaste = () => {
    if (!pasteBuffer.trim()) {
      setActivePopover(null);
      return;
    }
    const normalized =
      pasteModeType === 'plain'
        ? normalizePastedHtmlToSiteDefault('', pasteBuffer)
        : normalizePastedHtmlToSiteDefault(pasteBuffer, pasteBuffer);
    if (normalized) {
      insertNormalizedPasteHtml(normalized, 'متن با قلم و اندازه پیش‌فرض سایت درج شد.');
    }
    setPasteBuffer('');
    setActivePopover(null);
  };

  const handleFindNext = () => {
    if (!findText) return;
    const win = window as Window & {
      find?: (
        str: string,
        caseSensitive?: boolean,
        backwards?: boolean,
        wrapAround?: boolean
      ) => boolean;
    };
    editorRef.current?.focus();
    if (typeof win.find === 'function') {
      const found = win.find(findText, false, false, true);
      if (!found) setEditorError('عبارت مورد نظر یافت نشد.');
      else setEditorError(null);
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const el = editorRef.current;
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let count = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.includes(findText)) {
        const parts = node.nodeValue.split(findText);
        count += parts.length - 1;
        node.nodeValue = parts.join(replaceText);
      }
    }
    emitChange();
    showNotice(count > 0 ? `${count} مورد جایگزین شد.` : 'موردی یافت نشد.');
  };

  const handleSelectAll = () => {
    if (sourceMode) return;
    editorRef.current?.focus();
    document.execCommand('selectAll');
    saveSelection();
  };

  const handleSetDirection = (dir: 'rtl' | 'ltr') => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLElement && /^(P|DIV|H[1-6]|BLOCKQUOTE|LI)$/.test(node.tagName)) {
          node.dir = dir;
          node.style.textAlign = dir === 'rtl' ? 'right' : 'left';
          emitChange();
          return;
        }
        node = node.parentNode;
      }
    }
    runCmd(dir === 'rtl' ? 'justifyRight' : 'justifyLeft');
  };

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>' || value === '<div><br></div>';

  const toolbarBtnClass =
    'p-1 rounded hover:bg-white border border-transparent hover:border-neutral-300 text-neutral-700 hover:text-neutral-950 cursor-pointer transition-colors disabled:opacity-40';

  return (
    <div
      className={
        maximized
          ? 'fixed inset-3 z-50 bg-white rounded-lg shadow-2xl border border-neutral-400 flex flex-col p-3'
          : 'space-y-0'
      }
    >
      {/* Header Row: "متن" Label + Complete 2-Row CKEditor-Style Toolbar */}
      <div className="bg-[#f3f3f3] border border-neutral-300 rounded-t-md px-2.5 py-2 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <label className="text-[11px] font-bold text-neutral-800 shrink-0">
              متن
            </label>
            <span className="text-[10px] text-neutral-500">
              (متن‌های کپی‌شده خودکار به قلم و اندازه سایت تبدیل می‌شوند و فقط در این بخش قابل ویرایش هستند)
            </span>
          </div>
          {editorStatus && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
              {editorStatus}
            </span>
          )}
        </div>

        {/* ROW 1: Source, Preview | Cut, Copy, Paste, Paste Plain, Paste Word | Undo, Redo, Find, Replace, SelectAll, RemoveFormat | Link, Unlink, Anchor | Image, Table, SpecialChar | B, I, U, S, Sub, Sup */}
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="نوار ابزار ردیف اول">
          {/* Group 1: Source & Preview */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setPreviewMode(false);
                setSourceMode((s) => !s);
                setActivePopover(null);
              }}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                sourceMode
                  ? 'bg-[#0b5e85] text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              title="نمایش و ویرایش کد منبع HTML"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>منبع</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSourceMode(false);
                setPreviewMode((p) => !p);
                setActivePopover(null);
              }}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                previewMode
                  ? 'bg-emerald-700 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              title="پیش‌نمایش متن نهایی"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 2: Clipboard (Cut, Copy, Paste, Paste Plain, Paste from Word) */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('cut');
              }}
              className={toolbarBtnClass}
              title="برش (Cut)"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('copy');
              }}
              className={toolbarBtnClass}
              title="کپی (Copy)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
                handleClipboardPaste('normal');
              }}
              className={toolbarBtnClass}
              title="چسباندن (Paste)"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
                handleClipboardPaste('plain');
              }}
              className={toolbarBtnClass}
              title="چسباندن به‌عنوان متن ساده"
            >
              <ClipboardType className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
                handleClipboardPaste('word');
              }}
              className={toolbarBtnClass}
              title="چسباندن از Word (حذف قالب‌بندی اضافی ورد)"
            >
              <FileText className="w-3.5 h-3.5 text-[#0b5e85]" />
            </button>
          </div>

          {/* Group 3: Undo/Redo, Find/Replace, SelectAll, RemoveFormat */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('redo');
              }}
              className={toolbarBtnClass}
              title="تکرار (Redo)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('undo');
              }}
              className={toolbarBtnClass}
              title="بازگشت (Undo)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <span className="h-3.5 w-px bg-neutral-300 mx-0.5" />
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('find');
              }}
              className={`${toolbarBtnClass} ${activePopover === 'find' ? 'bg-sky-100 text-[#0b5e85]' : ''}`}
              title="جست‌وجو و جایگزینی در متن"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('find');
              }}
              className={toolbarBtnClass}
              title="جایگزینی عبارت (Replace)"
            >
              <Replace className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectAll();
              }}
              className={toolbarBtnClass}
              title="انتخاب همه (Select All)"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('removeFormat');
              }}
              className={toolbarBtnClass}
              title="پاک کردن قالب‌بندی (Remove Format)"
            >
              <Eraser className="w-3.5 h-3.5 text-sky-700" />
            </button>
          </div>

          {/* Group 4: Link, Unlink, Anchor */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('link');
              }}
              className={`${toolbarBtnClass} ${activePopover === 'link' ? 'bg-[#0b5e85] text-white' : 'text-[#0b5e85]'}`}
              title="درج لینک یا لینک‌دار کردن متن انتخاب‌شده"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('unlink');
              }}
              className={toolbarBtnClass}
              title="حذف لینک"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('anchor');
              }}
              className={`${toolbarBtnClass} ${activePopover === 'anchor' ? 'bg-sky-100 text-[#0b5e85]' : ''}`}
              title="درج لنگر (Anchor)"
            >
              <Flag className="w-3.5 h-3.5 text-sky-700" />
            </button>
          </div>

          {/* Group 5: Image in Body, Table, Special Chars */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('image');
              }}
              className={`${toolbarBtnClass} ${activePopover === 'image' ? 'bg-emerald-700 text-white' : 'text-emerald-700'}`}
              title="ضمیمه کردن تصویر داخل متن"
            >
              <ImagePlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('table');
              }}
              className={`${toolbarBtnClass} ${activePopover === 'table' ? 'bg-sky-100 text-[#0b5e85]' : ''}`}
              title="درج جدول داخل متن"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('special');
              }}
              className={`${toolbarBtnClass} ${activePopover === 'special' ? 'bg-sky-100 text-[#0b5e85]' : 'text-indigo-700'}`}
              title="درج کاراکتر و نماد ویژه"
            >
              <Omega className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 6: B, I, U, S, Subscript, Superscript */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('bold');
              }}
              className={toolbarBtnClass}
              title="ضخیم (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('italic');
              }}
              className={toolbarBtnClass}
              title="مورب (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('underline');
              }}
              className={toolbarBtnClass}
              title="زیرخط (Underline)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('strikeThrough');
              }}
              className={toolbarBtnClass}
              title="خط‌خورده"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <span className="h-3.5 w-px bg-neutral-300 mx-0.5" />
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('subscript');
              }}
              className={toolbarBtnClass}
              title="زیرنویس (x₂)"
            >
              <Subscript className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('superscript');
              }}
              className={toolbarBtnClass}
              title="بالانویس (x²)"
            >
              <Superscript className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ROW 2: Alignments, Lists, Quote, RTL/LTR | Format (قالب) & Font Size | Text Color, Highlight, Maximize | 2→۲ Persian Digits */}
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="نوار ابزار ردیف دوم">
          {/* Group 7: Alignments & Lists & Quote & Direction */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('justifyRight');
              }}
              className={toolbarBtnClass}
              title="راست‌چین"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('justifyCenter');
              }}
              className={toolbarBtnClass}
              title="وسط‌چین"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('justifyLeft');
              }}
              className={toolbarBtnClass}
              title="چپ‌چین"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('justifyFull');
              }}
              className={toolbarBtnClass}
              title="تراز دوطرفه (Justify)"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
            <span className="h-3.5 w-px bg-neutral-300 mx-0.5" />
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('insertUnorderedList');
              }}
              className={toolbarBtnClass}
              title="فهرست نقطه‌ای"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('insertOrderedList');
              }}
              className={toolbarBtnClass}
              title="فهرست شماره‌دار"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                runCmd('formatBlock', 'BLOCKQUOTE');
              }}
              className={toolbarBtnClass}
              title="نقل‌قول"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <span className="h-3.5 w-px bg-neutral-300 mx-0.5" />
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSetDirection('rtl');
              }}
              className="px-1 py-0.5 rounded hover:bg-white text-[10px] font-bold text-neutral-700 cursor-pointer"
              title="جهت راست‌به‌چپ (RTL)"
            >
              RTL
            </button>
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSetDirection('ltr');
              }}
              className="px-1 py-0.5 rounded hover:bg-white text-[10px] font-bold text-neutral-700 cursor-pointer"
              title="جهت چپ‌به‌راست (LTR)"
            >
              LTR
            </button>
          </div>

          {/* Group 8: Format (قالب) & Font Size */}
          <div className="inline-flex items-center gap-1">
            <select
              aria-label="قالب"
              disabled={sourceMode || previewMode}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  runCmd('formatBlock', e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 cursor-pointer shadow-2xs"
            >
              <option value="">قالب</option>
              <option value="P">متن عادی</option>
              <option value="H1">تیتر ۱</option>
              <option value="H2">تیتر ۲</option>
              <option value="H3">تیتر ۳</option>
              <option value="H4">تیتر ۴</option>
              <option value="BLOCKQUOTE">نقل‌قول</option>
            </select>

            <select
              aria-label="اندازه قلم"
              disabled={sourceMode || previewMode}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  runCmd('fontSize', e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 cursor-pointer shadow-2xs"
            >
              <option value="">اندازه قلم</option>
              <option value="2">کوچک</option>
              <option value="3">عادی</option>
              <option value="4">متوسط</option>
              <option value="5">بزرگ</option>
              <option value="6">خیلی بزرگ</option>
            </select>
          </div>

          {/* Group 9: Text Color (A), Highlight Color, Maximize */}
          <div className="inline-flex items-center gap-0.5 bg-white/90 border border-neutral-300 rounded px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('color');
              }}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                activePopover === 'color' ? 'bg-sky-100 text-[#0b5e85]' : 'hover:bg-neutral-100'
              }`}
              title="رنگی کردن متن"
            >
              <span className="border-b-2 border-[#d41a24] leading-none px-0.5">A</span>
              <Palette className="w-3 h-3 text-neutral-600" />
            </button>

            <button
              type="button"
              disabled={sourceMode || previewMode}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenPopover('highlight');
              }}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                activePopover === 'highlight' ? 'bg-amber-100 text-amber-900' : 'hover:bg-neutral-100'
              }`}
              title="رنگ پس‌زمینه متن"
            >
              <span className="bg-amber-300 px-1 rounded-2xs leading-tight text-neutral-900">A</span>
              <Highlighter className="w-3 h-3 text-neutral-600" />
            </button>

            <span className="h-3.5 w-px bg-neutral-300 mx-0.5" />

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMaximized((m) => !m);
              }}
              className={toolbarBtnClass}
              title={maximized ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه کردن ویرایشگر'}
            >
              {maximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-[#0b5e85]" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Group 10: 2→۲ Persian Digit Converter */}
          <button
            type="button"
            disabled={previewMode}
            onMouseDown={(e) => {
              e.preventDefault();
              handleConvertDigitsToPersian();
            }}
            className="inline-flex items-center gap-0.5 bg-white/90 hover:bg-white border border-neutral-300 rounded px-2 py-0.5 text-[11px] font-bold text-neutral-800 cursor-pointer shadow-2xs"
            title="تبدیل تمام اعداد انگلیسی به فارسی (2→۲)"
          >
            <span className="font-mono">2</span>
            <span className="text-[#d41a24] text-[10px]">←</span>
            <span>۲</span>
          </button>
        </div>
      </div>

      {/* Inline Tool Popovers */}
      {activePopover === 'color' && (
        <div className="bg-sky-50/70 border-x border-b border-neutral-300 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-neutral-700">رنگ متن:</span>
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleApplyColor(c.value);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer"
            >
              <span
                className="w-3 h-3 rounded-full border border-neutral-300"
                style={{ backgroundColor: c.value }}
              />
              <span>{c.label}</span>
            </button>
          ))}
          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-300 bg-white cursor-pointer">
            <span>دلخواه:</span>
            <input
              type="color"
              value={customTextColor}
              onChange={(e) => {
                setCustomTextColor(e.target.value);
                handleApplyColor(e.target.value);
              }}
              className="w-5 h-4 cursor-pointer border-0 p-0 bg-transparent"
            />
          </label>
          <button
            type="button"
            onClick={() => setActivePopover(null)}
            className="mr-auto text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activePopover === 'highlight' && (
        <div className="bg-amber-50/70 border-x border-b border-neutral-300 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-neutral-700">رنگ پس‌زمینه:</span>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleApplyHighlight(c.value);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer"
            >
              <span
                className="w-3 h-3 rounded border border-neutral-300"
                style={{ backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value }}
              />
              <span>{c.label}</span>
            </button>
          ))}
          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-300 bg-white cursor-pointer">
            <span>دلخواه:</span>
            <input
              type="color"
              value={customHighlightColor}
              onChange={(e) => {
                setCustomHighlightColor(e.target.value);
                handleApplyHighlight(e.target.value);
              }}
              className="w-5 h-4 cursor-pointer border-0 p-0 bg-transparent"
            />
          </label>
          <button
            type="button"
            onClick={() => setActivePopover(null)}
            className="mr-auto text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activePopover === 'link' && (
        <div className="bg-sky-50/80 border-x border-b border-neutral-300 px-3 py-2.5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#0b5e85]">
              {selectedTextPreview
                ? `لینک‌دار کردن متن انتخاب‌شده: «${selectedTextPreview}»`
                : 'درج لینک جدید در متن'}
            </span>
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!selectedTextPreview && (
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="متن نمایشی لینک"
                className="rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs"
              />
            )}
            <div className={`flex items-center gap-2 ${selectedTextPreview ? 'sm:col-span-2' : ''}`}>
              <input
                type="text"
                dir="ltr"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-3 py-1.5 rounded bg-[#0b5e85] hover:bg-[#084867] text-white font-bold cursor-pointer shrink-0"
              >
                اعمال لینک
              </button>
            </div>
          </div>
          {editorError && <p className="text-[#d41a24] font-medium">{editorError}</p>}
        </div>
      )}

      {activePopover === 'anchor' && (
        <div className="bg-sky-50/80 border-x border-b border-neutral-300 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-bold text-[#0b5e85]">نام لنگر (Anchor):</span>
          <input
            type="text"
            dir="ltr"
            value={anchorName}
            onChange={(e) => setAnchorName(e.target.value)}
            placeholder="section-1"
            className="w-44 rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-mono"
          />
          <button
            type="button"
            onClick={handleInsertAnchor}
            className="px-3 py-1 rounded bg-[#0b5e85] text-white font-bold cursor-pointer"
          >
            درج لنگر
          </button>
          {editorError && <span className="text-[#d41a24]">{editorError}</span>}
          <button
            type="button"
            onClick={() => setActivePopover(null)}
            className="mr-auto text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activePopover === 'image' && (
        <div className="bg-emerald-50/70 border-x border-b border-neutral-300 px-3 py-2.5 space-y-2 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-emerald-800">ضمیمه کردن تصویر در محل نشانگر</span>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer">
                {uploadingInlineImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
                <span>{uploadingInlineImage ? 'در حال آپلود...' : 'آپلود تصویر از سیستم'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingInlineImage}
                  onChange={(e) => {
                    handleUploadInlineImage(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setActivePopover(null)}
                className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px_auto] gap-2">
            <input
              type="text"
              dir="ltr"
              value={inlineImageUrl}
              onChange={(e) => setInlineImageUrl(e.target.value)}
              placeholder="https://... نشانی مستقیم تصویر"
              className="rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono"
            />
            <input
              type="text"
              value={inlineImageAlt}
              onChange={(e) => setInlineImageAlt(e.target.value)}
              placeholder="توضیح تصویر (اختیاری)"
              className="rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs"
            />
            <select
              value={inlineImageWidth}
              onChange={(e) => setInlineImageWidth(e.target.value)}
              className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs"
              title="عرض تصویر"
            >
              <option value="100%">عرض ۱۰۰٪</option>
              <option value="75%">عرض ۷۵٪</option>
              <option value="50%">عرض ۵۰٪</option>
              <option value="auto">اندازه اصلی</option>
            </select>
            <button
              type="button"
              onClick={handleInsertImageByUrl}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-900 text-white font-bold cursor-pointer"
            >
              درج تصویر
            </button>
          </div>
          {editorError && <p className="text-[#d41a24] font-medium">{editorError}</p>}
        </div>
      )}

      {activePopover === 'table' && (
        <div className="bg-neutral-50 border-x border-b border-neutral-300 px-3 py-2.5 flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-bold text-neutral-800">درج جدول:</span>
          <label className="inline-flex items-center gap-1.5">
            <span>سطرها:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={tableRows}
              onChange={(e) => setTableRows(Number(e.target.value) || 2)}
              className="w-14 rounded border border-neutral-300 bg-white px-2 py-1 text-center font-mono"
            />
          </label>
          <label className="inline-flex items-center gap-1.5">
            <span>ستون‌ها:</span>
            <input
              type="number"
              min={1}
              max={12}
              value={tableCols}
              onChange={(e) => setTableCols(Number(e.target.value) || 2)}
              className="w-14 rounded border border-neutral-300 bg-white px-2 py-1 text-center font-mono"
            />
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tableHasHeader}
              onChange={(e) => setTableHasHeader(e.target.checked)}
            />
            <span>ردیف سرستون</span>
          </label>
          <button
            type="button"
            onClick={handleInsertTable}
            className="px-3 py-1 rounded bg-[#0b5e85] hover:bg-[#084867] text-white font-bold cursor-pointer"
          >
            ایجاد جدول
          </button>
          <button
            type="button"
            onClick={() => setActivePopover(null)}
            className="mr-auto text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activePopover === 'special' && (
        <div className="bg-neutral-50 border-x border-b border-neutral-300 px-3 py-2.5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-800">انتخاب کاراکتر ویژه:</span>
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {SPECIAL_CHARS.map((ch) => (
              <button
                key={ch}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertSpecialChar(ch);
                }}
                className="w-7 h-7 rounded border border-neutral-300 bg-white hover:bg-[#0b5e85] hover:text-white font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePopover === 'find' && (
        <div className="bg-neutral-50 border-x border-b border-neutral-300 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="عبارت جست‌وجو..."
            className="w-40 rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs"
          />
          <button
            type="button"
            onClick={handleFindNext}
            className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-semibold cursor-pointer"
          >
            جست‌وجو
          </button>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="جایگزین با..."
            className="w-40 rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs"
          />
          <button
            type="button"
            onClick={handleReplaceAll}
            className="px-2.5 py-1 rounded bg-[#0b5e85] text-white font-semibold cursor-pointer"
          >
            جایگزینی همه
          </button>
          {editorError && <span className="text-[#d41a24]">{editorError}</span>}
          <button
            type="button"
            onClick={() => setActivePopover(null)}
            className="mr-auto text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activePopover === 'pasteWord' && (
        <div className="bg-sky-50/70 border-x border-b border-neutral-300 px-3 py-2.5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#0b5e85]">
              {pasteModeType === 'plain'
                ? 'متن خود را برای چسباندن ساده اینجا Paste (Ctrl+V) کنید:'
                : 'متن کپی‌شده از Word را اینجا Paste (Ctrl+V) کنید:'}
            </span>
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            rows={3}
            value={pasteBuffer}
            onChange={(e) => setPasteBuffer(e.target.value)}
            onPaste={(e) => {
              if (pasteModeType === 'word') {
                const html = e.clipboardData?.getData('text/html') || '';
                const text = e.clipboardData?.getData('text/plain') || '';
                const normalized = normalizePastedHtmlToSiteDefault(html, text);
                if (normalized) {
                  e.preventDefault();
                  setPasteBuffer(normalized);
                }
              }
            }}
            placeholder="Ctrl+V..."
            className="w-full rounded border border-neutral-300 bg-white p-2 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleApplyFallbackPaste}
              className="px-3 py-1 rounded bg-[#0b5e85] text-white font-bold cursor-pointer"
            >
              درج در متن
            </button>
          </div>
        </div>
      )}

      {/* Editor Body: Source HTML Mode | Preview Mode | Visual Word-Style Surface */}
      {sourceMode ? (
        <textarea
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<p>...</p>"
          className={`w-full rounded-b-md border border-t-0 border-neutral-300 bg-neutral-950 text-emerald-300 p-3.5 text-xs font-mono focus:outline-none ${
            maximized ? 'flex-1' : 'min-h-[260px]'
          }`}
        />
      ) : previewMode ? (
        <div
          dir="rtl"
          className={`rich-article-body w-full rounded-b-md border border-t-0 border-neutral-300 bg-neutral-50 p-4 text-[15px] leading-8 text-neutral-800 overflow-y-auto ${
            maximized ? 'flex-1' : 'min-h-[260px] max-h-[540px]'
          }`}
          dangerouslySetInnerHTML={{
            __html: sanitizeRichHtml(value) || '<p class="text-neutral-400">متنی برای پیش‌نمایش وجود ندارد.</p>',
          }}
        />
      ) : (
        <div className={`relative ${maximized ? 'flex-1 flex flex-col min-h-0' : ''}`}>
          {isEmpty && (
            <div className="pointer-events-none absolute top-3.5 right-3.5 text-[15px] leading-8 text-neutral-400">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dir="rtl"
            onPaste={handleEditorPaste}
            onInput={emitChange}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onBlur={saveSelection}
            className={`rich-article-body w-full rounded-b-md border border-t-0 border-neutral-300 bg-white p-3.5 text-[15px] leading-8 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0b5e85]/30 focus:border-[#0b5e85] overflow-y-auto ${
              maximized ? 'flex-1' : 'min-h-[260px] max-h-[540px]'
            }`}
          />
        </div>
      )}
    </div>
  );
}
