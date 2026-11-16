/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Monitor,
  Paperclip,
  Smartphone,
  Tag,
  User,
  Video,
  ChevronLeft,
} from 'lucide-react';
import {
  ArticleAttachment,
  ArticleGalleryItem,
  ArticleVideoItem,
  isBreakingArticleType,
  MenuConfig,
  SECTION_LABELS,
  SectionKey,
  toPersianDigits,
} from '../types/news';
import {
  hasRichBodyContent,
  isRichHtml,
  sanitizeRichHtml,
  stripHtmlToText,
} from '../lib/richText';
import { SafeImage } from './SafeImage';

export interface ArticleLivePreviewProps {
  code?: string;
  status?: 'published' | 'draft';
  articleType: string;
  section: string;
  subsection: string;
  menuConfig: MenuConfig;
  kicker: string;
  title: string;
  subtitle: string;
  lead: string;
  body: string;
  imageUrl: string;
  authorName: string;
  contentOrigin: 'quoted' | 'original' | '';
  sourceName: string;
  sourceUrl: string;
  attachments: ArticleAttachment[];
  galleryImages: ArticleGalleryItem[];
  videos: ArticleVideoItem[];
  tags: string;
}

export function ArticleLivePreview({
  code,
  status = 'published',
  articleType,
  section,
  subsection,
  menuConfig,
  kicker,
  title,
  subtitle,
  lead,
  body,
  imageUrl,
  authorName,
  contentOrigin,
  sourceName,
  sourceUrl,
  attachments,
  galleryImages,
  videos,
  tags,
}: ArticleLivePreviewProps) {
  const [previewScope, setPreviewScope] = useState<'page' | 'card'>('page');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [fontSize, setFontSize] = useState(15);

  const sectionLabel = section
    ? menuConfig.items.find((m) => m.key === section)?.label ||
      SECTION_LABELS[section as SectionKey] ||
      section
    : '';

  const parsedTags = tags
    .split(/[،,]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const cleanBody = body.trim();
  const hasBody = hasRichBodyContent(cleanBody);
  const richBody = isRichHtml(cleanBody);
  const sanitizedBodyHtml = richBody ? sanitizeRichHtml(cleanBody) : '';
  const paragraphs = !richBody && cleanBody ? cleanBody.split('\n\n').filter(Boolean) : [];
  const plainSummary = richBody ? stripHtmlToText(cleanBody) : cleanBody;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
    return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  };

  const todayPersian = new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const safeHref = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const previewSourceUrl = contentOrigin === 'original' ? '' : safeHref(sourceUrl);
  const previewSourceName = contentOrigin === 'original' ? '' : sourceName.trim();

  return (
    <div
      className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden shadow-xs flex flex-col"
      dir="rtl"
    >
      {/* Preview Toolbar */}
      <div className="bg-white border-b border-neutral-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b5e85]">
            <Eye className="w-4 h-4" />
            پیشنمایش زنده خبر
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              status === 'draft'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {status === 'draft' ? 'حالت پیشنویس' : 'حالت انتشار'}
          </span>
          {contentOrigin === 'original' && (
            <span className="px-2 py-0.5 rounded bg-[#d41a24] text-white text-[10px] font-extrabold">
              تولیدی / اختصاصی
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Page vs Card Switch */}
          <div className="inline-flex items-center rounded border border-neutral-200 bg-neutral-100 p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setPreviewScope('page')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-colors ${
                previewScope === 'page'
                  ? 'bg-white text-[#0b5e85] shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              صفحه کامل خبر
            </button>
            <button
              type="button"
              onClick={() => setPreviewScope('card')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-colors ${
                previewScope === 'card'
                  ? 'bg-white text-[#0b5e85] shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              کارت صفحه اول
            </button>
          </div>

          {previewScope === 'page' && (
            <>
              {/* Desktop vs Mobile Switch */}
              <div className="inline-flex items-center rounded border border-neutral-200 bg-neutral-100 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  title="نمای دسکتاپ"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors ${
                    deviceMode === 'desktop'
                      ? 'bg-white text-[#0b5e85] shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  دسکتاپ
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  title="نمای موبایل"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors ${
                    deviceMode === 'mobile'
                      ? 'bg-white text-[#0b5e85] shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  موبایل
                </button>
              </div>

              {/* Font Size Control */}
              <div className="inline-flex items-center gap-1 border border-neutral-200 rounded px-2 py-0.5 bg-white text-[11px]">
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                  className="text-[#d41a24] font-bold px-1 hover:bg-neutral-100 rounded cursor-pointer"
                  title="بزرگ کردن قلم متن"
                >
                  +
                </button>
                <span className="font-semibold text-neutral-700 select-none">ت</span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                  className="text-[#d41a24] font-bold px-1 hover:bg-neutral-100 rounded cursor-pointer"
                  title="کوچک کردن قلم متن"
                >
                  −
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Canvas */}
      <div className="p-3 sm:p-5">
        {previewScope === 'card' ? (
          <div className="space-y-4">
            {/* Lead Featured Card Preview */}
            <div className="bg-white rounded-md border border-neutral-200 p-4 space-y-2.5 shadow-xs">
              <div className="text-[11px] font-bold text-[#0b5e85] border-b border-neutral-100 pb-1.5">
                نمای کارت در ستون اصلی صفحه اول
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-5 relative aspect-[16/10] rounded-sm overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                  {imageUrl ? (
                    <>
                      <SafeImage
                        src={imageUrl}
                        alt={title || 'پیش‌نمایش تصویر خبر'}
                        className="w-full h-full object-cover"
                      />
                      {contentOrigin === 'original' && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[10px] font-extrabold shadow">
                          اختصاصی
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400 text-[11px] gap-1">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                      <span>بدون تصویر اصلی</span>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-7 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
                    {articleType && (
                      <span className="font-bold text-[#d41a24]">{articleType}</span>
                    )}
                    {sectionLabel && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-[#0b5e85]">{sectionLabel}</span>
                      </>
                    )}
                    {subsection && (
                      <>
                        <span>/</span>
                        <span>{subsection}</span>
                      </>
                    )}
                  </div>
                  {kicker.trim() && (
                    <p className="text-[11px] font-bold text-[#0b5e85]">{kicker}</p>
                  )}
                  <h3 className="text-base font-extrabold text-neutral-900 leading-snug">
                    {title.trim() || (
                      <span className="text-neutral-400 font-normal">
                        تیتر مطلب اینجا نمایش داده می‌شود...
                      </span>
                    )}
                  </h3>
                  {subtitle.trim() && (
                    <p className="text-xs font-bold text-neutral-600">{subtitle}</p>
                  )}
                  <p className="text-xs text-neutral-600 leading-6 line-clamp-3">
                    {lead.trim() ||
                      plainSummary ||
                      'لید یا خلاصه متن مطلب در کارت صفحه اول نمایش داده می‌شود.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Headline List Preview */}
            <div className="bg-white rounded-md border border-neutral-200 p-4 space-y-2.5 shadow-xs">
              <div className="text-[11px] font-bold text-[#0b5e85] border-b border-neutral-100 pb-1.5">
                نمای فهرست اخبار / ستون کناری
              </div>
              <div className="flex items-start gap-3">
                {imageUrl && (
                  <div className="relative w-24 h-16 rounded-sm overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                    <SafeImage
                      src={imageUrl}
                      alt={title || 'تصویر خبر'}
                      size="small"
                      className="w-full h-full object-cover"
                    />
                    {contentOrigin === 'original' && (
                      <span className="absolute top-1 right-1 px-1 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[8px] font-extrabold">
                        اختصاصی
                      </span>
                    )}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  {kicker.trim() && (
                    <p className="text-[10px] font-bold text-[#0b5e85] truncate">{kicker}</p>
                  )}
                  <h4 className="text-xs font-bold text-neutral-900 leading-5">
                    {title.trim() || 'تیتر مطلب...'}
                  </h4>
                  <p className="text-[10px] text-neutral-500 tabular-nums">
                    {code ? `کد خبر: ${toPersianDigits(code)}` : 'کد خبر پس از ثبت'} •{' '}
                    {todayPersian}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`mx-auto bg-white rounded-md border border-neutral-200 shadow-xs transition-all ${
              deviceMode === 'mobile' ? 'max-w-[390px] p-4' : 'w-full p-5 sm:p-6'
            }`}
          >
            {/* Breadcrumb & Article Code */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 pb-3 mb-4 border-b border-neutral-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`font-bold ${
                    isBreakingArticleType(articleType) ? 'text-[#d41a24]' : 'text-[#0b5e85]'
                  }`}
                >
                  {articleType || 'نوع مطلب (انتخاب‌نشده)'}
                </span>
                <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-semibold text-neutral-700">
                  {sectionLabel ||
                    (isBreakingArticleType(articleType)
                      ? 'نوار خبر فوری (بدون بخش)'
                      : 'منوی اصلی (انتخاب‌نشده)')}
                </span>
                {subsection.trim() && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[#d41a24] font-semibold">{subsection.trim()}</span>
                  </>
                )}
              </div>

              <div className="tabular-nums text-neutral-500 text-[11px]">
                {code ? `کد مطلب : ${toPersianDigits(code)}` : 'کد مطلب : خودکار پس از ثبت'}
              </div>
            </div>

            {/* Kicker, Title, Subtitle, Lead */}
            {kicker.trim() && (
              <p className="text-xs sm:text-sm font-bold text-[#0b5e85] mb-1.5">{kicker}</p>
            )}

            {title.trim() ? (
              <h1
                className={`${
                  deviceMode === 'mobile' ? 'text-lg' : 'text-xl sm:text-2xl md:text-[26px]'
                } font-extrabold text-neutral-900 leading-snug mb-2`}
              >
                {title}
              </h1>
            ) : (
              <div className="mb-3 rounded border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400">
                تیتر خبر پس از تایپ در اینجا با فونت و اندازه اصلی سایت نمایش داده می‌شود...
              </div>
            )}

            {subtitle.trim() && (
              <p className="text-sm sm:text-base font-bold text-neutral-600 leading-7 mb-3">
                {subtitle}
              </p>
            )}

            {lead.trim() && (
              <p className="text-sm md:text-[15px] font-medium text-neutral-700 leading-7 mb-5">
                {lead}
              </p>
            )}

            {/* Main Photo */}
            {imageUrl.trim() && (
              <div className="relative w-full aspect-[16/10] overflow-hidden rounded-sm bg-neutral-100 mb-6">
                <SafeImage
                  src={imageUrl.trim()}
                  alt={title || 'تصویر خبر'}
                  className="w-full h-full object-cover"
                />
                {contentOrigin === 'original' && (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-sm bg-[#d41a24] text-white text-xs font-extrabold shadow-md tracking-wide">
                    اختصاصی
                  </span>
                )}
              </div>
            )}

            {/* Rich or Plain Body */}
            {hasBody ? (
              richBody ? (
                <div
                  className="rich-article-body text-neutral-800 leading-8 mb-6"
                  style={{ fontSize: `${fontSize}px` }}
                  dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
                />
              ) : (
                <div
                  className="space-y-4 text-neutral-800 leading-8 mb-6"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {paragraphs.map((p, idx) => {
                    if (idx === 0 && p.startsWith('به گزارش اسلام تایمز:')) {
                      const rest = p.replace('به گزارش اسلام تایمز:', '');
                      return (
                        <p key={`prev-p-rep-${idx}`} className="text-justify">
                          <span className="text-[#d41a24] font-bold">
                            به گزارش اسلام تایمز:
                          </span>
                          {rest}
                        </p>
                      );
                    }
                    return (
                      <p key={`prev-p-${idx}`} className="text-justify">
                        {p}
                      </p>
                    );
                  })}
                </div>
              )
            ) : isBreakingArticleType(articleType) ? (
              <div className="mb-6 rounded border border-rose-200 bg-rose-50/60 px-4 py-4 text-center text-xs text-rose-900">
                این خبر در نوار «خبر فوری» زیر منوی اصلی نمایش داده می‌شود و در صورت نیاز بعداً می‌توانید بخش و متن کامل آن را اضافه کنید.
              </div>
            ) : (
              <div className="mb-6 rounded border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-xs text-neutral-400">
                متن کامل خبر (شامل تصویرهای داخل متن، لینک‌ها، جداول و قالب‌بندی‌ها) به‌صورت زنده در اینجا نمایش داده می‌شود.
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <section className="mb-6 space-y-3">
                <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                  <Video className="w-4 h-4 text-[#d41a24]" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    ویدیوهای خبر ({toPersianDigits(videos.length)})
                  </h2>
                </div>
                <div className="space-y-3">
                  {videos.map((vid, idx) => (
                    <div
                      key={vid.id || `prev-vid-${idx}`}
                      className="rounded-md overflow-hidden border border-neutral-200 bg-neutral-950"
                    >
                      <video
                        src={vid.url}
                        controls
                        preload="metadata"
                        className="w-full max-h-[360px]"
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

            {/* Photo Gallery */}
            {galleryImages.length > 0 && (
              <section className="mb-6 space-y-3">
                <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                  <ImageIcon className="w-4 h-4 text-[#0b5e85]" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    گالری تصاویر ({toPersianDigits(galleryImages.length)} عکس)
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={img.id || `prev-gal-${idx}`}
                      className="rounded-md overflow-hidden border border-neutral-200 bg-neutral-50"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                        <SafeImage
                          src={img.url}
                          alt={img.caption || title || `تصویر ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {img.caption && (
                        <p className="p-2 text-[11px] text-neutral-700 line-clamp-2 leading-4">
                          {img.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <section className="mb-6 space-y-3">
                <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                  <Paperclip className="w-4 h-4 text-[#0b5e85]" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    فایل‌های ضمیمه ({toPersianDigits(attachments.length)})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={att.id || `prev-att-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-neutral-200 bg-neutral-50 text-xs"
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
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Author, Timestamp, Source Strip */}
            <div className="bg-neutral-100 rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 mb-4">
              {authorName.trim() ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-300 shrink-0 bg-white flex items-center justify-center text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <span>
                    خبرنگار: <strong className="text-neutral-800">{authorName}</strong>
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-400">خبرنگار / نویسنده: تعیین‌نشده</span>
              )}

              <div className="tabular-nums text-neutral-500">{todayPersian}</div>

              {previewSourceName && (
                <div>
                  منبع:{' '}
                  {previewSourceUrl ? (
                    <a
                      href={previewSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#0b5e85] hover:text-[#d41a24] hover:underline"
                    >
                      <span>{previewSourceName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <strong className="text-neutral-800">{previewSourceName}</strong>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-100 text-xs">
                <span className="inline-flex items-center gap-1 text-neutral-500 font-semibold">
                  <Tag className="w-3.5 h-3.5" />
                  برچسب‌ها:
                </span>
                {parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
