import { Camera, ChevronLeft, Play } from 'lucide-react';
import {
  Article,
  DEFAULT_HERO_CONFIG,
  DEFAULT_HOME_BLOCKS,
  HomeLayoutBlock,
  MenuConfig,
  SECTION_LABELS,
  SectionKey,
  toPersianDigits,
} from '../types/news';
import { SafeImage } from './SafeImage';
import { SectionHeader } from './SectionHeader';

interface HomeViewProps {
  articles: Article[];
  menuConfig: MenuConfig;
  onSelectArticle: (article: Article) => void;
  onSelectSection: (section: SectionKey, subsection?: string | null) => void;
  onSelectArticleType?: (articleType: string) => void;
  onPlayVideoArticle: (article: Article) => void;
}

function CompactHorizontalCard({
  article,
  onClick,
  numberBadge,
}: {
  article: Article;
  onClick: () => void;
  numberBadge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 text-right group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5e85] rounded-sm pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0 sm:p-1 sm:-m-1 sm:border-b-0 transition-colors hover:bg-neutral-50"
    >
      <div className="relative w-28 h-[72px] sm:w-24 sm:h-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
        <SafeImage
          src={article.imageUrl}
          alt={article.title}
          size="small"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        {article.contentOrigin === 'original' && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[9px] font-extrabold shadow">
            اختصاصی
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          {numberBadge !== undefined && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] bg-[#d41a24] text-white text-[10px] font-bold shrink-0 mt-1 sm:mt-0.5 tabular-nums">
              {toPersianDigits(numberBadge)}
            </span>
          )}
          <h3 className="text-[13px] sm:text-xs leading-6 sm:leading-5 font-semibold text-neutral-800 group-hover:text-[#d41a24] transition-colors line-clamp-3 sm:line-clamp-2">
            {article.title}
          </h3>
        </div>
      </div>
    </button>
  );
}

