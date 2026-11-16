/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Facebook,
  FileText,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Instagram,
  Layers,
  LayoutGrid,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  Newspaper,
  Paperclip,
  PenSquare,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Search,
  Send,
  Share2,
  Trash2,
  Upload,
  User,
  UserCheck,
  Users,
  Video,
  X,
  Youtube,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  AdminSidebarMenuId,
  AdminSidebarMenuItem,
  Article,
  ArticleAttachment,
  ArticleGalleryItem,
  ArticleTypeOption,
  ArticleVideoItem,
  CommentItem,
  CORE_SITE_SOCIAL_IDS,
  CustomShareChannel,
  DEFAULT_ADMIN_SIDEBAR_MENUS,
  DEFAULT_ARTICLE_TYPES,
  DEFAULT_HOME_BLOCKS,
  DEFAULT_MENU_CONFIG,
  DEFAULT_SHARE_CHANNELS,
  DEFAULT_SITE_SOCIAL_ACCOUNTS,
  HomeLayoutBlock,
  isBreakingArticleType,
  MainMenuItemConfig,
  MenuConfig,
  NewsSource,
  normalizeAdminSidebarMenus,
  normalizeExternalSocialUrl,
  normalizeMenuConfig,
  normalizeShareChannels,
  normalizeSiteSocialAccounts,
  parseJsonArray,
  parseTags,
  SECTION_LABELS,
  SectionKey,
  SiteSocialAccount,
  toPersianDigits,
} from '../types/news';
import { hasRichBodyContent, normalizeSitePlainText } from '../lib/richText';
import {
  GALLERY_IMAGE_HEIGHT,
  GALLERY_IMAGE_WIDTH,
  LARGE_IMAGE_HEIGHT,
  LARGE_IMAGE_WIDTH,
  MAX_MEDIA_FILE_BYTES,
  SMALL_IMAGE_HEIGHT,
  SMALL_IMAGE_WIDTH,
  getSmallVariantUrl,
  optimizeAndCropImage,
  prepareArticleMainImages,
} from '../lib/imageOptimizer';
import { AdminMediaManager } from './AdminMediaManager';
import { ArticleLivePreview } from './ArticleLivePreview';
import { HomeLayoutManager } from './HomeLayoutManager';
import { IslamTimesLogo } from './IslamTimesLogo';
import { NewsSourceCombobox } from './NewsSourceCombobox';
import { RichTextEditor } from './RichTextEditor';

interface AdminPageProps {
  articles: Article[];
  menuConfig: MenuConfig;
  articleTypes: ArticleTypeOption[];
  shareChannels?: CustomShareChannel[];
  siteSocials?: SiteSocialAccount[];
  onMenuConfigSaved: (next: MenuConfig) => void;
  onArticleTypesSaved: (next: ArticleTypeOption[]) => void;
  onShareChannelsSaved?: (next: CustomShareChannel[]) => void;
  onSiteSocialsSaved?: (next: SiteSocialAccount[]) => void;
  onArticlePublished: (article: Article) => void;
  onArticleUpdated?: (article: Article) => void;
  onArticleDeleted: (articleId: number) => void;
}

interface EditorialMember {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
  avatar: string;
}

interface ReporterItem {
  id: string;
  name: string;
  location: string;
  specialty: string;
  articlesCount: number;
  avatar: string;
}

