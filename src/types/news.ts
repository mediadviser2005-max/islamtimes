export interface ArticleAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface ArticleGalleryItem {
  id: string;
  url: string;
  caption?: string;
}

export interface ArticleVideoItem {
  id: string;
  url: string;
  title?: string;
  mimeType?: string;
}

export interface Article {
  id: number;
  code: string;
  language: string;
  section: string;
  subsection: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  lead: string;
  body: string;
  imageUrl: string;
  authorName: string;
  authorAvatar: string;
  sourceId?: number | null;
  sourceName: string;
  sourceUrl?: string;
  contentOrigin?: 'quoted' | 'original' | '';
  articleType?: string;
  status?: 'published' | 'draft';
  publishedLabel: string;
  tags: string;
  attachments?: string;
  galleryImages?: string;
  videos?: string;
  isFeatured: boolean;
  isHeroMain: boolean;
  isVideo: boolean;
  videoDuration?: string | null;
  views: number;
  likes: number;
  createdAt?: string;
}

export interface NewsSource {
  id: number;
  name: string;
  url: string;
  createdAt?: string;
}

export interface ArticleTypeOption {
  id: string;
  name: string;
  code: string;
  description: string;
  isDefault?: boolean;
}

export const DEFAULT_ARTICLE_TYPES: ArticleTypeOption[] = [
  {
    id: 'type-news',
    name: 'خبر',
    code: 'news',
    description: 'اخبار عادی و گزارش‌های روز تحریریه',
    isDefault: true,
  },
  {
    id: 'type-breaking',
    name: 'خبرفوری',
    code: 'breaking',
    description: 'اخبار و رویدادهای فوری با اولویت بالا',
  },
  {
    id: 'type-opinion',
    name: 'دیدگاه',
    code: 'opinion',
    description: 'یادداشت‌ها، سرمقاله‌ها و تحلیل‌های سیاسی و راهبردی',
  },
  {
    id: 'type-interview',
    name: 'گفتگو',
    code: 'interview',
    description: 'مصاحبه‌ها و گفت‌وگوهای اختصاصی با شخصیت‌ها و کارشناسان',
  },
  {
    id: 'type-photo-report',
    name: 'گزارش تصویری',
    code: 'photo-report',
    description: 'گزارش‌های مصور و مجموعه‌عکس‌های خبری',
  },
  {
    id: 'type-video',
    name: 'ویدیو',
    code: 'video',
    description: 'اخبار و گزارش‌های ویدئویی و چندرسانه‌ای',
  },
];

export const ARTICLE_TYPE_NAMES = DEFAULT_ARTICLE_TYPES.map((t) => t.name);

export interface CommentItem {
  id: number;
  articleId: number;
  userId?: number | null;
  parentId?: number | null;
  authorName: string;
  authorEmail: string;
  showEmail: boolean;
  content: string;
  likes: number;
  dislikes: number;
  publishedLabel: string;
  createdAt?: string;
}

export interface VideoAnimationItem {
  id: number;
  userId: number;
  title: string;
  prompt: string;
  aspectRatio: string;
  sourceImageUrl?: string | null;
  videoData: string;
  mimeType: string;
  createdAt?: string;
}

export type SectionKey =
  | 'home'
  | 'asia'
  | 'west-asia'
  | 'africa'
  | 'europe'
  | 'america'
  | 'special'
  | 'sports'
  | 'interview'
  | 'world'
  | (string & {});

export const SECTION_LABELS: Record<string, string> = {
  home: 'صفحه نخست',
  'west-asia': 'غرب آسیا',
  asia: 'آسیا',
  africa: 'آفریقا',
  europe: 'اروپا',
  america: 'آمریکا',
  special: 'بخش‌های ویژه',
  sports: 'ورزش',
  interview: 'گفت‌وگو',
  world: 'جهان',
};