function dedupeArticles(list: Article[]): Article[] {
  const seen = new Set<number>();
  const out: Article[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function resolveBlockArticles(
  block: HomeLayoutBlock,
  articles: Article[],
  nonHero: Article[]
): Article[] {
  const count = Math.max(1, Math.min(30, block.articleCount || 4));

  if (block.sourceType === 'special-feed') {
    if (block.sectionKey === 'most-viewed') {
      return [...articles].sort((a, b) => b.views - a.views).slice(0, count);
    }
    return articles.slice(0, count);
  }

  if (block.sourceType === 'submenu' && block.subsectionLabel) {
    const sub = block.subsectionLabel.trim().toLowerCase();
    const exact = articles.filter(
      (a) =>
        a.subsection.toLowerCase() === sub ||
        a.tags.toLowerCase().includes(sub) ||
        (a.section === block.sectionKey &&
          (a.title.toLowerCase().includes(sub) || a.lead.toLowerCase().includes(sub)))
    );
    if (block.strictFilter) {
      return exact.slice(0, count);
    }
    const parentMatches = articles.filter((a) => a.section === block.sectionKey);
    return dedupeArticles([...exact, ...parentMatches, ...nonHero]).slice(0, count);
  }

  if (block.sourceType === 'article-type') {
    const targetType = block.sectionKey.trim();
    const exact = articles.filter((a) => {
      const aType = a.articleType || (a.isVideo ? 'ویدیو' : 'خبر');
      if (targetType === 'ویدیو') return aType === 'ویدیو' || a.isVideo;
      if (targetType === 'گفتگو') return aType === 'گفتگو' || a.section === 'interview';
      return aType === targetType;
    });
    if (block.strictFilter) {
      return exact.slice(0, count);
    }
    return dedupeArticles([...exact, ...nonHero]).slice(0, count);
  }

  // sourceType === 'menu'
  let exact: Article[];
  if (block.sectionKey === 'world') {
    exact = articles.filter((a) => a.section === 'world' || a.section === 'africa');
  } else if (block.sectionKey === 'home') {
    exact = articles;
  } else {
    exact = articles.filter((a) => a.section === block.sectionKey);
  }

  if (block.strictFilter) {
    return exact.slice(0, count);
  }
  return dedupeArticles([...exact, ...nonHero]).slice(0, count);
}

function renderBlockBody(
  block: HomeLayoutBlock,
  items: Article[],
  inSidebar: boolean,
  onSelectArticle: (article: Article) => void,
  onPlayVideoArticle: (article: Article) => void
) {
  if (items.length === 0) {
    return (
      <div className="py-6 px-4 text-center border border-dashed border-neutral-200 rounded bg-neutral-50 text-xs text-neutral-500">
        هنوز مطلبی برای «{block.title}» ثبت نشده است.
      </div>
    );
  }

  const isVideoItem = (item: Article) =>
    item.isVideo || item.articleType === 'ویدیو' || item.articleType === 'ویدئو';
  const isVideoBlock =
    block.sourceType === 'article-type' &&
    (block.sectionKey === 'ویدیو' || block.sectionKey === 'ویدئو');
  const handleItemClick = (item: Article) => {
    if ((isVideoBlock || block.layout === 'media-dark') && isVideoItem(item)) {
      onPlayVideoArticle(item);
    } else {
      onSelectArticle(item);
    }
  };

  switch (block.layout) {
    case 'featured-split': {
      const mainItem = items[0];
      const sideItems = items.slice(1);
      return (
        <div
          className={`grid grid-cols-1 ${
            inSidebar ? 'gap-4' : 'md:grid-cols-2 gap-4 md:gap-6'
          } items-start`}
        >
          <div>
            <button
              type="button"
              onClick={() => handleItemClick(mainItem)}
              className="w-full text-right group cursor-pointer"
            >
              <div className="relative w-full aspect-[16/10] overflow-hidden rounded-sm bg-neutral-100 mb-2.5">
                <SafeImage
                  src={mainItem.imageUrl}
                  alt={mainItem.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                />
                {mainItem.contentOrigin === 'original' && (
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-sm bg-[#d41a24] text-white text-[11px] font-extrabold shadow">
                    اختصاصی
                  </span>
                )}
              </div>
              <div className="flex items-start gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d41a24] shrink-0 mt-2.5 sm:mt-2" />
                <h3 className="text-[15px] sm:text-sm font-bold text-neutral-900 group-hover:text-[#d41a24] leading-7 sm:leading-6">
                  {mainItem.title}
                </h3>
              </div>
              <p className="text-[13px] sm:text-xs leading-6 sm:leading-5 text-neutral-600 line-clamp-3">
                {mainItem.lead}
              </p>
            </button>
          </div>

          {sideItems.length > 0 && (
            <div className="space-y-3 sm:space-y-3.5 pt-3 border-t border-neutral-100 md:pt-0 md:border-t-0">
              {sideItems.map((item, idx) => (
                <CompactHorizontalCard
                  key={`${block.id}-fs-${item.id}-${idx}`}
                  article={item}
                  numberBadge={block.showNumbers ? idx + 2 : undefined}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'lead-with-list': {
      const leadItem = items[0];
      const rest = items.slice(1);
      return (
        <div>
          <button
            type="button"
            onClick={() => handleItemClick(leadItem)}
            className="w-full text-right group cursor-pointer mb-3.5 sm:mb-4 pb-3 border-b border-neutral-100 sm:pb-0 sm:border-b-0 block"
          >
            <div className="relative w-full aspect-[16/10] overflow-hidden rounded-sm bg-neutral-100 mb-2">
              <SafeImage
                src={leadItem.imageUrl}
                alt={leadItem.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
              />
              {leadItem.contentOrigin === 'original' && (
                <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-sm bg-[#d41a24] text-white text-[11px] font-extrabold shadow">
                  اختصاصی
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d41a24] shrink-0 mt-2.5 sm:mt-2" />
              <h3 className="text-[15px] sm:text-sm font-bold text-neutral-900 group-hover:text-[#d41a24] leading-7 sm:leading-6">
                {leadItem.title}
              </h3>
            </div>
            <p
              className={`text-[13px] sm:text-xs leading-6 sm:leading-5 text-neutral-600 line-clamp-2 ${
                inSidebar ? 'block' : 'block sm:hidden'
              }`}
            >
              {leadItem.lead}
            </p>
          </button>

          {rest.length > 0 && (
            <div className="space-y-3 sm:space-y-3.5">
              {rest.map((item, idx) => (
                <CompactHorizontalCard
                  key={`${block.id}-lwl-${item.id}-${idx}`}
                  article={item}
                  numberBadge={block.showNumbers ? idx + 2 : undefined}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'grid-2col': {
      return (
        <div
          className={`grid grid-cols-1 ${
            inSidebar ? 'gap-3 sm:gap-3.5' : 'gap-3 md:grid-cols-2 md:gap-x-6 md:gap-y-4'
          }`}
        >
          {items.map((item, index) => (
            <CompactHorizontalCard
              key={`${block.id}-g2-${item.id}-${index}`}
              article={item}
              numberBadge={block.showNumbers ? index + 1 : undefined}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      );
    }

    case 'grid-4col': {
      return (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            inSidebar ? 'lg:grid-cols-1' : 'lg:grid-cols-4'
          } gap-4 sm:gap-5`}
        >
          {items.map((item, idx) => (
            <button
              key={`${block.id}-g4-${item.id}-${idx}`}
              type="button"
              onClick={() => handleItemClick(item)}
              className="text-right group cursor-pointer pb-3.5 border-b border-neutral-100 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0"
            >
              <div className="relative aspect-[16/10] rounded-sm overflow-hidden bg-neutral-100 mb-2">
                <SafeImage
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {item.contentOrigin === 'original' && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-sm bg-[#d41a24] text-white text-[10px] font-extrabold shadow">
                    اختصاصی
                  </span>
                )}
              </div>
              <div className="flex items-start gap-1.5">
                {block.showNumbers ? (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] bg-[#d41a24] text-white text-[10px] font-bold shrink-0 mt-1 sm:mt-0.5 tabular-nums">
                    {toPersianDigits(idx + 1)}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d41a24] shrink-0 mt-2.5 sm:mt-2" />
                )}
                <h3 className="text-[14px] sm:text-xs font-bold text-neutral-900 group-hover:text-[#d41a24] leading-6 sm:leading-5 line-clamp-2">
                  {item.title}
                </h3>
              </div>
            </button>
          ))}
        </div>
      );
    }

    case 'list-compact': {
      return (
        <div className="space-y-3 sm:space-y-3.5">
          {items.map((item, idx) => (
            <CompactHorizontalCard
              key={`${block.id}-lc-${item.id}-${idx}`}
              article={item}
              numberBadge={block.showNumbers ? idx + 1 : undefined}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      );
    }

    case 'headline-list': {
      return (
        <div className="divide-y divide-neutral-200 border-b border-neutral-200">
          {items.map((item, idx) => (
            <button
              key={`${block.id}-hl-${item.id}-${idx}`}
              type="button"
              onClick={() => handleItemClick(item)}
              className="w-full py-3 sm:py-2.5 flex items-center justify-between gap-2.5 text-right group cursor-pointer"
            >
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                {block.showNumbers && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] bg-[#d41a24] text-white text-[10px] font-bold shrink-0 mt-1 sm:mt-0 tabular-nums">
                    {toPersianDigits(idx + 1)}
                  </span>
                )}
                <span className="text-[13px] sm:text-xs leading-6 sm:leading-5 text-neutral-800 group-hover:text-[#d41a24] transition-colors line-clamp-2 sm:line-clamp-1 font-medium">
                  {item.title}
                </span>
              </div>
              <span className="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-neutral-200 group-hover:bg-[#d41a24] text-neutral-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <ChevronLeft className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      );
    }

    case 'avatar-list': {
      return (
        <div className="space-y-3 sm:space-y-3.5">
          {items.map((item, idx) => (
            <button
              key={`${block.id}-av-${item.id}-${idx}`}
              type="button"
              onClick={() => handleItemClick(item)}
              className="w-full flex items-center gap-3 text-right group cursor-pointer pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200">
                <SafeImage
                  src={item.authorAvatar || item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13.5px] sm:text-xs font-semibold text-neutral-800 group-hover:text-[#d41a24] leading-6 sm:leading-5 line-clamp-2 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1 tabular-nums">
                  {item.publishedLabel.split(' ساعت')[0] || '۱۴ فروردین ۱۴۰۵'}
                </p>
              </div>
            </button>
          ))}
        </div>
      );
    }

    case 'media-dark': {
      const mediaMain = items[0];
      const mediaSide = items.slice(1, 4);
      const extraMedia = items.slice(4);

      if (inSidebar) {
        return (
          <div className="space-y-3">
            {items.map((vid, idx) => {
              const itemIsVideo = isVideoItem(vid);
              return (
                <button
                  key={`${block.id}-mside-${vid.id}-${idx}`}
                  type="button"
                  onClick={() => handleItemClick(vid)}
                  className="relative w-full aspect-[16/9] rounded-sm overflow-hidden group cursor-pointer block bg-black"
                >
                  <SafeImage
                    src={vid.imageUrl}
                    alt={vid.title}
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-10 h-10 rounded-full bg-white/80 group-hover:bg-white text-neutral-900 flex items-center justify-center shadow">
                      {itemIsVideo ? (
                        <Play className="w-4 h-4 fill-current mr-[-2px]" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </span>
                  </div>
                  <div className="absolute bottom-2 inset-x-3 text-right">
                    <p className="text-xs sm:text-[11px] font-semibold text-white line-clamp-2 sm:line-clamp-1">
                      {vid.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      const mainIsVideo = isVideoItem(mediaMain);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            <div className={mediaSide.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <button
                type="button"
                onClick={() => handleItemClick(mediaMain)}
                className="relative w-full h-full min-h-[210px] sm:min-h-[260px] md:min-h-[360px] rounded-sm overflow-hidden group cursor-pointer block text-right bg-black"
              >
                <SafeImage
                  src={mediaMain.imageUrl}
                  alt={mediaMain.title}
                  className="w-full h-full object-cover opacity-90 group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/80 group-hover:bg-white text-neutral-900 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                    {mainIsVideo ? (
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current mr-[-2px]" />
                    ) : (
                      <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
                    )}
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 md:p-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  <span className="text-sm sm:text-base md:text-lg font-bold text-white leading-6 line-clamp-2 sm:line-clamp-1">
                    {mediaMain.title}
                  </span>
                </div>
              </button>
            </div>

            {mediaSide.length > 0 && (
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-col gap-3 justify-between">
                {mediaSide.map((vid, idx) => {
                  const sideIsVideo = isVideoItem(vid);
                  return (
                    <button
                      key={`${block.id}-ms-${vid.id}-${idx}`}
                      type="button"
                      onClick={() => handleItemClick(vid)}
                      className="relative w-full flex-1 min-h-[140px] sm:min-h-[120px] lg:min-h-[108px] rounded-sm overflow-hidden group cursor-pointer block bg-black"
                    >
                      <SafeImage
                        src={vid.imageUrl}
                        alt={vid.title}
                        className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full bg-white/80 group-hover:bg-white text-neutral-900 flex items-center justify-center shadow transition-transform group-hover:scale-105">
                          {sideIsVideo ? (
                            <Play className="w-4 h-4 fill-current mr-[-2px]" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                      <div className="absolute bottom-2 inset-x-3 text-right">
                        <p className="text-xs sm:text-[11px] font-semibold text-white line-clamp-2 sm:line-clamp-1">
                          {vid.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {extraMedia.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {extraMedia.map((vid, idx) => {
                const extraIsVideo = isVideoItem(vid);
                return (
                  <button
                    key={`${block.id}-mextra-${vid.id}-${idx}`}
                    type="button"
                    onClick={() => handleItemClick(vid)}
                    className="relative w-full aspect-[16/10] rounded-sm overflow-hidden group cursor-pointer block bg-black"
                  >
                    <SafeImage
                      src={vid.imageUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-10 h-10 rounded-full bg-white/80 group-hover:bg-white text-neutral-900 flex items-center justify-center shadow">
                        {extraIsVideo ? (
                          <Play className="w-4 h-4 fill-current mr-[-2px]" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </span>
                    </div>
                    <div className="absolute bottom-2 inset-x-3 text-right">
                      <p className="text-[11px] font-semibold text-white line-clamp-1">
                        {vid.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  }
}

export function HomeView({
  articles,
  menuConfig,
  onSelectArticle,
  onSelectSection,
  onSelectArticleType,
  onPlayVideoArticle,
}: HomeViewProps) {
  if (articles.length === 0) {
    return (
      <div className="max-w-[1140px] mx-auto px-4 py-16 text-center text-neutral-500 text-sm">
        خبری برای نمایش یافت نشد.
      </div>
    );
  }

  const heroCfg = menuConfig.heroConfig || DEFAULT_HERO_CONFIG;
  const blocks = (menuConfig.homeBlocks && menuConfig.homeBlocks.length > 0
    ? menuConfig.homeBlocks
    : DEFAULT_HOME_BLOCKS
  ).filter((b) => b.enabled);

  // Hero pool
  let heroPool = articles;
  if (heroCfg.sourceType === 'menu' && heroCfg.sectionKey !== 'home') {
    const matched = articles.filter((a) => a.section === heroCfg.sectionKey);
    if (matched.length > 0) heroPool = dedupeArticles([...matched, ...articles]);
  } else if (heroCfg.sourceType === 'submenu' && heroCfg.subsectionLabel) {
    const sub = heroCfg.subsectionLabel.toLowerCase();
    const matched = articles.filter(
      (a) =>
        a.subsection.toLowerCase() === sub ||
        a.tags.toLowerCase().includes(sub) ||
        a.title.toLowerCase().includes(sub)
    );
    if (matched.length > 0) heroPool = dedupeArticles([...matched, ...articles]);
  }

  const heroMain = heroPool.find((a) => a.isHeroMain) || heroPool[0];
  const nonHero = articles.filter((a) => a.id !== heroMain.id);
  const heroPoolNonHero = heroPool.filter((a) => a.id !== heroMain.id);

  const rightCount = Math.max(0, Math.min(12, heroCfg.sideRightCount ?? 6));
  const leftCount = Math.max(0, Math.min(12, heroCfg.sideLeftCount ?? 6));
  const heroRight = heroPoolNonHero.slice(0, rightCount);
  const heroLeft = heroPoolNonHero.slice(rightCount, rightCount + leftCount);

  const fullTopBlocks = blocks.filter((b) => b.zone === 'full-top');
  const mainBlocks = blocks.filter((b) => b.zone === 'main');
  const sidebarBlocks = blocks.filter((b) => b.zone === 'sidebar');
  const fullBottomBlocks = blocks.filter((b) => b.zone === 'full-bottom');

  const handleMore = (block: HomeLayoutBlock) => {
    if (block.sourceType === 'special-feed') {
      onSelectSection('asia', null);
      return;
    }
    if (block.sourceType === 'article-type') {
      if (onSelectArticleType) {
        onSelectArticleType(block.sectionKey);
      } else if (block.sectionKey === 'گفتگو') {
        onSelectSection('interview', null);
      } else {
        onSelectSection('west-asia', null);
      }
      return;
    }
    if (block.sourceType === 'submenu' && block.subsectionLabel) {
      onSelectSection(block.sectionKey, block.subsectionLabel);
      return;
    }
    onSelectSection(block.sectionKey || 'home', null);
  };

  // Group main column blocks into full-width and half-width pairs
  type MainRow =
    | { type: 'full'; block: HomeLayoutBlock }
    | { type: 'pair'; blocks: HomeLayoutBlock[] };

  const mainRows: MainRow[] = [];
  for (const b of mainBlocks) {
    if (b.columnSpan === 'half') {
      const last = mainRows[mainRows.length - 1];
      if (last && last.type === 'pair' && last.blocks.length < 2) {
        last.blocks.push(b);
      } else {
        mainRows.push({ type: 'pair', blocks: [b] });
      }
    } else {
      mainRows.push({ type: 'full', block: b });
    }
  }

  const resolveBlockTitle = (block: HomeLayoutBlock) => {
    if (block.sourceType === 'menu') {
      const matchingMenu = menuConfig.items.find((m) => m.key === block.sectionKey);
      if (
        matchingMenu &&
        (!block.title || block.title === SECTION_LABELS[block.sectionKey])
      ) {
        return matchingMenu.label;
      }
    }
    return block.title;
  };

  const renderFullWidthBand = (block: HomeLayoutBlock) => {
    const items = resolveBlockArticles(block, articles, nonHero);
    const isDark = block.layout === 'media-dark';
    const displayTitle = resolveBlockTitle(block);
    return (
      <section
        key={block.id}
        className={`w-full py-6 sm:py-8 ${
          isDark ? 'bg-[#242424] text-white' : 'bg-white text-neutral-900 border-t border-neutral-100'
        }`}
      >
        <div className="max-w-[1140px] mx-auto px-3.5 sm:px-4">
          <SectionHeader
            title={displayTitle}
            subtitle={block.sourceType === 'submenu' && block.subsectionLabel && block.subsectionLabel !== displayTitle ? block.subsectionLabel : undefined}
            dark={isDark}
            onMore={() => handleMore(block)}
          />
          {renderBlockBody(block, items, false, onSelectArticle, onPlayVideoArticle)}
        </div>
      </section>
    );
  };

  const renderColumnBlock = (block: HomeLayoutBlock, inSidebar: boolean) => {
    const items = resolveBlockArticles(block, articles, nonHero);
    const isDark = block.layout === 'media-dark';
    const displayTitle = resolveBlockTitle(block);
    return (
      <div
        key={block.id}
        className={isDark ? 'bg-[#242424] text-white p-3.5 sm:p-4 rounded-sm' : ''}
      >
        <SectionHeader
          title={displayTitle}
          subtitle={block.sourceType === 'submenu' && block.subsectionLabel && block.subsectionLabel !== displayTitle ? block.subsectionLabel : undefined}
          dark={isDark}
          onMore={() => handleMore(block)}
        />
        {renderBlockBody(block, items, inSidebar, onSelectArticle, onPlayVideoArticle)}
      </div>
    );
  };

  return (
    <main className="w-full">
      {/* 1. Top 3-Column Hero Grid */}
      {heroCfg.enabled && (
        <section className="max-w-[1140px] mx-auto px-3.5 sm:px-4 pt-4 sm:pt-8 pb-6 sm:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Right Column */}
            {rightCount > 0 && (
              <div className="lg:col-span-3 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 lg:block lg:space-y-4 order-2 lg:order-1 pt-3 border-t border-neutral-100 lg:pt-0 lg:border-t-0">
                {heroRight.map((item, idx) => (
                  <CompactHorizontalCard
                    key={`hero-right-${item.id}-${idx}`}
                    article={item}
                    onClick={() => onSelectArticle(item)}
                  />
                ))}
              </div>
            )}

            {/* Center Column: Dominant Lead Story */}
            <div
              className={`order-1 lg:order-2 ${
                rightCount > 0 && leftCount > 0
                  ? 'lg:col-span-6'
                  : rightCount > 0 || leftCount > 0
                    ? 'lg:col-span-9'
                    : 'lg:col-span-12'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectArticle(heroMain)}
                className="w-full text-right group cursor-pointer focus:outline-none"
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
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-[#d41a24] shrink-0 mt-3 sm:mt-2.5"
                    aria-hidden="true"
                  />
                  <h1 className="text-[18px] sm:text-lg md:text-xl font-extrabold text-neutral-900 group-hover:text-[#d41a24] transition-colors leading-8 sm:leading-snug">
                    {heroMain.title}
                  </h1>
                </div>
                {heroMain.subtitle && (
                  <p className="text-xs sm:text-[13px] font-semibold text-neutral-700 mb-1.5 pr-4">
                    {heroMain.subtitle}
                  </p>
                )}
                <p className="text-[13.5px] sm:text-[13px] leading-7 sm:leading-6 text-neutral-700 sm:text-neutral-600 line-clamp-3">
                  {heroMain.lead}
                </p>
              </button>
            </div>

            {/* Left Column */}
            {leftCount > 0 && (
              <div className="lg:col-span-3 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 lg:block lg:space-y-4 order-3 pt-3 border-t border-neutral-100 lg:pt-0 lg:border-t-0">
                {heroLeft.map((item, idx) => (
                  <CompactHorizontalCard
                    key={`hero-left-${item.id}-${idx}`}
                    article={item}
                    onClick={() => onSelectArticle(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Full-Width Top Bands */}
      {fullTopBlocks.map(renderFullWidthBand)}

      {/* 3. Main Content + Left Sidebar */}
      {(mainRows.length > 0 || sidebarBlocks.length > 0) && (
        <section className="max-w-[1140px] mx-auto px-3.5 sm:px-4 pt-5 sm:pt-8 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-8 items-start">
            {/* Right Main Column (8 cols, or 12 if sidebar is empty) */}
            {mainRows.length > 0 && (
              <div
                className={`${
                  sidebarBlocks.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'
                } space-y-7 sm:space-y-10`}
              >
                {mainRows.map((row, rIdx) =>
                  row.type === 'full' ? (
                    renderColumnBlock(row.block, false)
                  ) : (
                    <div
                      key={`pair-${row.blocks.map((b) => b.id).join('-')}-${rIdx}`}
                      className="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-6"
                    >
                      {row.blocks.map((b) => renderColumnBlock(b, false))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Left Sidebar (4 cols, or 12 if main is empty) */}
            {sidebarBlocks.length > 0 && (
              <aside
                className={`${
                  mainRows.length > 0 ? 'lg:col-span-4' : 'lg:col-span-12'
                } space-y-7 sm:space-y-10 pt-5 border-t border-neutral-200 lg:pt-0 lg:border-t-0`}
              >
                {sidebarBlocks.map((block) => renderColumnBlock(block, true))}
              </aside>
            )}
          </div>
        </section>
      )}

      {/* 4. Full-Width Bottom Bands */}
      {fullBottomBlocks.map(renderFullWidthBand)}
    </main>
  );
}
