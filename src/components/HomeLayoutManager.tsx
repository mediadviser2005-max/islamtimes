import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Columns,
  Edit3,
  Eye,
  EyeOff,
  LayoutGrid,
  LayoutList,
  Minus,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ArticleTypeOption,
  CategoryMediaMode,
  DEFAULT_ARTICLE_TYPES,
  DEFAULT_HERO_CONFIG,
  DEFAULT_HOME_BLOCKS,
  HomeBlockLayout,
  HomeBlockSourceType,
  HomeBlockZone,
  HomeHeroConfig,
  HomeLayoutBlock,
  MenuConfig,
  SECTION_LABELS,
  toPersianDigits,
} from '../types/news';

interface HomeLayoutManagerProps {
  menuConfig: MenuConfig;
  articleTypes?: ArticleTypeOption[];
  onChangeMenuConfig: (next: MenuConfig, autoPersist?: boolean) => void;
  highlightedBlockId?: string | null;
}

const ZONE_META: { key: HomeBlockZone; label: string; desc: string; badgeColor: string }[] = [
  {
    key: 'full-top',
    label: 'نوار تمام‌عرض بالا (زیر بخش سرخط)',
    desc: 'بخش‌هایی که در تمام عرض صفحه و بلافاصله زیر سرخط خبرهای اصلی نمایش داده می‌شوند (مثل ویدیو یا گزارش تصویری).',
    badgeColor: 'bg-neutral-800 text-white',
  },
  {
    key: 'main',
    label: 'ستون اصلی صفحه اول (سمت راست — عریض)',
    desc: 'بدنه اصلی صفحه اول؛ هر باکس می‌تواند تمام‌عرض یا نیم‌عرض (دوتایی کنار هم) باشد.',
    badgeColor: 'bg-[#0b5e85] text-white',
  },
  {
    key: 'sidebar',
    label: 'ستون کناری صفحه اول (سمت چپ — سایدبار)',
    desc: 'ستون کناری در سمت چپ صفحه اول (مثل آخرین عناوین، ورزش، گفت‌وگو).',
    badgeColor: 'bg-[#d41a24] text-white',
  },
  {
    key: 'full-bottom',
    label: 'نوار تمام‌عرض پایین صفحه (قبل از فوتر)',
    desc: 'بخش‌هایی که در پایین صفحه و در تمام عرض قبل از فوتر نمایش داده می‌شوند.',
    badgeColor: 'bg-emerald-700 text-white',
  },
];

const LAYOUT_OPTIONS: { key: HomeBlockLayout; label: string; hint: string }[] = [
  {
    key: 'featured-split',
    label: 'خبر بزرگ + لیست کناری',
    hint: 'یک خبر شاخص با عکس بزرگ و خلاصه + لیست اخبار کناری',
  },
  {
    key: 'lead-with-list',
    label: 'خبر شاخص بالا + لیست زیر آن',
    hint: 'یک تصویر بزرگ در بالا و بقیه مطالب به‌صورت فهرست در پایین',
  },
  {
    key: 'grid-2col',
    label: 'شبکه دو ستونه افقی',
    hint: 'نمایش کارت‌های تصویر و تیتر در دو ستون کنار هم',
  },
  {
    key: 'grid-4col',
    label: 'شبکه ۴ ستونه کارتی',
    hint: 'مناسب بخش‌های تمام‌عرض با ۴ کارت کنار هم',
  },
  {
    key: 'list-compact',
    label: 'لیست افقی فشرده',
    hint: 'فهرست عمودی کارت‌های تصویر کوچک و تیتر',
  },
  {
    key: 'headline-list',
    label: 'فهرست متنی تیترها با فلش',
    hint: 'لیست متنی و سریع تیتر اخبار (بدون تصویر)',
  },
  {
    key: 'avatar-list',
    label: 'لیست با تصویر دایره‌ای',
    hint: 'نمایش با آواتار گرد نویسنده/تصویر + تاریخ (مناسب گفت‌وگو)',
  },
  {
    key: 'media-dark',
    label: 'نوار تیره ویدیو / گزارش تصویری',
    hint: 'پس‌زمینه تیره برای نمایش شاخص ویدیوها یا گزارش‌های تصویری',
  },
];