export const SECTION_SUBSECTIONS: Record<string, string[]> = {
  'west-asia': [
    'لبنان',
    'فلسطین',
    'عراق',
    'ایران',
    'یمن',
    'سوریه',
    'بحرین',
    'عربستان سعودی',
    'قطر',
    'امارات متحده',
    'عمان',
    'اردن',
    'پاکستان',
    'افغانستان',
  ],
  asia: ['ترکیه', 'آذربایجان', 'چین', 'هند', 'اندونزی'],
  africa: ['مصر', 'سودان', 'لیبی', 'تونس', 'صومالی'],
  europe: ['روسیه', 'انگلیس', 'فرانسه', 'آلمان', 'اسپانیا'],
  america: ['ایالات متحده', 'آمریکای لاتین'],
  special: [
    'اختصاصی اسلام تایمز',
    'روز قدس',
    'شهید القدس',
    'سالگرد امام خمینی',
    'سالگرد رهبر شهید',
  ],
};

export type HomeBlockZone = 'full-top' | 'main' | 'sidebar' | 'full-bottom';

export type HomeBlockLayout =
  | 'featured-split'
  | 'lead-with-list'
  | 'grid-2col'
  | 'grid-4col'
  | 'list-compact'
  | 'headline-list'
  | 'avatar-list'
  | 'media-dark';

export type HomeBlockSourceType = 'menu' | 'submenu' | 'article-type' | 'special-feed';

export interface HomeLayoutBlock {
  id: string;
  enabled: boolean;
  title: string;
  sourceType: HomeBlockSourceType;
  sectionKey: string;
  subsectionLabel?: string | null;
  zone: HomeBlockZone;
  columnSpan?: 'full' | 'half';
  layout: HomeBlockLayout;
  articleCount: number;
  showNumbers?: boolean;
  strictFilter?: boolean;
}

export interface HomeHeroConfig {
  enabled: boolean;
  sourceType: 'all' | 'menu' | 'submenu';
  sectionKey: string;
  subsectionLabel?: string | null;
  sideRightCount: number;
  sideLeftCount: number;
}

export interface SubmenuItemConfig {
  id: string;
  label: string;
  showOnHome: boolean;
  showOnMenuPage: boolean;
}

export interface MainMenuItemConfig {
  id: string;
  key: string;
  label: string;
  description?: string;
  showOnHome: boolean;
  showOnMenuPage: boolean;
  homeSubmenuLimit: number;
  menuPageSubmenuLimit: number;
  subsections: SubmenuItemConfig[];
}

export type CategoryMediaMode = 'video' | 'photo-report' | 'both' | 'none';

export interface MenuConfig {
  showMainMenuOnHome: boolean;
  maxMainMenusOnHome: number;
  showSubmenusOnHome: boolean;
  maxSubmenusOnHome: number;
  showMainMenuOnMenuPage: boolean;
  maxMainMenusOnMenuPage: number;
  showSubmenusOnMenuPage: boolean;
  maxSubmenusOnMenuPage: number;
  categoryMediaMode?: CategoryMediaMode;
  items: MainMenuItemConfig[];
  heroConfig?: HomeHeroConfig;
  homeBlocks?: HomeLayoutBlock[];
}

export const DEFAULT_HERO_CONFIG: HomeHeroConfig = {
  enabled: true,
  sourceType: 'all',
  sectionKey: 'home',
  subsectionLabel: null,
  sideRightCount: 6,
  sideLeftCount: 6,
};

