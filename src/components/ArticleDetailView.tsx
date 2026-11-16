import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageSquare,
  Paperclip,
  Printer,
  Share2,
  ThumbsDown,
  ThumbsUp,
  User,
  Video,
  X,
} from 'lucide-react';

import {
  Article,
  ArticleAttachment,
  ArticleGalleryItem,
  ArticleVideoItem,
  CommentItem,
  CustomShareChannel,
  DEFAULT_SHARE_CHANNELS,
  MenuConfig,
  SECTION_LABELS,
  SectionKey,
  isBreakingArticleType,
  parseJsonArray,
  parseTags,
  toPersianDigits,
} from '../types/news';
import { isRichHtml, sanitizeRichHtml, stripHtmlToText } from '../lib/richText';
import { SafeImage } from './SafeImage';
import { SectionHeader } from './SectionHeader';

const SIDEBAR_POSTER = '/src/assets/images/editorial_sidebar_poster_1794648751792.jpg';

interface ArticleDetailViewProps {
  article: Article;
  comments: CommentItem[];
  allArticles: Article[];
  menuConfig?: MenuConfig;
  shareChannels?: CustomShareChannel[];
  onSelectArticle: (article: Article) => void;
  onSelectSection: (section: SectionKey, subsection?: string | null) => void;
  onSelectArticleType?: (articleType: string) => void;
  onArticleUpdated: (updated: Article) => void;
  onCommentAdded: (comment: CommentItem) => void;
  onCommentUpdated: (comment: CommentItem) => void;
  onTagClick: (tag: string) => void;
}