const INITIAL_EDITORIAL: EditorialMember[] = [
  { id: 'e1', name: 'دکتر محمدرضا صادقی', role: 'سردبیر ارشد', email: 'sadeghi@islamtimes.org', department: 'سیاست خارجی', avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
  { id: 'e2', name: 'علی حسینی نسب', role: 'دبیر بخش غرب آسیا', email: 'hosseini@islamtimes.org', department: 'غرب آسیا و مقاومت', avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
  { id: 'e3', name: 'زهرا مهدوی', role: 'مدیر بخش چندرسانه‌ای', email: 'mahdavi@islamtimes.org', department: 'رسانه و ویدیو', avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
];

const INITIAL_REPORTERS: ReporterItem[] = [
  { id: 'r1', name: 'حسن نصرالله‌زاده', location: 'بیروت، لبنان', specialty: 'تحولات میدانی لبنان', articlesCount: 142, avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
  { id: 'r2', name: 'سعيد العمری', location: 'دمشق، سوریه', specialty: 'سوریه و محور مقاومت', articlesCount: 98, avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
  { id: 'r3', name: 'مریم کاظمی', location: 'تهران، ایران', specialty: 'دیپلماسی هسته‌ای و اقتصاد سیاسی', articlesCount: 215, avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
  { id: 'r4', name: 'احمد بن‌سعید', location: 'صنعا، یمن', specialty: 'تحولات یمن و خلیج عدن', articlesCount: 84, avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg' },
];

type AdminTab = AdminSidebarMenuId;

const ADMIN_TAB_ICONS: Record<AdminSidebarMenuId, typeof Menu> = {
  menus: Menu,
  socials: Share2,
  publish: PenSquare,
  articles: Newspaper,
  media: FolderOpen,
  sources: Globe,
  editorial: UserCheck,
  reporters: Users,
  comments: MessageSquare,
};

export function AdminPage({
  articles,
  menuConfig,
  articleTypes,
  shareChannels,
  siteSocials,
  onMenuConfigSaved,
  onArticleTypesSaved,
  onShareChannelsSaved,
  onSiteSocialsSaved,
  onArticlePublished,
  onArticleUpdated,
  onArticleDeleted,
}: AdminPageProps) {
  const { isAdmin, adminLogin, adminLogout, getAdminToken, loginError } = useAdminAuth();

  // Full-Page Login State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('islamtimes1405');
  const [loginLoading, setLoginLoading] = useState(false);
  const [localLoginErr, setLocalLoginErr] = useState<string | null>(null);

  // CMS Tab State & Customizable Admin Sidebar
  const [activeTab, setActiveTab] = useState<AdminTab>('publish');
  const [menuSubTab, setMenuSubTab] = useState<'structure' | 'home-layout' | 'types'>('structure');
  const [socialSubTab, setSocialSubTab] = useState<'own-socials' | 'share-channels'>('own-socials');
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [sidebarMenus, setSidebarMenus] = useState<AdminSidebarMenuItem[]>(
    DEFAULT_ADMIN_SIDEBAR_MENUS
  );
  const [editingSidebar, setEditingSidebar] = useState(false);
  const [savingSidebar, setSavingSidebar] = useState(false);
  const [sidebarStatus, setSidebarStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editingTabHeaderId, setEditingTabHeaderId] = useState<AdminSidebarMenuId | null>(null);
  const [tabHeaderLabelDraft, setTabHeaderLabelDraft] = useState('');
  const [tabHeaderDescDraft, setTabHeaderDescDraft] = useState('');

  // Menu Management State
  const [draftMenu, setDraftMenu] = useState<MenuConfig>(normalizeMenuConfig(menuConfig));
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuStatus, setMenuStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newMainLabel, setNewMainLabel] = useState('');
  const [newMainKey, setNewMainKey] = useState('');
  const [newMainDesc, setNewMainDesc] = useState('');
  const [newSubByMenuId, setNewSubByMenuId] = useState<Record<string, string>>({});
  const [editingMainId, setEditingMainId] = useState<string | null>(null);
  const [editingMainValue, setEditingMainValue] = useState('');
  const [editingMainDesc, setEditingMainDesc] = useState('');
  const [editingSubKey, setEditingSubKey] = useState<{ menuId: string; subId: string } | null>(null);
  const [editingSubValue, setEditingSubValue] = useState('');

  // Article Types Management State
  const [draftTypes, setDraftTypes] = useState<ArticleTypeOption[]>(
    articleTypes.length > 0 ? articleTypes : DEFAULT_ARTICLE_TYPES
  );
  const [savingTypes, setSavingTypes] = useState(false);
  const [typesStatus, setTypesStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeDesc, setEditingTypeDesc] = useState('');

  // Share Channels Management State (Custom / Other Networks)
  const [draftChannels, setDraftChannels] = useState<CustomShareChannel[]>(
    shareChannels && shareChannels.length > 0
      ? shareChannels
      : DEFAULT_SHARE_CHANNELS
  );
  const [savingChannels, setSavingChannels] = useState(false);
  const [channelsStatus, setChannelsStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelRegion, setNewChannelRegion] = useState('');
  const [newChannelColor, setNewChannelColor] = useState('#0b5e85');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelUrl, setEditChannelUrl] = useState('');
  const [editChannelRegion, setEditChannelRegion] = useState('');
  const [editChannelColor, setEditChannelColor] = useState('#0b5e85');

  // Official Islam Times Social Networks State
  const [draftSiteSocials, setDraftSiteSocials] = useState<SiteSocialAccount[]>(
    siteSocials && siteSocials.length > 0
      ? normalizeSiteSocialAccounts(siteSocials)
      : DEFAULT_SITE_SOCIAL_ACCOUNTS
  );
  const [savingSiteSocials, setSavingSiteSocials] = useState(false);
  const [siteSocialsStatus, setSiteSocialsStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [newOwnSocialName, setNewOwnSocialName] = useState('');
  const [newOwnSocialUrl, setNewOwnSocialUrl] = useState('');
  const [newOwnSocialHandle, setNewOwnSocialHandle] = useState('');
  const [newOwnSocialColor, setNewOwnSocialColor] = useState('#0b5e85');

  // Other CMS States
  const [editorialList] = useState<EditorialMember[]>(INITIAL_EDITORIAL);
  const [reportersList, setReportersList] = useState<ReporterItem[]>(INITIAL_REPORTERS);
  const [allComments, setAllComments] = useState<CommentItem[]>([]);
  const [mediaCount, setMediaCount] = useState<number | null>(null);

  // Article Publish / Drafts / Published Management State (completely empty by default)
  const [showPublishForm, setShowPublishForm] = useState(true);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [editingArticleCode, setEditingArticleCode] = useState<string>('');
  const [editingArticleStatus, setEditingArticleStatus] = useState<'published' | 'draft'>('published');
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [draftTypeFilter, setDraftTypeFilter] = useState<string>('all');
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [articleSection, setArticleSection] = useState<string>('');
  const [articleSubsection, setArticleSubsection] = useState<string>('');
  const [articleType, setArticleType] = useState<string>('');
  const [articleKicker, setArticleKicker] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleSubtitle, setArticleSubtitle] = useState('');
  const [articleLead, setArticleLead] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [articleImageUrl, setArticleImageUrl] = useState('');
  const [articleAttachments, setArticleAttachments] = useState<ArticleAttachment[]>([]);
  const [articleGalleryImages, setArticleGalleryImages] = useState<ArticleGalleryItem[]>([]);
  const [articleVideos, setArticleVideos] = useState<ArticleVideoItem[]>([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [imageProcessInfo, setImageProcessInfo] = useState<{
    originalDimensions: string;
    largeDimensions: string;
    smallDimensions: string;
    originalSize: number;
    largeSize: number;
    smallSize: number;
    wasCropped: boolean;
  } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [articleAuthor, setArticleAuthor] = useState('');
  const [articleSourceId, setArticleSourceId] = useState<number | null>(null);
  const [articleSourceName, setArticleSourceName] = useState('');
  const [articleSourceUrl, setArticleSourceUrl] = useState('');
  const [articleContentOrigin, setArticleContentOrigin] = useState<'quoted' | 'original' | ''>('');
  const [articleTags, setArticleTags] = useState('');
  const [submittingArticle, setSubmittingArticle] = useState(false);
  const [submittingStatusMode, setSubmittingStatusMode] = useState<'published' | 'draft' | null>(null);
  const [publishingDraftId, setPublishingDraftId] = useState<number | null>(null);
  const [convertingToDraftId, setConvertingToDraftId] = useState<number | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [articleNotice, setArticleNotice] = useState<{
    type: 'success' | 'error';
    text: string;
    actionLabel?: string;
    actionTab?: AdminTab;
  } | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);

  // News Sources Management State
  const [newsSources, setNewsSources] = useState<NewsSource[]>([]);
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [sourceFeedback, setSourceFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');
  const [editingSourceUrl, setEditingSourceUrl] = useState('');
  const [deletingSourceId, setDeletingSourceId] = useState<number | null>(null);

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setEditingArticleCode('');
    setEditingArticleStatus('published');
    setArticleSection('');
    setArticleSubsection('');
    setArticleType('');
    setArticleKicker('');
    setArticleTitle('');
    setArticleSubtitle('');
    setArticleLead('');
    setArticleBody('');
    setArticleImageUrl('');
    setArticleAttachments([]);
    setArticleGalleryImages([]);
    setArticleVideos([]);
    setNewGalleryUrl('');
    setNewVideoUrl('');
    setArticleAuthor('');
    setArticleSourceId(null);
    setArticleSourceName('');
    setArticleSourceUrl('');
    setArticleContentOrigin('');
    setArticleTags('');
    setArticleError(null);
    setImageProcessInfo(null);
    setPreviewMode('edit');
  };

  // Staff forms
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('خبرنگار ارشد');
  const [newStaffLoc, setNewStaffLoc] = useState('تهران');

  useEffect(() => {
    setDraftMenu(normalizeMenuConfig(menuConfig));
  }, [menuConfig]);

  useEffect(() => {
    if (articleTypes.length > 0) {
      setDraftTypes(articleTypes);
    }
  }, [articleTypes]);

  useEffect(() => {
    if (shareChannels && shareChannels.length > 0) {
      setDraftChannels(shareChannels);
    }
  }, [shareChannels]);

  useEffect(() => {
    if (siteSocials && siteSocials.length > 0) {
      setDraftSiteSocials(normalizeSiteSocialAccounts(siteSocials));
    }
  }, [siteSocials]);

  useEffect(() => {
    if (articleType && draftTypes.length > 0 && !draftTypes.some((t) => t.name === articleType)) {
      setArticleType('');
    }
  }, [draftTypes, articleType]);

  useEffect(() => {
    fetch('/api/admin/sidebar-menus')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.sidebarMenus)) {
          setSidebarMenus(normalizeAdminSidebarMenus(data.sidebarMenus));
        }
      })
      .catch(() => {
        // Keep default sidebar menus on transient error
      });
  }, []);

  const loadNewsSources = async () => {
    setSourcesLoading(true);
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (Array.isArray(data.sources)) {
        setNewsSources(data.sources);
      }
    } catch {
      // ignore transient error
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const token = getAdminToken();
    if (!token) return;
    fetch('/api/admin/comments', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.comments)) {
          setAllComments(data.comments);
        }
      })
      .catch(() => {
        // ignore transient error
      });
    fetch('/api/admin/media', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.summary && typeof data.summary.totalCount === 'number') {
          setMediaCount(data.summary.totalCount);
        }
      })
      .catch(() => {
        // ignore transient error
      });
    loadNewsSources();
  }, [isAdmin, getAdminToken]);

  const persistSidebarMenus = async (nextMenus: AdminSidebarMenuItem[]) => {
    const token = getAdminToken();
    if (!token) {
      setSidebarStatus({
        type: 'error',
        text: 'نشست مدیریت منقضی شده است.',
      });
      return;
    }
    setSavingSidebar(true);
    setSidebarStatus(null);
    try {
      const cleaned = normalizeAdminSidebarMenus(nextMenus);
      const res = await fetch('/api/admin/sidebar-menus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sidebarMenus: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره منوهای پنل');
      }
      setSidebarMenus(normalizeAdminSidebarMenus(data.sidebarMenus));
      setSidebarStatus({
        type: 'success',
        text: 'نام، متن توضیحی و ترتیب منوهای پنل ذخیره شد.',
      });
    } catch (err: unknown) {
      setSidebarStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'ذخیره ناموفق بود.',
      });
    } finally {
      setSavingSidebar(false);
    }
  };

  const handleMoveSidebarMenu = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sidebarMenus.length) return;
    const next = [...sidebarMenus];
    [next[index], next[target]] = [next[target], next[index]];
    setSidebarMenus(next);
    persistSidebarMenus(next);
  };

  const handleSidebarLabelInput = (id: AdminSidebarMenuId, label: string) => {
    setSidebarMenus((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label } : item))
    );
  };

  const handleSidebarDescriptionInput = (id: AdminSidebarMenuId, description: string) => {
    setSidebarMenus((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    );
  };

  const getSidebarMenu = (id: AdminSidebarMenuId) => {
    const found = sidebarMenus.find((m) => m.id === id);
    const def = DEFAULT_ADMIN_SIDEBAR_MENUS.find((m) => m.id === id);
    return {
      label: found?.label || def?.label || '',
      description:
        typeof found?.description === 'string'
          ? found.description
          : def?.description || '',
    };
  };

  const startEditTabHeader = (id: AdminSidebarMenuId) => {
    const current = getSidebarMenu(id);
    setEditingTabHeaderId(id);
    setTabHeaderLabelDraft(current.label);
    setTabHeaderDescDraft(current.description);
  };

  const saveTabHeaderEdit = async (id: AdminSidebarMenuId) => {
    const cleanLabel = tabHeaderLabelDraft.trim();
    if (!cleanLabel) return;
    const cleanDesc = tabHeaderDescDraft.trim();
    const next = sidebarMenus.map((item) =>
      item.id === id ? { ...item, label: cleanLabel, description: cleanDesc } : item
    );
    setSidebarMenus(next);
    await persistSidebarMenus(next);
    setEditingTabHeaderId(null);
  };

  const handleResetSidebarMenus = () => {
    setSidebarMenus(DEFAULT_ADMIN_SIDEBAR_MENUS);
    setEditingTabHeaderId(null);
    persistSidebarMenus(DEFAULT_ADMIN_SIDEBAR_MENUS);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoginErr(null);
    if (!username.trim() || !password.trim()) {
      setLocalLoginErr('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }
    setLoginLoading(true);
    const loggedIn = await adminLogin(username.trim(), password.trim());
    if (loggedIn) {
      setActiveTab('publish');
      setShowPublishForm(true);
    }
    setLoginLoading(false);
  };

  const persistMenuConfig = async (nextConfig: MenuConfig) => {
    const token = getAdminToken();
    if (!token) {
      setMenuStatus({ type: 'error', text: 'نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.' });
      return;
    }
    setSavingMenu(true);
    setMenuStatus(null);
    try {
      const res = await fetch('/api/menus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ menuConfig: nextConfig }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره تنظیمات منو');
      }
      onMenuConfigSaved(data.menuConfig);
      setMenuStatus({
        type: 'success',
        text: 'تنظیمات منوها با موفقیت در پایگاه داده ذخیره و در سایت اعمال شد.',
      });
    } catch (err: unknown) {
      setMenuStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'ذخیره تنظیمات منوها ناموفق بود.',
      });
    } finally {
      setSavingMenu(false);
    }
  };

  const persistArticleTypes = async (
    nextTypes: ArticleTypeOption[],
    renameInfo?: { from: string; to: string }
  ) => {
    const token = getAdminToken();
    if (!token) {
      setTypesStatus({
        type: 'error',
        text: 'نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.',
      });
      return;
    }
    setSavingTypes(true);
    setTypesStatus(null);
    try {
      const res = await fetch('/api/article-types', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          articleTypes: nextTypes,
          renamedFrom: renameInfo?.from,
          renamedTo: renameInfo?.to,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره انواع مطلب');
      }

      const savedTypes: ArticleTypeOption[] = Array.isArray(data.articleTypes)
        ? data.articleTypes
        : nextTypes;
      setDraftTypes(savedTypes);
      onArticleTypesSaved(savedTypes);

      if (renameInfo && renameInfo.from !== renameInfo.to) {
        if (articleType === renameInfo.from) {
          setArticleType(renameInfo.to);
        }
        if (draftTypeFilter === renameInfo.from) {
          setDraftTypeFilter(renameInfo.to);
        }
        const blocks = draftMenu.homeBlocks || DEFAULT_HOME_BLOCKS;
        const hasAffectedBlock = blocks.some(
          (b) => b.sourceType === 'article-type' && b.sectionKey === renameInfo.from
        );
        if (hasAffectedBlock) {
          const updatedMenu: MenuConfig = {
            ...draftMenu,
            homeBlocks: blocks.map((b) =>
              b.sourceType === 'article-type' && b.sectionKey === renameInfo.from
                ? {
                    ...b,
                    sectionKey: renameInfo.to,
                    title: b.title === renameInfo.from ? renameInfo.to : b.title,
                  }
                : b
            ),
          };
          setDraftMenu(updatedMenu);
          await persistMenuConfig(updatedMenu);
        }
      }

      setTypesStatus({
        type: 'success',
        text: 'تغییرات انواع مطلب ذخیره شد و در تمام بخش‌های مدیریت و سایت فعال گردید.',
      });
    } catch (err: unknown) {
      setTypesStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'ذخیره انواع مطلب ناموفق بود.',
      });
    } finally {
      setSavingTypes(false);
    }
  };

  const handleAddArticleType = () => {
    const cleanName = newTypeName.trim();
    if (!cleanName) {
      setTypesStatus({ type: 'error', text: 'لطفاً عنوان نوع مطلب را وارد کنید.' });
      return;
    }
    if (draftTypes.some((t) => t.name === cleanName)) {
      setTypesStatus({ type: 'error', text: 'این نوع مطلب قبلاً ثبت شده است.' });
      return;
    }
    const newItem: ArticleTypeOption = {
      id: `type-${Date.now()}`,
      name: cleanName,
      code: `custom-${Date.now()}`,
      description: newTypeDesc.trim() || `مطالب و گزارش‌های مرتبط با ${cleanName}`,
      isDefault: draftTypes.length === 0,
    };
    const next = [...draftTypes, newItem];
    setDraftTypes(next);
    setNewTypeName('');
    setNewTypeDesc('');
    persistArticleTypes(next);
  };

  const handleStartEditType = (t: ArticleTypeOption) => {
    setEditingTypeId(t.id);
    setEditingTypeName(t.name);
    setEditingTypeDesc(t.description || '');
    setTypesStatus(null);
  };

  const handleSaveEditType = (typeId: string) => {
    const cleanName = editingTypeName.trim();
    if (!cleanName) {
      setTypesStatus({ type: 'error', text: 'نام نوع مطلب نمی‌تواند خالی باشد.' });
      return;
    }
    if (draftTypes.some((t) => t.id !== typeId && t.name === cleanName)) {
      setTypesStatus({ type: 'error', text: 'نوع مطلب دیگری با این نام وجود دارد.' });
      return;
    }
    const existing = draftTypes.find((t) => t.id === typeId);
    if (!existing) return;

    const oldName = existing.name;
    const next = draftTypes.map((t) =>
      t.id === typeId
        ? {
            ...t,
            name: cleanName,
            description: editingTypeDesc.trim() || t.description,
          }
        : t
    );
    setDraftTypes(next);
    setEditingTypeId(null);
    setEditingTypeName('');
    setEditingTypeDesc('');
    persistArticleTypes(
      next,
      oldName !== cleanName ? { from: oldName, to: cleanName } : undefined
    );
  };

  const handleDeleteArticleType = (typeId: string) => {
    if (draftTypes.length <= 1) {
      setTypesStatus({
        type: 'error',
        text: 'حداقل یک نوع مطلب باید در سامانه باقی بماند.',
      });
      return;
    }
    const target = draftTypes.find((t) => t.id === typeId);
    const filtered = draftTypes.filter((t) => t.id !== typeId);
    const hasDefault = filtered.some((t) => t.isDefault);
    const next = hasDefault
      ? filtered
      : filtered.map((t, idx) => ({ ...t, isDefault: idx === 0 }));
    if (target && articleType === target.name) {
      setArticleType('');
    }
    setDraftTypes(next);
    persistArticleTypes(next);
  };

  const handleSetDefaultArticleType = (typeId: string) => {
    const next = draftTypes.map((t) => ({
      ...t,
      isDefault: t.id === typeId,
    }));
    setDraftTypes(next);
    persistArticleTypes(next);
  };

  const handleMoveArticleType = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftTypes.length) return;
    const next = [...draftTypes];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setDraftTypes(next);
    persistArticleTypes(next);
  };

  const handleResetDefaultArticleTypes = () => {
    setDraftTypes(DEFAULT_ARTICLE_TYPES);
    setEditingTypeId(null);
    persistArticleTypes(DEFAULT_ARTICLE_TYPES);
  };

  const persistShareChannels = async (nextList: CustomShareChannel[]) => {
    const token = getAdminToken();
    if (!token) {
      setChannelsStatus({
        type: 'error',
        text: 'نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.',
      });
      return;
    }
    setSavingChannels(true);
    setChannelsStatus(null);
    try {
      const res = await fetch('/api/share-channels', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channels: nextList }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره شبکه‌ها');
      }
      const saved = normalizeShareChannels(data.channels);
      setDraftChannels(saved);
      onShareChannelsSaved?.(saved);
      setChannelsStatus({
        type: 'success',
        text: 'تنظیمات شبکه‌های اشتراک‌گذاری با موفقیت در پایگاه داده ذخیره شد.',
      });
      setTimeout(() => setChannelsStatus(null), 4000);
    } catch (err: unknown) {
      setChannelsStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'ذخیره شبکه‌ها ناموفق بود.',
      });
    } finally {
      setSavingChannels(false);
    }
  };

  const handleAddShareChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      setChannelsStatus({ type: 'error', text: 'لطفاً نام شبکه اجتماعی را وارد کنید.' });
      return;
    }
    if (!newChannelUrl.trim()) {
      setChannelsStatus({ type: 'error', text: 'لطفاً آدرس لینک اشتراک‌گذاری را وارد کنید.' });
      return;
    }
    const newCh: CustomShareChannel = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newChannelName.trim(),
      urlTemplate: newChannelUrl.trim(),
      color: newChannelColor.trim() || '#0b5e85',
      ...(newChannelRegion.trim() ? { region: newChannelRegion.trim() } : {}),
      enabled: true,
    };
    const nextList = [...draftChannels, newCh];
    setDraftChannels(nextList);
    setNewChannelName('');
    setNewChannelUrl('');
    setNewChannelRegion('');
    setNewChannelColor('#0b5e85');
    persistShareChannels(nextList);
  };

  const handleDeleteShareChannel = (id: string) => {
    const nextList = draftChannels.filter((c) => c.id !== id);
    setDraftChannels(nextList);
    persistShareChannels(nextList);
  };

  const handleToggleShareChannel = (id: string) => {
    const nextList = draftChannels.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
    setDraftChannels(nextList);
    persistShareChannels(nextList);
  };

  const handleMoveShareChannel = (id: string, dir: -1 | 1) => {
    const idx = draftChannels.findIndex((c) => c.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= draftChannels.length) return;
    const copy = [...draftChannels];
    [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
    setDraftChannels(copy);
    persistShareChannels(copy);
  };

  const handleSaveEditShareChannel = (id: string) => {
    if (!editChannelName.trim() || !editChannelUrl.trim()) return;
    const nextList = draftChannels.map((c) =>
      c.id === id
        ? {
            ...c,
            name: editChannelName.trim(),
            urlTemplate: editChannelUrl.trim(),
            region: editChannelRegion.trim() || undefined,
            color: editChannelColor.trim() || '#0b5e85',
          }
        : c
    );
    setDraftChannels(nextList);
    setEditingChannelId(null);
    persistShareChannels(nextList);
  };

  const handleResetDefaultShareChannels = () => {
    setDraftChannels(DEFAULT_SHARE_CHANNELS);
    setEditingChannelId(null);
    persistShareChannels(DEFAULT_SHARE_CHANNELS);
  };

  const persistSiteSocials = async (nextList: SiteSocialAccount[]) => {
    const token = getAdminToken();
    if (!token) {
      setSiteSocialsStatus({
        type: 'error',
        text: 'نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.',
      });
      return;
    }
    setSavingSiteSocials(true);
    setSiteSocialsStatus(null);
    try {
      const normalizedPayload = normalizeSiteSocialAccounts(nextList);
      const res = await fetch('/api/site-socials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accounts: normalizedPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره لینک شبکه‌های اجتماعی سایت');
      }
      const saved = normalizeSiteSocialAccounts(data.accounts);
      setDraftSiteSocials(saved);
      onSiteSocialsSaved?.(saved);
      setSiteSocialsStatus({
        type: 'success',
        text: 'لینک و تنظیمات شبکه‌های اجتماعی رسمی اسلام‌تایمز با موفقیت ذخیره و در هدر و فوتر سایت اعمال شد.',
      });
      setTimeout(() => setSiteSocialsStatus(null), 4500);
    } catch (err: unknown) {
      setSiteSocialsStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'ذخیره لینک شبکه‌های اجتماعی ناموفق بود.',
      });
    } finally {
      setSavingSiteSocials(false);
    }
  };

  const handleUpdateOwnSocialField = (
    id: string,
    patch: Partial<Pick<SiteSocialAccount, 'name' | 'url' | 'handle' | 'color'>>
  ) => {
    setDraftSiteSocials((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...patch } : acc))
    );
  };

  const handleToggleOwnSocial = (id: string) => {
    const nextList = draftSiteSocials.map((acc) =>
      acc.id === id ? { ...acc, enabled: !acc.enabled } : acc
    );
    setDraftSiteSocials(nextList);
    persistSiteSocials(nextList);
  };

  const handleMoveOwnSocial = (id: string, dir: -1 | 1) => {
    const idx = draftSiteSocials.findIndex((acc) => acc.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= draftSiteSocials.length) return;
    const copy = [...draftSiteSocials];
    [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
    setDraftSiteSocials(copy);
    persistSiteSocials(copy);
  };

  const handleAddOwnSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnSocialName.trim()) {
      setSiteSocialsStatus({ type: 'error', text: 'لطفاً نام شبکه اجتماعی را وارد کنید.' });
      return;
    }
    if (!newOwnSocialUrl.trim()) {
      setSiteSocialsStatus({ type: 'error', text: 'لطفاً آدرس لینک صفحه یا کانال را وارد کنید.' });
      return;
    }
    const newItem: SiteSocialAccount = {
      id: `site-social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newOwnSocialName.trim(),
      url: normalizeExternalSocialUrl(newOwnSocialUrl),
      ...(newOwnSocialHandle.trim() ? { handle: newOwnSocialHandle.trim() } : {}),
      color: newOwnSocialColor.trim() || '#0b5e85',
      enabled: true,
    };
    const nextList = [...draftSiteSocials, newItem];
    setDraftSiteSocials(nextList);
    setNewOwnSocialName('');
    setNewOwnSocialUrl('');
    setNewOwnSocialHandle('');
    setNewOwnSocialColor('#0b5e85');
    persistSiteSocials(nextList);
  };

  const handleDeleteOwnSocial = (id: string) => {
    if ((CORE_SITE_SOCIAL_IDS as readonly string[]).includes(id)) return;
    const nextList = draftSiteSocials.filter((acc) => acc.id !== id);
    setDraftSiteSocials(nextList);
    persistSiteSocials(nextList);
  };

  const handleResetSiteSocials = () => {
    const defaults = DEFAULT_SITE_SOCIAL_ACCOUNTS.map((item) => ({ ...item }));
    setDraftSiteSocials(defaults);
    persistSiteSocials(defaults);
  };

  const handleAddMainMenu = () => {
    const label = newMainLabel.trim();
    if (!label) return;
    const rawKey = newMainKey.trim() || `custom-${Date.now()}`;
    const cleanKey = rawKey.toLowerCase().replace(/\s+/g, '-');
    if (draftMenu.items.some((m) => m.key === cleanKey)) {
      setMenuStatus({ type: 'error', text: 'کلید یکتای این منو تکراری است.' });
      return;
    }
    const newItem: MainMenuItemConfig = {
      id: `menu-${Date.now()}`,
      key: cleanKey,
      label,
      description: newMainDesc.trim(),
      showOnHome: true,
      showOnMenuPage: true,
      homeSubmenuLimit: 14,
      menuPageSubmenuLimit: 14,
      subsections: [],
    };
    const next: MenuConfig = {
      ...draftMenu,
      maxMainMenusOnHome: Math.max(draftMenu.maxMainMenusOnHome, draftMenu.items.length + 1),
      maxMainMenusOnMenuPage: Math.max(draftMenu.maxMainMenusOnMenuPage, draftMenu.items.length + 1),
      items: [...draftMenu.items, newItem],
    };
    setDraftMenu(next);
    setNewMainLabel('');
    setNewMainKey('');
    setNewMainDesc('');
    persistMenuConfig(next);
  };

  const handleDeleteMainMenu = (menuId: string) => {
    const next: MenuConfig = {
      ...draftMenu,
      items: draftMenu.items.filter((m) => m.id !== menuId),
    };
    setDraftMenu(next);
    persistMenuConfig(next);
  };

  const handleMoveMainMenu = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draftMenu.items.length) return;
    const copy = [...draftMenu.items];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    const next = { ...draftMenu, items: copy };
    setDraftMenu(next);
    persistMenuConfig(next);
  };

  const handleSaveMainMenuName = (menuId: string) => {
    const trimmed = editingMainValue.trim();
    if (!trimmed) return;
    const trimmedDesc = editingMainDesc.trim();
    const targetMenu = draftMenu.items.find((m) => m.id === menuId);
    const oldLabel = targetMenu?.label;

    const updatedBlocks = (draftMenu.homeBlocks || DEFAULT_HOME_BLOCKS).map((block) => {
      if (
        targetMenu &&
        block.sourceType === 'menu' &&
        block.sectionKey === targetMenu.key &&
        (block.title === oldLabel || block.title === SECTION_LABELS[targetMenu.key])
      ) {
        return { ...block, title: trimmed };
      }
      return block;
    });

    const next: MenuConfig = {
      ...draftMenu,
      items: draftMenu.items.map((m) =>
        m.id === menuId ? { ...m, label: trimmed, description: trimmedDesc } : m
      ),
      homeBlocks: updatedBlocks,
    };
    setDraftMenu(next);
    setEditingMainId(null);
    setEditingMainValue('');
    setEditingMainDesc('');
    persistMenuConfig(next);
  };

  const handleSaveSubmenuName = (menuId: string, subId: string) => {
    const trimmed = editingSubValue.trim();
    if (!trimmed) return;
    const next: MenuConfig = {
      ...draftMenu,
      items: draftMenu.items.map((m) =>
        m.id === menuId
          ? {
              ...m,
              subsections: m.subsections.map((s) =>
                s.id === subId ? { ...s, label: trimmed } : s
              ),
            }
          : m
      ),
    };
    setDraftMenu(next);
    setEditingSubKey(null);
    setEditingSubValue('');
    persistMenuConfig(next);
  };

  const handleAddSubmenu = (menuId: string) => {
    const label = (newSubByMenuId[menuId] || '').trim();
    if (!label) return;
    const next: MenuConfig = {
      ...draftMenu,
      items: draftMenu.items.map((m) => {
        if (m.id !== menuId) return m;
        if (m.subsections.some((s) => s.label === label)) return m;
        return {
          ...m,
          subsections: [
            ...m.subsections,
            {
              id: `${m.key}-sub-${Date.now()}`,
              label,
              showOnHome: true,
              showOnMenuPage: true,
            },
          ],
        };
      }),
    };
    setDraftMenu(next);
    setNewSubByMenuId((prev) => ({ ...prev, [menuId]: '' }));
    persistMenuConfig(next);
  };

  const handleDeleteSubmenu = (menuId: string, subId: string) => {
    const next: MenuConfig = {
      ...draftMenu,
      items: draftMenu.items.map((m) =>
        m.id === menuId
          ? { ...m, subsections: m.subsections.filter((s) => s.id !== subId) }
          : m
      ),
    };
    setDraftMenu(next);
    persistMenuConfig(next);
  };

  const handleMoveSubmenu = (menuId: string, subIdx: number, dir: -1 | 1) => {
    const next: MenuConfig = {
      ...draftMenu,
      items: draftMenu.items.map((m) => {
        if (m.id !== menuId) return m;
        const target = subIdx + dir;
        if (target < 0 || target >= m.subsections.length) return m;
        const copy = [...m.subsections];
        [copy[subIdx], copy[target]] = [copy[target], copy[subIdx]];
        return { ...m, subsections: copy };
      }),
    };
    setDraftMenu(next);
    persistMenuConfig(next);
  };

  const handleQuickAddToHomeLayout = (
    sourceType: 'menu' | 'submenu',
    sectionKey: string,
    title: string,
    subsectionLabel?: string
  ) => {
    const currentBlocks = draftMenu.homeBlocks || DEFAULT_HOME_BLOCKS;
    const existing = currentBlocks.find((b) =>
      sourceType === 'submenu'
        ? b.sourceType === 'submenu' &&
          b.sectionKey === sectionKey &&
          b.subsectionLabel === subsectionLabel
        : b.sourceType === 'menu' && b.sectionKey === sectionKey
    );

    if (existing) {
      setHighlightedBlockId(existing.id);
      setMenuSubTab('home-layout');
      return;
    }

    const newBlock: HomeLayoutBlock = {
      id: `block-${Date.now()}`,
      enabled: true,
      title,
      sourceType,
      sectionKey,
      subsectionLabel: subsectionLabel || null,
      zone: 'main',
      columnSpan: 'half',
      layout: 'lead-with-list',
      articleCount: 4,
      showNumbers: false,
      strictFilter: sourceType === 'submenu',
    };

    const next: MenuConfig = {
      ...draftMenu,
      homeBlocks: [...currentBlocks, newBlock],
    };
    setDraftMenu(next);
    setHighlightedBlockId(newBlock.id);
    setMenuSubTab('home-layout');
    persistMenuConfig(next);
  };

  const uploadAdminFile = async (
    file: File,
    folder: 'images' | 'attachments' | 'gallery' | 'videos',
    options?: {
      imageRole?: 'lg' | 'sm';
      companionFor?: string;
    }
  ) => {
    const token = getAdminToken();
    if (!token) {
      throw new Error('نشست مدیریت منقضی شده است.');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'X-Folder': folder,
      'X-File-Name': encodeURIComponent(file.name),
      'X-Mime-Type': file.type || 'application/octet-stream',
    };
    if (options?.imageRole) {
      headers['X-Image-Role'] = options.imageRole;
    }
    if (options?.companionFor) {
      headers['X-Companion-For'] = options.companionFor;
    }

    const res = await fetch('/api/admin/upload-stream', {
      method: 'POST',
      headers,
      body: file,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در آپلود فایل');
    }
    return data as {
      url: string;
      storedName?: string;
      name: string;
      size: number;
      mimeType: string;
    };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
    return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  };

  const handleMainImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const rawFile = files[0];
    setArticleError(null);
    setImageProcessInfo(null);
    setUploadingMainImage(true);
    try {
      const { large, small } = await prepareArticleMainImages(rawFile);
      const uploadedLarge = await uploadAdminFile(large.file, 'images', {
        imageRole: small ? 'lg' : undefined,
      });

      if (small && uploadedLarge.storedName) {
        await uploadAdminFile(small.file, 'images', {
          imageRole: 'sm',
          companionFor: uploadedLarge.storedName,
        });
      }

      setArticleImageUrl(uploadedLarge.url);
      if (large.width > 0 && large.height > 0) {
        setImageProcessInfo({
          originalDimensions: `${toPersianDigits(large.originalWidth)}×${toPersianDigits(large.originalHeight)}`,
          largeDimensions: `${toPersianDigits(large.width)}×${toPersianDigits(large.height)}`,
          smallDimensions: small
            ? `${toPersianDigits(small.width)}×${toPersianDigits(small.height)}`
            : '',
          originalSize: large.originalSize,
          largeSize: large.optimizedSize,
          smallSize: small ? small.optimizedSize : 0,
          wasCropped: large.wasCropped,
        });
      }
    } catch (err: unknown) {
      setArticleError(err instanceof Error ? err.message : 'آپلود تصویر اصلی ناموفق بود.');
    } finally {
      setUploadingMainImage(false);
    }
  };

  const handleAttachmentsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const oversized = fileList.find((f) => f.size > MAX_MEDIA_FILE_BYTES);
    if (oversized) {
      setArticleError(
        `حجم فایل «${oversized.name}» (${formatFileSize(oversized.size)}) بیشتر از ۵۰۰ مگابایت است و مجاز به بارگذاری نیست. حداکثر حجم مجاز: ۵۰۰ مگابایت.`
      );
      return;
    }

    setArticleError(null);
    setUploadingAttachment(true);
    try {
      const uploadedList: ArticleAttachment[] = [];
      for (const file of fileList) {
        const uploaded = await uploadAdminFile(file, 'attachments');
        uploadedList.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: uploaded.name,
          url: uploaded.url,
          size: uploaded.size,
          mimeType: uploaded.mimeType,
        });
      }
      setArticleAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err: unknown) {
      setArticleError(err instanceof Error ? err.message : 'آپلود فایل ضمیمه ناموفق بود.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setArticleError(null);
    setUploadingGallery(true);
    try {
      const uploadedList: ArticleGalleryItem[] = [];
      for (const rawFile of Array.from(files)) {
        const processed = await optimizeAndCropImage(rawFile, 'gallery');
        const uploaded = await uploadAdminFile(processed.file, 'gallery');
        uploadedList.push({
          id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: uploaded.url,
          caption: '',
        });
      }
      setArticleGalleryImages((prev) => [...prev, ...uploadedList]);
    } catch (err: unknown) {
      setArticleError(err instanceof Error ? err.message : 'آپلود تصویر گالری ناموفق بود.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleVideosUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const oversized = fileList.find((f) => f.size > MAX_MEDIA_FILE_BYTES);
    if (oversized) {
      setArticleError(
        `حجم ویدیو «${oversized.name}» (${formatFileSize(oversized.size)}) بیشتر از ۵۰۰ مگابایت است و مجاز به بارگذاری نیست. حداکثر حجم مجاز: ۵۰۰ مگابایت.`
      );
      return;
    }

    setArticleError(null);
    setUploadingVideo(true);
    try {
      const uploadedList: ArticleVideoItem[] = [];
      for (const file of fileList) {
        const uploaded = await uploadAdminFile(file, 'videos');
        uploadedList.push({
          id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: uploaded.url,
          title: file.name.replace(/\.[^.]+$/, ''),
          mimeType: uploaded.mimeType || 'video/mp4',
        });
      }
      setArticleVideos((prev) => [...prev, ...uploadedList]);
    } catch (err: unknown) {
      setArticleError(err instanceof Error ? err.message : 'آپلود ویدیو ناموفق بود.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleAutoCreateSourceFromDropdown = async (name: string): Promise<NewsSource | null> => {
    const cleanName = normalizeSitePlainText(name, true);
    if (!cleanName) return null;
    const token = getAdminToken();
    if (!token) {
      setArticleError('نشست مدیریت منقضی شده است.');
      return null;
    }
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cleanName,
          url: articleSourceUrl.trim(),
          autoCreate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.source) {
        throw new Error(data.error || 'خطا در ثبت منبع جدید');
      }
      const createdSource: NewsSource = data.source;
      setNewsSources((prev) =>
        prev.some((s) => s.id === createdSource.id)
          ? prev.map((s) => (s.id === createdSource.id ? createdSource : s))
          : [createdSource, ...prev]
      );
      return createdSource;
    } catch (err: unknown) {
      setArticleError(err instanceof Error ? err.message : 'ثبت خودکار منبع ناموفق بود.');
      return null;
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceFeedback(null);
    const cleanName = normalizeSitePlainText(newSourceName, true);
    if (!cleanName) {
      setSourceFeedback({ type: 'error', text: 'لطفاً نام منبع خبری را وارد کنید.' });
      return;
    }
    const token = getAdminToken();
    if (!token) {
      setSourceFeedback({ type: 'error', text: 'نشست مدیریت منقضی شده است.' });
      return;
    }
    setSavingSource(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: cleanName, url: newSourceUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در افزودن منبع خبری');
      setNewsSources((prev) => [data.source, ...prev]);
      setNewSourceName('');
      setNewSourceUrl('');
      setSourceFeedback({ type: 'success', text: `منبع «${data.source.name}» با موفقیت ثبت شد.` });
    } catch (err: unknown) {
      setSourceFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'ثبت منبع ناموفق بود.',
      });
    } finally {
      setSavingSource(false);
    }
  };

  const handleStartEditSource = (src: NewsSource) => {
    setSourceFeedback(null);
    setEditingSourceId(src.id);
    setEditingSourceName(src.name);
    setEditingSourceUrl(src.url || '');
  };

  const handleSaveEditSource = async (id: number) => {
    setSourceFeedback(null);
    const cleanName = normalizeSitePlainText(editingSourceName, true);
    if (!cleanName) {
      setSourceFeedback({ type: 'error', text: 'نام منبع نمی‌تواند خالی باشد.' });
      return;
    }
    const token = getAdminToken();
    if (!token) return;
    setSavingSource(true);
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: cleanName, url: editingSourceUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ویرایش منبع خبری');
      setNewsSources((prev) => prev.map((s) => (s.id === id ? data.source : s)));
      setEditingSourceId(null);
      setSourceFeedback({ type: 'success', text: 'منبع خبری با موفقیت ویرایش شد.' });
    } catch (err: unknown) {
      setSourceFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'ویرایش منبع ناموفق بود.',
      });
    } finally {
      setSavingSource(false);
    }
  };

  const handleDeleteSource = async (id: number) => {
    const token = getAdminToken();
    if (!token) return;
    setSourceFeedback(null);
    setDeletingSourceId(id);
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف منبع');
      setNewsSources((prev) => prev.filter((s) => s.id !== id));
      if (articleSourceId === id) {
        setArticleSourceId(null);
      }
      setSourceFeedback({ type: 'success', text: 'منبع خبری حذف شد.' });
    } catch (err: unknown) {
      setSourceFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'حذف منبع ناموفق بود.',
      });
    } finally {
      setDeletingSourceId(null);
    }
  };

  const handleStartEditArticle = (art: Article) => {
    const matchedSrc = newsSources.find((s) => s.id === art.sourceId);
    const resolvedOrigin: 'quoted' | 'original' | '' =
      art.contentOrigin === 'original' || art.contentOrigin === 'quoted'
        ? art.contentOrigin
        : art.sourceName
          ? 'quoted'
          : '';
    const isDraft = art.status === 'draft';
    setEditingArticleId(art.id);
    setEditingArticleCode(art.code || String(art.id));
    setEditingArticleStatus(isDraft ? 'draft' : 'published');
    setArticleType(art.articleType || (isDraft ? '' : art.isVideo ? 'ویدیو' : 'خبر'));
    setArticleSection(art.section || '');
    setArticleSubsection(art.subsection || '');
    setArticleAuthor(art.authorName || '');
    setArticleContentOrigin(resolvedOrigin);
    setArticleSourceId(resolvedOrigin === 'original' ? null : (art.sourceId ?? null));
    setArticleSourceName(resolvedOrigin === 'original' ? '' : (art.sourceName || ''));
    setArticleSourceUrl(
      resolvedOrigin === 'original' ? '' : (art.sourceUrl || matchedSrc?.url || '')
    );
    setArticleKicker(art.kicker || '');
    setArticleTitle(art.title || '');
    setArticleSubtitle(art.subtitle || '');
    setArticleLead(art.lead || '');
    setArticleBody(art.body || '');
    setArticleImageUrl(art.imageUrl || '');
    setArticleAttachments(parseJsonArray<ArticleAttachment>(art.attachments));
    setArticleGalleryImages(parseJsonArray<ArticleGalleryItem>(art.galleryImages));
    setArticleVideos(parseJsonArray<ArticleVideoItem>(art.videos));
    setArticleTags(parseTags(art.tags).join('، '));
    setArticleError(null);
    setImageProcessInfo(null);
    setArticleNotice(null);
    if (isDraft) {
      setActiveTab('publish');
      setShowPublishForm(true);
    } else {
      setActiveTab('articles');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveArticle = async (targetStatus: 'published' | 'draft') => {
    setArticleError(null);
    setArticleNotice(null);

    const isBreaking = isBreakingArticleType(articleType);

    if (targetStatus === 'draft') {
      if (!articleTitle.trim()) {
        setArticleError('برای ذخیره به عنوان پیشنویس، وارد کردن حداقل تیتر مطلب الزامی است.');
        return;
      }
    } else {
      if (!articleType) {
        setArticleError('لطفاً نوع مطلب را انتخاب کنید.');
        return;
      }
      if (isBreaking) {
        if (!articleTitle.trim()) {
          setArticleError('برای انتشار خبر فوری، وارد کردن تیتر خبر الزامی است.');
          return;
        }
      } else {
        if (!articleSection) {
          setArticleError('لطفاً منوی اصلی را انتخاب کنید.');
          return;
        }
        if (!articleTitle.trim() || !hasRichBodyContent(articleBody)) {
          setArticleError('لطفاً تیتر و متن را تکمیل کنید.');
          return;
        }
      }
    }

    const token = getAdminToken();
    if (!token) {
      setArticleError('نشست مدیریت منقضی شده است.');
      return;
    }

    setSubmittingArticle(true);
    setSubmittingStatusMode(targetStatus);
    try {
      const tags = articleTags
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const isEditing = editingArticleId !== null;
      const wasPublished = isEditing && editingArticleStatus === 'published';
      const url = isEditing ? `/api/news/${editingArticleId}` : '/api/news';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          section: articleSection,
          subsection: articleSubsection.trim(),
          articleType: articleType.trim(),
          kicker: normalizeSitePlainText(articleKicker, true),
          title: normalizeSitePlainText(articleTitle, true),
          subtitle: normalizeSitePlainText(articleSubtitle, true),
          lead: normalizeSitePlainText(articleLead, false),
          body: articleBody.trim(),
          imageUrl: articleImageUrl.trim(),
          tags,
          authorName: articleAuthor.trim(),
          authorAvatar: '',
          contentOrigin: articleContentOrigin,
          sourceId: articleContentOrigin === 'original' ? null : articleSourceId,
          sourceName:
            articleContentOrigin === 'original'
              ? ''
              : normalizeSitePlainText(articleSourceName, true),
          sourceUrl: articleContentOrigin === 'original' ? '' : articleSourceUrl.trim(),
          attachments: articleAttachments,
          galleryImages: articleGalleryImages,
          videos: articleVideos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت مطلب');
      if (isEditing && onArticleUpdated) {
        onArticleUpdated(data.article);
      } else {
        onArticlePublished(data.article);
      }
      await loadNewsSources();
      const savedTitle = data.article?.title || articleTitle.trim();
      if (wasPublished && targetStatus === 'draft') {
        setArticleNotice({
          type: 'success',
          text: `مطلب «${savedTitle}» ویرایش و به پیشنویس تبدیل شد و از صفحه عمومی سایت خارج گردید.`,
          actionLabel: `مشاهده در «${getSidebarMenu('publish').label}»`,
          actionTab: 'publish',
        });
      } else if (targetStatus === 'draft') {
        setArticleNotice({
          type: 'success',
          text: `مطلب «${savedTitle}» در فهرست پیشنویس‌ها ذخیره شد و برای ادامه ویرایش یا انتشار نهایی آماده است.`,
        });
      } else if (wasPublished) {
        setArticleNotice({
          type: 'success',
          text: `تغییرات مطلب منتشرشده «${savedTitle}» با موفقیت ذخیره و در سایت به‌روزرسانی شد.`,
        });
      } else {
        const publishedBreakingQuick =
          isBreaking && (!articleSection || !hasRichBodyContent(articleBody));
        setArticleNotice({
          type: 'success',
          text: publishedBreakingQuick
            ? `خبر فوری «${savedTitle}» با موفقیت منتشر شد و در نوار خبر فوری زیر منو قرار گرفت. هر زمان که بخواهید می‌توانید از بخش مدیریت خبر منتشرشده آن را ویرایش، تکمیل یا حذف کنید.`
            : `مطلب «${savedTitle}» با موفقیت در سایت منتشر شد.`,
          actionLabel: `مشاهده در «${getSidebarMenu('articles').label}»`,
          actionTab: 'articles',
        });
      }
      resetArticleForm();
    } catch (err: unknown) {
      setArticleError(err instanceof Error ? err.message : 'ثبت مطلب ناموفق بود.');
    } finally {
      setSubmittingArticle(false);
      setSubmittingStatusMode(null);
    }
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveArticle('published');
  };

  const handleQuickPublishDraft = async (art: Article) => {
    setArticleNotice(null);
    const isBreaking = isBreakingArticleType(art.articleType);
    const hasMissingRequired = isBreaking
      ? !art.articleType || !art.title.trim()
      : !art.articleType || !art.section || !art.title.trim() || !hasRichBodyContent(art.body || '');

    if (hasMissingRequired) {
      handleStartEditArticle(art);
      setArticleError(
        isBreaking
          ? 'برای انتشار خبر فوری، وارد کردن نوع مطلب و تیتر الزامی است.'
          : 'برای انتشار نهایی این پیشنویس، لطفاً فیلدهای الزامی (نوع مطلب، منوی اصلی، تیتر و متن) را تکمیل کرده و دکمه انتشار را بزنید.'
      );
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setArticleNotice({ type: 'error', text: 'نشست مدیریت منقضی شده است.' });
      return;
    }

    setPublishingDraftId(art.id);
    try {
      const res = await fetch(`/api/news/${art.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'published',
          section: art.section,
          subsection: art.subsection || '',
          articleType: art.articleType || '',
          kicker: art.kicker || '',
          title: art.title,
          subtitle: art.subtitle || '',
          lead: art.lead || '',
          body: art.body || '',
          imageUrl: art.imageUrl || '',
          tags: parseTags(art.tags),
          authorName: art.authorName || '',
          contentOrigin: art.contentOrigin || '',
          sourceId: art.contentOrigin === 'original' ? null : (art.sourceId ?? null),
          sourceName: art.contentOrigin === 'original' ? '' : (art.sourceName || ''),
          sourceUrl: art.contentOrigin === 'original' ? '' : (art.sourceUrl || ''),
          attachments: parseJsonArray<ArticleAttachment>(art.attachments),
          galleryImages: parseJsonArray<ArticleGalleryItem>(art.galleryImages),
          videos: parseJsonArray<ArticleVideoItem>(art.videos),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در انتشار پیشنویس');
      if (onArticleUpdated) {
        onArticleUpdated(data.article);
      }
      setArticleNotice({
        type: 'success',
        text: `پیشنویس «${art.title}» با موفقیت منتشر شد و به بخش خبرهای منتشرشده انتقال یافت.`,
        actionLabel: `مشاهده در «${getSidebarMenu('articles').label}»`,
        actionTab: 'articles',
      });
    } catch (err: unknown) {
      setArticleNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'انتشار پیشنویس ناموفق بود.',
      });
    } finally {
      setPublishingDraftId(null);
    }
  };

  const handleConvertPublishedToDraft = async (art: Article) => {
    setArticleNotice(null);
    const token = getAdminToken();
    if (!token) {
      setArticleNotice({ type: 'error', text: 'نشست مدیریت منقضی شده است.' });
      return;
    }

    setConvertingToDraftId(art.id);
    try {
      const res = await fetch(`/api/news/${art.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'draft',
          section: art.section,
          subsection: art.subsection || '',
          articleType: art.articleType || '',
          kicker: art.kicker || '',
          title: art.title,
          subtitle: art.subtitle || '',
          lead: art.lead || '',
          body: art.body || '',
          imageUrl: art.imageUrl || '',
          tags: parseTags(art.tags),
          authorName: art.authorName || '',
          contentOrigin: art.contentOrigin || '',
          sourceId: art.contentOrigin === 'original' ? null : (art.sourceId ?? null),
          sourceName: art.contentOrigin === 'original' ? '' : (art.sourceName || ''),
          sourceUrl: art.contentOrigin === 'original' ? '' : (art.sourceUrl || ''),
          attachments: parseJsonArray<ArticleAttachment>(art.attachments),
          galleryImages: parseJsonArray<ArticleGalleryItem>(art.galleryImages),
          videos: parseJsonArray<ArticleVideoItem>(art.videos),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در تبدیل مطلب به پیشنویس');
      if (onArticleUpdated) {
        onArticleUpdated(data.article);
      }
      if (editingArticleId === art.id) {
        resetArticleForm();
      }
      setArticleNotice({
        type: 'success',
        text: `خبر «${art.title}» به پیشنویس تبدیل شد و از صفحه عمومی سایت خارج گردید.`,
        actionLabel: `مشاهده در «${getSidebarMenu('publish').label}»`,
        actionTab: 'publish',
      });
    } catch (err: unknown) {
      setArticleNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'تبدیل به پیشنویس ناموفق بود.',
      });
    } finally {
      setConvertingToDraftId(null);
    }
  };

  const handleDeleteArticle = async (articleId: number) => {
    const token = getAdminToken();
    if (!token) return;
    setDeletingArticleId(articleId);
    try {
      const res = await fetch(`/api/news/${articleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onArticleDeleted(articleId);
      }
    } finally {
      setDeletingArticleId(null);
    }
  };

  // Unauthenticated full-page login view (NOT a modal)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col justify-between" dir="rtl">
        <div className="bg-[#0b5e85] text-white px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <IslamTimesLogo compact />
            <span className="text-xs font-semibold text-sky-100 border-r border-white/25 pr-3">
              سامانه مدیریت محتوا (CMS)
            </span>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            بازگشت به صفحه اصلی سایت
          </a>
        </div>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#0b5e85] text-white px-6 py-4 flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-sky-200" />
              <div>
                <h1 className="text-base font-bold">ورود به پنل مدیریت اسلام تایمز</h1>
                <p className="text-[11px] text-sky-100">صفحه اختصاصی مدیریت محتوا، منوها و تحریریه</p>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              <div className="bg-neutral-50 rounded p-3 text-xs text-neutral-600 border border-neutral-200">
                <p className="font-semibold text-neutral-800 mb-1">اطلاعات ورود مدیر:</p>
                <p>
                  نام کاربری:{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-300 font-mono">
                    admin
                  </code>
                </p>
                <p className="mt-1">
                  رمز عبور:{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-300 font-mono">
                    islamtimes1405
                  </code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  نام کاربری
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-neutral-400 absolute right-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded border border-neutral-300 pr-9 pl-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0b5e85]"
                    placeholder="نام کاربری..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  رمز عبور
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-400 absolute right-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded border border-neutral-300 pr-9 pl-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0b5e85]"
                    placeholder="رمز عبور..."
                  />
                </div>
              </div>

              {(localLoginErr || loginError) && (
                <p className="text-xs text-[#d41a24] font-medium">
                  {localLoginErr || loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-xs font-bold cursor-pointer disabled:opacity-60 transition-colors"
              >
                {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                ورود به سامانه مدیریت CMS
              </button>
            </form>
          </div>
        </main>

        <footer className="py-3 text-center text-[11px] text-neutral-500 border-t border-neutral-200 bg-white">
          سامانه مدیریت محتوای پایگاه خبری اسلام تایمز
        </footer>
      </div>
    );
  }

  const sectionMenusForPublish = draftMenu.items.filter((m) => m.key !== 'home');
  const selectedMenuForPublish = sectionMenusForPublish.find((m) => m.key === articleSection);

  const normalizeDigits = (val: string) =>
    val
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const renderArticleNotice = () =>
    articleNotice ? (
      <div
        className={`p-3.5 rounded-lg border text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
          articleNotice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-[#d41a24]'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{articleNotice.text}</span>
        </div>
        <div className="flex items-center gap-2">
          {articleNotice.actionLabel && articleNotice.actionTab && (
            <button
              type="button"
              onClick={() => {
                const targetTab = articleNotice.actionTab!;
                setArticleNotice(null);
                setActiveTab(targetTab);
              }}
              className="px-2.5 py-1 rounded bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold cursor-pointer"
            >
              {articleNotice.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setArticleNotice(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    ) : null;

  const renderArticleForm = (mode: 'compose' | 'edit-draft' | 'edit-published') => {
    const isPublishedEdit = mode === 'edit-published';
    const isDraftEdit = mode === 'edit-draft';
    const isBreakingSelected = isBreakingArticleType(articleType);
    const isMediaBusy =
      submittingArticle ||
      uploadingMainImage ||
      uploadingAttachment ||
      uploadingGallery ||
      uploadingVideo;

    return (
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#0b5e85]">
                {isPublishedEdit
                  ? 'فرم ویرایش خبر منتشرشده'
                  : isDraftEdit
                    ? 'فرم ویرایش پیشنویس و انتشار نهایی'
                    : 'فرم انتشار مطلب جدید'}
              </h3>
              {editingArticleId !== null && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isDraftEdit
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isDraftEdit ? 'پیشنویس (منتشرنشده)' : 'منتشرشده در سایت'}
                </span>
              )}
            </div>
            <span className="block text-[11px] text-neutral-500">
              {isPublishedEdit
                ? 'می‌توانید این خبر منتشرشده را ویرایش کنید یا با دکمه «تبدیل به پیشنویس» آن را موقتاً از سایت خارج نمایید.'
                : 'برای ذخیره پیشنویس، نوشتن تیتر کافی است و با انتخاب گزینه «پیش‌نمایش» می‌توانید ظاهر نهایی خبر را پیش از انتشار مشاهده کنید.'}
            </span>
          </div>

          <div className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 p-0.5 text-[11px] font-bold shrink-0">
            <button
              type="button"
              onClick={() => setPreviewMode('edit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                previewMode === 'edit'
                  ? 'bg-[#0b5e85] text-white shadow-xs'
                  : 'text-neutral-700 hover:bg-white/70'
              }`}
              title="فرم نوشتن و ویرایش مطلب (پیش‌فرض)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>فرم</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                previewMode === 'preview'
                  ? 'bg-[#d41a24] text-white shadow-xs'
                  : 'text-neutral-700 hover:bg-white/70'
              }`}
              title="پیش‌نمایش ظاهر نهایی خبر پیش از انتشار"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>پیش‌نمایش</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="w-full">
            <form
              onSubmit={handlePublishArticle}
              className={previewMode === 'preview' ? 'hidden' : 'space-y-3 text-xs'}
            >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                نوع مطلب
              </label>
              <select
                value={articleType}
                onChange={(e) => setArticleType(e.target.value)}
                className="w-full rounded border border-neutral-300 px-3 py-1.5 bg-white font-semibold"
              >
                <option value="">-- انتخاب نوع مطلب --</option>
                {draftTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                {isBreakingSelected ? 'منوی اصلی (اختیاری در خبر فوری)' : 'منوی اصلی'}
              </label>
              <select
                value={articleSection}
                onChange={(e) => {
                  setArticleSection(e.target.value);
                  setArticleSubsection('');
                }}
                className="w-full rounded border border-neutral-300 px-3 py-1.5 bg-white"
              >
                <option value="">
                  {isBreakingSelected
                    ? '-- اختیاری (فقط در نوار خبر فوری) --'
                    : '-- انتخاب منوی اصلی --'}
                </option>
                {sectionMenusForPublish.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                زیرمنو (اختیاری)
              </label>
              {selectedMenuForPublish && selectedMenuForPublish.subsections.length > 0 ? (
                <select
                  value={articleSubsection}
                  onChange={(e) => setArticleSubsection(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-1.5 bg-white"
                >
                  <option value="">-- بدون زیرمنو (فقط در منوی اصلی) --</option>
                  {selectedMenuForPublish.subsections.map((sub) => (
                    <option key={sub.id} value={sub.label}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={articleSubsection}
                  onChange={(e) => setArticleSubsection(e.target.value)}
                  placeholder="اختیاری — برای انتشار فقط در منوی اصلی خالی بگذارید"
                  className="w-full rounded border border-neutral-300 px-3 py-1.5"
                />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                نویسنده / خبرنگار (اختیاری)
              </label>
              <select
                value={articleAuthor}
                onChange={(e) => setArticleAuthor(e.target.value)}
                className="w-full rounded border border-neutral-300 px-3 py-1.5 bg-white"
              >
                <option value="">-- بدون انتخاب (خالی) --</option>
                <option value="دکتر محمدرضا صادقی">دکتر محمدرضا صادقی (سردبیر)</option>
                {reportersList.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isBreakingSelected && (
            <div className="rounded-md border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 flex items-start gap-2.5 text-[11px] text-rose-950 leading-5">
              <Radio className="w-4 h-4 text-[#d41a24] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#d41a24]">حالت انتشار سریع «خبر فوری» فعال است:</strong>{' '}
                کافی است فقط <strong>تیتر خبر</strong> را بنویسید و دکمه «انتشار مطلب» را بزنید تا فوراً در نوار خبر فوری زیر منوی اصلی نمایش داده شود (تکمیل سایر بخش‌ها مانند منو، لید، متن یا عکس در این مرحله اختیاری است). بعداً می‌توانید از بخش «{getSidebarMenu('articles').label}» آن را حذف کنید یا با ویرایش و انتخاب منو و متن کامل، خبر را تکمیل نمایید.
              </div>
            </div>
          )}

          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              <div className="lg:col-span-4 space-y-1.5">
                <label className="block text-[11px] font-semibold text-neutral-700">
                  وضعیت نقلی یا تولیدی مطلب (اختیاری)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 px-2.5 py-2 rounded border text-xs font-bold cursor-pointer transition-colors ${
                      articleContentOrigin === 'quoted'
                        ? 'bg-sky-50 border-[#0b5e85] text-[#0b5e85]'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={articleContentOrigin === 'quoted'}
                      onChange={() =>
                        setArticleContentOrigin((prev) => (prev === 'quoted' ? '' : 'quoted'))
                      }
                      className="accent-[#0b5e85] w-4 h-4"
                    />
                    <span>نقلی</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 px-2.5 py-2 rounded border text-xs font-bold cursor-pointer transition-colors ${
                      articleContentOrigin === 'original'
                        ? 'bg-rose-50 border-[#d41a24] text-[#d41a24]'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={articleContentOrigin === 'original'}
                      onChange={() => {
                        setArticleContentOrigin((prev) => {
                          const next = prev === 'original' ? '' : 'original';
                          if (next === 'original') {
                            setArticleSourceId(null);
                            setArticleSourceName('');
                            setArticleSourceUrl('');
                          }
                          return next;
                        });
                      }}
                      className="accent-[#d41a24] w-4 h-4"
                    />
                    <span>تولیدی</span>
                  </label>
                </div>
                <p className="text-[10px] text-neutral-500 leading-4">
                  {articleContentOrigin === 'original'
                    ? 'واژه «اختصاصی» روی تصویر مطلب نمایش داده می‌شود.'
                    : 'در مطالب نقلی می‌توانید نام و لینک منبع را وارد کنید.'}
                </p>
              </div>

              <div className="lg:col-span-8">
                {articleContentOrigin === 'original' ? (
                  <div className="h-full min-h-[68px] rounded border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-[#d41a24] text-white text-[10px] font-extrabold">
                          اختصاصی
                        </span>
                        <span className="text-xs font-bold text-neutral-800">
                          مطلب تولیدی انتخاب شد
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600">
                        نشان «اختصاصی» روی تصویر این مطلب درج می‌شود و نیازی به ثبت منبع بیرونی نیست.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-[11px] font-semibold text-neutral-700">
                          نام منبع خبر (اختیاری)
                        </label>
                        <span className="text-[10px] text-neutral-400">
                          جست‌وجو یا تایپ منبع جدید
                        </span>
                      </div>
                      <NewsSourceCombobox
                        sources={newsSources}
                        value={articleSourceName}
                        selectedSourceId={articleSourceId}
                        onChange={(nextName, nextId, nextUrl) => {
                          setArticleSourceName(nextName);
                          setArticleSourceId(nextId);
                          if (nextUrl !== undefined) {
                            setArticleSourceUrl(nextUrl);
                          }
                          if (nextName.trim() && articleContentOrigin !== 'quoted') {
                            setArticleContentOrigin('quoted');
                          }
                        }}
                        onCreateSource={handleAutoCreateSourceFromDropdown}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-[11px] font-semibold text-neutral-700">
                          آدرس اینترنتی منبع (لینک در انتهای خبر)
                        </label>
                        <span className="text-[10px] text-neutral-400">
                          در مدیریت منابع هم ذخیره می‌شود
                        </span>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={articleSourceUrl}
                        onChange={(e) => setArticleSourceUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0b5e85]/25 focus:border-[#0b5e85]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-semibold text-neutral-700">
                روتیتر (اختیاری)
              </label>
              <span className="text-[10px] text-neutral-400">قلم و اندازه ثابت سایت</span>
            </div>
            <input
              type="text"
              dir="rtl"
              value={articleKicker}
              onChange={(e) => setArticleKicker(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const raw =
                  e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html');
                const clean = normalizeSitePlainText(raw, true);
                if (!clean) return;
                const input = e.currentTarget;
                const start = input.selectionStart ?? articleKicker.length;
                const end = input.selectionEnd ?? articleKicker.length;
                const next = articleKicker.slice(0, start) + clean + articleKicker.slice(end);
                setArticleKicker(normalizeSitePlainText(next, true));
              }}
              onBlur={() => setArticleKicker((v) => normalizeSitePlainText(v, true))}
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#0b5e85]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-semibold text-neutral-700">تیتر</label>
              <span className="text-[10px] text-neutral-400">قلم و اندازه ثابت سایت</span>
            </div>
            <input
              type="text"
              dir="rtl"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const raw =
                  e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html');
                const clean = normalizeSitePlainText(raw, true);
                if (!clean) return;
                const input = e.currentTarget;
                const start = input.selectionStart ?? articleTitle.length;
                const end = input.selectionEnd ?? articleTitle.length;
                const next = articleTitle.slice(0, start) + clean + articleTitle.slice(end);
                setArticleTitle(normalizeSitePlainText(next, true));
              }}
              onBlur={() => setArticleTitle((v) => normalizeSitePlainText(v, true))}
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-base font-extrabold text-neutral-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-semibold text-neutral-700">
                زیرتیتر (اختیاری)
              </label>
              <span className="text-[10px] text-neutral-400">قلم و اندازه ثابت سایت</span>
            </div>
            <input
              type="text"
              dir="rtl"
              value={articleSubtitle}
              onChange={(e) => setArticleSubtitle(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const raw =
                  e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html');
                const clean = normalizeSitePlainText(raw, true);
                if (!clean) return;
                const input = e.currentTarget;
                const start = input.selectionStart ?? articleSubtitle.length;
                const end = input.selectionEnd ?? articleSubtitle.length;
                const next =
                  articleSubtitle.slice(0, start) + clean + articleSubtitle.slice(end);
                setArticleSubtitle(normalizeSitePlainText(next, true));
              }}
              onBlur={() => setArticleSubtitle((v) => normalizeSitePlainText(v, true))}
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm font-bold text-neutral-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-semibold text-neutral-700">لید</label>
              <span className="text-[10px] text-neutral-400">قلم و اندازه ثابت سایت</span>
            </div>
            <textarea
              rows={2}
              dir="rtl"
              value={articleLead}
              onChange={(e) => setArticleLead(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const raw =
                  e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html');
                const clean = normalizeSitePlainText(raw, false);
                if (!clean) return;
                const textarea = e.currentTarget;
                const start = textarea.selectionStart ?? articleLead.length;
                const end = textarea.selectionEnd ?? articleLead.length;
                const next = articleLead.slice(0, start) + clean + articleLead.slice(end);
                setArticleLead(normalizeSitePlainText(next, false));
              }}
              onBlur={() => setArticleLead((v) => normalizeSitePlainText(v, false))}
              className="w-full rounded border border-neutral-300 p-2 text-sm font-medium text-neutral-700 leading-7"
            />
          </div>

          <RichTextEditor
            value={articleBody}
            onChange={setArticleBody}
            onUploadImage={async (rawFile) => {
              const processed = await optimizeAndCropImage(rawFile, 'inline');
              const uploaded = await uploadAdminFile(processed.file, 'images');
              return { url: uploaded.url, name: uploaded.name };
            }}
          />

          {/* Main Photo: Auto-Crop (Large 16:10 + Small 3:2) & Optimization */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#0b5e85]" />
                تصویر اصلی مطلب (تولید خودکار عکس بزرگ و عکس کوچک و بهینه‌سازی حجم)
              </label>
              <div className="flex items-center gap-2">
                {articleImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setArticleImageUrl('');
                      setImageProcessInfo(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-neutral-300 bg-white hover:bg-rose-50 text-neutral-700 hover:text-[#d41a24] text-[11px] font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف تصویر</span>
                  </button>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-[11px] font-bold cursor-pointer">
                  {uploadingMainImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingMainImage ? 'در حال برش و بهینه‌سازی...' : 'آپلود عکس مطلب'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingMainImage}
                    onChange={(e) => {
                      handleMainImageUpload(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Recommended Size Guide so Large Image is NOT Cropped */}
            <div className="rounded border border-sky-200 bg-sky-50/80 px-3 py-2 text-[11px] text-sky-950 leading-5">
              <strong className="text-[#0b5e85]">سایز استاندارد عکس بزرگ (برای اینکه برش نخورد):</strong>{' '}
              <span className="font-extrabold tabular-nums">
                {toPersianDigits(LARGE_IMAGE_WIDTH)} × {toPersianDigits(LARGE_IMAGE_HEIGHT)} پیکسل
              </span>{' '}
              (نسبت <strong className="tabular-nums">۱۶:۱۰</strong>). اگر تصویر با این ابعاد یا نسبت ۱۶:۱۰ بارگذاری شود بدون برش باقی می‌ماند؛ در غیر این صورت، سیستم به‌طور خودکار عکس بزرگ (۱۶:۱۰) و عکس کوچک کارت‌ها (۳:۲ با ابعاد{' '}
              <span className="tabular-nums">
                {toPersianDigits(SMALL_IMAGE_WIDTH)}×{toPersianDigits(SMALL_IMAGE_HEIGHT)}
              </span>
              ) را برش داده و حجم و سایز تصویر را برای سرعت سایت اصلاح می‌کند.
            </div>

            {imageProcessInfo && (
              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold">
                  {imageProcessInfo.wasCropped
                    ? 'برش خودکار و اصلاح حجم انجام شد:'
                    : 'نسبت تصویر دقیق بود (بدون برش) و حجم بهینه شد:'}
                </span>
                <span className="tabular-nums">
                  اصلی: {imageProcessInfo.originalDimensions} ({formatFileSize(imageProcessInfo.originalSize)})
                </span>
                <span>←</span>
                <span className="font-bold tabular-nums">
                  عکس بزرگ: {imageProcessInfo.largeDimensions} ({formatFileSize(imageProcessInfo.largeSize)})
                </span>
                {imageProcessInfo.smallDimensions && (
                  <span className="font-bold tabular-nums">
                    • عکس کوچک: {imageProcessInfo.smallDimensions} ({formatFileSize(imageProcessInfo.smallSize)})
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 items-center">
              <div className="flex items-end gap-2.5">
                {/* Large Image Preview (16:10) */}
                <div className="flex-1 space-y-1">
                  <span className="block text-[10px] font-semibold text-neutral-500">
                    عکس بزرگ (۱۶:۱۰)
                  </span>
                  <div className="relative w-full aspect-[16/10] rounded border border-neutral-300 overflow-hidden bg-white flex flex-col items-center justify-center text-neutral-400">
                    {articleImageUrl ? (
                      <>
                        <img
                          src={articleImageUrl}
                          alt="پیش‌نمایش عکس بزرگ خبر"
                          className="w-full h-full object-cover"
                        />
                        {articleContentOrigin === 'original' && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-[2px] bg-[#d41a24] text-white text-[9px] font-extrabold shadow">
                            اختصاصی
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 opacity-50 mb-1" />
                        <span className="text-[10px]">بدون تصویر</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Small Thumbnail Preview (3:2) */}
                <div className="w-20 shrink-0 space-y-1">
                  <span className="block text-[10px] font-semibold text-neutral-500">
                    عکس کوچک (۳:۲)
                  </span>
                  <div className="relative w-20 aspect-[3/2] rounded border border-neutral-300 overflow-hidden bg-white flex items-center justify-center text-neutral-400">
                    {articleImageUrl ? (
                      <img
                        src={getSmallVariantUrl(articleImageUrl)}
                        onError={(e) => {
                          if (e.currentTarget.src !== articleImageUrl) {
                            e.currentTarget.src = articleImageUrl;
                          }
                        }}
                        alt="پیش‌نمایش عکس کوچک خبر"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 opacity-40" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                  نشانی مستقیم تصویر (اختیاری — پس از آپلود خودکار پر می‌شود)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={articleImageUrl}
                  onChange={(e) => {
                    setArticleImageUrl(e.target.value);
                    setImageProcessInfo(null);
                  }}
                  placeholder="https://..."
                  className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Photo Gallery Section */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0b5e85]" />
                  گالری عکس ({toPersianDigits(articleGalleryImages.length)} تصویر)
                </label>
                <span className="block text-[10px] text-neutral-500 mt-0.5">
                  برش خودکار با نسبت ۴:۳ ({toPersianDigits(GALLERY_IMAGE_WIDTH)}×{toPersianDigits(GALLERY_IMAGE_HEIGHT)}) و بهینه‌سازی خودکار حجم
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    dir="ltr"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    placeholder="https://... نشانی عکس"
                    className="w-44 rounded border border-neutral-300 bg-white px-2 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = newGalleryUrl.trim();
                      if (!url) return;
                      setArticleGalleryImages((prev) => [
                        ...prev,
                        { id: `gal-${Date.now()}`, url, caption: '' },
                      ]);
                      setNewGalleryUrl('');
                    }}
                    className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-[11px] font-semibold cursor-pointer"
                  >
                    افزودن لینک
                  </button>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer">
                  {uploadingGallery ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingGallery ? 'در حال آپلود...' : 'آپلود تصاویر گالری'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingGallery}
                    onChange={(e) => {
                      handleGalleryUpload(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {articleGalleryImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {articleGalleryImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="bg-white border border-neutral-200 rounded p-2 flex items-center gap-2"
                  >
                    <img
                      src={img.url}
                      alt={img.caption || `تصویر ${idx + 1}`}
                      className="w-16 h-12 rounded object-cover shrink-0 border border-neutral-200"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(e) =>
                          setArticleGalleryImages((prev) =>
                            prev.map((item) =>
                              item.id === img.id ? { ...item, caption: e.target.value } : item
                            )
                          )
                        }
                        placeholder={`توضیح تصویر ${toPersianDigits(idx + 1)}...`}
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-[11px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setArticleGalleryImages((prev) => prev.filter((item) => item.id !== img.id))
                      }
                      className="p-1 text-neutral-400 hover:text-[#d41a24] cursor-pointer"
                      title="حذف تصویر از گالری"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Upload / Links Section */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#d41a24]" />
                  ویدیوهای مطلب ({toPersianDigits(articleVideos.length)} ویدیو)
                </label>
                <span className="block text-[10px] text-neutral-500 mt-0.5">
                  حداکثر حجم مجاز برای بارگذاری هر ویدیو: ۵۰۰ مگابایت
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    dir="ltr"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://.../video.mp4"
                    className="w-44 rounded border border-neutral-300 bg-white px-2 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = newVideoUrl.trim();
                      if (!url) return;
                      setArticleVideos((prev) => [
                        ...prev,
                        {
                          id: `vid-${Date.now()}`,
                          url,
                          title: `ویدیو ${toPersianDigits(prev.length + 1)}`,
                          mimeType: 'video/mp4',
                        },
                      ]);
                      setNewVideoUrl('');
                    }}
                    className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-[11px] font-semibold cursor-pointer"
                  >
                    افزودن لینک ویدیو
                  </button>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white text-[11px] font-bold cursor-pointer">
                  {uploadingVideo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingVideo ? 'در حال آپلود...' : 'آپلود فایل ویدیو'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    disabled={uploadingVideo}
                    onChange={(e) => {
                      handleVideosUpload(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {articleVideos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {articleVideos.map((vid, idx) => (
                  <div
                    key={vid.id}
                    className="bg-white border border-neutral-200 rounded p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vid.title || ''}
                        onChange={(e) =>
                          setArticleVideos((prev) =>
                            prev.map((item) =>
                              item.id === vid.id ? { ...item, title: e.target.value } : item
                            )
                          )
                        }
                        placeholder={`عنوان ویدیو ${toPersianDigits(idx + 1)}...`}
                        className="flex-1 rounded border border-neutral-200 px-2 py-1 text-[11px] font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setArticleVideos((prev) => prev.filter((item) => item.id !== vid.id))
                        }
                        className="p-1 text-neutral-400 hover:text-[#d41a24] cursor-pointer"
                        title="حذف ویدیو"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <video
                      src={vid.url}
                      controls
                      preload="metadata"
                      className="w-full max-h-36 rounded bg-black"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#0b5e85]" />
                  فایل‌های ضمیمه ({toPersianDigits(articleAttachments.length)} فایل)
                </label>
                <span className="block text-[10px] text-neutral-500 mt-0.5">
                  حداکثر حجم مجاز برای بارگذاری هر فایل ضمیمه: ۵۰۰ مگابایت
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-900 text-white text-[11px] font-bold cursor-pointer">
                {uploadingAttachment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploadingAttachment
                    ? 'در حال آپلود...'
                    : 'افزودن فایل ضمیمه (PDF، Word، ZIP، صوت...)'}
                </span>
                <input
                  type="file"
                  multiple
                  disabled={uploadingAttachment}
                  onChange={(e) => {
                    handleAttachmentsUpload(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {articleAttachments.length > 0 && (
              <div className="space-y-1.5">
                {articleAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="bg-white border border-neutral-200 rounded px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-[#0b5e85] shrink-0" />
                      <input
                        type="text"
                        value={att.name}
                        onChange={(e) =>
                          setArticleAttachments((prev) =>
                            prev.map((item) =>
                              item.id === att.id ? { ...item, name: e.target.value } : item
                            )
                          )
                        }
                        className="flex-1 min-w-0 rounded border border-neutral-200 px-2 py-0.5 text-[11px] font-semibold"
                      />
                      {att.size && (
                        <span className="text-[10px] text-neutral-500 shrink-0">
                          {formatFileSize(att.size)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setArticleAttachments((prev) => prev.filter((item) => item.id !== att.id))
                      }
                      className="p-1 text-neutral-400 hover:text-[#d41a24] cursor-pointer"
                      title="حذف فایل ضمیمه"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              برچسب‌ها (با ویرگول)
            </label>
            <input
              type="text"
              value={articleTags}
              onChange={(e) => setArticleTags(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-1.5"
            />
          </div>

          {articleError && <p className="text-[#d41a24] font-medium">{articleError}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                resetArticleForm();
                if (mode === 'compose') {
                  setShowPublishForm(false);
                }
              }}
              className="px-4 py-1.5 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold cursor-pointer"
            >
              {isPublishedEdit ? 'انصراف از ویرایش' : isDraftEdit ? 'انصراف' : 'بستن / پاک کردن فرم'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('preview')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded border border-[#0b5e85] bg-sky-50 hover:bg-sky-100 text-[#0b5e85] font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>پیش‌نمایش</span>
            </button>
            <button
              type="button"
              disabled={isMediaBusy}
              onClick={() => handleSaveArticle('draft')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {submittingArticle && submittingStatusMode === 'draft' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>
                {submittingArticle && submittingStatusMode === 'draft'
                  ? 'در حال ذخیره...'
                  : isPublishedEdit
                    ? 'تبدیل به پیشنویس و ذخیره'
                    : isDraftEdit
                      ? 'ذخیره تغییرات پیشنویس'
                      : 'ذخیره به عنوان پیشنویس'}
              </span>
            </button>
            <button
              type="submit"
              disabled={isMediaBusy}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {submittingArticle && submittingStatusMode === 'published' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>
                {submittingArticle && submittingStatusMode === 'published'
                  ? 'در حال ثبت...'
                  : isPublishedEdit
                    ? 'ذخیره تغییرات مطلب'
                    : isDraftEdit
                      ? 'انتشار نهایی مطلب'
                      : 'انتشار مطلب'}
              </span>
            </button>
          </div>
          </form>
          </div>

          {previewMode === 'preview' && (
            <div className="w-full space-y-3">
              <ArticleLivePreview
                code={editingArticleCode || undefined}
                status={editingArticleId !== null ? editingArticleStatus : 'draft'}
                articleType={articleType}
                section={articleSection}
                subsection={articleSubsection}
                menuConfig={draftMenu}
                kicker={articleKicker}
                title={articleTitle}
                subtitle={articleSubtitle}
                lead={articleLead}
                body={articleBody}
                imageUrl={articleImageUrl}
                authorName={articleAuthor}
                contentOrigin={articleContentOrigin}
                sourceName={articleSourceName}
                sourceUrl={articleSourceUrl}
                attachments={articleAttachments}
                galleryImages={articleGalleryImages}
                videos={articleVideos}
                tags={articleTags}
              />

              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                {articleError ? (
                  <p className="text-[#d41a24] font-medium">{articleError}</p>
                ) : (
                  <span className="text-[11px] text-neutral-600">
                    در صورت تأیید ظاهر نهایی خبر می‌توانید همین‌جا آن را ذخیره یا منتشر کنید.
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('edit')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>بازگشت به فرم</span>
                  </button>
                    <button
                      type="button"
                      disabled={isMediaBusy}
                      onClick={() => handleSaveArticle('draft')}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {submittingArticle && submittingStatusMode === 'draft' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPublishedEdit
                          ? 'تبدیل به پیشنویس و ذخیره'
                          : isDraftEdit
                            ? 'ذخیره تغییرات پیشنویس'
                            : 'ذخیره به عنوان پیشنویس'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isMediaBusy}
                      onClick={() => handleSaveArticle('published')}
                      className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {submittingArticle && submittingStatusMode === 'published' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPublishedEdit
                          ? 'ذخیره تغییرات مطلب'
                          : isDraftEdit
                            ? 'انتشار نهایی مطلب'
                            : 'انتشار مطلب'}
                      </span>
                    </button>
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col" dir="rtl">
      {/* Top Admin Bar */}
      <header className="bg-[#0b5e85] text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <IslamTimesLogo compact />
          <div className="border-r border-white/25 pr-3">
            <h1 className="text-sm font-bold">پنل جامع مدیریت محتوا (CMS) — اسلام تایمز</h1>
            <p className="text-[11px] text-sky-100">
              {sidebarMenus.map((m) => m.label).join('، ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 text-white font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            مشاهده وب‌سایت
          </a>
          <button
            type="button"
            onClick={adminLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            خروج
          </button>
        </div>
      </header>

      {/* Main Layout: Sidebar + Full Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1400px] w-full mx-auto px-4 py-6 gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xs p-2.5 space-y-2 sticky top-20">
            <div className="flex items-center justify-between gap-2 px-2 pb-2 border-b border-neutral-100">
              <span className="text-[11px] font-bold text-neutral-600">
                منوهای پنل مدیریت
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingSidebar((prev) => !prev);
                  setSidebarStatus(null);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  editingSidebar
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-neutral-100 hover:bg-sky-50 text-neutral-700 hover:text-[#0b5e85]'
                }`}
                title="تغییر نام و جابه‌جایی منوهای پنل مدیریت"
              >
                <Edit3 className="w-3 h-3" />
                {editingSidebar ? 'پایان ویرایش' : 'تغییر نام و ترتیب'}
              </button>
            </div>

            {editingSidebar ? (
              <div className="space-y-2">
                <p className="text-[10px] text-neutral-500 px-1 leading-4">
                  نام و متن توضیحی زیر هر منو را ویرایش کنید یا با فلش‌های بالا/پایین جای آن را تغییر دهید:
                </p>

                <div className="space-y-2">
                  {sidebarMenus.map((item, idx) => {
                    const Icon = ADMIN_TAB_ICONS[item.id] || Menu;
                    const defaultDesc =
                      DEFAULT_ADMIN_SIDEBAR_MENUS.find((d) => d.id === item.id)?.description || '';
                    return (
                      <div
                        key={item.id}
                        className="bg-neutral-50 border border-neutral-200 rounded-md p-2 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0 || savingSidebar}
                              onClick={() => handleMoveSidebarMenu(idx, -1)}
                              title="انتقال به بالا"
                              className="p-0.5 rounded border border-neutral-200 bg-white text-neutral-600 hover:text-[#0b5e85] hover:bg-sky-50 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === sidebarMenus.length - 1 || savingSidebar}
                              onClick={() => handleMoveSidebarMenu(idx, 1)}
                              title="انتقال به پایین"
                              className="p-0.5 rounded border border-neutral-200 bg-white text-neutral-600 hover:text-[#0b5e85] hover:bg-sky-50 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                          <Icon className="w-3.5 h-3.5 text-[#0b5e85] shrink-0" />
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleSidebarLabelInput(item.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                persistSidebarMenus(sidebarMenus);
                              }
                            }}
                            placeholder="نام منو..."
                            className="flex-1 min-w-0 rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#0b5e85]"
                          />
                        </div>
                        <input
                          type="text"
                          value={typeof item.description === 'string' ? item.description : defaultDesc}
                          onChange={(e) => handleSidebarDescriptionInput(item.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              persistSidebarMenus(sidebarMenus);
                            }
                          }}
                          placeholder="متن توضیحی زیر منو..."
                          className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                    );
                  })}
                </div>

                {sidebarStatus && (
                  <div
                    className={`px-2.5 py-1.5 rounded text-[11px] font-semibold ${
                      sidebarStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-[#d41a24] border border-rose-200'
                    }`}
                  >
                    {sidebarStatus.text}
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={savingSidebar}
                    onClick={() => persistSidebarMenus(sidebarMenus)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingSidebar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    ذخیره منوهای پنل
                  </button>
                  <button
                    type="button"
                    disabled={savingSidebar}
                    onClick={handleResetSidebarMenus}
                    title="بازگشت به نام و ترتیب پیش‌فرض"
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    پیش‌فرض
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {sidebarMenus.map((item) => {
                  const Icon = ADMIN_TAB_ICONS[item.id] || Menu;
                  const active = activeTab === item.id;
                  const countBadge =
                    item.id === 'socials'
                      ? `${toPersianDigits(draftSiteSocials.filter((s) => s.url.trim()).length)}/${toPersianDigits(draftSiteSocials.length)}`
                      : item.id === 'publish'
                        ? toPersianDigits(articles.filter((a) => a.status === 'draft').length)
                        : item.id === 'articles'
                          ? toPersianDigits(articles.filter((a) => a.status !== 'draft').length)
                          : item.id === 'media'
                            ? mediaCount !== null
                              ? toPersianDigits(mediaCount)
                              : null
                            : item.id === 'sources'
                              ? toPersianDigits(newsSources.length)
                              : item.id === 'comments'
                                ? toPersianDigits(allComments.length)
                                : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (
                          item.id === 'publish' &&
                          editingArticleId !== null &&
                          editingArticleStatus === 'published'
                        ) {
                          resetArticleForm();
                          setShowPublishForm(true);
                        }
                        if (
                          item.id === 'articles' &&
                          editingArticleId !== null &&
                          editingArticleStatus === 'draft'
                        ) {
                          resetArticleForm();
                        }
                        setArticleNotice(null);
                        setActiveTab(item.id);
                        setEditingTabHeaderId(null);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-semibold text-right cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#0b5e85] text-white shadow-xs'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {countBadge !== null && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {countBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Workspace Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* TAB: MENU MANAGEMENT */}
          {activeTab === 'menus' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[240px]">
                  {editingTabHeaderId === 'menus' ? (
                    <div className="space-y-2 max-w-xl">
                      <input
                        type="text"
                        value={tabHeaderLabelDraft}
                        onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                        placeholder="نام منو..."
                        className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                      />
                      <input
                        type="text"
                        value={tabHeaderDescDraft}
                        onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                        placeholder="متن توضیحی زیر منو..."
                        className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={savingSidebar}
                          onClick={() => saveTabHeaderEdit('menus')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTabHeaderId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-neutral-900">
                          {getSidebarMenu('menus').label}
                        </h2>
                        <button
                          type="button"
                          onClick={() => startEditTabHeader('menus')}
                          title="ویرایش عنوان و متن توضیحی"
                          className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {getSidebarMenu('menus').description && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {getSidebarMenu('menus').description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {menuSubTab !== 'types' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftMenu(DEFAULT_MENU_CONFIG);
                        persistMenuConfig(DEFAULT_MENU_CONFIG);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      بازگشت به پیش‌فرض
                    </button>
                    <button
                      type="button"
                      disabled={savingMenu}
                      onClick={() => persistMenuConfig(draftMenu)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white text-xs font-bold cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      {savingMenu ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      ذخیره و اعمال در سایت
                    </button>
                  </div>
                )}
              </div>

              {menuStatus && menuSubTab !== 'types' && (
                <div
                  className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                    menuStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-[#d41a24]'
                  }`}
                >
                  <span>{menuStatus.text}</span>
                </div>
              )}

              {/* Sub-tab Switcher: Menu Structure vs Home Page Layout vs Article Types */}
              <div className="bg-white rounded-lg border border-neutral-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuSubTab('structure');
                    setHighlightedBlockId(null);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    menuSubTab === 'structure'
                      ? 'bg-[#0b5e85] text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Menu className="w-4 h-4" />
                  <span>ساختار منوها و زیرمنوها</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('home-layout')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    menuSubTab === 'home-layout'
                      ? 'bg-[#d41a24] text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>مدیریت چینش صفحه اول (موقعیت، شکل و تعداد مطلب)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      menuSubTab === 'home-layout'
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {toPersianDigits((draftMenu.homeBlocks || DEFAULT_HOME_BLOCKS).length)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('types')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    menuSubTab === 'types'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>مدیریت نوع مطلب</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      menuSubTab === 'types'
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {toPersianDigits(draftTypes.length)}
                  </span>
                </button>
              </div>

              {menuSubTab === 'home-layout' ? (
                <div className="space-y-6">
                  <HomeLayoutManager
                    menuConfig={draftMenu}
                    articleTypes={draftTypes}
                    highlightedBlockId={highlightedBlockId}
                    onChangeMenuConfig={(next, autoPersist) => {
                      setDraftMenu(next);
                      if (autoPersist) {
                        persistMenuConfig(next);
                      }
                    }}
                  />
                </div>
              ) : menuSubTab === 'types' ? (
                <div className="space-y-4 text-xs">
                  <div className="bg-white p-5 rounded-lg border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        مدیریت نوع مطلب (افزودن، تغییر نام، حذف و انتخاب پیش‌فرض)
                      </h3>
                      <p className="text-neutral-500 text-[11px] mt-1">
                        هر نوع مطلبی که در این بخش اضافه، ویرایش یا حذف شود بلافاصله در فرم انتشار خبر، فیلترهای آرشیو، چینش صفحه اول و فوتر سایت فعال می‌گردد.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1.5 rounded bg-sky-50 border border-sky-200 text-[#0b5e85] font-bold text-[11px]">
                        {toPersianDigits(draftTypes.length)} نوع مطلب فعال
                      </span>
                      <button
                        type="button"
                        disabled={savingTypes}
                        onClick={handleResetDefaultArticleTypes}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        بازگشت به پیش‌فرض
                      </button>
                      <button
                        type="button"
                        disabled={savingTypes}
                        onClick={() => persistArticleTypes(draftTypes)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        {savingTypes ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        ذخیره و اعمال در سایت
                      </button>
                    </div>
                  </div>

                  {typesStatus && (
                    <div
                      className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                        typesStatus.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-[#d41a24]'
                      }`}
                    >
                      <span>{typesStatus.text}</span>
                      <button
                        type="button"
                        onClick={() => setTypesStatus(null)}
                        className="opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Add New Article Type */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-[#0b5e85] flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      افزودن نوع مطلب جدید
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          عنوان نوع مطلب (مثلاً: تحلیل ویژه، مستند، پرونده)
                        </label>
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddArticleType();
                            }
                          }}
                          placeholder="نام نوع مطلب..."
                          className="w-full rounded border border-neutral-300 px-3 py-1.5 text-xs focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          توضیح کوتاه (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={newTypeDesc}
                          onChange={(e) => setNewTypeDesc(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddArticleType();
                            }
                          }}
                          placeholder="کاربرد این نوع مطلب در تحریریه..."
                          className="w-full rounded border border-neutral-300 px-3 py-1.5 text-xs focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={savingTypes}
                        onClick={handleAddArticleType}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded bg-[#0b5e85] hover:bg-[#084867] text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        افزودن نوع مطلب
                      </button>
                    </div>
                  </div>

                  {/* Article Types List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {draftTypes.map((t, index) => {
                      const typeCount = articles.filter(
                        (a) => (a.articleType || (a.isVideo ? 'ویدیو' : 'خبر')) === t.name
                      ).length;
                      const isEditing = editingTypeId === t.id;

                      return (
                        <div
                          key={t.id}
                          className={`bg-white p-4 rounded-lg border space-y-3 shadow-xs flex flex-col justify-between transition-colors ${
                            t.isDefault ? 'border-[#0b5e85]/50 ring-1 ring-[#0b5e85]/15' : 'border-neutral-200'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {isEditing ? (
                              <div className="space-y-2 bg-sky-50/70 p-2.5 rounded border border-sky-200">
                                <div>
                                  <label className="block text-[10px] font-semibold text-neutral-700 mb-1">
                                    نام جدید نوع مطلب:
                                  </label>
                                  <input
                                    type="text"
                                    value={editingTypeName}
                                    onChange={(e) => setEditingTypeName(e.target.value)}
                                    className="w-full rounded border border-sky-300 bg-white px-2.5 py-1 text-xs font-bold focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-neutral-700 mb-1">
                                    توضیح:
                                  </label>
                                  <input
                                    type="text"
                                    value={editingTypeDesc}
                                    onChange={(e) => setEditingTypeDesc(e.target.value)}
                                    className="w-full rounded border border-sky-300 bg-white px-2.5 py-1 text-[11px] focus:outline-none"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTypeId(null)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[11px] font-semibold cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    لغو
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingTypes}
                                    onClick={() => handleSaveEditType(t.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    <Check className="w-3 h-3" />
                                    ثبت تغییر نام
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="text-sm font-bold text-neutral-900">{t.name}</h4>
                                    {t.isDefault && (
                                      <span className="text-[10px] font-bold text-[#0b5e85] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                                        پیش‌فرض
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      disabled={index === 0 || savingTypes}
                                      onClick={() => handleMoveArticleType(index, -1)}
                                      title="انتقال به بالا"
                                      className="p-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === draftTypes.length - 1 || savingTypes}
                                      onClick={() => handleMoveArticleType(index, 1)}
                                      title="انتقال به پایین"
                                      className="p-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={savingTypes}
                                      onClick={() => handleStartEditType(t)}
                                      title="تغییر اسم و ویرایش"
                                      className="p-1 rounded border border-sky-200 text-[#0b5e85] hover:bg-sky-50 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={draftTypes.length <= 1 || savingTypes}
                                      onClick={() => handleDeleteArticleType(t.id)}
                                      title={
                                        draftTypes.length <= 1
                                          ? 'حداقل یک نوع مطلب باید وجود داشته باشد'
                                          : 'حذف نوع مطلب'
                                      }
                                      className="p-1 rounded border border-rose-200 text-[#d41a24] hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[11px] text-neutral-600 leading-5">
                                  {t.description || 'بدون توضیح'}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-neutral-500">
                                مطالب ثبت‌شده:{' '}
                                <strong className="text-neutral-800">
                                  {toPersianDigits(typeCount)}
                                </strong>
                              </span>
                              {!t.isDefault && (
                                <button
                                  type="button"
                                  disabled={savingTypes}
                                  onClick={() => handleSetDefaultArticleType(t.id)}
                                  className="text-[10px] font-semibold text-neutral-600 hover:text-[#0b5e85] underline cursor-pointer"
                                >
                                  تنظیم به‌عنوان پیش‌فرض
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                resetArticleForm();
                                setArticleType(t.name);
                                setShowPublishForm(true);
                                setActiveTab('publish');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-[11px] font-semibold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              انتشار {t.name}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
              {/* Global Display & Count Controls: Home Page vs Menu Page */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Home Page Settings */}
                <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-[#0b5e85] border-b border-neutral-100 pb-2.5">
                    تنظیمات نمایش در صفحه اصلی سایت
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded border border-neutral-200/70">
                      <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftMenu.showMainMenuOnHome}
                          onChange={(e) =>
                            setDraftMenu({ ...draftMenu, showMainMenuOnHome: e.target.checked })
                          }
                          className="accent-[#0b5e85] w-4 h-4"
                        />
                        <span>نمایش منوی اصلی در صفحه اصلی</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">تعداد:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxMainMenusOnHome: Math.max(0, draftMenu.maxMainMenusOnHome - 1),
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="کاهش تعداد منوی اصلی در صفحه اصلی"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={draftMenu.maxMainMenusOnHome}
                          onChange={(e) =>
                            setDraftMenu({
                              ...draftMenu,
                              maxMainMenusOnHome: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-12 text-center border border-neutral-300 rounded py-0.5 bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxMainMenusOnHome: draftMenu.maxMainMenusOnHome + 1,
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="افزایش تعداد منوی اصلی در صفحه اصلی"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded border border-neutral-200/70">
                      <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftMenu.showSubmenusOnHome}
                          onChange={(e) =>
                            setDraftMenu({ ...draftMenu, showSubmenusOnHome: e.target.checked })
                          }
                          className="accent-[#0b5e85] w-4 h-4"
                        />
                        <span>نمایش زیرمنوها در صفحه اصلی</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">تعداد:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxSubmenusOnHome: Math.max(0, draftMenu.maxSubmenusOnHome - 1),
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="کاهش تعداد زیرمنو در صفحه اصلی"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={draftMenu.maxSubmenusOnHome}
                          onChange={(e) =>
                            setDraftMenu({
                              ...draftMenu,
                              maxSubmenusOnHome: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-12 text-center border border-neutral-300 rounded py-0.5 bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxSubmenusOnHome: draftMenu.maxSubmenusOnHome + 1,
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="افزایش تعداد زیرمنو در صفحه اصلی"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Page Settings */}
                <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-[#d41a24] border-b border-neutral-100 pb-2.5">
                    تنظیمات نمایش در صفحه خود منو (صفحه بخش‌ها)
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded border border-neutral-200/70">
                      <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftMenu.showMainMenuOnMenuPage}
                          onChange={(e) =>
                            setDraftMenu({
                              ...draftMenu,
                              showMainMenuOnMenuPage: e.target.checked,
                            })
                          }
                          className="accent-[#d41a24] w-4 h-4"
                        />
                        <span>نمایش منوی اصلی در صفحه منو</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">تعداد:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxMainMenusOnMenuPage: Math.max(
                                0,
                                draftMenu.maxMainMenusOnMenuPage - 1
                              ),
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="کاهش تعداد منوی اصلی در صفحه منو"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={draftMenu.maxMainMenusOnMenuPage}
                          onChange={(e) =>
                            setDraftMenu({
                              ...draftMenu,
                              maxMainMenusOnMenuPage: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-12 text-center border border-neutral-300 rounded py-0.5 bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxMainMenusOnMenuPage: draftMenu.maxMainMenusOnMenuPage + 1,
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="افزایش تعداد منوی اصلی در صفحه منو"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded border border-neutral-200/70">
                      <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftMenu.showSubmenusOnMenuPage}
                          onChange={(e) =>
                            setDraftMenu({
                              ...draftMenu,
                              showSubmenusOnMenuPage: e.target.checked,
                            })
                          }
                          className="accent-[#d41a24] w-4 h-4"
                        />
                        <span>نمایش زیرمنوها در صفحه منو</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">تعداد:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxSubmenusOnMenuPage: Math.max(
                                0,
                                draftMenu.maxSubmenusOnMenuPage - 1
                              ),
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="کاهش تعداد زیرمنو در صفحه منو"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={draftMenu.maxSubmenusOnMenuPage}
                          onChange={(e) =>
                            setDraftMenu({
                              ...draftMenu,
                              maxSubmenusOnMenuPage: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-12 text-center border border-neutral-300 rounded py-0.5 bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              maxSubmenusOnMenuPage: draftMenu.maxSubmenusOnMenuPage + 1,
                            })
                          }
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                          aria-label="افزایش تعداد زیرمنو در صفحه منو"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add New Main Menu Form */}
              <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs">
                <h3 className="text-xs font-bold text-neutral-900 mb-3">افزودن منوی اصلی جدید</h3>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px_auto] items-end gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      عنوان منوی اصلی
                    </label>
                    <input
                      type="text"
                      value={newMainLabel}
                      onChange={(e) => setNewMainLabel(e.target.value)}
                      placeholder="مثلاً: اقتصاد و بازار، فرهنگ، جهان اسلام..."
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      متن توضیحی زیر منو (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={newMainDesc}
                      onChange={(e) => setNewMainDesc(e.target.value)}
                      placeholder="توضیح کوتاه برای صفحه این بخش..."
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      کلید انگلیسی (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={newMainKey}
                      onChange={(e) => setNewMainKey(e.target.value)}
                      placeholder="مثلاً: economy"
                      dir="ltr"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMainMenu}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    افزودن منوی اصلی
                  </button>
                </div>
              </div>

              {/* Main Menus + Submenus List */}
              <div className="space-y-4">
                {draftMenu.items.map((menuItem, mIdx) => (
                  <div
                    key={menuItem.id}
                    className="bg-white rounded-lg border border-neutral-200 shadow-xs overflow-hidden"
                  >
                    {/* Main Menu Header Row */}
                    <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={mIdx === 0}
                            onClick={() => handleMoveMainMenu(mIdx, -1)}
                            className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                            title="انتقال به بالا"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-neutral-600" />
                          </button>
                          <button
                            type="button"
                            disabled={mIdx === draftMenu.items.length - 1}
                            onClick={() => handleMoveMainMenu(mIdx, 1)}
                            className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                            title="انتقال به پایین"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-neutral-600" />
                          </button>
                        </div>

                        <div>
                          {editingMainId === menuItem.id ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingMainValue}
                                  onChange={(e) => setEditingMainValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveMainMenuName(menuItem.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingMainId(null);
                                    }
                                  }}
                                  autoFocus
                                  placeholder="عنوان منوی اصلی..."
                                  className="rounded border border-[#0b5e85] px-2 py-0.5 text-xs font-bold text-neutral-900 bg-white w-48 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveMainMenuName(menuItem.id)}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                  title="ذخیره نام و توضیح منو"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMainId(null)}
                                  className="p-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 cursor-pointer"
                                  title="انصراف"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={editingMainDesc}
                                onChange={(e) => setEditingMainDesc(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveMainMenuName(menuItem.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingMainId(null);
                                  }
                                }}
                                placeholder="متن توضیحی زیر منو (اختیاری)..."
                                className="rounded border border-neutral-300 px-2 py-0.5 text-[11px] text-neutral-700 bg-white w-72 focus:outline-none focus:border-[#0b5e85]"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900">
                                  {menuItem.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMainId(menuItem.id);
                                    setEditingMainValue(menuItem.label);
                                    setEditingMainDesc(menuItem.description || '');
                                  }}
                                  className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                                  title="تغییر نام و متن توضیحی منو"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-mono bg-white border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded">
                                  {menuItem.key}
                                </span>
                              </div>
                              {menuItem.description && (
                                <p className="text-[11px] text-neutral-500 mt-0.5">
                                  {menuItem.description}
                                </p>
                              )}
                            </div>
                          )}
                          <span className="text-[11px] text-neutral-500">
                            {toPersianDigits(menuItem.subsections.length)} زیرمنو
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        {/* Show on Home toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              items: draftMenu.items.map((m) =>
                                m.id === menuItem.id ? { ...m, showOnHome: !m.showOnHome } : m
                              ),
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                            menuItem.showOnHome
                              ? 'bg-sky-50 border-sky-200 text-[#0b5e85]'
                              : 'bg-neutral-100 border-neutral-300 text-neutral-500'
                          }`}
                        >
                          {menuItem.showOnHome ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                          <span>صفحه اصلی</span>
                        </button>

                        {/* Show on Menu Page toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setDraftMenu({
                              ...draftMenu,
                              items: draftMenu.items.map((m) =>
                                m.id === menuItem.id
                                  ? { ...m, showOnMenuPage: !m.showOnMenuPage }
                                  : m
                              ),
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                            menuItem.showOnMenuPage
                              ? 'bg-rose-50 border-rose-200 text-[#d41a24]'
                              : 'bg-neutral-100 border-neutral-300 text-neutral-500'
                          }`}
                        >
                          {menuItem.showOnMenuPage ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                          <span>صفحه منو</span>
                        </button>

                        {/* Per-menu submenu limits */}
                        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded px-2 py-1">
                          <span className="text-neutral-500">سقف زیرمنو اصلی:</span>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={menuItem.homeSubmenuLimit}
                            onChange={(e) =>
                              setDraftMenu({
                                ...draftMenu,
                                items: draftMenu.items.map((m) =>
                                  m.id === menuItem.id
                                    ? {
                                        ...m,
                                        homeSubmenuLimit: Math.max(0, Number(e.target.value) || 0),
                                      }
                                    : m
                                ),
                              })
                            }
                            className="w-10 text-center font-mono border border-neutral-200 rounded"
                          />
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded px-2 py-1">
                          <span className="text-neutral-500">سقف زیرمنو صفحه منو:</span>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={menuItem.menuPageSubmenuLimit}
                            onChange={(e) =>
                              setDraftMenu({
                                ...draftMenu,
                                items: draftMenu.items.map((m) =>
                                  m.id === menuItem.id
                                    ? {
                                        ...m,
                                        menuPageSubmenuLimit: Math.max(
                                          0,
                                          Number(e.target.value) || 0
                                        ),
                                      }
                                    : m
                                ),
                              })
                            }
                            className="w-10 text-center font-mono border border-neutral-200 rounded"
                          />
                        </div>

                        {/* Quick Add/Edit in Home Layout */}
                        {menuItem.key !== 'home' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAddToHomeLayout(
                                'menu',
                                menuItem.key,
                                menuItem.label
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold cursor-pointer"
                            title="تنظیم نمایش این منو در چینش صفحه اول"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>چینش صفحه اول</span>
                          </button>
                        )}

                        {/* Delete Main Menu */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMainMenu(menuItem.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-[#d41a24] font-semibold cursor-pointer"
                          title="حذف کامل منوی اصلی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف منو</span>
                        </button>
                      </div>
                    </div>

                    {/* Submenus Management Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={newSubByMenuId[menuItem.id] || ''}
                          onChange={(e) =>
                            setNewSubByMenuId((prev) => ({
                              ...prev,
                              [menuItem.id]: e.target.value,
                            }))
                          }
                          placeholder={`افزودن زیرمنوی جدید به «${menuItem.label}»...`}
                          className="flex-1 min-w-[200px] max-w-sm rounded border border-neutral-300 px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSubmenu(menuItem.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          افزودن زیرمنو
                        </button>
                      </div>

                      {menuItem.subsections.length === 0 ? (
                        <p className="text-[11px] text-neutral-400">
                          زیرمنویی برای این منو تعریف نشده است.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {menuItem.subsections.map((sub, sIdx) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between gap-2 bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={sIdx === 0}
                                    onClick={() => handleMoveSubmenu(menuItem.id, sIdx, -1)}
                                    className="text-neutral-400 hover:text-neutral-700 disabled:opacity-25 cursor-pointer"
                                    title="جلوتر"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sIdx === menuItem.subsections.length - 1}
                                    onClick={() => handleMoveSubmenu(menuItem.id, sIdx, 1)}
                                    className="text-neutral-400 hover:text-neutral-700 disabled:opacity-25 cursor-pointer"
                                    title="عقب‌تر"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                {editingSubKey?.menuId === menuItem.id &&
                                editingSubKey?.subId === sub.id ? (
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={editingSubValue}
                                      onChange={(e) => setEditingSubValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveSubmenuName(menuItem.id, sub.id);
                                        } else if (e.key === 'Escape') {
                                          setEditingSubKey(null);
                                        }
                                      }}
                                      autoFocus
                                      className="flex-1 min-w-0 rounded border border-[#0b5e85] px-1.5 py-0.5 text-xs font-semibold text-neutral-900 bg-white focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveSubmenuName(menuItem.id, sub.id)}
                                      className="p-0.5 rounded bg-emerald-600 text-white cursor-pointer"
                                      title="ذخیره"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubKey(null)}
                                      className="p-0.5 rounded bg-neutral-200 text-neutral-700 cursor-pointer"
                                      title="انصراف"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-neutral-800 truncate">
                                    {sub.label}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubKey({ menuId: menuItem.id, subId: sub.id });
                                    setEditingSubValue(sub.label);
                                  }}
                                  className="p-0.5 text-neutral-400 hover:text-[#0b5e85] cursor-pointer"
                                  title="تغییر نام زیرمنو"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftMenu({
                                      ...draftMenu,
                                      items: draftMenu.items.map((m) =>
                                        m.id === menuItem.id
                                          ? {
                                              ...m,
                                              subsections: m.subsections.map((s) =>
                                                s.id === sub.id
                                                  ? { ...s, showOnHome: !s.showOnHome }
                                                  : s
                                              ),
                                            }
                                          : m
                                      ),
                                    })
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                                    sub.showOnHome
                                      ? 'bg-sky-100 text-[#0b5e85]'
                                      : 'bg-neutral-200 text-neutral-500 line-through'
                                  }`}
                                  title="نمایش در صفحه اصلی"
                                >
                                  اصلی
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftMenu({
                                      ...draftMenu,
                                      items: draftMenu.items.map((m) =>
                                        m.id === menuItem.id
                                          ? {
                                              ...m,
                                              subsections: m.subsections.map((s) =>
                                                s.id === sub.id
                                                  ? { ...s, showOnMenuPage: !s.showOnMenuPage }
                                                  : s
                                              ),
                                            }
                                          : m
                                      ),
                                    })
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                                    sub.showOnMenuPage
                                      ? 'bg-rose-100 text-[#d41a24]'
                                      : 'bg-neutral-200 text-neutral-500 line-through'
                                  }`}
                                  title="نمایش در صفحه منو"
                                >
                                  منو
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickAddToHomeLayout(
                                      'submenu',
                                      menuItem.key,
                                      sub.label,
                                      sub.label
                                    )
                                  }
                                  className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="نمایش و چینش در صفحه اول"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubmenu(menuItem.id, sub.id)}
                                  className="p-0.5 text-neutral-400 hover:text-[#d41a24] cursor-pointer"
                                  title="حذف زیرمنو"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          )}

          {/* TAB: SOCIAL NETWORKS MANAGEMENT */}
          {activeTab === 'socials' && (
            <div className="space-y-6">
              {/* Tab Header */}
              <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[240px]">
                  {editingTabHeaderId === 'socials' ? (
                    <div className="space-y-2 max-w-xl">
                      <input
                        type="text"
                        value={tabHeaderLabelDraft}
                        onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                        placeholder="نام منو..."
                        className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                      />
                      <input
                        type="text"
                        value={tabHeaderDescDraft}
                        onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                        placeholder="متن توضیحی زیر منو..."
                        className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={savingSidebar}
                          onClick={() => saveTabHeaderEdit('socials')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTabHeaderId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-neutral-900">
                          {getSidebarMenu('socials').label}
                        </h2>
                        <button
                          type="button"
                          onClick={() => startEditTabHeader('socials')}
                          title="ویرایش عنوان و متن توضیحی"
                          className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {getSidebarMenu('socials').description && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {getSidebarMenu('socials').description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded bg-sky-50 border border-sky-200 text-[#0b5e85] font-bold text-[11px]">
                    {toPersianDigits(draftSiteSocials.filter((s) => s.url.trim()).length)} لینک رسمی ثبت‌شده
                  </span>
                  <span className="px-3 py-1.5 rounded bg-purple-50 border border-purple-200 text-purple-800 font-bold text-[11px]">
                    {toPersianDigits(draftChannels.filter((c) => c.enabled).length)} شبکه اشتراک‌گذاری فعال
                  </span>
                </div>
              </div>

              {/* Sub-tab Switcher: Official Site Socials vs Share Channels */}
              <div className="bg-white rounded-lg border border-neutral-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSocialSubTab('own-socials')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    socialSubTab === 'own-socials'
                      ? 'bg-[#0b5e85] text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  <span>شبکه‌های اجتماعی رسمی اسلام‌تایمز (لینک‌های سایت)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      socialSubTab === 'own-socials'
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {toPersianDigits(draftSiteSocials.length)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialSubTab('share-channels')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    socialSubTab === 'share-channels'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>مدیریت شبکه‌های اجتماعی اشتراک‌گذاری (سایر شبکه‌ها)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      socialSubTab === 'share-channels'
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {toPersianDigits(draftChannels.length)}
                  </span>
                </button>
              </div>

              {socialSubTab === 'own-socials' ? (
                <div className="space-y-4 text-xs">
                  {/* Official Site Socials Toolbar */}
                  <div className="bg-white p-5 rounded-lg border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        لینک شبکه‌های اجتماعی اختصاصی اسلام‌تایمز (تلگرام، اینستاگرام، فیسبوک، یوتیوب و واتساپ)
                      </h3>
                      <p className="text-neutral-500 text-[11px] mt-1">
                        لینک صفحات و کانال‌های رسمی سایت را وارد کنید تا آیکون‌ها در نوار بالای سایت (هدر) و ستون شبکه‌های اجتماعی پایین سایت (فوتر) مستقیم به حساب‌های شما متصل شوند.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={savingSiteSocials}
                        onClick={handleResetSiteSocials}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        بازنشانی به پیش‌فرض
                      </button>
                      <button
                        type="button"
                        disabled={savingSiteSocials}
                        onClick={() => persistSiteSocials(draftSiteSocials)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-60 shadow-xs"
                      >
                        {savingSiteSocials ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        ذخیره و اعمال در سایت
                      </button>
                    </div>
                  </div>

                  {siteSocialsStatus && (
                    <div
                      className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                        siteSocialsStatus.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-[#d41a24]'
                      }`}
                    >
                      <span>{siteSocialsStatus.text}</span>
                      <button
                        type="button"
                        onClick={() => setSiteSocialsStatus(null)}
                        className="opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Core + Custom Official Accounts List */}
                  <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
                    {draftSiteSocials.map((acc, idx) => {
                      const isCore = (CORE_SITE_SOCIAL_IDS as readonly string[]).includes(acc.id);
                      const hasLink = Boolean(acc.url && acc.url.trim());
                      const normalizedPreviewUrl = hasLink
                        ? normalizeExternalSocialUrl(acc.url)
                        : '';
                      const placeholderById: Record<string, string> = {
                        telegram: 'https://t.me/islamtimes_org',
                        instagram: 'https://instagram.com/islamtimes_org',
                        facebook: 'https://facebook.com/islamtimes',
                        youtube: 'https://youtube.com/@islamtimes',
                        whatsapp: 'https://whatsapp.com/channel/...',
                      };
                      const renderSocialIcon = () => {
                        switch (acc.id) {
                          case 'telegram':
                            return <Send className="w-4 h-4" />;
                          case 'instagram':
                            return <Instagram className="w-4 h-4" />;
                          case 'facebook':
                            return <Facebook className="w-4 h-4" />;
                          case 'youtube':
                            return <Youtube className="w-4 h-4" />;
                          case 'whatsapp':
                            return <MessageCircle className="w-4 h-4" />;
                          default:
                            return <Globe className="w-4 h-4" />;
                        }
                      };

                      return (
                        <div
                          key={acc.id}
                          className={`p-4 transition-colors ${
                            !acc.enabled ? 'bg-neutral-50/75 opacity-65' : 'hover:bg-neutral-50/40'
                          }`}
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                            {/* Reorder + Icon + Name */}
                            <div className="lg:col-span-3 flex items-center gap-2.5 min-w-0">
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0 || savingSiteSocials}
                                  onClick={() => handleMoveOwnSocial(acc.id, -1)}
                                  className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-25 cursor-pointer"
                                  title="انتقال به بالا"
                                >
                                  <ArrowUp className="w-3 h-3 text-neutral-600" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === draftSiteSocials.length - 1 || savingSiteSocials}
                                  onClick={() => handleMoveOwnSocial(acc.id, 1)}
                                  className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-25 cursor-pointer"
                                  title="انتقال به پایین"
                                >
                                  <ArrowDown className="w-3 h-3 text-neutral-600" />
                                </button>
                              </div>

                              <span
                                className="w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
                                style={{ backgroundColor: acc.color || '#0b5e85' }}
                              >
                                {renderSocialIcon()}
                              </span>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-neutral-900 text-xs">
                                    {acc.name}
                                  </span>
                                  {isCore && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#0b5e85] font-semibold">
                                      اصلی سایت
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1">
                                  <span
                                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${
                                      hasLink
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                                        : 'bg-amber-50 border-amber-200 text-amber-800'
                                    }`}
                                  >
                                    {hasLink ? 'لینک متصل شده' : 'لینک وارد نشده'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* URL Input */}
                            <div className="lg:col-span-5">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">
                                آدرس مستقیم صفحه / کانال {acc.name} (URL)
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={acc.url}
                                  onChange={(e) =>
                                    handleUpdateOwnSocialField(acc.id, { url: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      persistSiteSocials(draftSiteSocials);
                                    }
                                  }}
                                  placeholder={placeholderById[acc.id] || 'https://...'}
                                  className="flex-1 rounded border border-neutral-300 px-3 py-1.5 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85] font-mono text-[11px]"
                                />
                                {hasLink && (
                                  <>
                                    <a
                                      href={normalizedPreviewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="آزمایش لینک در پنجره جدید"
                                      className="p-1.5 rounded border border-neutral-200 text-[#0b5e85] hover:bg-sky-50 shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOwnSocialField(acc.id, { url: '' })
                                      }
                                      title="پاک کردن لینک"
                                      className="p-1.5 rounded border border-neutral-200 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Handle / Tooltip Text */}
                            <div className="lg:col-span-2">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">
                                شناسه یا عنوان توضیحی (اختیاری)
                              </label>
                              <input
                                type="text"
                                value={acc.handle || ''}
                                onChange={(e) =>
                                  handleUpdateOwnSocialField(acc.id, { handle: e.target.value })
                                }
                                placeholder={`مثال: @islamtimes`}
                                className="w-full rounded border border-neutral-300 px-2.5 py-1.5 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85] text-[11px]"
                              />
                            </div>

                            {/* Toggle Visibility + Delete Custom */}
                            <div className="lg:col-span-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={savingSiteSocials}
                                onClick={() => handleToggleOwnSocial(acc.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-[11px] font-semibold cursor-pointer ${
                                  acc.enabled
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-neutral-100 border-neutral-300 text-neutral-600'
                                }`}
                              >
                                {acc.enabled ? (
                                  <Eye className="w-3.5 h-3.5" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5" />
                                )}
                                {acc.enabled ? 'نمایش در سایت' : 'مخفی'}
                              </button>
                              {!isCore && (
                                <button
                                  type="button"
                                  disabled={savingSiteSocials}
                                  onClick={() => handleDeleteOwnSocial(acc.id)}
                                  className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  title="حذف شبکه اضافه‌شده"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Bar Bottom */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingSiteSocials}
                      onClick={() => persistSiteSocials(draftSiteSocials)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      {savingSiteSocials ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      ذخیره و اعمال لینک‌ها در هدر و فوتر سایت
                    </button>
                  </div>

                  {/* Add Extra Official Site Social Network */}
                  <form
                    onSubmit={handleAddOwnSocial}
                    className="bg-white p-5 rounded-lg border border-neutral-200 space-y-3"
                  >
                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                      <Plus className="w-4 h-4 text-[#0b5e85]" />
                      <h4 className="text-xs font-bold text-neutral-800">
                        افزودن شبکه اجتماعی رسمی دیگر به سایت (در صورت نیاز)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          نام شبکه (مثلاً: ایتا، روبیکا، ایکس)
                        </label>
                        <input
                          type="text"
                          value={newOwnSocialName}
                          onChange={(e) => setNewOwnSocialName(e.target.value)}
                          placeholder="ایتا"
                          className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          لینک کانال یا صفحه رسمی
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={newOwnSocialUrl}
                          onChange={(e) => setNewOwnSocialUrl(e.target.value)}
                          placeholder="https://eitaa.com/islamtimes"
                          className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85] font-mono text-[11px]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          شناسه (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={newOwnSocialHandle}
                          onChange={(e) => setNewOwnSocialHandle(e.target.value)}
                          placeholder="@islamtimes"
                          className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          رنگ آیکون
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newOwnSocialColor}
                            onChange={(e) => setNewOwnSocialColor(e.target.value)}
                            className="w-8 h-8 p-0 border border-neutral-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={newOwnSocialColor}
                            onChange={(e) => setNewOwnSocialColor(e.target.value)}
                            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 bg-neutral-50 font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={savingSiteSocials}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#0b5e85] hover:bg-[#084867] text-white font-bold cursor-pointer disabled:opacity-60 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن به شبکه‌های رسمی سایت
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Share Channels Header */}
                  <div className="bg-white p-5 rounded-lg border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        مدیریت شبکه‌های اجتماعی اشتراک‌گذاری (سایر شبکه‌ها)
                      </h3>
                      <p className="text-neutral-500 text-[11px] mt-1">
                        در پایین هر خبر، علاوه بر شبکه‌های ثابت (فیسبوک، تلگرام، واتساپ، ایکس، یوتیوب و اینستاگرام)، منوی بازشونده «سایر شبکه‌ها» قرار دارد. در این بخش می‌توانید هر شبکه دلخواهی را اضافه، ویرایش یا حذف کنید.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1.5 rounded bg-purple-50 border border-purple-200 text-purple-800 font-bold text-[11px]">
                        {toPersianDigits(draftChannels.filter((c) => c.enabled).length)} شبکه فعال از {toPersianDigits(draftChannels.length)}
                      </span>
                      <button
                        type="button"
                        disabled={savingChannels}
                        onClick={handleResetDefaultShareChannels}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        بازنشانی به پیش‌فرض
                      </button>
                      <button
                        type="button"
                        disabled={savingChannels}
                        onClick={() => persistShareChannels(draftChannels)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        {savingChannels ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        ذخیره و اعمال در سایت
                      </button>
                    </div>
                  </div>

                  {channelsStatus && (
                    <div
                      className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                        channelsStatus.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-[#d41a24]'
                      }`}
                    >
                      <span>{channelsStatus.text}</span>
                    </div>
                  )}

                  {/* Add New Channel Card */}
                  <form
                    onSubmit={handleAddShareChannel}
                    className="bg-white p-5 rounded-lg border border-neutral-200 space-y-3"
                  >
                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                      <Plus className="w-4 h-4 text-[#0b5e85]" />
                      <h4 className="text-xs font-bold text-neutral-800">
                        افزودن شبکه اجتماعی جدید به لیست اشتراک‌گذاری
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          نام شبکه اجتماعی
                        </label>
                        <input
                          type="text"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="مثال: ویراستی، تردز، پینترست..."
                          className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          الگوی لینک اشتراک‌گذاری
                          <span className="text-neutral-400 font-normal mr-1">
                            (از <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700">&#123;url&#125;</code> و <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700">&#123;title&#125;</code>)
                          </span>
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={newChannelUrl}
                          onChange={(e) => setNewChannelUrl(e.target.value)}
                          placeholder="https://example.com/share?url={url}&text={title}"
                          className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85] font-mono text-[11px]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          منطقه / زبان (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={newChannelRegion}
                          onChange={(e) => setNewChannelRegion(e.target.value)}
                          placeholder="مثلاً: فارسی (ایران)"
                          className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#0b5e85]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          رنگ نشانگر
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newChannelColor}
                            onChange={(e) => setNewChannelColor(e.target.value)}
                            className="w-8 h-8 p-0 border border-neutral-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={newChannelColor}
                            onChange={(e) => setNewChannelColor(e.target.value)}
                            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 bg-neutral-50 font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingChannels}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#0b5e85] hover:bg-[#084867] text-white font-bold cursor-pointer disabled:opacity-60 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن به لیست اشتراک‌گذاری
                      </button>
                    </div>
                  </form>

                  {/* Channels List */}
                  <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
                    {draftChannels.map((ch, idx) => {
                      const isEditing = editingChannelId === ch.id;
                      return (
                        <div
                          key={ch.id}
                          className={`p-4 transition-colors ${!ch.enabled ? 'bg-neutral-50/70 opacity-60' : 'hover:bg-neutral-50/50'}`}
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-3">
                                  <input
                                    type="text"
                                    value={editChannelName}
                                    onChange={(e) => setEditChannelName(e.target.value)}
                                    placeholder="نام شبکه"
                                    className="w-full rounded border border-[#0b5e85] px-2.5 py-1.5 font-bold"
                                  />
                                </div>
                                <div className="sm:col-span-5">
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={editChannelUrl}
                                    onChange={(e) => setEditChannelUrl(e.target.value)}
                                    placeholder="الگوی آدرس..."
                                    className="w-full rounded border border-[#0b5e85] px-2.5 py-1.5 font-mono text-[11px]"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <input
                                    type="text"
                                    value={editChannelRegion}
                                    onChange={(e) => setEditChannelRegion(e.target.value)}
                                    placeholder="منطقه / زبان"
                                    className="w-full rounded border border-[#0b5e85] px-2.5 py-1.5"
                                  />
                                </div>
                                <div className="sm:col-span-2 flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={editChannelColor}
                                    onChange={(e) => setEditChannelColor(e.target.value)}
                                    className="w-8 h-8 p-0 border border-neutral-300 rounded cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={editChannelColor}
                                    onChange={(e) => setEditChannelColor(e.target.value)}
                                    className="flex-1 rounded border border-neutral-300 px-2 py-1 font-mono text-[11px]"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditShareChannel(ch.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  ذخیره ویرایش
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingChannelId(null)}
                                  className="px-3 py-1.5 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-semibold cursor-pointer"
                                >
                                  انصراف
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Reorder up/down */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveShareChannel(ch.id, -1)}
                                    className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-25 cursor-pointer"
                                    title="انتقال به بالا"
                                  >
                                    <ArrowUp className="w-3 h-3 text-neutral-600" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === draftChannels.length - 1}
                                    onClick={() => handleMoveShareChannel(ch.id, 1)}
                                    className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-25 cursor-pointer"
                                    title="انتقال به پایین"
                                  >
                                    <ArrowDown className="w-3 h-3 text-neutral-600" />
                                  </button>
                                </div>

                                {/* Color Dot */}
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: ch.color || '#0b5e85' }}
                                />

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-neutral-900 text-xs">{ch.name}</span>
                                    {ch.region && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#0b5e85] font-medium">
                                        {ch.region}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded border ${
                                        ch.enabled
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                          : 'bg-neutral-100 border-neutral-300 text-neutral-500'
                                      }`}
                                    >
                                      {ch.enabled ? 'فعال در منو' : 'غیرفعال'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate" dir="ltr">
                                    {ch.urlTemplate}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleShareChannel(ch.id)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                                    ch.enabled
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-neutral-100 border-neutral-300 text-neutral-600'
                                  }`}
                                >
                                  {ch.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  {ch.enabled ? 'فعال' : 'مخفی'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChannelId(ch.id);
                                    setEditChannelName(ch.name);
                                    setEditChannelUrl(ch.urlTemplate);
                                    setEditChannelRegion(ch.region || '');
                                    setEditChannelColor(ch.color || '#0b5e85');
                                  }}
                                  className="p-1 rounded text-neutral-500 hover:text-[#0b5e85] hover:bg-neutral-100 cursor-pointer"
                                  title="ویرایش شبکه"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteShareChannel(ch.id)}
                                  className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  title="حذف شبکه"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: PUBLISH & DRAFTS */}
          {activeTab === 'publish' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-neutral-200 p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[220px]">
                  {editingTabHeaderId === 'publish' ? (
                    <div className="space-y-2 max-w-xl">
                      <input
                        type="text"
                        value={tabHeaderLabelDraft}
                        onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                        placeholder="نام منو..."
                        className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                      />
                      <input
                        type="text"
                        value={tabHeaderDescDraft}
                        onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                        placeholder="متن توضیحی زیر منو..."
                        className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={savingSidebar}
                          onClick={() => saveTabHeaderEdit('publish')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTabHeaderId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-neutral-900">
                          {getSidebarMenu('publish').label}
                        </h2>
                        <button
                          type="button"
                          onClick={() => startEditTabHeader('publish')}
                          title="ویرایش عنوان و متن توضیحی"
                          className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {getSidebarMenu('publish').description && (
                        <p className="text-neutral-500 text-xs mt-0.5">
                          {getSidebarMenu('publish').description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {showPublishForm && (
                    <button
                      type="button"
                      onClick={() => setShowPublishForm(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      نمایش فقط پیشنویس‌ها
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      resetArticleForm();
                      setArticleNotice(null);
                      setShowPublishForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    نوشتن مطلب جدید
                  </button>
                </div>
              </div>

              {renderArticleNotice()}

              {showPublishForm &&
                (editingArticleId === null || editingArticleStatus === 'draft') &&
                renderArticleForm(editingArticleId !== null ? 'edit-draft' : 'compose')}

              {(() => {
                const draftArticles = articles.filter((art) => art.status === 'draft');
                const rawQ = draftSearchQuery.trim();
                const normQ = normalizeDigits(rawQ).toLowerCase();
                const isNumericQuery = /^\d+$/.test(normQ);

                const filteredDrafts = draftArticles
                  .filter((art) => {
                    if (draftTypeFilter !== 'all') {
                      const resolvedType = art.articleType || '';
                      if (resolvedType !== draftTypeFilter) return false;
                    }
                    if (!normQ) return true;

                    const sectionLabel = art.section
                      ? draftMenu.items.find((m) => m.key === art.section)?.label ||
                        SECTION_LABELS[art.section as SectionKey] ||
                        art.section
                      : '';
                    const plainBody = (art.body || '').replace(/<[^>]*>/g, ' ');
                    const hay = normalizeDigits(
                      `${art.code || ''} #${art.id} ${art.kicker || ''} ${art.title || ''} ${
                        art.subtitle || ''
                      } ${art.lead || ''} ${plainBody} ${art.authorName || ''} ${
                        art.sourceName || ''
                      } ${sectionLabel} ${art.subsection || ''} ${art.articleType || ''} ${
                        art.tags || ''
                      }`
                    ).toLowerCase();
                    return hay.includes(normQ);
                  })
                  .sort((a, b) => {
                    if (!isNumericQuery) return 0;
                    const aExact = normalizeDigits(a.code || '') === normQ ? 1 : 0;
                    const bExact = normalizeDigits(b.code || '') === normQ ? 1 : 0;
                    return bExact - aExact;
                  });

                return (
                  <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-amber-200 bg-amber-50/70 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs font-bold text-amber-900">
                          فهرست پیشنویس‌های ذخیره‌شده
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 text-[10px] font-bold">
                          {toPersianDigits(draftArticles.length)} پیشنویس
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[11px] text-neutral-600 font-semibold">نوع مطلب:</span>
                        <select
                          value={draftTypeFilter}
                          onChange={(e) => setDraftTypeFilter(e.target.value)}
                          className="rounded border border-neutral-300 px-2.5 py-1 bg-white text-xs font-semibold text-neutral-800"
                        >
                          <option value="all">
                            همه انواع ({toPersianDigits(draftArticles.length)})
                          </option>
                          {draftTypes.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-3.5 border-b border-neutral-100 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-[240px] max-w-xl">
                        <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          dir="rtl"
                          value={draftSearchQuery}
                          onChange={(e) => setDraftSearchQuery(e.target.value)}
                          placeholder="جست‌وجو در پیشنویس‌ها بر اساس کد خبر، تیتر، لید، متن یا نویسنده..."
                          className="w-full rounded border border-neutral-300 bg-white pr-9 pl-8 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-600"
                        />
                        {draftSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setDraftSearchQuery('')}
                            title="پاک کردن جست‌وجو"
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-600">
                        <span className="px-2.5 py-1 rounded bg-white border border-neutral-200 font-semibold">
                          نمایش {toPersianDigits(filteredDrafts.length)} از{' '}
                          {toPersianDigits(draftArticles.length)} پیشنویس
                        </span>
                        {(draftSearchQuery || draftTypeFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraftSearchQuery('');
                              setDraftTypeFilter('all');
                            }}
                            className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer"
                          >
                            پاک کردن فیلترها
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-100 text-neutral-700 text-[11px] border-b border-neutral-200">
                            <th className="p-3 whitespace-nowrap">کد خبر</th>
                            <th className="p-3">نوع مطلب</th>
                            <th className="p-3">عنوان پیشنویس</th>
                            <th className="p-3">منو / زیرمنو</th>
                            <th className="p-3">منبع</th>
                            <th className="p-3">نویسنده</th>
                            <th className="p-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {filteredDrafts.map((art) => {
                            const resolvedSectionLabel = art.section
                              ? draftMenu.items.find((m) => m.key === art.section)?.label ||
                                SECTION_LABELS[art.section as SectionKey] ||
                                art.section
                              : '';
                            const artType = art.articleType || '';
                            const isCurrentlyEditing = editingArticleId === art.id;
                            return (
                              <tr
                                key={art.id}
                                className={
                                  isCurrentlyEditing
                                    ? 'bg-sky-50/70'
                                    : 'bg-amber-50/30 hover:bg-amber-50/70'
                                }
                              >
                                <td className="p-3 whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded bg-white border border-amber-200 font-bold text-[#0b5e85] tabular-nums">
                                    {toPersianDigits(art.code || art.id)}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {artType ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-[#0b5e85] whitespace-nowrap">
                                      {artType}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400 text-[10px]">تعیین‌نشده</span>
                                  )}
                                </td>
                                <td className="p-3 font-semibold max-w-md truncate">
                                  {art.kicker && (
                                    <div className="text-[10px] font-medium text-[#0b5e85] truncate">
                                      {art.kicker}
                                    </div>
                                  )}
                                  <div className="truncate">{art.title}</div>
                                  {art.subtitle && (
                                    <div className="text-[10px] font-normal text-neutral-500 truncate">
                                      {art.subtitle}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  {resolvedSectionLabel ? (
                                    <span className="px-2 py-0.5 rounded bg-sky-50 text-[#0b5e85] text-[10px] font-bold">
                                      {art.subsection
                                        ? `${resolvedSectionLabel} / ${art.subsection}`
                                        : resolvedSectionLabel}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400 text-[10px]">تعیین‌نشده</span>
                                  )}
                                </td>
                                <td className="p-3 text-neutral-700 font-medium">
                                  {art.contentOrigin === 'original' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-100 text-[#d41a24] text-[10px] font-bold">
                                      تولیدی (اختصاصی)
                                    </span>
                                  ) : art.sourceName ? (
                                    <span>{art.sourceName}</span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="p-3 text-neutral-600">{art.authorName || '—'}</td>
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={publishingDraftId === art.id}
                                      onClick={() => handleQuickPublishDraft(art)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                      title="انتشار نهایی پیشنویس"
                                    >
                                      {publishingDraftId === art.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3 h-3" />
                                      )}
                                      <span>انتشار نهایی</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditArticle(art)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-sky-50 text-[#0b5e85] text-[10px] font-bold cursor-pointer"
                                      title="ادامه ویرایش پیشنویس"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>ویرایش</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingArticleId === art.id}
                                      onClick={() => handleDeleteArticle(art.id)}
                                      className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                                      title="حذف پیشنویس"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredDrafts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-neutral-400">
                                {draftSearchQuery.trim()
                                  ? `پیشنویسی با عبارت «${draftSearchQuery.trim()}» یافت نشد.`
                                  : 'هیچ پیشنویسی ثبت نشده است.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: PUBLISHED ARTICLES MANAGEMENT */}
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-neutral-200 p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[220px]">
                  {editingTabHeaderId === 'articles' ? (
                    <div className="space-y-2 max-w-xl">
                      <input
                        type="text"
                        value={tabHeaderLabelDraft}
                        onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                        placeholder="نام منو..."
                        className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                      />
                      <input
                        type="text"
                        value={tabHeaderDescDraft}
                        onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                        placeholder="متن توضیحی زیر منو..."
                        className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={savingSidebar}
                          onClick={() => saveTabHeaderEdit('articles')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTabHeaderId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-neutral-900">
                          {getSidebarMenu('articles').label}
                        </h2>
                        <button
                          type="button"
                          onClick={() => startEditTabHeader('articles')}
                          title="ویرایش عنوان و متن توضیحی"
                          className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {getSidebarMenu('articles').description && (
                        <p className="text-neutral-500 text-xs mt-0.5">
                          {getSidebarMenu('articles').description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetArticleForm();
                      setArticleNotice(null);
                      setShowPublishForm(true);
                      setActiveTab('publish');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white text-xs font-bold cursor-pointer"
                  >
                    <PenSquare className="w-4 h-4" />
                    انتشار مطلب جدید
                  </button>
                </div>
              </div>

              {renderArticleNotice()}

              {editingArticleId !== null &&
                editingArticleStatus === 'published' &&
                renderArticleForm('edit-published')}

              {(() => {
                const publishedArticles = articles.filter((art) => art.status !== 'draft');
                const rawQ = articleSearchQuery.trim();
                const normQ = normalizeDigits(rawQ).toLowerCase();
                const isNumericQuery = /^\d+$/.test(normQ);

                const filteredPublishedArticles = publishedArticles
                  .filter((art) => {
                    if (!normQ) return true;

                    const sectionLabel = art.section
                      ? draftMenu.items.find((m) => m.key === art.section)?.label ||
                        SECTION_LABELS[art.section as SectionKey] ||
                        art.section
                      : '';
                    const resolvedType = art.articleType || (art.isVideo ? 'ویدیو' : 'خبر');
                    const plainBody = (art.body || '').replace(/<[^>]*>/g, ' ');
                    const hay = normalizeDigits(
                      `${art.code || ''} #${art.id} ${art.kicker || ''} ${art.title || ''} ${
                        art.subtitle || ''
                      } ${art.lead || ''} ${plainBody} ${art.authorName || ''} ${
                        art.sourceName || ''
                      } ${sectionLabel} ${art.subsection || ''} ${art.articleType || ''} ${resolvedType} ${
                        art.tags || ''
                      }`
                    ).toLowerCase();
                    return hay.includes(normQ);
                  })
                  .sort((a, b) => {
                    if (!isNumericQuery) return 0;
                    const aExact = normalizeDigits(a.code || '') === normQ ? 1 : 0;
                    const bExact = normalizeDigits(b.code || '') === normQ ? 1 : 0;
                    return bExact - aExact;
                  });

                return (
                  <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                    <div className="p-3.5 border-b border-neutral-100 bg-neutral-50/70 flex flex-wrap items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-[280px]">
                        <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          dir="rtl"
                          value={articleSearchQuery}
                          onChange={(e) => setArticleSearchQuery(e.target.value)}
                          placeholder="جست‌وجوی مطلب منتشرشده بر اساس کد مطلب، نوع مطلب، عنوان، منو و زیرمنو، متن، نویسنده، منبع یا برچسب..."
                          className="w-full rounded border border-neutral-300 bg-white pr-9 pl-8 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0b5e85]/25 focus:border-[#0b5e85]"
                        />
                        {articleSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setArticleSearchQuery('')}
                            title="پاک کردن جست‌وجو"
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-600">
                        <span className="px-2.5 py-1 rounded bg-white border border-neutral-200 font-semibold">
                          نمایش {toPersianDigits(filteredPublishedArticles.length)} از{' '}
                          {toPersianDigits(publishedArticles.length)} خبر منتشرشده
                        </span>
                        {articleSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setArticleSearchQuery('')}
                            className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer"
                          >
                            پاک کردن جست‌وجو
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-100 text-neutral-700 text-[11px] border-b border-neutral-200">
                            <th className="p-3 whitespace-nowrap">کد مطلب</th>
                            <th className="p-3 whitespace-nowrap">نوع مطلب</th>
                            <th className="p-3">عنوان مطلب</th>
                            <th className="p-3 whitespace-nowrap">منو و زیرمنوی مطلب</th>
                            <th className="p-3 text-center whitespace-nowrap">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {filteredPublishedArticles.map((art) => {
                            const resolvedSectionLabel = art.section
                              ? draftMenu.items.find((m) => m.key === art.section)?.label ||
                                SECTION_LABELS[art.section as SectionKey] ||
                                art.section
                              : '';
                            const artType = art.articleType || '';
                            const isCurrentlyEditing = editingArticleId === art.id;
                            return (
                              <tr
                                key={art.id}
                                className={
                                  isCurrentlyEditing ? 'bg-sky-50/70' : 'hover:bg-neutral-50'
                                }
                              >
                                <td className="p-3 whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-bold text-[#0b5e85] tabular-nums">
                                    {toPersianDigits(art.code || art.id)}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {artType ? (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                                        artType === 'خبرفوری'
                                          ? 'bg-rose-100 text-[#d41a24]'
                                          : artType === 'ویدیو'
                                            ? 'bg-purple-100 text-purple-700'
                                            : artType === 'گزارش تصویری'
                                              ? 'bg-amber-100 text-amber-800'
                                              : artType === 'گفتگو'
                                                ? 'bg-teal-100 text-teal-800'
                                                : artType === 'دیدگاه'
                                                  ? 'bg-indigo-100 text-indigo-800'
                                                  : 'bg-sky-50 text-[#0b5e85]'
                                      }`}
                                    >
                                      {artType}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400 text-[10px]">—</span>
                                  )}
                                </td>
                                <td className="p-3 font-semibold max-w-md truncate">
                                  {art.kicker && (
                                    <div className="text-[10px] font-medium text-[#0b5e85] truncate">
                                      {art.kicker}
                                    </div>
                                  )}
                                  <div className="truncate">{art.title}</div>
                                  {art.subtitle && (
                                    <div className="text-[10px] font-normal text-neutral-500 truncate">
                                      {art.subtitle}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {resolvedSectionLabel ? (
                                    <span className="px-2 py-0.5 rounded bg-sky-50 text-[#0b5e85] text-[10px] font-bold">
                                      {art.subsection
                                        ? `${resolvedSectionLabel} / ${art.subsection}`
                                        : resolvedSectionLabel}
                                    </span>
                                  ) : isBreakingArticleType(art.articleType) ? (
                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-[#d41a24] border border-rose-200 text-[10px] font-bold">
                                      نوار خبر فوری (بدون منو)
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400 text-[10px]">تعیین نشده</span>
                                  )}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditArticle(art)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-sky-50 text-[#0b5e85] text-[10px] font-bold cursor-pointer"
                                      title="ویرایش خبر منتشرشده"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>ویرایش</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={convertingToDraftId === art.id}
                                      onClick={() => handleConvertPublishedToDraft(art)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                      title="تبدیل این خبر منتشرشده به پیشنویس و انتقال به بخش پیشنویس‌ها"
                                    >
                                      {convertingToDraftId === art.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <FileText className="w-3 h-3" />
                                      )}
                                      <span>تبدیل به پیشنویس</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingArticleId === art.id}
                                      onClick={() => handleDeleteArticle(art.id)}
                                      className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                                      title="حذف از پایگاه داده"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredPublishedArticles.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-neutral-400">
                                {articleSearchQuery.trim()
                                  ? `خبر منتشرشده‌ای با عبارت «${articleSearchQuery.trim()}» یافت نشد.`
                                  : 'هیچ خبر منتشرشده‌ای ثبت نشده است.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: MEDIA & FILES MANAGEMENT */}
          {activeTab === 'media' && (
            <AdminMediaManager
              tabLabel={getSidebarMenu('media').label}
              tabDescription={getSidebarMenu('media').description}
              isEditingHeader={editingTabHeaderId === 'media'}
              headerLabelDraft={tabHeaderLabelDraft}
              headerDescDraft={tabHeaderDescDraft}
              savingHeader={savingSidebar}
              onStartEditHeader={() => startEditTabHeader('media')}
              onHeaderLabelChange={setTabHeaderLabelDraft}
              onHeaderDescChange={setTabHeaderDescDraft}
              onSaveHeader={() => saveTabHeaderEdit('media')}
              onCancelEditHeader={() => setEditingTabHeaderId(null)}
              getAdminToken={getAdminToken}
              onCountChange={setMediaCount}
            />
          )}

          {/* TAB: NEWS SOURCES MANAGEMENT */}
          {activeTab === 'sources' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white rounded-lg border border-neutral-200 p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[220px]">
                  {editingTabHeaderId === 'sources' ? (
                    <div className="space-y-2 max-w-xl">
                      <input
                        type="text"
                        value={tabHeaderLabelDraft}
                        onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                        placeholder="نام منو..."
                        className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                      />
                      <input
                        type="text"
                        value={tabHeaderDescDraft}
                        onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                        placeholder="متن توضیحی زیر منو..."
                        className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={savingSidebar}
                          onClick={() => saveTabHeaderEdit('sources')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTabHeaderId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-neutral-900">
                          {getSidebarMenu('sources').label}
                        </h2>
                        <button
                          type="button"
                          onClick={() => startEditTabHeader('sources')}
                          title="ویرایش عنوان و متن توضیحی"
                          className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {getSidebarMenu('sources').description && (
                        <p className="text-neutral-500 text-xs mt-0.5">
                          {getSidebarMenu('sources').description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-[#0b5e85] bg-sky-50 border border-sky-200 rounded px-2.5 py-1">
                  کل منابع: {toPersianDigits(newsSources.length)}
                </span>
              </div>

              {/* Add Source Form */}
              <div className="bg-white rounded-lg border border-neutral-200 p-5 space-y-3">
                <h3 className="text-xs font-bold text-[#0b5e85] border-b border-neutral-100 pb-2">
                  افزودن منبع خبری جدید
                </h3>
                <form onSubmit={handleAddSource} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      نام منبع خبری
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      placeholder="مثلاً: خبرگزاری تسنیم، رویترز..."
                      className="w-full rounded border border-neutral-300 px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      نشانی اینترنتی منبع (URL)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full rounded border border-neutral-300 px-3 py-1.5 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingSource}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{savingSource ? 'در حال ثبت...' : 'افزودن منبع'}</span>
                  </button>
                </form>
                {sourceFeedback && (
                  <p
                    className={`text-[11px] font-semibold ${
                      sourceFeedback.type === 'success' ? 'text-emerald-700' : 'text-[#d41a24]'
                    }`}
                  >
                    {sourceFeedback.text}
                  </p>
                )}
              </div>

              {/* Search + Sources List */}
              <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      dir="rtl"
                      value={sourceSearchQuery}
                      onChange={(e) => setSourceSearchQuery(e.target.value)}
                      placeholder="جست‌وجو بر اساس نام منبع یا نشانی اینترنتی..."
                      className="w-full rounded border border-neutral-300 pr-9 pl-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5e85]/25 focus:border-[#0b5e85]"
                    />
                    {sourceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSourceSearchQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {sourcesLoading && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      در حال بارگذاری...
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 text-neutral-700 text-[11px] border-b border-neutral-200">
                        <th className="p-3">شناسه</th>
                        <th className="p-3">نام منبع</th>
                        <th className="p-3">نشانی اینترنتی (URL)</th>
                        <th className="p-3">تعداد مطالب</th>
                        <th className="p-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {newsSources
                        .filter((src) => {
                          const q = sourceSearchQuery.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            src.name.toLowerCase().includes(q) ||
                            (src.url && src.url.toLowerCase().includes(q))
                          );
                        })
                        .map((src) => {
                          const isEditingRow = editingSourceId === src.id;
                          const usageCount = articles.filter(
                            (a) =>
                              a.sourceId === src.id ||
                              (a.sourceName || '').trim().toLowerCase() === src.name.toLowerCase()
                          ).length;

                          return (
                            <tr key={src.id} className="hover:bg-neutral-50">
                              <td className="p-3 font-mono text-neutral-500">#{src.id}</td>
                              <td className="p-3 font-bold text-neutral-900">
                                {isEditingRow ? (
                                  <input
                                    type="text"
                                    value={editingSourceName}
                                    onChange={(e) => setEditingSourceName(e.target.value)}
                                    className="w-full rounded border border-[#0b5e85] px-2 py-1 text-xs"
                                  />
                                ) : (
                                  src.name
                                )}
                              </td>
                              <td className="p-3">
                                {isEditingRow ? (
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={editingSourceUrl}
                                    onChange={(e) => setEditingSourceUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full rounded border border-[#0b5e85] px-2 py-1 text-xs font-mono"
                                  />
                                ) : src.url ? (
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    dir="ltr"
                                    className="inline-flex items-center gap-1 text-[#0b5e85] hover:underline font-mono"
                                  >
                                    <span>{src.url}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-neutral-400">—</span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-neutral-700">
                                {toPersianDigits(usageCount)}
                              </td>
                              <td className="p-3 text-center">
                                {isEditingRow ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={savingSource}
                                      onClick={() => handleSaveEditSource(src.id)}
                                      className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                      title="ذخیره تغییرات"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSourceId(null)}
                                      className="p-1.5 rounded bg-neutral-200 text-neutral-700 hover:bg-neutral-300 cursor-pointer"
                                      title="انصراف"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditSource(src)}
                                      className="p-1.5 rounded text-[#0b5e85] hover:bg-sky-50 cursor-pointer"
                                      title="ویرایش منبع"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingSourceId === src.id}
                                      onClick={() => handleDeleteSource(src.id)}
                                      className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                                      title="حذف منبع"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {newsSources.filter((src) => {
                        const q = sourceSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          src.name.toLowerCase().includes(q) ||
                          (src.url && src.url.toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-neutral-400">
                            هیچ منبع خبری مطابقی یافت نشد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EDITORIAL */}
          {activeTab === 'editorial' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                {editingTabHeaderId === 'editorial' ? (
                  <div className="space-y-2 max-w-xl">
                    <input
                      type="text"
                      value={tabHeaderLabelDraft}
                      onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                      placeholder="نام منو..."
                      className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                    />
                    <input
                      type="text"
                      value={tabHeaderDescDraft}
                      onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                      placeholder="متن توضیحی زیر منو..."
                      className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={savingSidebar}
                        onClick={() => saveTabHeaderEdit('editorial')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ذخیره
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTabHeaderId(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-neutral-900">
                        {getSidebarMenu('editorial').label}
                      </h2>
                      <button
                        type="button"
                        onClick={() => startEditTabHeader('editorial')}
                        title="ویرایش عنوان و متن توضیحی"
                        className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {getSidebarMenu('editorial').description && (
                      <p className="text-neutral-500 text-xs mt-1">
                        {getSidebarMenu('editorial').description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {editorialList.map((ed) => (
                  <div key={ed.id} className="bg-white p-5 rounded-lg border border-neutral-200 flex items-start gap-3 shadow-xs">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
                      <img src={ed.avatar} alt={ed.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-neutral-900">{ed.name}</h4>
                      <p className="text-[11px] text-[#0b5e85] font-semibold">{ed.role}</p>
                      <p className="text-[10px] text-neutral-500">{ed.department}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{ed.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: REPORTERS */}
          {activeTab === 'reporters' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                {editingTabHeaderId === 'reporters' ? (
                  <div className="space-y-2 max-w-xl">
                    <input
                      type="text"
                      value={tabHeaderLabelDraft}
                      onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                      placeholder="نام منو..."
                      className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                    />
                    <input
                      type="text"
                      value={tabHeaderDescDraft}
                      onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                      placeholder="متن توضیحی زیر منو..."
                      className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={savingSidebar}
                        onClick={() => saveTabHeaderEdit('reporters')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ذخیره
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTabHeaderId(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-neutral-900">
                        {getSidebarMenu('reporters').label}
                      </h2>
                      <button
                        type="button"
                        onClick={() => startEditTabHeader('reporters')}
                        title="ویرایش عنوان و متن توضیحی"
                        className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {getSidebarMenu('reporters').description && (
                      <p className="text-neutral-500 text-[11px] mt-1">
                        {getSidebarMenu('reporters').description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="مثال: علی اکبری"
                    className="rounded border border-neutral-300 px-3 py-1.5 text-xs w-48"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    سمت / تخصص
                  </label>
                  <input
                    type="text"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    placeholder="مثال: خبرنگار اقتصادی"
                    className="rounded border border-neutral-300 px-3 py-1.5 text-xs w-44"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    محل استقرار
                  </label>
                  <input
                    type="text"
                    value={newStaffLoc}
                    onChange={(e) => setNewStaffLoc(e.target.value)}
                    placeholder="مثال: قاهره، مصر"
                    className="rounded border border-neutral-300 px-3 py-1.5 text-xs w-40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newStaffName.trim()) return;
                    setReportersList([
                      ...reportersList,
                      {
                        id: String(Date.now()),
                        name: newStaffName.trim(),
                        location: newStaffLoc.trim() || 'تهران',
                        specialty: newStaffRole.trim() || 'خبرنگار',
                        articlesCount: 1,
                        avatar: '/src/assets/images/journalist_avatar_1794648750931.jpg',
                      },
                    ]);
                    setNewStaffName('');
                  }}
                  className="px-4 py-1.5 bg-[#0b5e85] text-white rounded text-xs font-bold cursor-pointer"
                >
                  افزودن خبرنگار جدید
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportersList.map((rep) => (
                  <div key={rep.id} className="bg-white p-4 rounded-lg border border-neutral-200 text-center space-y-3 shadow-xs">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-200 mx-auto border-2 border-[#0b5e85]">
                      <img src={rep.avatar} alt={rep.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">{rep.name}</h4>
                      <p className="text-[11px] text-[#0b5e85] font-medium mt-0.5">{rep.specialty}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{rep.location}</p>
                    </div>
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 px-2">
                      <span>تعداد مقالات:</span>
                      <span className="font-bold text-[#d41a24]">{toPersianDigits(rep.articlesCount)} مقاله</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                {editingTabHeaderId === 'comments' ? (
                  <div className="space-y-2 max-w-xl">
                    <input
                      type="text"
                      value={tabHeaderLabelDraft}
                      onChange={(e) => setTabHeaderLabelDraft(e.target.value)}
                      placeholder="نام منو..."
                      className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
                    />
                    <input
                      type="text"
                      value={tabHeaderDescDraft}
                      onChange={(e) => setTabHeaderDescDraft(e.target.value)}
                      placeholder="متن توضیحی زیر منو..."
                      className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={savingSidebar}
                        onClick={() => saveTabHeaderEdit('comments')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ذخیره
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTabHeaderId(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-neutral-900">
                        {getSidebarMenu('comments').label}
                      </h2>
                      <button
                        type="button"
                        onClick={() => startEditTabHeader('comments')}
                        title="ویرایش عنوان و متن توضیحی"
                        className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {getSidebarMenu('comments').description && (
                      <p className="text-neutral-500 text-xs mt-1">
                        {getSidebarMenu('comments').description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-neutral-200 overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-700 text-[11px] border-b border-neutral-200">
                      <th className="p-3">فرستنده</th>
                      <th className="p-3">متن نظر</th>
                      <th className="p-3">تاریخ ثبت</th>
                      <th className="p-3 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {allComments.map((comm) => (
                      <tr key={comm.id} className="hover:bg-neutral-50">
                        <td className="p-3 font-semibold">
                          {comm.authorName}
                          <span className="block text-[10px] text-neutral-400 font-normal">
                            {comm.authorEmail}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-700 max-w-md">{comm.content}</td>
                        <td className="p-3 text-[11px] text-neutral-500 font-mono">
                          {comm.publishedLabel}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            تأیید شده
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allComments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-neutral-400">
                          نظری تاکنون ثبت نشده است.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
