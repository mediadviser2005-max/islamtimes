import { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import {
  Article,
  ArticleTypeOption,
  CategoryMediaMode,
  DEFAULT_ARTICLE_TYPES,
  SECTION_LABELS,
  SectionKey,
  toPersianDigits,
} from '../types/news';
import { SafeImage } from './SafeImage';
import { SectionHeader } from './SectionHeader';

interface CategoryViewProps {
  section: SectionKey;
  sectionLabelOverride?: string;
  sectionDescriptionOverride?: string;
  activeSubsection?: string | null;
  activeArticleType?: string | null;
  articleTypes?: ArticleTypeOption[];
  categoryMediaMode?: CategoryMediaMode;
  searchQuery: string;
  articles: Article[];
  allArticles: Article[];
  onSelectArticle: (article: Article) => void;
  onSelectArticleType?: (typeName: string | null) => void;
  onPlayVideoArticle: (article: Article) => void;
}

export function CategoryView({
  section,
  sectionLabelOverride,
  sectionDescriptionOverride,
  activeSubsection,
  activeArticleType = null,
  articleTypes = DEFAULT_ARTICLE_TYPES,
  categoryMediaMode = 'both',
  searchQuery,
  articles,
  allArticles,
  onSelectArticle,
  onSelectArticleType,
  onPlayVideoArticle,
}: CategoryViewProps) {
  const [videoPage, setVideoPage] = useState(0);
  const [photoPage, setPhotoPage] = useState(0);
  const [archivePage, setArchivePage] = useState(0);

  const sectionTitle = searchQuery
    ? `نتایج جستجو برای: «${searchQuery}»`
    : activeArticleType && section === 'home'
      ? `نوع مطلب: ${activeArticleType}`
      : sectionLabelOverride || SECTION_LABELS[section] || 'اخبار';
  const subLabel = !searchQuery
    ? activeSubsection || (activeArticleType && section !== 'home' ? activeArticleType : undefined)
    : undefined;

  const sectionFallback = allArticles.filter((a) => a.section === section);
  const displayList =
    articles.length > 0
      ? articles
      : activeArticleType
        ? []
        : sectionFallback.length > 0
          ? sectionFallback
          : allArticles;
  const heroMain = displayList[0];
  const heroRight = displayList.slice(1, 5);
  const heroLeft = displayList.slice(5, 9);

  const prioritizeSection = (list: Article[]) => {
    if (section === 'home') return list;
    const inSection = list.filter((a) => a.section === section);
    const others = list.filter((a) => a.section !== section);
    return [...inSection, ...others];
  };

  const allVideos = allArticles.filter(
    (a) => a.articleType === 'ویدیو' || a.articleType === 'ویدئو' || a.isVideo
  );
  const videoSource = prioritizeSection(allVideos);
  const videoPageItems = videoSource.slice(videoPage * 4, videoPage * 4 + 4);
  const hasNextVideo = (videoPage + 1) * 4 < videoSource.length;

  const allPhotoReports = allArticles.filter((a) => a.articleType === 'گزارش تصویری');
  const photoSource = prioritizeSection(allPhotoReports);
  const photoPageItems = photoSource.slice(photoPage * 4, photoPage * 4 + 4);
  const hasNextPhoto = (photoPage + 1) * 4 < photoSource.length;

  const showVideoBand =
    categoryMediaMode === 'video' || categoryMediaMode === 'both';
  const showPhotoBand =
    categoryMediaMode === 'photo-report' || categoryMediaMode === 'both';

  const archivePerPage = 10;
  const archiveItems = displayList.slice(
    archivePage * archivePerPage,
    archivePage * archivePerPage + archivePerPage
  );
  const hasNextArchive = (archivePage + 1) * archivePerPage < displayList.length;

  const mostViewed = [...allArticles]
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return (
    <main className="w-full">
      {/* 1. Category Breadcrumb & 3-Col Hero */}
      <section className="max-w-[1140px] mx-auto px-4 pt-8 pb-8">
        <SectionHeader title={sectionTitle} subtitle={subLabel} />
        {!searchQuery && !activeArticleType && !activeSubsection && sectionDescriptionOverride && (
          <p className="text-xs text-neutral-600 leading-6 mb-4 -mt-2">
            {sectionDescriptionOverride}
          </p>
        )}

        {/* Article Type Filter Strip */}
        {onSelectArticleType && articleTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3 mb-4 text-xs">
            <span className="text-neutral-500 font-semibold ml-1">نوع مطلب:</span>
            <button
              type="button"
              onClick={() => {
                setArchivePage(0);
                onSelectArticleType(null);
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                !activeArticleType
                  ? 'bg-[#0b5e85] text-white font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium'
              }`}
            >
              همه انواع
            </button>
            {articleTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setArchivePage(0);
                  onSelectArticleType(activeArticleType === t.name ? null : t.name);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeArticleType === t.name
                    ? 'bg-[#d41a24] text-white font-bold'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {articles.length === 0 && searchQuery ? (
          <div className="py-10 text-center border border-neutral-200 rounded-md bg-neutral-50 text-sm text-neutral-600 mb-4">
            خبری مطابق عبارت جستجوی شما یافت نشد. تازه‌ترین مطالب پیشنهادی در زیر نمایش داده شده‌اند.
          </div>
        ) : articles.length === 0 && activeArticleType ? (
          <div className="py-8 px-4 text-center border border-neutral-200 rounded-md bg-neutral-50 text-xs text-neutral-600 mb-4">
            در حال حاضر مطلبی با نوع «{activeArticleType}» در این بخش ثبت نشده است.
          </div>
        ) : articles.length === 0 && activeSubsection ? (
          <div className="py-6 px-4 text-center border border-neutral-200 rounded-md bg-neutral-50 text-xs text-neutral-600 mb-4">
            در حال حاضر خبری در زیربخش «{activeSubsection}» ثبت نشده است؛ سایر اخبار بخش «{sectionTitle}» در زیر نمایش داده شده‌اند.
          </div>
        ) : null}

        {heroMain && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
            <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
              {heroRight.map((item, idx) => (
                <button
                  key={`cat-hero-r-${item.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectArticle(item)}
                  className="w-full flex items-start gap-3 text-right group cursor-pointer"
                >
                  <div className="relative w-24 h-16 shrink-0 rounded-sm overflow-hidden bg-neutral-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      size="small"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {item.contentOrigin === 'original' && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[9px] font-extrabold shadow">
                        اختصاصی
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-2">
                    {item.title}
                  </h3>
                </button>
              ))}
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <button
                type="button"
                onClick={() => onSelectArticle(heroMain)}
                className="w-full text-right group cursor-pointer"
              >
                <div className="relative w-full aspect-[16/10] overflow-hidden rounded-sm bg-neutral-100 mb-3">
                  <SafeImage
                    src={heroMain.imageUrl}
                    alt={heroMain.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {heroMain.contentOrigin === 'original' && (
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-sm bg-[#d41a24] text-white text-xs font-extrabold shadow-md">
                      اختصاصی
                    </span>
                  )}
                </div>
                {heroMain.kicker && (
                  <p className="text-[11px] sm:text-xs font-bold text-[#0b5e85] mb-1 pr-4">
                    {heroMain.kicker}
                  </p>
                )}
                <div className="flex items-start gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#d41a24] shrink-0 mt-2.5" />
                  <h1 className="text-lg md:text-xl font-extrabold text-neutral-900 group-hover:text-[#d41a24] leading-snug">
                    {heroMain.title}
                  </h1>
                </div>
                {heroMain.subtitle && (
                  <p className="text-xs font-semibold text-neutral-700 mb-1.5 pr-4">
                    {heroMain.subtitle}
                  </p>
                )}
                <p className="text-xs md:text-[13px] leading-6 text-neutral-600 line-clamp-4">
                  {heroMain.lead}
                </p>
              </button>
            </div>

            <div className="lg:col-span-3 space-y-4 order-3">
              {heroLeft.map((item, idx) => (
                <button
                  key={`cat-hero-l-${item.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectArticle(item)}
                  className="w-full flex items-start gap-3 text-right group cursor-pointer"
                >
                  <div className="relative w-24 h-16 shrink-0 rounded-sm overflow-hidden bg-neutral-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      size="small"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {item.contentOrigin === 'original' && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[9px] font-extrabold shadow">
                        اختصاصی
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-2">
                    {item.title}
                  </h3>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. Video Band (ویدیو) - Controlled by Admin Layout */}
      {showVideoBand && (
        <section className="w-full bg-[#242424] py-8 text-white">
          <div className="max-w-[1140px] mx-auto px-4">
            <SectionHeader
              title="ویدیو"
              dark
              onMore={onSelectArticleType ? () => onSelectArticleType('ویدیو') : undefined}
            />

            {videoPageItems.length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed border-neutral-600 rounded text-xs text-neutral-300">
                هنوز ویدیویی در سایت ثبت نشده است.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {videoPageItems.map((vid, idx) => (
                    <button
                      key={`cat-video-${vid.id}-${idx}`}
                      type="button"
                      onClick={() => onPlayVideoArticle(vid)}
                      className="text-right group cursor-pointer"
                    >
                      <div className="relative aspect-[16/10] rounded-sm overflow-hidden bg-black mb-2.5">
                        <SafeImage
                          src={vid.imageUrl}
                          alt={vid.title}
                          className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="w-11 h-11 rounded-full bg-white/80 group-hover:bg-white text-neutral-900 flex items-center justify-center shadow transition-transform group-hover:scale-105">
                            <Play className="w-5 h-5 fill-current mr-[-2px]" />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-2" />
                        <h3 className="text-xs font-semibold text-neutral-100 group-hover:text-white leading-5 line-clamp-2">
                          {vid.title}
                        </h3>
                      </div>
                    </button>
                  ))}
                </div>

                {videoSource.length > 4 && (
                  <div className="mt-6 flex items-center justify-center gap-4 text-xs text-neutral-300">
                    <button
                      type="button"
                      disabled={videoPage === 0}
                      onClick={() => setVideoPage((p) => Math.max(0, p - 1))}
                      className="inline-flex items-center gap-1 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                      صفحه قبل
                    </button>
                    <span className="text-neutral-600">|</span>
                    <button
                      type="button"
                      disabled={!hasNextVideo}
                      onClick={() => setVideoPage((p) => p + 1)}
                      className="inline-flex items-center gap-1 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      صفحه بعد
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* 2.5. Photo Report Band (گزارش تصویری) - Controlled by Admin Layout */}
      {showPhotoBand && (
        <section className="w-full bg-neutral-100 border-y border-neutral-200 py-8 text-neutral-900">
          <div className="max-w-[1140px] mx-auto px-4">
            <SectionHeader
              title="گزارش تصویری"
              onMore={onSelectArticleType ? () => onSelectArticleType('گزارش تصویری') : undefined}
            />

            {photoPageItems.length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed border-neutral-300 rounded bg-white text-xs text-neutral-500">
                هنوز گزارش تصویری در سایت ثبت نشده است.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {photoPageItems.map((item, idx) => (
                    <button
                      key={`cat-photo-${item.id}-${idx}`}
                      type="button"
                      onClick={() => onSelectArticle(item)}
                      className="text-right group cursor-pointer"
                    >
                      <div className="relative aspect-[16/10] rounded-sm overflow-hidden bg-neutral-200 mb-2.5">
                        <SafeImage
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center shadow">
                          <Camera className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d41a24] shrink-0 mt-2" />
                        <h3 className="text-xs font-semibold text-neutral-900 group-hover:text-[#d41a24] leading-5 line-clamp-2">
                          {item.title}
                        </h3>
                      </div>
                    </button>
                  ))}
                </div>

                {photoSource.length > 4 && (
                  <div className="mt-6 flex items-center justify-center gap-4 text-xs text-neutral-600">
                    <button
                      type="button"
                      disabled={photoPage === 0}
                      onClick={() => setPhotoPage((p) => Math.max(0, p - 1))}
                      className="inline-flex items-center gap-1 hover:text-[#d41a24] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                      صفحه قبل
                    </button>
                    <span className="text-neutral-300">|</span>
                    <button
                      type="button"
                      disabled={!hasNextPhoto}
                      onClick={() => setPhotoPage((p) => p + 1)}
                      className="inline-flex items-center gap-1 hover:text-[#d41a24] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      صفحه بعد
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* 3. Archive Latest Headlines + Most Viewed Sidebar */}
      <section className="max-w-[1140px] mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <SectionHeader title="آخرین عناوین" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {archiveItems.map((item, idx) => (
                <button
                  key={`cat-archive-${item.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectArticle(item)}
                  className="w-full flex items-start gap-3 text-right group cursor-pointer"
                >
                  <div className="relative w-24 h-16 shrink-0 rounded-sm overflow-hidden bg-neutral-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      size="small"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {item.contentOrigin === 'original' && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[9px] font-extrabold shadow">
                        اختصاصی
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-2">
                    {item.title}
                  </h3>
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 text-xs text-neutral-600">
              <button
                type="button"
                disabled={archivePage === 0}
                onClick={() => setArchivePage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 hover:text-[#d41a24] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
                صفحه قبل
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                disabled={!hasNextArchive}
                onClick={() => setArchivePage((p) => p + 1)}
                className="inline-flex items-center gap-1 hover:text-[#d41a24] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                صفحه بعد
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <SectionHeader title="پربیننده‌ترین" />
            <div className="space-y-4">
              {mostViewed.map((item, idx) => (
                <button
                  key={`cat-most-viewed-${item.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectArticle(item)}
                  className="w-full flex items-start gap-3 text-right group cursor-pointer"
                >
                  <div className="relative w-24 h-16 shrink-0 rounded-sm overflow-hidden bg-neutral-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      size="small"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {item.contentOrigin === 'original' && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[9px] font-extrabold shadow">
                        اختصاصی
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] bg-[#d41a24] text-white text-[10px] font-bold shrink-0 mt-0.5 tabular-nums">
                      {toPersianDigits(idx + 1)}
                    </span>
                    <h3 className="text-xs font-semibold leading-5 text-neutral-800 group-hover:text-[#d41a24] line-clamp-2">
                      {item.title}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
