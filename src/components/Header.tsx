import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Lock,
  LogOut,
  MessageCircle,
  Radio,
  Search,
  Send,
  Youtube,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Article,
  DEFAULT_SITE_SOCIAL_ACCOUNTS,
  LANGUAGES,
  MainMenuItemConfig,
  MenuConfig,
  SectionKey,
  SiteSocialAccount,
  toPersianDigits,
} from '../types/news';
import { IslamTimesLogo } from './IslamTimesLogo';

interface HeaderProps {
  activeSection: SectionKey;
  activeSubsection?: string | null;
  isHomePage: boolean;
  menuConfig: MenuConfig;
  siteSocials?: SiteSocialAccount[];
  breakingArticles?: Article[];
  onSelectArticle?: (article: Article) => void;
  onSelectSection: (section: SectionKey, subsection?: string | null) => void;
  searchQuery: string;
  onSearchSubmit: (q: string) => void;
  onSelectUnavailableLang: (langLabel: string) => void;
}

export function Header({
  activeSection,
  activeSubsection,
  isHomePage,
  menuConfig,
  siteSocials = DEFAULT_SITE_SOCIAL_ACCOUNTS,
  breakingArticles = [],
  onSelectArticle,
  onSelectSection,
  searchQuery,
  onSearchSubmit,
  onSelectUnavailableLang,
}: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [breakingIndex, setBreakingIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [pauseTicker, setPauseTicker] = useState(false);
  const { isAdmin, adminLogout } = useAdminAuth();

  useEffect(() => {
    setBreakingIndex(0);
  }, [breakingArticles.length]);

  const safeIndex =
    breakingArticles.length > 0 ? breakingIndex % breakingArticles.length : 0;
  const currentBreaking =
    breakingArticles.length > 0 ? breakingArticles[safeIndex] : null;
  const currentBreakingTitle = currentBreaking?.title || '';

  useEffect(() => {
    if (!currentBreaking) {
      setTypedLength(0);
      return;
    }
    setTypedLength(0);
    setFlashKey((k) => k + 1);
  }, [currentBreaking?.id, currentBreakingTitle, safeIndex]);

  useEffect(() => {
    if (!currentBreaking) return;

    if (typedLength < currentBreakingTitle.length) {
      const charDelay = currentBreakingTitle.length > 75 ? 20 : 28;
      const timer = window.setTimeout(() => {
        setTypedLength((len) => len + 1);
      }, charDelay);
      return () => window.clearTimeout(timer);
    }

    if (breakingArticles.length > 1 && !pauseTicker) {
      const holdTimer = window.setTimeout(() => {
        setBreakingIndex((prev) => (prev + 1) % breakingArticles.length);
      }, 3600);
      return () => window.clearTimeout(holdTimer);
    }
  }, [
    currentBreaking,
    currentBreakingTitle.length,
    typedLength,
    breakingArticles.length,
    pauseTicker,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(localSearch);
  };

  const showMainMenu = isHomePage
    ? menuConfig.showMainMenuOnHome
    : menuConfig.showMainMenuOnMenuPage;
  const maxMainMenus = isHomePage
    ? menuConfig.maxMainMenusOnHome
    : menuConfig.maxMainMenusOnMenuPage;
  const showSubmenus = isHomePage
    ? menuConfig.showSubmenusOnHome
    : menuConfig.showSubmenusOnMenuPage;
  const maxSubmenusGlobal = isHomePage
    ? menuConfig.maxSubmenusOnHome
    : menuConfig.maxSubmenusOnMenuPage;

  const visibleMainMenus = showMainMenu
    ? menuConfig.items
        .filter((m) => (isHomePage ? m.showOnHome : m.showOnMenuPage))
        .slice(0, maxMainMenus)
    : [];

  const getVisibleSubmenus = (item: MainMenuItemConfig) => {
    if (!showSubmenus) return [];
    const perMenuLimit = isHomePage ? item.homeSubmenuLimit : item.menuPageSubmenuLimit;
    const cap = Math.min(maxSubmenusGlobal, perMenuLimit > 0 ? perMenuLimit : maxSubmenusGlobal);
    return item.subsections
      .filter((s) => (isHomePage ? s.showOnHome : s.showOnMenuPage))
      .slice(0, cap);
  };

  const activeMenuItem = menuConfig.items.find((m) => m.key === activeSection);
  const activeBarSubmenus = activeMenuItem ? getVisibleSubmenus(activeMenuItem) : [];

  return (
    <header className="w-full no-print">
      {/* Top Language & Date Bar */}
      <div className="w-full bg-[#0b5e85] text-white text-xs border-b border-white/15">
        <div className="max-w-[1140px] mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sky-100 tabular-nums whitespace-nowrap shrink-0">
            ۱۴ فروردین ۱۴۰۵ / April 9 2026
          </div>

          <div
            className="flex items-center gap-1.5 flex-wrap justify-center"
            role="navigation"
            aria-label="انتخاب زبان پایگاه خبری"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  if (!lang.active) {
                    onSelectUnavailableLang(lang.label);
                  }
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  lang.active
                    ? 'bg-[#d41a24] text-white shadow-sm'
                    : 'bg-[#1982b0] text-white/95 hover:bg-[#2394c4]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin ? (
              <>
                <a
                  href="/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  ورود به پنل مدیریت CMS
                </a>
                <span className="text-sky-100 text-[11px] px-1.5 py-0.5 bg-black/20 rounded">
                  مدیر سیستم
                </span>
                <button
                  type="button"
                  onClick={adminLogout}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-white text-[11px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  title="خروج از مدیریت"
                >
                  <LogOut className="w-3 h-3" />
                  خروج
                </button>
              </>
            ) : (
              <a
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                پنل مدیریت
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Blue Brand Banner */}
      <div className="w-full islam-times-banner-bg pt-4 pb-8">
        <div className="max-w-[1140px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <IslamTimesLogo
            onClick={() => {
              setLocalSearch('');
              onSearchSubmit('');
              onSelectSection('home');
            }}
          />

          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md flex items-center bg-white rounded-md shadow-sm overflow-hidden border border-white/60"
          >
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="جستجو در اخبار اسلام تایمز..."
              className="flex-1 px-3.5 py-2 text-xs md:text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-transparent"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className="px-3 py-2 text-[#0b5e85] hover:text-[#d41a24] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-3 shrink-0 text-white">
            <div className="hidden sm:flex items-center gap-2.5 text-white/90">
              {(siteSocials && siteSocials.length > 0
                ? siteSocials
                : DEFAULT_SITE_SOCIAL_ACCOUNTS
              )
                .filter((acc) => acc.enabled)
                .map((acc) => {
                  const hasUrl = Boolean(acc.url && acc.url.trim());
                  const renderIcon = () => {
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
                    <a
                      key={acc.id}
                      href={hasUrl ? acc.url : '#footer-social'}
                      target={hasUrl ? '_blank' : undefined}
                      rel={hasUrl ? 'noopener noreferrer' : undefined}
                      aria-label={acc.name}
                      title={acc.handle ? `${acc.name} — ${acc.handle}` : acc.name}
                      className="hover:text-white transition-colors"
                    >
                      {renderIcon()}
                    </a>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating White Section Navigation Bar */}
      {showMainMenu && visibleMainMenus.length > 0 && (
        <div className="max-w-[960px] mx-auto px-4 -mt-5 relative z-20">
          <nav
            className="bg-white rounded-md shadow-md border border-neutral-200/80 px-3 py-2 flex flex-wrap items-center justify-center gap-1 md:gap-1.5"
            aria-label="منوی اصلی بخش‌های خبری"
          >
            {visibleMainMenus.map((item, idx) => {
              const isActive = activeSection === item.key;
              const hasSub =
                item.subsections.some((s) =>
                  isHomePage ? s.showOnMenuPage || s.showOnHome : s.showOnMenuPage
                ) &&
                (isHomePage
                  ? menuConfig.showSubmenusOnMenuPage || menuConfig.showSubmenusOnHome
                  : menuConfig.showSubmenusOnMenuPage);
              return (
                <div key={item.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectSection(item.key, null)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs md:text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#d41a24] text-white'
                        : 'text-neutral-700 hover:text-[#d41a24]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {hasSub && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-white/90' : 'text-neutral-400'
                        }`}
                      />
                    )}
                  </button>

                  {idx < visibleMainMenus.length - 1 && (
                    <span
                      className="mx-1 text-neutral-300 select-none text-xs"
                      aria-hidden="true"
                    >
                      |
                    </span>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Active Section Submenu Strip (when on menu/category page) */}
          {activeBarSubmenus.length > 0 && (
            <div className="mt-2 bg-neutral-50 border border-neutral-200/90 rounded-md px-3 py-2 flex items-center flex-wrap justify-center gap-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => onSelectSection(activeSection, null)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  !activeSubsection
                    ? 'bg-[#0b5e85] text-white'
                    : 'text-neutral-600 hover:text-[#0b5e85] hover:bg-white'
                }`}
              >
                همه مطالب
              </button>
              {activeBarSubmenus.map((sub) => {
                const isSubActive = activeSubsection === sub.label;
                return (
                  <div key={`subbar-${sub.id}`} className="flex items-center gap-1.5">
                    <span className="text-neutral-300 text-[10px] select-none" aria-hidden="true">
                      /
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectSection(activeSection, sub.label)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        isSubActive
                          ? 'bg-[#d41a24] text-white font-semibold'
                          : 'text-neutral-700 hover:text-[#d41a24] hover:bg-white'
                      }`}
                    >
                      {sub.label}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Breaking News Strip under Main Menu */}
      {currentBreaking && (
        <div className="max-w-[960px] mx-auto px-4 mt-2.5 relative z-10">
          <div
            onMouseEnter={() => setPauseTicker(true)}
            onMouseLeave={() => setPauseTicker(false)}
            className="bg-white rounded-md border border-rose-200 shadow-xs overflow-hidden flex items-stretch min-h-[38px]"
            role="region"
            aria-label="نوار خبر فوری"
          >
            <div className="bg-[#d41a24] text-white px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-extrabold shrink-0 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>خبر فوری</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectArticle?.(currentBreaking)}
              className="relative flex-1 min-w-0 px-3 py-1.5 flex items-center justify-between gap-2 text-right bg-rose-50/40 hover:bg-rose-50 transition-colors cursor-pointer group overflow-hidden"
              title={currentBreaking.title}
            >
              <span
                key={`flash-${flashKey}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 breaking-row-flash"
              />
              <span className="relative z-10 text-xs sm:text-[13px] font-bold text-neutral-900 group-hover:text-[#d41a24] truncate transition-colors">
                <span>{currentBreakingTitle.slice(0, typedLength)}</span>
                <span
                  aria-hidden="true"
                  className="inline-block w-[2px] h-3.5 bg-[#d41a24] align-middle mr-1 breaking-caret-blink"
                />
              </span>
              {currentBreaking.code && (
                <span className="relative z-10 hidden sm:inline-flex shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-rose-200 text-[#d41a24]">
                  کد {toPersianDigits(currentBreaking.code)}
                </span>
              )}
            </button>

            {breakingArticles.length > 1 && (
              <div className="flex items-center gap-0.5 px-1.5 bg-neutral-50 border-r border-rose-100 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setBreakingIndex(
                      (prev) => (prev - 1 + breakingArticles.length) % breakingArticles.length
                    )
                  }
                  aria-label="خبر فوری قبلی"
                  title="خبر فوری قبلی"
                  className="p-1 rounded hover:bg-rose-100 text-neutral-600 hover:text-[#d41a24] cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-neutral-500 px-1 tabular-nums whitespace-nowrap">
                  {toPersianDigits(safeIndex + 1)}/{toPersianDigits(breakingArticles.length)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBreakingIndex((prev) => (prev + 1) % breakingArticles.length)
                  }
                  aria-label="خبر فوری بعدی"
                  title="خبر فوری بعدی"
                  className="p-1 rounded hover:bg-rose-100 text-neutral-600 hover:text-[#d41a24] cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