export const DEFAULT_HOME_BLOCKS: HomeLayoutBlock[] = [
  {
    id: 'block-video',
    enabled: true,
    title: 'ویدیو',
    sourceType: 'article-type',
    sectionKey: 'ویدیو',
    zone: 'full-top',
    columnSpan: 'full',
    layout: 'media-dark',
    articleCount: 4,
    strictFilter: false,
  },
  {
    id: 'block-photo-report',
    enabled: true,
    title: 'گزارش تصویری',
    sourceType: 'article-type',
    sectionKey: 'گزارش تصویری',
    zone: 'full-top',
    columnSpan: 'full',
    layout: 'grid-4col',
    articleCount: 4,
    strictFilter: false,
  },
  {
    id: 'block-most-viewed',
    enabled: true,
    title: 'پربیننده‌ترین',
    sourceType: 'special-feed',
    sectionKey: 'most-viewed',
    zone: 'main',
    columnSpan: 'full',
    layout: 'grid-2col',
    articleCount: 6,
    showNumbers: true,
    strictFilter: false,
  },
  {
    id: 'block-special',
    enabled: true,
    title: 'بخش‌های ویژه',
    sourceType: 'menu',
    sectionKey: 'special',
    zone: 'main',
    columnSpan: 'full',
    layout: 'featured-split',
    articleCount: 5,
    strictFilter: false,
  },
  {
    id: 'block-west-asia',
    enabled: true,
    title: 'غرب آسیا',
    sourceType: 'menu',
    sectionKey: 'west-asia',
    zone: 'main',
    columnSpan: 'half',
    layout: 'lead-with-list',
    articleCount: 3,
    strictFilter: false,
  },
  {
    id: 'block-world',
    enabled: true,
    title: 'دیدگاه',
    sourceType: 'article-type',
    sectionKey: 'دیدگاه',
    zone: 'main',
    columnSpan: 'half',
    layout: 'lead-with-list',
    articleCount: 3,
    strictFilter: false,
  },
  {
    id: 'block-america',
    enabled: true,
    title: 'آمریکا',
    sourceType: 'menu',
    sectionKey: 'america',
    zone: 'main',
    columnSpan: 'full',
    layout: 'featured-split',
    articleCount: 5,
    strictFilter: false,
  },
  {
    id: 'block-asia',
    enabled: true,
    title: 'آسیا',
    sourceType: 'menu',
    sectionKey: 'asia',
    zone: 'main',
    columnSpan: 'half',
    layout: 'list-compact',
    articleCount: 4,
    strictFilter: false,
  },
  {
    id: 'block-europe',
    enabled: true,
    title: 'اروپا',
    sourceType: 'menu',
    sectionKey: 'europe',
    zone: 'main',
    columnSpan: 'half',
    layout: 'list-compact',
    articleCount: 4,
    strictFilter: false,
  },
  {
    id: 'block-latest',
    enabled: true,
    title: 'آخرین عناوین',
    sourceType: 'special-feed',
    sectionKey: 'latest',
    zone: 'sidebar',
    columnSpan: 'full',
    layout: 'headline-list',
    articleCount: 8,
    strictFilter: false,
  },
  {
    id: 'block-sports',
    enabled: true,
    title: 'ورزش',
    sourceType: 'menu',
    sectionKey: 'sports',
    zone: 'sidebar',
    columnSpan: 'full',
    layout: 'lead-with-list',
    articleCount: 6,
    strictFilter: false,
  },
  {
    id: 'block-interview',
    enabled: true,
    title: 'گفت‌وگو',
    sourceType: 'menu',
    sectionKey: 'interview',
    zone: 'sidebar',
    columnSpan: 'full',
    layout: 'avatar-list',
    articleCount: 8,
    strictFilter: false,
  },
];

function makeSubs(key: string, labels: string[]): SubmenuItemConfig[] {
  return labels.map((label, idx) => ({
    id: `${key}-sub-${idx + 1}`,
    label,
    showOnHome: true,
    showOnMenuPage: true,
  }));
}

