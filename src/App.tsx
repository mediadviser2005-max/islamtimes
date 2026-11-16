import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { AdminPage } from './components/AdminPage';
import { ArticleDetailView } from './components/ArticleDetailView';
import { CategoryView } from './components/CategoryView';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import {
  Article,
  ArticleTypeOption,
  CommentItem,
  CustomShareChannel,
  DEFAULT_ARTICLE_TYPES,
  DEFAULT_MENU_CONFIG,
  DEFAULT_SHARE_CHANNELS,
  DEFAULT_SITE_SOCIAL_ACCOUNTS,
  isBreakingArticleType,
  isTickerOnlyBreakingArticle,
  MenuConfig,
  normalizeMenuConfig,
  normalizeShareChannels,
  normalizeSiteSocialAccounts,
  SectionKey,
  SiteSocialAccount,
} from './types/news';

function IslamTimesPortal() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>('home');
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null);
  const [activeArticleType, setActiveArticleType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleComments, setArticleComments] = useState<CommentItem[]>([]);

  const [menuConfig, setMenuConfig] = useState<MenuConfig>(DEFAULT_MENU_CONFIG);
  const [articleTypes, setArticleTypes] = useState<ArticleTypeOption[]>(DEFAULT_ARTICLE_TYPES);
  const [shareChannels, setShareChannels] = useState<CustomShareChannel[]>(DEFAULT_SHARE_CHANNELS);
  const [siteSocials, setSiteSocials] = useState<SiteSocialAccount[]>(DEFAULT_SITE_SOCIAL_ACCOUNTS);
  const [playingVideoArticle, setPlayingVideoArticle] = useState<Article | null>(
    null
  );
  const [langNotice, setLangNotice] = useState<string | null>(null);

  const { isAdmin, adminToken } = useAdminAuth();

  const isAdminRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/admin' ||
      window.location.pathname.startsWith('/admin/') ||
      new URLSearchParams(window.location.search).get('admin') === '1');

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        adminToken || (typeof window !== 'undefined' ? localStorage.getItem('islam_admin_token') : null);
      const shouldIncludeDrafts = Boolean(isAdminRoute && isAdmin && token);
      const url = shouldIncludeDrafts
        ? '/api/news?language=fa&includeDrafts=1'
        : '/api/news?language=fa';
      const res = await fetch(url, {
        headers: shouldIncludeDrafts && token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در بارگذاری اخبار');
      }
      const list: Article[] = Array.isArray(data.articles) ? data.articles : [];
      setArticles(list);

      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        const matched = list.find((a) => a.code === codeParam);
        if (matched) {
          openArticleDetail(matched);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'ارتباط با پایگاه داده برقرار نشد.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMenuConfig = async () => {
    try {
      const res = await fetch('/api/menus');
      const data = await res.json();
      if (res.ok && data.menuConfig && Array.isArray(data.menuConfig.items)) {
        setMenuConfig(normalizeMenuConfig(data.menuConfig));
      }
    } catch {
      // keep default menu config on transient failure
    }
  };

  const loadArticleTypes = async () => {
    try {
      const res = await fetch('/api/article-types');
      const data = await res.json();
      if (res.ok && Array.isArray(data.articleTypes) && data.articleTypes.length > 0) {
        setArticleTypes(data.articleTypes);
      }
    } catch {
      // keep default article types on transient failure
    }
  };

  const loadShareChannels = async () => {
    try {
      const res = await fetch('/api/share-channels');
      const data = await res.json();
      if (res.ok && Array.isArray(data.channels)) {
        setShareChannels(normalizeShareChannels(data.channels));
      }
    } catch {
      // keep default channels
    }
  };

  const loadSiteSocials = async () => {
    try {
      const res = await fetch('/api/site-socials');
      const data = await res.json();
      if (res.ok && Array.isArray(data.accounts)) {
        setSiteSocials(normalizeSiteSocialAccounts(data.accounts));
      }
    } catch {
      // keep default site socials
    }
  };

  useEffect(() => {
    loadArticles();
    loadMenuConfig();
    loadArticleTypes();
    loadShareChannels();
    loadSiteSocials();

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('islamtimes_cms_sync');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'MENU_UPDATED' && ev.data.menuConfig) {
          setMenuConfig(normalizeMenuConfig(ev.data.menuConfig));
        } else if (ev.data?.type === 'ARTICLE_TYPES_UPDATED' && Array.isArray(ev.data.articleTypes)) {
          setArticleTypes(ev.data.articleTypes);
          loadArticles();
        } else if (ev.data?.type === 'SHARE_CHANNELS_UPDATED' && Array.isArray(ev.data.channels)) {
          setShareChannels(normalizeShareChannels(ev.data.channels));
        } else if (ev.data?.type === 'SITE_SOCIALS_UPDATED' && Array.isArray(ev.data.accounts)) {
          setSiteSocials(normalizeSiteSocialAccounts(ev.data.accounts));
        } else if (ev.data?.type === 'ARTICLES_UPDATED') {
          loadArticles();
        }
      };
    }

    return () => {
      if (bc) bc.close();
    };
  }, [isAdminRoute, isAdmin, adminToken]);

  const openArticleDetail = async (article: Article) => {
    setSelectedArticle(article);
    setArticleComments([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch(`/api/news/${article.id}`);
      const data = await res.json();
      if (res.ok && data.article) {
        setSelectedArticle(data.article);
        setArticleComments(Array.isArray(data.comments) ? data.comments : []);
        setArticles((prev) =>
          prev.map((a) => (a.id === data.article.id ? data.article : a))
        );
      }
    } catch {
      // Keep local article data visible even if view counter request fails
    }
  };

  const handleSelectSection = (section: SectionKey, subsection: string | null = null) => {
    setSelectedArticle(null);
    setSearchQuery('');
    setActiveArticleType(null);
    setActiveSection(section);
    setActiveSubsection(subsection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectArticleTypeArchive = (typeName: string) => {
    setSelectedArticle(null);
    setSearchQuery('');
    setActiveSection('home');
    setActiveSubsection(null);
    setActiveArticleType(typeName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (q: string) => {
    setSelectedArticle(null);
    setActiveSubsection(null);
    setActiveArticleType(null);
    setSearchQuery(q.trim());
    if (q.trim()) {
      setActiveSection('west-asia');
    } else {
      setActiveSection('home');
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedArticle(null);
    setActiveSubsection(null);
    setActiveArticleType(null);
    setSearchQuery(tag);
    setActiveSection('west-asia');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      if (searchQuery) {
        const normDigits = (val: string) =>
          val
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        const q = normDigits(searchQuery).toLowerCase();
        const hay = normDigits(
          `${item.code || ''} ${item.title} ${item.lead} ${item.body} ${item.subsection} ${item.tags} ${item.articleType || ''}`
        ).toLowerCase();
        return hay.includes(q);
      }
      if (activeArticleType) {
        const itemType = item.articleType || (item.isVideo ? 'ویدیو' : 'خبر');
        const matchesType =
          itemType === activeArticleType ||
          (activeArticleType === 'ویدیو' && item.isVideo) ||
          (activeArticleType === 'گفتگو' && item.section === 'interview');
        if (!matchesType) return false;
      }
      if (activeSection === 'home') return true;
      if (activeSubsection) {
        const sub = activeSubsection.toLowerCase();
        if (item.section === activeSection) {
          return (
            item.subsection.toLowerCase() === sub ||
            item.title.toLowerCase().includes(sub) ||
            item.lead.toLowerCase().includes(sub) ||
            item.tags.toLowerCase().includes(sub)
          );
        }
        return (
          item.subsection.toLowerCase() === sub ||
          item.tags.toLowerCase().includes(sub)
        );
      }
      return item.section === activeSection;
    });
  }, [articles, activeSection, activeSubsection, activeArticleType, searchQuery]);

  const breakingTickerArticles = useMemo(
    () =>
      articles.filter(
        (item) => item.status !== 'draft' && isBreakingArticleType(item.articleType)
      ),
    [articles]
  );

  const homeFeedArticles = useMemo(
    () => articles.filter((item) => !isTickerOnlyBreakingArticle(item)),
    [articles]
  );

  const handleUnavailableLang = (langLabel: string) => {
    setLangNotice(
      `نسخه فارسی هم‌اکنون فعال است. نسخه زبان «${langLabel}» پس از دستور بعدی شما راه‌اندازی خواهد شد.`
    );
    setTimeout(() => {
      setLangNotice((prev) => (prev?.includes(langLabel) ? null : prev));
    }, 5000);
  };

  const notifySync = (payload: {
    type: string;
    menuConfig?: MenuConfig;
    articleTypes?: ArticleTypeOption[];
    channels?: CustomShareChannel[];
    accounts?: SiteSocialAccount[];
  }) => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('islamtimes_cms_sync');
      bc.postMessage(payload);
      bc.close();
    }
  };

  if (isAdminRoute) {
    return (
      <AdminPage
        articles={articles}
        menuConfig={menuConfig}
        articleTypes={articleTypes}
        shareChannels={shareChannels}
        siteSocials={siteSocials}
        onMenuConfigSaved={(next) => {
          setMenuConfig(next);
          notifySync({ type: 'MENU_UPDATED', menuConfig: next });
        }}
        onArticleTypesSaved={(nextTypes) => {
          setArticleTypes(nextTypes);
          loadArticles();
          notifySync({ type: 'ARTICLE_TYPES_UPDATED', articleTypes: nextTypes });
        }}
        onShareChannelsSaved={(nextChannels) => {
          setShareChannels(nextChannels);
          notifySync({ type: 'SHARE_CHANNELS_UPDATED', channels: nextChannels });
        }}
        onSiteSocialsSaved={(nextAccounts) => {
          setSiteSocials(nextAccounts);
          notifySync({ type: 'SITE_SOCIALS_UPDATED', accounts: nextAccounts });
        }}
        onArticlePublished={(newArticle) => {
          setArticles((prev) => [newArticle, ...prev]);
          notifySync({ type: 'ARTICLES_UPDATED' });
        }}
        onArticleUpdated={(updatedArticle) => {
          setArticles((prev) =>
            prev.map((a) => (a.id === updatedArticle.id ? updatedArticle : a))
          );
          notifySync({ type: 'ARTICLES_UPDATED' });
        }}
        onArticleDeleted={(articleId) => {
          setArticles((prev) => prev.filter((a) => a.id !== articleId));
          notifySync({ type: 'ARTICLES_UPDATED' });
        }}
      />
    );
  }

  const isHomePage =
    activeSection === 'home' && !searchQuery && !selectedArticle && !activeArticleType;
  const currentMenuItem = menuConfig.items.find((m) => m.key === activeSection);
  const currentMenuLabel = currentMenuItem?.label;
  const currentMenuDescription = currentMenuItem?.description;

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Header
        activeSection={
          selectedArticle ? ((selectedArticle.section as SectionKey) || 'home') : activeSection
        }
        activeSubsection={selectedArticle ? selectedArticle.subsection : activeSubsection}
        isHomePage={isHomePage}
        menuConfig={menuConfig}
        siteSocials={siteSocials}
        breakingArticles={breakingTickerArticles}
        onSelectArticle={openArticleDetail}
        onSelectSection={handleSelectSection}
        searchQuery={searchQuery}
        onSearchSubmit={handleSearchSubmit}
        onSelectUnavailableLang={handleUnavailableLang}
      />

      {langNotice && (
        <div className="max-w-[1140px] mx-auto px-4 mt-4 w-full">
          <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded px-4 py-2.5 text-xs flex items-center justify-between gap-3">
            <span>{langNotice}</span>
            <button
              type="button"
              onClick={() => setLangNotice(null)}
              aria-label="بستن پیام"
              className="text-sky-700 hover:text-sky-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-[1140px] mx-auto px-4 mt-6 w-full">
          <div className="bg-rose-50 border border-rose-200 text-[#d41a24] rounded p-4 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadArticles}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#d41a24] text-white font-semibold cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تلاش مجدد
            </button>
          </div>
        </div>
      )}

      <div className="flex-1">
        {loading ? (
          <div className="max-w-[1140px] mx-auto px-4 py-12 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={`load-r-${i}`} className="h-16 bg-neutral-100 animate-pulse rounded" />
                ))}
              </div>
              <div className="lg:col-span-6 h-80 bg-neutral-100 animate-pulse rounded" />
              <div className="lg:col-span-3 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={`load-l-${i}`} className="h-16 bg-neutral-100 animate-pulse rounded" />
                ))}
              </div>
            </div>
          </div>
        ) : selectedArticle ? (
          <ArticleDetailView
            article={selectedArticle}
            comments={articleComments}
            allArticles={articles}
            menuConfig={menuConfig}
            shareChannels={shareChannels}
            onSelectArticle={openArticleDetail}
            onSelectSection={handleSelectSection}
            onSelectArticleType={handleSelectArticleTypeArchive}
            onArticleUpdated={(updated) => {
              setSelectedArticle(updated);
              setArticles((prev) =>
                prev.map((a) => (a.id === updated.id ? updated : a))
              );
            }}
            onCommentAdded={(newComment) =>
              setArticleComments((prev) => [newComment, ...prev])
            }
            onCommentUpdated={(updatedComment) =>
              setArticleComments((prev) =>
                prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
              )
            }
            onTagClick={handleTagClick}
          />
        ) : activeSection === 'home' && !searchQuery && !activeArticleType ? (
          <HomeView
            articles={homeFeedArticles}
            menuConfig={menuConfig}
            onSelectArticle={openArticleDetail}
            onSelectSection={handleSelectSection}
            onSelectArticleType={handleSelectArticleTypeArchive}
            onPlayVideoArticle={(vid) => setPlayingVideoArticle(vid)}
          />
        ) : (
          <CategoryView
            section={activeSection}
            sectionLabelOverride={currentMenuLabel}
            sectionDescriptionOverride={currentMenuDescription}
            activeSubsection={activeSubsection}
            activeArticleType={activeArticleType}
            articleTypes={articleTypes}
            categoryMediaMode={menuConfig.categoryMediaMode || 'both'}
            searchQuery={searchQuery}
            articles={filteredArticles}
            allArticles={articles}
            onSelectArticle={openArticleDetail}
            onSelectArticleType={(typeName) => setActiveArticleType(typeName)}
            onPlayVideoArticle={(vid) => setPlayingVideoArticle(vid)}
          />
        )}
      </div>

      <Footer
        menuConfig={menuConfig}
        articleTypes={articleTypes}
        siteSocials={siteSocials}
        onSelectSection={handleSelectSection}
        onSelectArticleType={handleSelectArticleTypeArchive}
        onSearchSubmit={handleSearchSubmit}
        onSelectUnavailableLang={handleUnavailableLang}
      />

      <VideoPlayerModal
        article={playingVideoArticle}
        onClose={() => setPlayingVideoArticle(null)}
        onReadFullReport={openArticleDetail}
      />
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <IslamTimesPortal />
    </AdminAuthProvider>
  );
}