export function HomeLayoutManager({
  menuConfig,
  articleTypes = DEFAULT_ARTICLE_TYPES,
  onChangeMenuConfig,
  highlightedBlockId,
}: HomeLayoutManagerProps) {
  const activeTypes = articleTypes.length > 0 ? articleTypes : DEFAULT_ARTICLE_TYPES;
  const heroCfg: HomeHeroConfig = menuConfig.heroConfig || DEFAULT_HERO_CONFIG;
  const blocks: HomeLayoutBlock[] = menuConfig.homeBlocks || DEFAULT_HOME_BLOCKS;

  // Build list of available main menus directly from current MenuConfig items
  const menuOptions = menuConfig.items
    .filter((m) => m.key !== 'home')
    .map((m) => ({
      key: m.key,
      label: m.label,
      subsections: m.subsections.map((s) => s.label),
    }));

  // Add Block Builder State
  const firstMenuWithSubs =
    menuOptions.find((m) => m.subsections.length > 0) || menuOptions[0];

  const [newSourceType, setNewSourceType] = useState<HomeBlockSourceType>('menu');
  const [newSectionKey, setNewSectionKey] = useState<string>(
    firstMenuWithSubs?.key || 'west-asia'
  );
  const [newSubsectionLabel, setNewSubsectionLabel] = useState<string>(
    firstMenuWithSubs?.subsections[0] || ''
  );
  const [newSpecialFeedKey, setNewSpecialFeedKey] = useState<'most-viewed' | 'latest'>(
    'most-viewed'
  );
  const [newArticleTypeName, setNewArticleTypeName] = useState<string>(
    activeTypes[0]?.name || 'خبر'
  );
  const [newTitle, setNewTitle] = useState<string>('');
  const [newZone, setNewZone] = useState<HomeBlockZone>('main');
  const [newColSpan, setNewColSpan] = useState<'full' | 'half'>('half');
  const [newLayout, setNewLayout] = useState<HomeBlockLayout>('lead-with-list');
  const [newArticleCount, setNewArticleCount] = useState<number>(4);
  const [newStrictFilter, setNewStrictFilter] = useState<boolean>(true);
  const [newShowNumbers, setNewShowNumbers] = useState<boolean>(false);

  const [editingTitleBlockId, setEditingTitleBlockId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');

  const selectedMenuForNew = menuOptions.find((m) => m.key === newSectionKey);

  const updateHero = (patch: Partial<HomeHeroConfig>) => {
    onChangeMenuConfig({
      ...menuConfig,
      heroConfig: { ...heroCfg, ...patch },
    });
  };

  const updateBlocks = (nextBlocks: HomeLayoutBlock[], autoPersist = false) => {
    onChangeMenuConfig(
      {
        ...menuConfig,
        homeBlocks: nextBlocks,
      },
      autoPersist
    );
  };

  const updateSingleBlock = (
    blockId: string,
    patch: Partial<HomeLayoutBlock>,
    autoPersist = false
  ) => {
    updateBlocks(
      blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      autoPersist
    );
  };

  const handleMoveInZone = (blockId: string, zone: HomeBlockZone, dir: -1 | 1) => {
    const zoneBlocks = blocks.filter((b) => b.zone === zone);
    const idxInZone = zoneBlocks.findIndex((b) => b.id === blockId);
    const targetIdxInZone = idxInZone + dir;
    if (idxInZone < 0 || targetIdxInZone < 0 || targetIdxInZone >= zoneBlocks.length) {
      return;
    }

    const swapTargetId = zoneBlocks[targetIdxInZone].id;
    const globalIdxA = blocks.findIndex((b) => b.id === blockId);
    const globalIdxB = blocks.findIndex((b) => b.id === swapTargetId);
    if (globalIdxA < 0 || globalIdxB < 0) return;

    const copy = [...blocks];
    [copy[globalIdxA], copy[globalIdxB]] = [copy[globalIdxB], copy[globalIdxA]];
    updateBlocks(copy, true);
  };

  const handleDeleteBlock = (blockId: string) => {
    updateBlocks(
      blocks.filter((b) => b.id !== blockId),
      true
    );
  };

  const handleAddBlock = () => {
    let resolvedSection = newSectionKey;
    let resolvedSub: string | null = null;
    let defaultTitle = '';

    if (newSourceType === 'special-feed') {
      resolvedSection = newSpecialFeedKey;
      defaultTitle =
        newSpecialFeedKey === 'most-viewed' ? 'پربیننده‌ترین' : 'آخرین عناوین';
    } else if (newSourceType === 'article-type') {
      resolvedSection = newArticleTypeName;
      defaultTitle = newArticleTypeName;
    } else if (newSourceType === 'submenu') {
      resolvedSub = newSubsectionLabel || selectedMenuForNew?.subsections[0] || '';
      defaultTitle =
        resolvedSub ||
        selectedMenuForNew?.label ||
        SECTION_LABELS[resolvedSection] ||
        resolvedSection;
    } else {
      defaultTitle =
        selectedMenuForNew?.label || SECTION_LABELS[resolvedSection] || resolvedSection;
    }

    const block: HomeLayoutBlock = {
      id: `block-${Date.now()}`,
      enabled: true,
      title: newTitle.trim() || defaultTitle,
      sourceType: newSourceType,
      sectionKey: resolvedSection,
      subsectionLabel: resolvedSub,
      zone: newZone,
      columnSpan: newZone === 'main' ? newColSpan : 'full',
      layout: newLayout,
      articleCount: Math.max(1, Math.min(30, newArticleCount || 4)),
      showNumbers: newShowNumbers,
      strictFilter: newStrictFilter,
    };

    updateBlocks([...blocks, block], true);
    setNewTitle('');
  };

  const resolveSourceBadge = (block: HomeLayoutBlock) => {
    if (block.sourceType === 'special-feed') {
      return block.sectionKey === 'most-viewed'
        ? 'خوراک ویژه: پربیننده‌ترین'
        : 'خوراک ویژه: آخرین عناوین';
    }
    if (block.sourceType === 'article-type') {
      return `نوع مطلب: ${block.sectionKey}`;
    }
    const menuLabel =
      menuOptions.find((m) => m.key === block.sectionKey)?.label ||
      SECTION_LABELS[block.sectionKey] ||
      block.sectionKey;
    if (block.sourceType === 'submenu' && block.subsectionLabel) {
      return `زیرمنو: ${menuLabel} ← ${block.subsectionLabel}`;
    }
    return `منوی اصلی: ${menuLabel}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Hero Settings Card */}
      <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0b5e85]">
              تنظیمات بخش سرخط خبرهای بالای صفحه (Hero)
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              کنترل نمایش، منبع منو/زیرمنو و تعداد اخبار ستون‌های راست و چپ در بالاترین بخش صفحه اول
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateHero({ enabled: !heroCfg.enabled })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer ${
              heroCfg.enabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-neutral-100 border-neutral-300 text-neutral-500'
            }`}
          >
            {heroCfg.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {heroCfg.enabled ? 'نمایش در صفحه اول فعال است' : 'بخش سرخط مخفی است'}
          </button>
        </div>

        {heroCfg.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                منبع سرخط اخبار
              </label>
              <select
                value={heroCfg.sourceType}
                onChange={(e) => {
                  const nextType = e.target.value as 'all' | 'menu' | 'submenu';
                  const fallbackMenu = menuOptions[0]?.key || 'west-asia';
                  const fallbackSub =
                    menuOptions.find((m) => m.key === fallbackMenu)?.subsections[0] || '';
                  updateHero({
                    sourceType: nextType,
                    sectionKey: nextType === 'all' ? 'home' : fallbackMenu,
                    subsectionLabel: nextType === 'submenu' ? fallbackSub : null,
                  });
                }}
                className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-white"
              >
                <option value="all">همه اخبار سایت (خودکار)</option>
                <option value="menu">از یک منوی اصلی خاص</option>
                <option value="submenu">از یک زیرمنو (فرعی) خاص</option>
              </select>
            </div>

            {heroCfg.sourceType !== 'all' && (
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  انتخاب منوی اصلی
                </label>
                <select
                  value={heroCfg.sectionKey}
                  onChange={(e) => {
                    const sec = e.target.value;
                    const firstSub =
                      menuOptions.find((m) => m.key === sec)?.subsections[0] || '';
                    updateHero({
                      sectionKey: sec,
                      subsectionLabel: heroCfg.sourceType === 'submenu' ? firstSub : null,
                    });
                  }}
                  className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-white"
                >
                  {menuOptions.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {heroCfg.sourceType === 'submenu' && (
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  انتخاب زیرمنو
                </label>
                <select
                  value={heroCfg.subsectionLabel || ''}
                  onChange={(e) => updateHero({ subsectionLabel: e.target.value })}
                  className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-white"
                >
                  {(
                    menuOptions.find((m) => m.key === heroCfg.sectionKey)?.subsections || []
                  ).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end gap-3 md:col-span-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  تعداد اخبار ستون راست سرخط
                </label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={heroCfg.sideRightCount}
                  onChange={(e) =>
                    updateHero({
                      sideRightCount: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-white font-mono text-center"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  تعداد اخبار ستون چپ سرخط
                </label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={heroCfg.sideLeftCount}
                  onChange={(e) =>
                    updateHero({
                      sideLeftCount: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-white font-mono text-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1.5. Category/Section Page Video & Photo Report Mode */}
      <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="border-b border-neutral-100 pb-2.5">
          <h3 className="text-sm font-bold text-[#0b5e85]">
            نمایش ویدیو و گزارش تصویری در صفحه بخش‌ها (منوها و زیرمنوها)
          </h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            مشخص کنید در صفحات بخش‌ها و زیرمنوها، نوار «ویدیو»، نوار «گزارش تصویری» یا هر دو با هم نمایش داده شود.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {(
            [
              {
                key: 'both',
                label: 'ویدیو و گزارش تصویری (هر دو با هم)',
                desc: 'نمایش هر دو بخش ویدیو و گزارش تصویری',
              },
              {
                key: 'video',
                label: 'فقط ویدیو',
                desc: 'نمایش صرفاً نوار ویدیو در صفحه بخش‌ها',
              },
              {
                key: 'photo-report',
                label: 'فقط گزارش تصویری',
                desc: 'نمایش صرفاً بخش گزارش تصویری',
              },
              {
                key: 'none',
                label: 'عدم نمایش',
                desc: 'مخفی کردن هر دو در صفحه بخش‌ها',
              },
            ] as { key: CategoryMediaMode; label: string; desc: string }[]
          ).map((opt) => {
            const currentMode: CategoryMediaMode = menuConfig.categoryMediaMode || 'both';
            const isSelected = currentMode === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() =>
                  onChangeMenuConfig(
                    {
                      ...menuConfig,
                      categoryMediaMode: opt.key,
                    },
                    true
                  )
                }
                className={`text-right rounded-md border p-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 border-[#0b5e85] text-[#0b5e85]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="font-bold flex items-center justify-between gap-2">
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Add New Menu or Submenu Block to Home Page */}
      <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
          <Sparkles className="w-4 h-4 text-[#d41a24]" />
          <h3 className="text-sm font-bold text-neutral-900">
            افزودن منوی اصلی یا زیرمنو به چینش صفحه اول
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Source Type */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              نوع بخش
            </label>
            <select
              value={newSourceType}
              onChange={(e) => {
                const nextType = e.target.value as HomeBlockSourceType;
                setNewSourceType(nextType);
                if (nextType === 'submenu' && selectedMenuForNew?.subsections.length) {
                  setNewSubsectionLabel(selectedMenuForNew.subsections[0]);
                }
              }}
              className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white font-semibold"
            >
              <option value="menu">منوی اصلی</option>
              <option value="submenu">زیرمنو (بخش فرعی)</option>
              <option value="article-type">بر اساس نوع مطلب</option>
              <option value="special-feed">خوراک ویژه (پربیننده‌ترین / آخرین)</option>
            </select>
          </div>

          {/* Source Selection */}
          {newSourceType === 'special-feed' ? (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                انتخاب خوراک ویژه
              </label>
              <select
                value={newSpecialFeedKey}
                onChange={(e) =>
                  setNewSpecialFeedKey(e.target.value as 'most-viewed' | 'latest')
                }
                className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
              >
                <option value="most-viewed">پربیننده‌ترین مطالب</option>
                <option value="latest">آخرین عناوین خبری</option>
              </select>
            </div>
          ) : newSourceType === 'article-type' ? (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                انتخاب نوع مطلب
              </label>
              <select
                value={newArticleTypeName}
                onChange={(e) => setNewArticleTypeName(e.target.value)}
                className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
              >
                {activeTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                انتخاب منوی اصلی
              </label>
              <select
                value={newSectionKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setNewSectionKey(key);
                  const matched = menuOptions.find((m) => m.key === key);
                  setNewSubsectionLabel(matched?.subsections[0] || '');
                }}
                className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
              >
                {menuOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submenu Selection */}
          {newSourceType === 'submenu' && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                انتخاب زیرمنو (فرعی)
              </label>
              {selectedMenuForNew && selectedMenuForNew.subsections.length > 0 ? (
                <select
                  value={newSubsectionLabel}
                  onChange={(e) => setNewSubsectionLabel(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
                >
                  {selectedMenuForNew.subsections.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newSubsectionLabel}
                  onChange={(e) => setNewSubsectionLabel(e.target.value)}
                  placeholder="نام زیرمنو را بنویسید..."
                  className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
                />
              )}
            </div>
          )}

          {/* Custom Box Title */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              عنوان نمایشی در صفحه اول (اختیاری)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="پیش‌فرض: نام همان منو یا زیرمنو"
              className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
            />
          </div>

          {/* Zone (Where on Home Page) */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              محل نمایش در صفحه اول (کجا)
            </label>
            <select
              value={newZone}
              onChange={(e) => {
                const z = e.target.value as HomeBlockZone;
                setNewZone(z);
                if (z === 'sidebar') {
                  setNewLayout('headline-list');
                } else if (z === 'full-top' || z === 'full-bottom') {
                  setNewLayout('grid-4col');
                }
              }}
              className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
            >
              <option value="full-top">نوار تمام‌عرض بالا (زیر سرخط)</option>
              <option value="main">ستون اصلی صفحه (سمت راست — عریض)</option>
              <option value="sidebar">ستون کناری صفحه (سمت چپ — سایدبار)</option>
              <option value="full-bottom">نوار تمام‌عرض پایین صفحه</option>
            </select>
          </div>

          {/* Width in Main Zone */}
          {newZone === 'main' && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                پهنا در ستون اصلی
              </label>
              <select
                value={newColSpan}
                onChange={(e) => setNewColSpan(e.target.value as 'full' | 'half')}
                className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
              >
                <option value="full">تمام‌عرض ستون اصلی (تکی)</option>
                <option value="half">نیم‌عرض (دوتایی کنار باکس بعدی)</option>
              </select>
            </div>
          )}

          {/* Layout / Shape */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              شکل و قالب نمایش (چگونه)
            </label>
            <select
              value={newLayout}
              onChange={(e) => setNewLayout(e.target.value as HomeBlockLayout)}
              className="w-full rounded border border-neutral-300 px-2.5 py-2 bg-white"
            >
              {LAYOUT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Article Count */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              تعداد مطلب قابل نمایش
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNewArticleCount((c) => Math.max(1, c - 1))}
                className="w-8 h-8 rounded border border-neutral-300 bg-white hover:bg-neutral-50 flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={1}
                max={30}
                value={newArticleCount}
                onChange={(e) =>
                  setNewArticleCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))
                }
                className="flex-1 text-center rounded border border-neutral-300 py-1.5 bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setNewArticleCount((c) => Math.min(30, c + 1))}
                className="w-8 h-8 rounded border border-neutral-300 bg-white hover:bg-neutral-50 flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
              <input
                type="checkbox"
                checked={newStrictFilter}
                onChange={(e) => setNewStrictFilter(e.target.checked)}
                className="accent-[#0b5e85]"
              />
              <span>فقط مطالب دقیق همین منو/زیرمنو نمایش داده شود</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
              <input
                type="checkbox"
                checked={newShowNumbers}
                onChange={(e) => setNewShowNumbers(e.target.checked)}
                className="accent-[#d41a24]"
              />
              <span>نمایش شماره ردیف (۱، ۲، ۳...)</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleAddBlock}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-xs font-bold cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            افزودن به چینش صفحه اول
          </button>
        </div>
      </div>

      {/* 3. Zone-by-Zone Visual Layout Editor */}
      <div className="space-y-5">
        {ZONE_META.map((zoneInfo) => {
          const zoneBlocks = blocks.filter((b) => b.zone === zoneInfo.key);
          return (
            <div
              key={zoneInfo.key}
              className="bg-white rounded-lg border border-neutral-200 shadow-xs overflow-hidden"
            >
              <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${zoneInfo.badgeColor}`}
                  >
                    {zoneBlocks.length === 0
                      ? 'خالی'
                      : `${toPersianDigits(zoneBlocks.length)} باکس`}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                      {zoneInfo.label}
                    </h4>
                    <p className="text-[11px] text-neutral-500">{zoneInfo.desc}</p>
                  </div>
                </div>
              </div>

              {zoneBlocks.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400">
                  در این ناحیه از صفحه اول هنوز هیچ منو یا زیرمنویی قرار نگرفته است.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {zoneBlocks.map((block, bIdx) => {
                    const currentMenuObj = menuOptions.find(
                      (m) => m.key === block.sectionKey
                    );
                    const isHighlighted = highlightedBlockId === block.id;
                    return (
                      <div
                        key={block.id}
                        className={`p-4 space-y-3 transition-colors ${
                          isHighlighted
                            ? 'bg-sky-50/70 ring-2 ring-inset ring-[#0b5e85]'
                            : !block.enabled
                              ? 'bg-neutral-50/70 opacity-75'
                              : 'bg-white'
                        }`}
                      >
                        {/* Top Row: Order + Title + Source Badge + Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={bIdx === 0}
                                onClick={() =>
                                  handleMoveInZone(block.id, zoneInfo.key, -1)
                                }
                                className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-25 cursor-pointer"
                                title="جابه‌جایی به بالا"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-neutral-600" />
                              </button>
                              <button
                                type="button"
                                disabled={bIdx === zoneBlocks.length - 1}
                                onClick={() =>
                                  handleMoveInZone(block.id, zoneInfo.key, 1)
                                }
                                className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-25 cursor-pointer"
                                title="جابه‌جایی به پایین"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-neutral-600" />
                              </button>
                            </div>

                            <div>
                              {editingTitleBlockId === block.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingTitleValue}
                                    onChange={(e) => setEditingTitleValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (editingTitleValue.trim()) {
                                          updateSingleBlock(
                                            block.id,
                                            { title: editingTitleValue.trim() },
                                            true
                                          );
                                        }
                                        setEditingTitleBlockId(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingTitleBlockId(null);
                                      }
                                    }}
                                    autoFocus
                                    className="rounded border border-[#0b5e85] px-2 py-0.5 text-xs font-bold bg-white w-48"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingTitleValue.trim()) {
                                        updateSingleBlock(
                                          block.id,
                                          { title: editingTitleValue.trim() },
                                          true
                                        );
                                      }
                                      setEditingTitleBlockId(null);
                                    }}
                                    className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-neutral-900">
                                    {block.title}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTitleBlockId(block.id);
                                      setEditingTitleValue(block.title);
                                    }}
                                    className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer"
                                    title="تغییر عنوان باکس"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                      block.sourceType === 'submenu'
                                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                                        : block.sourceType === 'special-feed'
                                          ? 'bg-purple-50 border-purple-200 text-purple-800'
                                          : 'bg-sky-50 border-sky-200 text-[#0b5e85]'
                                    }`}
                                  >
                                    {resolveSourceBadge(block)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() =>
                                updateSingleBlock(
                                  block.id,
                                  { enabled: !block.enabled },
                                  true
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                                block.enabled
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-neutral-100 border-neutral-300 text-neutral-500'
                              }`}
                            >
                              {block.enabled ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                              {block.enabled ? 'فعال' : 'مخفی'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(block.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-[#d41a24] font-semibold cursor-pointer"
                              title="حذف از چینش صفحه اول"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          </div>
                        </div>

                        {/* Bottom Controls Grid: Source, Where, Width, Shape, Count */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-[11px] bg-neutral-50/80 p-3 rounded border border-neutral-200/80">
                          {/* Source Type + Menu/Submenu */}
                          <div>
                            <label className="block text-neutral-500 font-semibold mb-1">
                              منبع مطلب
                            </label>
                            <select
                              value={block.sourceType}
                              onChange={(e) => {
                                const st = e.target.value as HomeBlockSourceType;
                                if (st === 'special-feed') {
                                  updateSingleBlock(block.id, {
                                    sourceType: st,
                                    sectionKey: 'most-viewed',
                                    subsectionLabel: null,
                                  });
                                } else if (st === 'article-type') {
                                  updateSingleBlock(block.id, {
                                    sourceType: st,
                                    sectionKey: activeTypes[0]?.name || 'خبر',
                                    subsectionLabel: null,
                                  });
                                } else {
                                  const firstKey = menuOptions[0]?.key || 'west-asia';
                                  const subs =
                                    menuOptions.find((m) => m.key === firstKey)
                                      ?.subsections || [];
                                  updateSingleBlock(block.id, {
                                    sourceType: st,
                                    sectionKey: firstKey,
                                    subsectionLabel:
                                      st === 'submenu' ? subs[0] || '' : null,
                                  });
                                }
                              }}
                              className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                            >
                              <option value="menu">منوی اصلی</option>
                              <option value="submenu">زیرمنو (فرعی)</option>
                              <option value="article-type">نوع مطلب</option>
                              <option value="special-feed">خوراک ویژه</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-neutral-500 font-semibold mb-1">
                              {block.sourceType === 'special-feed'
                                ? 'نوع خوراک'
                                : block.sourceType === 'article-type'
                                  ? 'نوع مطلب'
                                  : 'منو / بخش'}
                            </label>
                            {block.sourceType === 'special-feed' ? (
                              <select
                                value={block.sectionKey}
                                onChange={(e) =>
                                  updateSingleBlock(block.id, {
                                    sectionKey: e.target.value,
                                  })
                                }
                                className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                              >
                                <option value="most-viewed">پربیننده‌ترین</option>
                                <option value="latest">آخرین عناوین</option>
                              </select>
                            ) : block.sourceType === 'article-type' ? (
                              <select
                                value={block.sectionKey}
                                onChange={(e) =>
                                  updateSingleBlock(block.id, {
                                    sectionKey: e.target.value,
                                  })
                                }
                                className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                              >
                                {!activeTypes.some((t) => t.name === block.sectionKey) && (
                                  <option value={block.sectionKey}>{block.sectionKey}</option>
                                )}
                                {activeTypes.map((t) => (
                                  <option key={t.id} value={t.name}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={block.sectionKey}
                                onChange={(e) => {
                                  const sec = e.target.value;
                                  const subs =
                                    menuOptions.find((m) => m.key === sec)
                                      ?.subsections || [];
                                  updateSingleBlock(block.id, {
                                    sectionKey: sec,
                                    subsectionLabel:
                                      block.sourceType === 'submenu'
                                        ? subs[0] || ''
                                        : null,
                                  });
                                }}
                                className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                              >
                                {!menuOptions.some((m) => m.key === block.sectionKey) && (
                                  <option value={block.sectionKey}>
                                    {SECTION_LABELS[block.sectionKey] || block.sectionKey}
                                  </option>
                                )}
                                {menuOptions.map((m) => (
                                  <option key={m.key} value={m.key}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {block.sourceType === 'submenu' && (
                            <div>
                              <label className="block text-neutral-500 font-semibold mb-1">
                                زیرمنوی انتخابی
                              </label>
                              {currentMenuObj && currentMenuObj.subsections.length > 0 ? (
                                <select
                                  value={block.subsectionLabel || ''}
                                  onChange={(e) =>
                                    updateSingleBlock(block.id, {
                                      subsectionLabel: e.target.value,
                                    })
                                  }
                                  className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                                >
                                  {currentMenuObj.subsections.map((sub) => (
                                    <option key={sub} value={sub}>
                                      {sub}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={block.subsectionLabel || ''}
                                  onChange={(e) =>
                                    updateSingleBlock(block.id, {
                                      subsectionLabel: e.target.value,
                                    })
                                  }
                                  className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                                />
                              )}
                            </div>
                          )}

                          {/* Where on Home Page */}
                          <div>
                            <label className="block text-neutral-500 font-semibold mb-1">
                              موقعیت در صفحه اول
                            </label>
                            <select
                              value={block.zone}
                              onChange={(e) =>
                                updateSingleBlock(
                                  block.id,
                                  { zone: e.target.value as HomeBlockZone },
                                  true
                                )
                              }
                              className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                            >
                              <option value="full-top">تمام‌عرض بالا</option>
                              <option value="main">ستون اصلی (راست)</option>
                              <option value="sidebar">ستون کناری (چپ)</option>
                              <option value="full-bottom">تمام‌عرض پایین</option>
                            </select>
                          </div>

                          {/* Column Span (only in main) */}
                          {block.zone === 'main' && (
                            <div>
                              <label className="block text-neutral-500 font-semibold mb-1">
                                پهنا در ستون اصلی
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSingleBlock(block.id, {
                                    columnSpan:
                                      block.columnSpan === 'half' ? 'full' : 'half',
                                  })
                                }
                                className={`w-full inline-flex items-center justify-center gap-1 rounded border px-2 py-1 font-semibold cursor-pointer ${
                                  block.columnSpan === 'half'
                                    ? 'bg-sky-50 border-sky-200 text-[#0b5e85]'
                                    : 'bg-white border-neutral-300 text-neutral-700'
                                }`}
                              >
                                <Columns className="w-3 h-3" />
                                {block.columnSpan === 'half'
                                  ? 'نیم‌عرض (دوتایی)'
                                  : 'تمام‌عرض (تکی)'}
                              </button>
                            </div>
                          )}

                          {/* Layout Shape */}
                          <div>
                            <label className="block text-neutral-500 font-semibold mb-1">
                              شکل نمایش
                            </label>
                            <select
                              value={block.layout}
                              onChange={(e) =>
                                updateSingleBlock(block.id, {
                                  layout: e.target.value as HomeBlockLayout,
                                })
                              }
                              className="w-full rounded border border-neutral-300 px-2 py-1 bg-white"
                            >
                              {LAYOUT_OPTIONS.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Article Count */}
                          <div>
                            <label className="block text-neutral-500 font-semibold mb-1">
                              تعداد مطلب
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSingleBlock(block.id, {
                                    articleCount: Math.max(1, block.articleCount - 1),
                                  })
                                }
                                className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={block.articleCount}
                                onChange={(e) =>
                                  updateSingleBlock(block.id, {
                                    articleCount: Math.max(
                                      1,
                                      Math.min(30, Number(e.target.value) || 1)
                                    ),
                                  })
                                }
                                className="w-12 text-center border border-neutral-300 rounded py-0.5 bg-white font-mono"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateSingleBlock(block.id, {
                                    articleCount: Math.min(30, block.articleCount + 1),
                                  })
                                }
                                className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Toggles Footer */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-600">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(block.showNumbers)}
                              onChange={(e) =>
                                updateSingleBlock(block.id, {
                                  showNumbers: e.target.checked,
                                })
                              }
                              className="accent-[#d41a24]"
                            />
                            <LayoutList className="w-3 h-3 text-neutral-400" />
                            <span>شماره‌گذاری ردیف‌ها (۱، ۲، ۳...)</span>
                          </label>

                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(block.strictFilter)}
                              onChange={(e) =>
                                updateSingleBlock(block.id, {
                                  strictFilter: e.target.checked,
                                })
                              }
                              className="accent-[#0b5e85]"
                            />
                            <LayoutGrid className="w-3 h-3 text-neutral-400" />
                            <span>فقط مطالب دقیق همین منو/زیرمنو (بدون پر کردن خودکار)</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