export const DEFAULT_MENU_CONFIG: MenuConfig = {
  showMainMenuOnHome: true,
  maxMainMenusOnHome: 7,
  showSubmenusOnHome: true,
  maxSubmenusOnHome: 14,
  showMainMenuOnMenuPage: true,
  maxMainMenusOnMenuPage: 7,
  showSubmenusOnMenuPage: true,
  maxSubmenusOnMenuPage: 14,
  categoryMediaMode: 'both',
  heroConfig: DEFAULT_HERO_CONFIG,
  homeBlocks: DEFAULT_HOME_BLOCKS,
  items: [
    {
      id: 'menu-home',
      key: 'home',
      label: 'صفحه نخست',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: [],
    },
    {
      id: 'menu-west-asia',
      key: 'west-asia',
      label: 'غرب آسیا',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: makeSubs('west-asia', SECTION_SUBSECTIONS['west-asia']),
    },
    {
      id: 'menu-asia',
      key: 'asia',
      label: 'آسیا',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: makeSubs('asia', SECTION_SUBSECTIONS.asia),
    },
    {
      id: 'menu-africa',
      key: 'africa',
      label: 'آفریقا',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: makeSubs('africa', SECTION_SUBSECTIONS.africa),
    },
    {
      id: 'menu-europe',
      key: 'europe',
      label: 'اروپا',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: makeSubs('europe', SECTION_SUBSECTIONS.europe),
    },
    {
      id: 'menu-america',
      key: 'america',
      label: 'آمریکا',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: makeSubs('america', SECTION_SUBSECTIONS.america),
    },
    {
      id: 'menu-special',
      key: 'special',
      label: 'بخش‌های ویژه',
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: makeSubs('special', SECTION_SUBSECTIONS.special),
    },
  ],
};

export function normalizeMenuConfig(raw?: Partial<MenuConfig> | null): MenuConfig {
  if (!raw || !Array.isArray(raw.items)) {
    return DEFAULT_MENU_CONFIG;
  }

  const migratedBlocks: HomeLayoutBlock[] | undefined =
    Array.isArray(raw.homeBlocks) && raw.homeBlocks.length > 0
      ? raw.homeBlocks.map((block) => {
          if (
            block.id === 'block-media' ||
            block.sectionKey === 'media' ||
            block.title.trim() === 'مدیا'
          ) {
            return {
              ...block,
              id: block.id === 'block-media' ? 'block-video' : block.id,
              title: block.title.trim() === 'مدیا' ? 'ویدیو' : block.title,
              sourceType: 'article-type',
              sectionKey: 'ویدیو',
              subsectionLabel: null,
            };
          }
          return block;
        })
      : undefined;

  const validCategoryMediaMode: CategoryMediaMode =
    raw.categoryMediaMode === 'video' ||
    raw.categoryMediaMode === 'photo-report' ||
    raw.categoryMediaMode === 'both' ||
    raw.categoryMediaMode === 'none'
      ? raw.categoryMediaMode
      : 'both';

  return {
    ...DEFAULT_MENU_CONFIG,
    ...raw,
    categoryMediaMode: validCategoryMediaMode,
    items: raw.items,
    heroConfig: raw.heroConfig
      ? { ...DEFAULT_HERO_CONFIG, ...raw.heroConfig }
      : DEFAULT_HERO_CONFIG,
    homeBlocks: migratedBlocks || DEFAULT_HOME_BLOCKS,
  };
}

export const LANGUAGES = [
  { code: 'az', label: 'Azari', active: false },
  { code: 'ur', label: 'اردو', active: false },
  { code: 'ar', label: 'العربية', active: false },
  { code: 'fa', label: 'فارسی', active: true },
  { code: 'id', label: 'Indonesia', active: false },
  { code: 'en', label: 'English', active: false },
];

export function toPersianDigits(value: number | string): string {
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, (d) => digits[Number(d)] ?? d);
}