export function ArticleDetailView({
  article,
  comments,
  allArticles,
  menuConfig,
  shareChannels,
  onSelectArticle,
  onSelectSection,
  onSelectArticleType,
  onArticleUpdated,
  onCommentAdded,
  onCommentUpdated,
  onTagClick,
}: ArticleDetailViewProps) {
  const [fontSize, setFontSize] = useState(15);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [likedLocal, setLikedLocal] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShareMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [shareMenuOpen]);

  const tags = parseTags(article.tags);
  const attachments = parseJsonArray<ArticleAttachment>(article.attachments);
  const galleryImages = parseJsonArray<ArticleGalleryItem>(article.galleryImages);
  const videos = parseJsonArray<ArticleVideoItem>(article.videos);
  const shortUrl = `${window.location.origin}/?code=${article.code}`;
  const richBody = isRichHtml(article.body);
  const sanitizedBodyHtml = richBody ? sanitizeRichHtml(article.body) : '';
  const plainBodyText = richBody ? stripHtmlToText(article.body) : article.body;
  const paragraphs = richBody ? [] : article.body.split('\n\n').filter(Boolean);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
    return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  };

  const latestHeadlines = allArticles.filter((a) => a.id !== article.id).slice(0, 8);
  const mostViewed = [...allArticles]
    .filter((a) => a.id !== article.id)
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);
  const relatedArticles = allArticles
    .filter((a) => a.id !== article.id)
    .slice(0, 6);

  const normalizeTag = (value: string) =>
    value
      .trim()
      .replace(/^#+/, '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\u200c+/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();

  const TAG_STOP_WORDS = new Set(['و', 'در', 'به', 'از', 'با', 'برای', 'بر', 'تا', 'های', 'ها']);

  const extractTagTokens = (tag: string) =>
    normalizeTag(tag)
      .split(/[\s\-_/]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && !TAG_STOP_WORDS.has(w));

  const currentTagEntries = tags.map((raw) => ({
    raw,
    norm: normalizeTag(raw),
    tokens: extractTagTokens(raw),
  }));

  const suggestedArticles = allArticles
    .filter((candidate) => candidate.id !== article.id)
    .map((candidate) => {
      const candidateTags = parseTags(candidate.tags);
      const exactMatched: string[] = [];
      const partialMatched: string[] = [];

      for (const candRaw of candidateTags) {
        const candNorm = normalizeTag(candRaw);
        if (!candNorm) continue;

        const isExact = currentTagEntries.some((curr) => curr.norm === candNorm);
        if (isExact) {
          if (!exactMatched.includes(candRaw)) exactMatched.push(candRaw);
          continue;
        }

        const candTokens = extractTagTokens(candRaw);
        const isPartial = currentTagEntries.some((curr) => {
          if (!curr.norm) return false;
          if (curr.norm.includes(candNorm) || candNorm.includes(curr.norm)) {
            return true;
          }
          return curr.tokens.some((t) => candTokens.includes(t));
        });

        if (isPartial && !partialMatched.includes(candRaw)) {
          partialMatched.push(candRaw);
        }
      }

      const tagScore = exactMatched.length * 10 + partialMatched.length * 3;
      const matchedTags = [...exactMatched, ...partialMatched];

      return {
        article: candidate,
        exactCount: exactMatched.length,
        tagScore,
        matchedTags,
      };
    })
    .filter((entry) => entry.tagScore > 0)
    .sort((a, b) => {
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      if (b.tagScore !== a.tagScore) return b.tagScore - a.tagScore;
      const aSameSub = article.subsection && a.article.subsection === article.subsection ? 1 : 0;
      const bSameSub = article.subsection && b.article.subsection === article.subsection ? 1 : 0;
      if (bSameSub !== aSameSub) return bSameSub - aSameSub;
      const aSameSec = a.article.section === article.section ? 1 : 0;
      const bSameSec = b.article.section === article.section ? 1 : 0;
      if (bSameSec !== aSameSec) return bSameSec - aSameSec;
      return b.article.views - a.article.views;
    })
    .slice(0, 8);

  const handleLikeArticle = async () => {
    if (likedLocal) return;
    setLikedLocal(true);
    try {
      const res = await fetch(`/api/news/${article.id}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.article) {
        onArticleUpdated(data.article);
      }
    } catch {
      // ignore transient error
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(
        [article.kicker, article.title, article.subtitle, article.lead, plainBodyText]
          .filter(Boolean)
          .join('\n\n')
      );
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleDownloadArticle = () => {
    const content = `${article.title}\nکد مطلب: ${article.code}\n${article.publishedLabel}\n\n${article.lead ? `${article.lead}\n\n` : ''}${plainBodyText}${article.sourceName ? `\n\nمنبع: ${article.sourceName}` : ''}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `islamtimes-${article.code}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleVoteComment = async (commentId: number, type: 'like' | 'dislike') => {
    try {
      const res = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        onCommentUpdated(data.comment);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentFeedback(null);

    if (!commentText.trim()) {
      setCommentFeedback({
        type: 'error',
        message: 'لطفاً متن نظر خود را بنویسید.',
      });
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: article.id,
          parentId: replyToId,
          authorName: authorName.trim() || 'کاربر اسلام تایمز',
          authorEmail: authorEmail.trim() || 'user@example.com',
          showEmail,
          content: commentText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ارسال نظر');
      }
      onCommentAdded(data.comment);
      setCommentText('');
      setReplyToId(null);
      setCommentFeedback({
        type: 'success',
        message: 'نظر شما با موفقیت در پایگاه داده ثبت شد.',
      });
    } catch (err: unknown) {
      setCommentFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'ثبت نظر ناموفق بود.',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <main className="max-w-[1140px] mx-auto px-3.5 sm:px-4 pt-6 sm:pt-8 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Article Column (8 cols) */}
        <article className="lg:col-span-8">
          {/* Breadcrumb & Article Code */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 pb-3 mb-4 border-b border-neutral-200">
            <div className="flex flex-wrap items-center gap-1.5">
              {(article.articleType || article.isVideo) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const typeLabel = article.articleType || 'ویدیو';
                      if (onSelectArticleType) {
                        onSelectArticleType(typeLabel);
                      } else {
                        onSelectSection('home');
                      }
                    }}
                    className={`font-bold cursor-pointer ${
                      isBreakingArticleType(article.articleType)
                        ? 'text-[#d41a24]'
                        : 'text-[#0b5e85] hover:text-[#d41a24]'
                    }`}
                  >
                    {article.articleType || 'ویدیو'}
                  </button>
                  {(article.section || article.subsection) && (
                    <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </>
              )}
              {article.section && (
                <button
                  type="button"
                  onClick={() => onSelectSection(article.section as SectionKey)}
                  className="hover:text-[#d41a24] cursor-pointer font-semibold"
                >
                  {menuConfig?.items.find((m) => m.key === article.section)?.label ||
                    SECTION_LABELS[article.section] ||
                    article.section}
                </button>
              )}
              {article.subsection && (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />
                  <button
                    type="button"
                    onClick={() => onSelectSection(article.section as SectionKey, article.subsection)}
                    className="text-[#d41a24] font-semibold hover:underline cursor-pointer"
                  >
                    {article.subsection}
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 tabular-nums text-neutral-500">
              <span>کد مطلب : {toPersianDigits(article.code)}</span>
            </div>
          </div>

          {/* Kicker, Title, Subtitle & Lead */}
          {article.kicker && (
            <p className="text-xs sm:text-sm font-bold text-[#0b5e85] mb-1.5">
              {article.kicker}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl md:text-[26px] font-extrabold text-neutral-900 leading-snug mb-2">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="text-sm sm:text-base font-bold text-neutral-600 leading-7 mb-3">
              {article.subtitle}
            </p>
          )}
          {article.lead && (
            <p className="text-sm md:text-[15px] font-medium text-neutral-700 leading-7 mb-5">
              {article.lead}
            </p>
          )}

          {/* Main Photo (only shown when imageUrl exists) */}
          {article.imageUrl && (
            <div className="relative w-full aspect-[16/10] overflow-hidden rounded-sm bg-neutral-100 mb-6">
              <SafeImage
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              {article.contentOrigin === 'original' && (
                <span className="absolute top-3 right-3 px-3 py-1 rounded-sm bg-[#d41a24] text-white text-xs font-extrabold shadow-md tracking-wide">
                  اختصاصی
                </span>
              )}
            </div>
          )}

          {/* Body Text (supports both rich HTML and plain paragraphs) */}
          {richBody ? (
            <div
              className="rich-article-body text-neutral-800 leading-8 mb-6"
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
            />
          ) : paragraphs.length > 0 ? (
            <div
              className="space-y-4 text-neutral-800 leading-8 mb-6"
              style={{ fontSize: `${fontSize}px` }}
            >
              {paragraphs.map((p, idx) => {
                if (idx === 0 && p.startsWith('به گزارش اسلام تایمز:')) {
                  const rest = p.replace('به گزارش اسلام تایمز:', '');
                  return (
                    <p key={`p-rep-${idx}`} className="text-justify">
                      <span className="text-[#d41a24] font-bold">
                        به گزارش اسلام تایمز:
                      </span>
                      {rest}
                    </p>
                  );
                }
                return (
                  <p key={`p-${idx}`} className="text-justify">
                    {p}
                  </p>
                );
              })}
            </div>
          ) : isBreakingArticleType(article.articleType) ? (
            <div className="mb-6 rounded-md border border-rose-200 bg-rose-50/70 px-4 py-4 text-xs sm:text-sm text-rose-950 font-medium leading-7">
              این خبر به‌عنوان <strong className="text-[#d41a24]">خبر فوری</strong> منتشر شده است؛ متن و جزئیات تکمیلی به محض دریافت توسط تحریریه تکمیل و منتشر خواهد شد.
            </div>
          ) : null}

          {/* Uploaded Videos Section */}
          {videos.length > 0 && (
            <section className="mb-7 space-y-3" id="article-videos">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <Video className="w-4 h-4 text-[#d41a24]" />
                <h2 className="text-sm font-bold text-neutral-900">
                  ویدیوهای خبر ({toPersianDigits(videos.length)})
                </h2>
              </div>
              <div className="space-y-4">
                {videos.map((vid, idx) => (
                  <div
                    key={vid.id || `vid-${idx}`}
                    className="rounded-md overflow-hidden border border-neutral-200 bg-neutral-950"
                  >
                    <video
                      src={vid.url}
                      controls
                      preload="metadata"
                      className="w-full max-h-[440px]"
                    />
                    {vid.title && (
                      <div className="bg-neutral-900 text-neutral-100 px-3 py-2 text-xs font-medium">
                        {vid.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Photo Gallery Section */}
          {galleryImages.length > 0 && (
            <section className="mb-7 space-y-3" id="article-gallery">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <ImageIcon className="w-4 h-4 text-[#0b5e85]" />
                <h2 className="text-sm font-bold text-neutral-900">
                  گالری تصاویر ({toPersianDigits(galleryImages.length)} عکس)
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((img, idx) => (
                  <button
                    key={img.id || `gal-${idx}`}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="group text-right rounded-md overflow-hidden border border-neutral-200 bg-neutral-50 hover:border-[#0b5e85] transition-colors cursor-pointer"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                      <SafeImage
                        src={img.url}
                        alt={img.caption || `${article.title} - تصویر ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    {img.caption && (
                      <p className="p-2 text-[11px] text-neutral-700 line-clamp-2 leading-4">
                        {img.caption}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Downloadable Attachments Section */}
          {attachments.length > 0 && (
            <section className="mb-7 space-y-3" id="article-attachments">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <Paperclip className="w-4 h-4 text-[#0b5e85]" />
                <h2 className="text-sm font-bold text-neutral-900">
                  فایل‌های ضمیمه ({toPersianDigits(attachments.length)})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map((att, idx) => (
                  <a
                    key={att.id || `att-${idx}`}
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-sky-50 hover:border-[#0b5e85] transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-[#0b5e85] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-800 truncate">{att.name}</p>
                        {att.size && (
                          <span className="text-[10px] text-neutral-500">
                            {formatFileSize(att.size)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0b5e85] text-white text-[10px] font-bold shrink-0">
                      <Download className="w-3 h-3" />
                      دانلود
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Gallery Lightbox Modal */}
          {lightboxIndex !== null && galleryImages[lightboxIndex] && (
            <div
              className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
              onClick={() => setLightboxIndex(null)}
            >
              <div
                className="relative max-w-4xl w-full bg-neutral-900 rounded-lg overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center cursor-pointer"
                  aria-label="بستن"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="max-h-[75vh] flex items-center justify-center bg-black">
                  <img
                    src={galleryImages[lightboxIndex].url}
                    alt={galleryImages[lightboxIndex].caption || article.title}
                    className="max-h-[75vh] w-auto object-contain"
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3 text-white text-xs bg-neutral-900">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={galleryImages.length <= 1}
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === null
                            ? 0
                            : (prev - 1 + galleryImages.length) % galleryImages.length
                        )
                      }
                      className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="font-mono">
                      {toPersianDigits(lightboxIndex + 1)} / {toPersianDigits(galleryImages.length)}
                    </span>
                    <button
                      type="button"
                      disabled={galleryImages.length <= 1}
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === null ? 0 : (prev + 1) % galleryImages.length
                        )
                      }
                      className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-neutral-200 truncate">
                    {galleryImages[lightboxIndex].caption || article.title}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Author, Timestamp, Source Strip */}
          <div className="bg-neutral-100 rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 mb-4">
            {article.authorName && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-300 shrink-0 bg-white flex items-center justify-center text-neutral-400">
                  {article.authorAvatar ? (
                    <SafeImage
                      src={article.authorAvatar}
                      alt={article.authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <span>
                  خبرنگار: <strong className="text-neutral-800">{article.authorName}</strong>
                </span>
              </div>
            )}

            <div className="tabular-nums text-neutral-500">
              {article.publishedLabel}
            </div>

            {article.sourceName && (
              <div>
                منبع:{' '}
                {article.sourceUrl ? (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#0b5e85] hover:text-[#d41a24] hover:underline"
                  >
                    <span>{article.sourceName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <strong className="text-neutral-800">{article.sourceName}</strong>
                )}
              </div>
            )}
          </div>

          {/* Interactive Toolbar */}
          <div className="border-y border-neutral-200 py-3 mb-4 space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
              <div className="flex flex-wrap items-center gap-4">
                {/* Font Size Controls */}
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                    className="text-[#d41a24] font-bold px-1 hover:bg-neutral-100 rounded cursor-pointer"
                    title="بزرگ کردن قلم"
                  >
                    +
                  </button>
                  <span className="font-semibold text-neutral-700 select-none">ت</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                    className="text-[#d41a24] font-bold px-1 hover:bg-neutral-100 rounded cursor-pointer"
                    title="کوچک کردن قلم"
                  >
                    −
                  </button>
                </div>

                {/* Comment Count */}
                <a
                  href="#comments-section"
                  className="inline-flex items-center gap-1.5 hover:text-[#d41a24]"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                  <span>تعداد نظر</span>
                  <span className="font-bold text-neutral-800 tabular-nums">
                    {toPersianDigits(comments.length)}
                  </span>
                </a>

                {/* Like / Interesting */}
                <button
                  type="button"
                  onClick={handleLikeArticle}
                  className={`inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    likedLocal ? 'text-[#d41a24] font-bold' : 'hover:text-[#d41a24]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${likedLocal ? 'fill-current' : ''}`} />
                  <span>جالب است</span>
                  <span className="tabular-nums font-semibold">
                    +{toPersianDigits(article.likes)}
                  </span>
                </button>

                {attachments.length > 0 ? (
                  <a
                    href="#article-attachments"
                    className="inline-flex items-center gap-1 text-[#0b5e85] font-semibold hover:text-[#d41a24]"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ضمیمه ({toPersianDigits(attachments.length)})</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-neutral-400">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>بدون ضمیمه</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyBody}
                  className="inline-flex items-center gap-1 hover:text-[#d41a24] cursor-pointer"
                >
                  {copiedBody ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#d41a24]" />
                  )}
                  <span>{copiedBody ? 'کپی شد' : 'کپی متن خبر'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadArticle}
                  title="دانلود متن خبر"
                  className="hover:text-[#d41a24] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#d41a24]" />
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  title="چاپ خبر"
                  className="hover:text-[#d41a24] cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#d41a24]" />
                </button>

                <a
                  href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(shortUrl)}`}
                  title="ارسال با ایمیل"
                  className="hover:text-[#d41a24]"
                >
                  <Mail className="w-4 h-4 text-[#d41a24]" />
                </a>
              </div>
            </div>

            {/* Social Share & Short Link */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-neutral-100 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-neutral-600">
                <span className="font-semibold">اشتراک‌گذاری:</span>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="اشتراک‌گذاری در فیس‌بوک"
                  title="فیس‌بوک"
                  className="w-7 h-7 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                    <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H7.5v3h2.8v8h3.2z" />
                  </svg>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="اشتراک‌گذاری در تلگرام"
                  title="تلگرام"
                  className="w-7 h-7 rounded-full bg-[#0088cc] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                    <path d="M21.5 4.2 3.1 11.3c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 10.9-6.9c.5-.3 1-.1.6.2l-8.8 8-.3 4.8c.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.6z" />
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(article.title + ' ' + shortUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="اشتراک‌گذاری در واتساپ"
                  title="واتساپ"
                  className="w-7 h-7 rounded-full bg-[#25d366] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.8 14.1c-.2.7-1.4 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5.3.6.9 2.2 1 2.4.1.2.1.4 0 .6-.1.2-.2.3-.4.5l-.5.6c-.2.2-.3.4-.1.7.2.3.8 1.4 1.8 2.2 1.2 1.1 2.2 1.4 2.6 1.6.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.5-.3.8-.2.3.1 2 .9 2.3 1.1.3.2.6.2.7.4.1.2.1 1-.2 1.7z" />
                  </svg>
                </a>

                {/* X (Twitter) */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="اشتراک‌گذاری در ایکس (X)"
                  title="ایکس (X)"
                  className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                    <path d="M18.2 3H21l-6.1 7 7.2 11h-5.6l-4.4-6.7L6.2 21H3.4l6.5-7.5L3 3h5.7l4 6.1L18.2 3zm-1 16.3h1.6L7.9 4.6H6.2l11 14.7z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${article.title}\n${shortUrl}`).catch(() => {});
                  }}
                  aria-label="اشتراک‌گذاری در یوتیوب"
                  title="یوتیوب (کپی لینک و باز کردن یوتیوب)"
                  className="w-7 h-7 rounded-full bg-[#ff0000] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9A28.4 28.4 0 0 0 2 12a28.4 28.4 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28.4 28.4 0 0 0 22 12a28.4 28.4 0 0 0-.4-4.8zM10 15.2V8.8l5.5 3.2-5.5 3.2z" />
                  </svg>
                </a>

                {/* Instagram (Fixed Share Button) */}
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${article.title}\n${shortUrl}`).catch(() => {});
                  }}
                  aria-label="اشتراک‌گذاری در اینستاگرام"
                  title="اینستاگرام (کپی متن و باز کردن اینستاگرام)"
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                {/* More Networks Dropdown Trigger */}
                <div className="relative" ref={shareMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShareMenuOpen((prev) => !prev)}
                    aria-expanded={shareMenuOpen}
                    aria-label="سایر شبکه‌های اشتراک‌گذاری"
                    title="سایر شبکه‌ها"
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                      shareMenuOpen
                        ? 'bg-[#0b5e85] border-[#0b5e85] text-white'
                        : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  {shareMenuOpen && (
                    <div className="absolute left-0 sm:right-0 sm:left-auto bottom-full mb-2 w-64 rounded-md border border-neutral-200 bg-white shadow-lg py-1.5 z-30 text-xs text-neutral-700 max-h-80 overflow-y-auto">
                      <div className="px-3 py-1 text-[11px] font-bold text-neutral-400 border-b border-neutral-100 flex items-center justify-between">
                        <span>سایر شبکه‌های اجتماعی</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {toPersianDigits((shareChannels && shareChannels.length > 0 ? shareChannels : DEFAULT_SHARE_CHANNELS).filter((c) => c.enabled).length)}
                        </span>
                      </div>

                      {/* Configurable Dynamic Channels */}
                      {(shareChannels && shareChannels.length > 0
                        ? shareChannels
                        : DEFAULT_SHARE_CHANNELS
                      )
                        .filter((c) => c.enabled)
                        .map((channel) => {
                          const hasUrlPlaceholder = channel.urlTemplate.includes('{url}');
                          const targetUrl = channel.urlTemplate
                            .replace(/\{url\}/g, encodeURIComponent(shortUrl))
                            .replace(/\{title\}/g, encodeURIComponent(article.title));
                          return (
                            <a
                              key={channel.id}
                              href={targetUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                if (!hasUrlPlaceholder) {
                                  navigator.clipboard
                                    ?.writeText(`${article.title}\n${shortUrl}`)
                                    .catch(() => {});
                                }
                                setShareMenuOpen(false);
                              }}
                              title={
                                hasUrlPlaceholder
                                  ? channel.name
                                  : `${channel.name} (کپی متن و لینک خبر)`
                              }
                              className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-neutral-50 hover:text-[#d41a24] transition-colors"
                            >
                              <div className="min-w-0">
                                <span className="block truncate font-medium">{channel.name}</span>
                                {channel.region && (
                                  <span className="block truncate text-[10px] text-neutral-400">
                                    {channel.region}
                                  </span>
                                )}
                              </div>
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: channel.color || '#0b5e85' }}
                              />
                            </a>
                          );
                        })}

                      <a
                        href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(article.title + '\n' + shortUrl)}`}
                        onClick={() => setShareMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 hover:bg-neutral-50 hover:text-[#d41a24] border-t border-neutral-100"
                      >
                        <span>ارسال با ایمیل</span>
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      </a>
                      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator
                              .share({ title: article.title, text: article.lead, url: shortUrl })
                              .catch(() => {});
                            setShareMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-50 hover:text-[#d41a24] border-t border-neutral-100 text-right cursor-pointer"
                        >
                          <span>اشتراک‌گذاری دستگاه...</span>
                          <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyLink();
                          setShareMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-50 hover:text-[#d41a24] border-t border-neutral-100 text-right cursor-pointer"
                      >
                        <span>کپی لینک خبر</span>
                        <Link2 className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-[#d41a24]" />
                  {copiedLink ? 'کپی شد' : 'لینک کوتاه'}
                </button>
                <input
                  type="text"
                  readOnly
                  value={shortUrl}
                  dir="ltr"
                  className="w-44 sm:w-56 px-2 py-1 text-[11px] border border-neutral-200 rounded bg-neutral-50 text-neutral-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Unboxed Inline Tags (Zero-Pill Discipline) */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 mb-8">
              <span className="font-semibold text-neutral-800">برچسب‌ها:</span>
              {tags.map((tag, i) => (
                <span key={`detail-tag-${tag}-${i}`} className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onTagClick(tag)}
                    className="hover:text-[#d41a24] transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                  {i < tags.length - 1 && (
                    <span className="text-neutral-300" aria-hidden="true">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Related Headlines (عناوین مرتبط) */}
          <section className="mb-10">
            <SectionHeader title="عناوین مرتبط" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {relatedArticles.map((item, idx) => (
                <button
                  key={`detail-related-${item.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectArticle(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-start gap-3 text-right group cursor-pointer"
                >
                  <div className="w-24 h-16 shrink-0 rounded-sm overflow-hidden bg-neutral-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      size="small"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <h3 className="text-xs font-semibold leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-2">
                    {item.title}
                  </h3>
                </button>
              ))}
            </div>
          </section>

          {/* Send Comment Form (ارسال نظر) */}
          <section className="mb-10 no-print" id="comments-section">
            <SectionHeader title="ارسال نظر" />
            {replyToId && (
              <div className="mb-3 flex items-center justify-between bg-sky-50 border border-sky-200 rounded px-3 py-1.5 text-xs text-sky-900">
                <span>در حال پاسخ به دیدگاه #{toPersianDigits(replyToId)}</span>
                <button
                  type="button"
                  onClick={() => setReplyToId(null)}
                  className="text-[#d41a24] font-semibold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmitComment}
              className="grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              <div className="md:col-span-7">
                <textarea
                  rows={5}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="نظر شما..."
                  className="w-full rounded bg-neutral-100 border border-neutral-200 p-3 text-xs md:text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#0b5e85]"
                />
              </div>

              <div className="md:col-span-5 flex flex-col justify-between gap-2.5">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="نام شما"
                  className="w-full rounded bg-neutral-100 border border-neutral-200 px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#0b5e85]"
                />
                <input
                  type="email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="ایمیل شما"
                  className="w-full rounded bg-neutral-100 border border-neutral-200 px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#0b5e85]"
                />

                <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    className="accent-[#0b5e85]"
                  />
                  <span>نمایش آدرس ایمیل</span>
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="px-5 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    {submittingComment ? 'در حال ارسال...' : 'ارسال'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCommentText('');
                      setReplyToId(null);
                      setCommentFeedback(null);
                    }}
                    className="px-4 py-1.5 rounded bg-neutral-400 hover:bg-neutral-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    پاک کردن
                  </button>
                </div>
              </div>
            </form>

            {commentFeedback && (
              <p
                className={`mt-3 text-xs font-medium ${
                  commentFeedback.type === 'success'
                    ? 'text-emerald-700'
                    : 'text-[#d41a24]'
                }`}
              >
                {commentFeedback.message}
              </p>
            )}
          </section>

          {/* Comments List (نظرات شما) */}
          <section className="mb-8">
            <SectionHeader title="نظرات شما" />
            {comments.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4">
                هنوز دیدگاهی ثبت نشده است. نخستین نفر باشید!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((c, idx) => (
                  <div
                    key={`detail-comment-${c.id}-${idx}`}
                    className="border border-neutral-200 rounded-md p-4 bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-neutral-900">
                            نام نظردهنده: {c.authorName}
                          </span>
                          {c.showEmail && c.authorEmail && (
                            <span className="text-[11px] text-neutral-400" dir="ltr">
                              ({c.authorEmail})
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-6 text-neutral-700">
                          {c.content}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums">{c.publishedLabel}</span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleVoteComment(c.id, 'like')}
                            className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer tabular-nums"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                            {toPersianDigits(c.likes)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVoteComment(c.id, 'dislike')}
                            className="inline-flex items-center gap-1 hover:text-[#d41a24] cursor-pointer tabular-nums"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-[#d41a24]" />
                            {toPersianDigits(c.dislikes)}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyToId(c.id);
                          document
                            .getElementById('comments-section')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-3 py-1 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        پاسخ به این نظر
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>

        {/* Left Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Latest Headlines */}
          <div>
            <SectionHeader
              title="آخرین عناوین"
              onMore={() => onSelectSection('asia')}
            />
            <div className="divide-y divide-neutral-200 border-b border-neutral-200">
              {latestHeadlines.map((item, idx) => (
                <button
                  key={`detail-latest-${item.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectArticle(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-right group cursor-pointer"
                >
                  <span className="text-xs leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-1 font-medium">
                    {item.title}
                  </span>
                  <span className="w-4 h-4 rounded-full bg-neutral-200 group-hover:bg-[#d41a24] text-neutral-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <ChevronLeft className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Most Viewed */}
          <div>
            <SectionHeader
              title="پربیننده‌ترین"
              onMore={() => onSelectSection('asia')}
            />
            <div className="space-y-4">
              {mostViewed.map((item, idx) => (
                <button
                  key={`detail-most-${item.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectArticle(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-start gap-3 text-right group cursor-pointer"
                >
                  <div className="w-24 h-16 shrink-0 rounded-sm overflow-hidden bg-neutral-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      size="small"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <h3 className="text-xs font-semibold leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-2">
                    {item.title}
                  </h3>
                </button>
              ))}
            </div>
          </div>

          {/* Editorial Sidebar Poster */}
          <div className="relative rounded-sm overflow-hidden shadow-sm border border-neutral-200">
            <SafeImage
              src={SIDEBAR_POSTER}
              alt="پرونده تحلیلی اسلام تایمز"
              className="w-full aspect-[3/4] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-[11px] text-sky-200 font-semibold mb-1">
                پرونده ویژه تحلیلی
              </span>
              <h3 className="text-lg font-extrabold leading-snug mb-1.5">
                پایان دوران تک‌قطبی و افق‌های نظم نوین جهانی
              </h3>
              <p className="text-xs text-neutral-200 leading-5">
                مجموعه یادداشت‌ها و گزارش‌های اختصاصی تحریریه بین‌الملل اسلام تایمز
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Suggested Articles by Similar Tags (مطالب پیشنهادی) */}
      <section className="mt-10 pt-8 border-t border-neutral-200">
        <SectionHeader title="مطالب پیشنهادی" />

        {suggestedArticles.length === 0 ? (
          <div className="rounded border border-neutral-200 bg-neutral-50 px-4 py-5 text-xs text-neutral-500">
            {tags.length === 0
              ? 'برای این خبر برچسبی ثبت نشده است تا مطالب پیشنهادی بر اساس برچسب‌های مشابه نمایش داده شود.'
              : 'در حال حاضر خبر دیگری با برچسب‌های مشابه این مطلب ثبت نشده است.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {suggestedArticles.map(({ article: item, matchedTags }, idx) => (
              <button
                key={`detail-suggested-${item.id}-${idx}`}
                type="button"
                onClick={() => {
                  onSelectArticle(item);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group flex flex-col text-right pb-4 border-b border-neutral-100 sm:pb-0 sm:border-b-0 cursor-pointer"
              >
                <div className="relative w-full aspect-[16/10] overflow-hidden rounded-sm bg-neutral-100 mb-2.5">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.contentOrigin === 'original' && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-sm bg-[#d41a24] text-white text-[10px] font-extrabold shadow">
                      اختصاصی
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mb-1">
                  <span className="font-semibold text-[#0b5e85]">
                    {item.subsection ||
                      menuConfig?.items.find((m) => m.key === item.section)?.label ||
                      SECTION_LABELS[item.section] ||
                      item.section}
                  </span>
                  {item.publishedLabel && (
                    <>
                      <span className="text-neutral-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="truncate">{item.publishedLabel}</span>
                    </>
                  )}
                </div>

                <h3 className="text-[13.5px] sm:text-xs md:text-[13px] font-bold leading-6 text-neutral-900 group-hover:text-[#d41a24] line-clamp-2 transition-colors mb-1.5">
                  {item.title}
                </h3>

                {matchedTags.length > 0 && (
                  <p className="text-[11px] text-neutral-500 line-clamp-1 mt-auto">
                    <span className="text-neutral-400">برچسب مشابه: </span>
                    {matchedTags.slice(0, 3).join(' · ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