export function parseTags(tagsJson: string): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) {
      return parsed.map((t) => String(t).trim()).filter(Boolean);
    }
  } catch {
    return tagsJson
      .split(/[،,]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseJsonArray<T>(raw?: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {
    // ignore malformed json
  }
  return [];
}

export type AdminSidebarMenuId =
  | 'menus'
  | 'socials'
  | 'publish'
  | 'articles'
  | 'media'
  | 'sources'
  | 'editorial'
  | 'reporters'
  | 'comments';

export interface AdminSidebarMenuItem {
  id: AdminSidebarMenuId;
  label: string;
  description?: string;
}

export interface AdminMediaUsageRef {
  id: number;
  code: string;
  title: string;
  status: 'published' | 'draft';
}

export interface AdminMediaItem {
  id: string;
  filename: string;
  folder: 'images' | 'gallery' | 'videos' | 'attachments' | 'general';
  mediaType: 'image' | 'video' | 'attachment';
  url: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  isUsed: boolean;
  usedBy: AdminMediaUsageRef[];
  variantLabel?: string;
}

export interface AdminMediaSummary {
  totalCount: number;
  totalBytes: number;
  imageCount: number;
  videoCount: number;
  attachmentCount: number;
  unusedCount: number;
  unusedBytes: number;
}

export const DEFAULT_ADMIN_SIDEBAR_MENUS: AdminSidebarMenuItem[] = [
  {
    id: 'menus',
    label: 'مدیریت منوها و زیرمنوها',
    description: 'مدیریت ساختار منوها و زیرمنوها، تنظیم چینش صفحه اول سایت و مدیریت انواع مطلب',
  },
  {
    id: 'socials',
    label: 'مدیریت شبکه‌های اجتماعی',
    description:
      'مدیریت لینک شبکه‌های اجتماعی رسمی اسلام‌تایمز (تلگرام، اینستاگرام، فیسبوک، یوتیوب، واتساپ) و شبکه‌های اشتراک‌گذاری',
  },
  {
    id: 'publish',
    label: 'انتشار مطلب و پیشنویس‌ها',
    description: 'نوشتن و انتشار مطلب جدید و مدیریت پیشنویس‌های ذخیره‌شده',
  },
  {
    id: 'articles',
    label: 'مدیریت خبرهای منتشرشده',
    description: 'فهرست، جست‌وجو، ویرایش و تبدیل به پیشنویس اخبار منتشرشده در سایت',
  },
  {
    id: 'media',
    label: 'مدیریت فایل‌ها و رسانه‌ها',
    description: 'مشاهده و جست‌وجو در تمام عکس‌ها، ویدیوها و فایل‌های آپلودشده و حذف موارد قدیمی یا بدون استفاده',
  },
  {
    id: 'sources',
    label: 'منابع خبری',
    description: 'ایجاد، ویرایش، جست‌وجو و مدیریت منابع خبری متصل به فرم انتشار مطلب',
  },
  {
    id: 'editorial',
    label: 'مدیریت تحریریه',
    description: 'اعضای ارشد تحریریه، دبیران بخش‌ها و ناظران انتشار',
  },
  {
    id: 'reporters',
    label: 'خبرنگاران و نویسندگان',
    description: 'خبرنگاران مستقر در دفاتر منطقه‌ای و تحلیلگران همکار',
  },
  {
    id: 'comments',
    label: 'مدیریت نظرات',
    description: 'فهرست نظرات ثبت‌شده در مقالات پایگاه خبری',
  },
];

export function normalizeAdminSidebarMenus(raw?: unknown): AdminSidebarMenuItem[] {
  const defaultMap = new Map(DEFAULT_ADMIN_SIDEBAR_MENUS.map((item) => [item.id, item]));
  if (!Array.isArray(raw)) {
    return DEFAULT_ADMIN_SIDEBAR_MENUS;
  }

  const hasPublishInRaw = raw.some(
    (entry) => entry && typeof entry === 'object' && (entry as { id?: unknown }).id === 'publish'
  );
  const hasSocialsInRaw = raw.some(
    (entry) => entry && typeof entry === 'object' && (entry as { id?: unknown }).id === 'socials'
  );
  const publishDef = defaultMap.get('publish')!;
  const socialsDef = defaultMap.get('socials')!;

  const seen = new Set<AdminSidebarMenuId>();
  const result: AdminSidebarMenuItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const rawId = (entry as { id?: unknown }).id as AdminSidebarMenuId;
    const def = defaultMap.get(rawId);
    if (!def || seen.has(rawId)) continue;

    if (!hasPublishInRaw && rawId === 'articles' && !seen.has('publish')) {
      seen.add('publish');
      result.push(publishDef);
    }

    seen.add(rawId);
    const rawLabel = (entry as { label?: unknown }).label;
    let label = typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel.trim() : def.label;
    const rawDesc = (entry as { description?: unknown }).description;
    let description =
      typeof rawDesc === 'string' ? rawDesc.trim() : def.description || '';

    if (!hasPublishInRaw && rawId === 'articles') {
      if (label === 'مدیریت اخبار' || label === 'انتشار و مدیریت مطالب') {
        label = def.label;
      }
      if (!description || description === 'فهرست کامل اخبار منتشرشده در پایگاه داده') {
        description = def.description || '';
      }
    }

    result.push({ id: rawId, label, description });

    if (!hasSocialsInRaw && rawId === 'menus' && !seen.has('socials')) {
      seen.add('socials');
      result.push(socialsDef);
    }
  }

  for (const def of DEFAULT_ADMIN_SIDEBAR_MENUS) {
    if (!seen.has(def.id)) {
      result.push(def);
    }
  }

  return result;
}

export interface CustomShareChannel {
  id: string;
  name: string;
  urlTemplate: string;
  color?: string;
  region?: string;
  enabled: boolean;
}

export const DEFAULT_SHARE_CHANNELS: CustomShareChannel[] = [
  // فارسی (ایران)
  {
    id: 'eitaa',
    name: 'ایتا (Eitaa)',
    urlTemplate: 'https://eitaa.com/share/url?url={url}&text={title}',
    color: '#d35400',
    region: 'فارسی (ایران)',
    enabled: true,
  },
  {
    id: 'rubika',
    name: 'روبیکا (Rubika)',
    urlTemplate: 'https://rubika.ir/share?url={url}',
    color: '#7928ca',
    region: 'فارسی (ایران)',
    enabled: true,
  },
  {
    id: 'bale',
    name: 'بله (Bale)',
    urlTemplate: 'https://ble.ir/share/url?url={url}&text={title}',
    color: '#10b981',
    region: 'فارسی (ایران)',
    enabled: true,
  },
  {
    id: 'soroush',
    name: 'سروش پلاس (Soroush+)',
    urlTemplate: 'https://splus.ir/share?url={url}&text={title}',
    color: '#0288d1',
    region: 'فارسی (ایران)',
    enabled: true,
  },
  {
    id: 'virasty',
    name: 'ویراستی (Virasty)',
    urlTemplate: 'https://virasty.com/intent/post?text={title}%20{url}',
    color: '#0f766e',
    region: 'فارسی (ایران)',
    enabled: true,
  },
  {
    id: 'igap',
    name: 'آی‌گپ (iGap)',
    urlTemplate: 'https://profile.igap.net/share?url={url}&text={title}',
    color: '#16a34a',
    region: 'فارسی (ایران)',
    enabled: true,
  },
  // آذربایجان و ترک‌زبان‌ها
  {
    id: 'vk',
    name: 'وی‌کی (VKontakte)',
    urlTemplate: 'https://vk.com/share.php?url={url}&title={title}',
    color: '#0077ff',
    region: 'آذربایجان و ترک‌زبان‌ها',
    enabled: true,
  },
  {
    id: 'ok',
    name: 'ادنوکلاسنیکی (OK.ru)',
    urlTemplate: 'https://connect.ok.ru/offer?url={url}&title={title}',
    color: '#ee8208',
    region: 'آذربایجان و ترک‌زبان‌ها',
    enabled: true,
  },
  {
    id: 'viber',
    name: 'وایبر (Viber)',
    urlTemplate: 'viber://forward?text={title}%20{url}',
    color: '#7360f2',
    region: 'آذربایجان، عراق و لبنان',
    enabled: true,
  },
  {
    id: 'bip',
    name: 'بایپ (BiP)',
    urlTemplate: 'https://bip.com/',
    color: '#0099ff',
    region: 'آذربایجان و ترک‌زبان‌ها',
    enabled: true,
  },
  // پاکستان (اردو) و جنوب آسیا
  {
    id: 'tiktok',
    name: 'تیک‌تاک (TikTok)',
    urlTemplate: 'https://www.tiktok.com/',
    color: '#111827',
    region: 'پاکستان، شرق آسیا و بین‌الملل',
    enabled: true,
  },
  {
    id: 'snapchat',
    name: 'اسنپ‌چت (Snapchat)',
    urlTemplate: 'https://www.snapchat.com/scan?attachmentUrl={url}',
    color: '#eab308',
    region: 'پاکستان و جهان عرب',
    enabled: true,
  },
  {
    id: 'snackvideo',
    name: 'اسنک‌ویدیو (SnackVideo)',
    urlTemplate: 'https://www.snackvideo.com/',
    color: '#ff5a00',
    region: 'پاکستان و اندونزی',
    enabled: true,
  },
  // اندونزی، مالزی و شرق آسیا
  {
    id: 'line',
    name: 'لاین (LINE)',
    urlTemplate: 'https://social-plugins.line.me/lineit/share?url={url}&text={title}',
    color: '#06c755',
    region: 'اندونزی، مالزی و شرق آسیا',
    enabled: true,
  },
  {
    id: 'weibo',
    name: 'ویبو (Weibo)',
    urlTemplate: 'https://service.weibo.com/share/share.php?url={url}&title={title}',
    color: '#e6162d',
    region: 'شرق آسیا',
    enabled: true,
  },
  {
    id: 'kakaostory',
    name: 'کاکائو (KakaoStory)',
    urlTemplate: 'https://story.kakao.com/share?url={url}',
    color: '#ca8a04',
    region: 'شرق آسیا',
    enabled: true,
  },
  // جهان عرب و جهان اسلام
  {
    id: 'threads',
    name: 'تردز (Threads)',
    urlTemplate: 'https://www.threads.net/intent/post?text={title}%20{url}',
    color: '#171717',
    region: 'جهان عرب، مالزی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'baaz',
    name: 'باز (Baaz)',
    urlTemplate: 'https://www.baaz.com/share?url={url}&title={title}',
    color: '#1d4ed8',
    region: 'جهان عرب و جهان اسلام',
    enabled: true,
  },
  // انگلیسی و بین‌الملل
  {
    id: 'tumblr',
    name: 'تامبلر (Tumblr)',
    urlTemplate: 'https://www.tumblr.com/widgets/share/tool?canonicalUrl={url}&title={title}',
    color: '#35465c',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'linkedin',
    name: 'لینکدین (LinkedIn)',
    urlTemplate: 'https://www.linkedin.com/sharing/share-offsite/?url={url}',
    color: '#0a66c2',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'pinterest',
    name: 'پینترست (Pinterest)',
    urlTemplate: 'https://pinterest.com/pin/create/button/?url={url}&description={title}',
    color: '#bd081c',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'reddit',
    name: 'ردیت (Reddit)',
    urlTemplate: 'https://reddit.com/submit?url={url}&title={title}',
    color: '#ff4500',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'bluesky',
    name: 'بلواسکای (Bluesky)',
    urlTemplate: 'https://bsky.app/intent/compose?text={title}%20{url}',
    color: '#0285ff',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'mastodon',
    name: 'ماستودون (Mastodon)',
    urlTemplate: 'https://mastodonshare.com/?text={title}&url={url}',
    color: '#6364ff',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
  {
    id: 'flipboard',
    name: 'فلیپ‌بورد (Flipboard)',
    urlTemplate: 'https://share.flipboard.com/bookmarklet/popout?v=2&title={title}&url={url}',
    color: '#e12828',
    region: 'انگلیسی و بین‌الملل',
    enabled: true,
  },
];

export function normalizeShareChannels(raw?: unknown): CustomShareChannel[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SHARE_CHANNELS;
  }
  const defaultRegionById = new Map(
    DEFAULT_SHARE_CHANNELS.map((item) => [item.id, item.region || ''])
  );
  const result: CustomShareChannel[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const ch = item as Partial<CustomShareChannel>;
    if (
      typeof ch.name === 'string' &&
      ch.name.trim() &&
      typeof ch.urlTemplate === 'string' &&
      ch.urlTemplate.trim()
    ) {
      const id = String(ch.id || `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const region =
        typeof ch.region === 'string' && ch.region.trim()
          ? ch.region.trim()
          : defaultRegionById.get(id) || undefined;
      result.push({
        id,
        name: ch.name.trim(),
        urlTemplate: ch.urlTemplate.trim(),
        color: typeof ch.color === 'string' && ch.color.trim() ? ch.color.trim() : '#0b5e85',
        ...(region ? { region } : {}),
        enabled: ch.enabled !== false,
      });
    }
  }
  return result.length > 0 ? result : DEFAULT_SHARE_CHANNELS;
}

export interface SiteSocialAccount {
  id: string;
  name: string;
  url: string;
  handle?: string;
  color?: string;
  enabled: boolean;
}

export const CORE_SITE_SOCIAL_IDS = [
  'telegram',
  'instagram',
  'facebook',
  'youtube',
  'whatsapp',
] as const;

export const DEFAULT_SITE_SOCIAL_ACCOUNTS: SiteSocialAccount[] = [
  {
    id: 'telegram',
    name: 'تلگرام',
    url: '',
    handle: 'کانال رسمی تلگرام اسلام‌تایمز',
    color: '#0088cc',
    enabled: true,
  },
  {
    id: 'instagram',
    name: 'اینستاگرام',
    url: '',
    handle: 'صفحه رسمی اینستاگرام اسلام‌تایمز',
    color: '#e1306c',
    enabled: true,
  },
  {
    id: 'facebook',
    name: 'فیسبوک',
    url: '',
    handle: 'صفحه رسمی فیسبوک اسلام‌تایمز',
    color: '#1877f2',
    enabled: true,
  },
  {
    id: 'youtube',
    name: 'یوتیوب',
    url: '',
    handle: 'کانال رسمی یوتیوب اسلام‌تایمز',
    color: '#ff0000',
    enabled: true,
  },
  {
    id: 'whatsapp',
    name: 'واتساپ',
    url: '',
    handle: 'کانال رسمی واتساپ اسلام‌تایمز',
    color: '#25d366',
    enabled: true,
  },
];

export function normalizeExternalSocialUrl(raw?: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|tg:\/\/|viber:\/\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function normalizeSiteSocialAccounts(raw?: unknown): SiteSocialAccount[] {
  const defaultById = new Map(DEFAULT_SITE_SOCIAL_ACCOUNTS.map((item) => [item.id, item]));
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SITE_SOCIAL_ACCOUNTS.map((item) => ({ ...item }));
  }

  const seen = new Set<string>();
  const result: SiteSocialAccount[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const acc = entry as Partial<SiteSocialAccount>;
    const rawId = typeof acc.id === 'string' ? acc.id.trim() : '';
    const id = rawId || `social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (seen.has(id)) continue;

    const def = defaultById.get(id);
    const name =
      typeof acc.name === 'string' && acc.name.trim()
        ? acc.name.trim()
        : def?.name || '';
    if (!name) continue;

    seen.add(id);
    const handle =
      typeof acc.handle === 'string'
        ? acc.handle.trim()
        : def?.handle || '';
    const color =
      typeof acc.color === 'string' && acc.color.trim()
        ? acc.color.trim()
        : def?.color || '#0b5e85';

    result.push({
      id,
      name,
      url: normalizeExternalSocialUrl(acc.url),
      ...(handle ? { handle } : {}),
      color,
      enabled: acc.enabled !== false,
    });
  }

  for (const def of DEFAULT_SITE_SOCIAL_ACCOUNTS) {
    if (!seen.has(def.id)) {
      result.push({ ...def });
    }
  }

  return result;
}

export function isBreakingArticleType(typeName?: string | null): boolean {
  return (typeName || '').replace(/\s+/g, '').trim() === 'خبرفوری';
}

export function isTickerOnlyBreakingArticle(article: {
  articleType?: string | null;
  section?: string | null;
  body?: string | null;
}): boolean {
  if (!isBreakingArticleType(article.articleType)) return false;
  const hasSection = Boolean((article.section || '').trim());
  const plainBody = (article.body || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return !hasSection || plainBody.length === 0;
}

