import { useState } from 'react';
import {
  Facebook,
  Globe,
  Instagram,
  MessageCircle,
  Search,
  Send,
  Youtube,
} from 'lucide-react';
import {
  ArticleTypeOption,
  DEFAULT_ARTICLE_TYPES,
  DEFAULT_SITE_SOCIAL_ACCOUNTS,
  MenuConfig,
  SectionKey,
  SiteSocialAccount,
} from '../types/news';
import { IslamTimesLogo } from './IslamTimesLogo';

interface FooterProps {
  menuConfig: MenuConfig;
  articleTypes?: ArticleTypeOption[];
  siteSocials?: SiteSocialAccount[];
  onSelectSection: (section: SectionKey) => void;
  onSelectArticleType?: (typeName: string) => void;
  onSearchSubmit: (q: string) => void;
  onSelectUnavailableLang: (langLabel: string) => void;
}

export function Footer({
  menuConfig,
  articleTypes = DEFAULT_ARTICLE_TYPES,
  siteSocials = DEFAULT_SITE_SOCIAL_ACCOUNTS,
  onSelectSection,
  onSelectArticleType,
  onSearchSubmit,
  onSelectUnavailableLang,
}: FooterProps) {
  const [footerSearch, setFooterSearch] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFooterSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(footerSearch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      setNewsletterStatus({
        type: 'error',
        message: 'لطفاً یک نشانی ایمیل معتبر وارد کنید.',
      });
      return;
    }
    setSubmitting(true);
    setNewsletterStatus(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت عضویت');
      }
      setNewsletterStatus({
        type: 'success',
        message: data.message || 'عضویت شما با موفقیت ثبت شد.',
      });
      setNewsletterEmail('');
    } catch (err: unknown) {
      setNewsletterStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'ثبت عضویت با خطا مواجه شد.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="w-full mt-10 no-print" id="footer-social">
      <div className="w-full islam-times-footer-bg text-white py-10">
        <div className="max-w-[1140px] mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Column 1: اسلام تایمز */}
          <div>
            <h3 className="text-sm font-bold mb-3 text-white pb-1 border-b border-white/20">
              اسلام تایمز
            </h3>
            <ul className="space-y-2 text-xs text-sky-100">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('home')}
                  className="hover:text-white cursor-pointer"
                >
                  • درباره ما
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('special')}
                  className="hover:text-white cursor-pointer"
                >
                  • تماس با ما
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('special')}
                  className="hover:text-white cursor-pointer"
                >
                  • حریم خصوصی
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('interview')}
                  className="hover:text-white cursor-pointer"
                >
                  • خبرنگار ما
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('special')}
                  className="hover:text-white cursor-pointer"
                >
                  • نظرسنجی
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById('footer-newsletter')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  • خبرنامه
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: بخش‌ها */}
          <div>
            <h3 className="text-sm font-bold mb-3 text-white pb-1 border-b border-white/20">
              بخش‌ها
            </h3>
            <ul className="space-y-2 text-xs text-sky-100">
              {menuConfig.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSection(item.key as SectionKey);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white cursor-pointer"
                  >
                    • {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: دسترسی سریع */}
          <div>
            <h3 className="text-sm font-bold mb-3 text-white pb-1 border-b border-white/20">
              دسترسی سریع
            </h3>
            <ul className="space-y-2 text-xs text-sky-100">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSection('special');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  •{' '}
                  {menuConfig.items.find((m) => m.key === 'special')?.label ||
                    'بخش‌های ویژه'}
                </button>
              </li>
              {articleTypes.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectArticleType) {
                        onSelectArticleType(t.name);
                      } else {
                        onSelectSection('west-asia');
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white cursor-pointer"
                  >
                    • {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: زبان‌ها */}
          <div>
            <h3 className="text-sm font-bold mb-3 text-white pb-1 border-b border-white/20">
              زبان‌ها
            </h3>
            <ul className="space-y-2 text-xs text-sky-100">
              {[
                ['ar', 'عربی'],
                ['en', 'انگلیسی'],
                ['ur', 'اردو'],
                ['az', 'آذری'],
                ['id', 'مالایی'],
                ['fa', 'فارسی'],
              ].map(([code, label]) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => {
                      if (code !== 'fa') {
                        onSelectUnavailableLang(label);
                      } else {
                        onSelectSection('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`hover:text-white cursor-pointer ${
                      code === 'fa' ? 'font-bold text-white' : ''
                    }`}
                  >
                    • {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: شبکه‌های اجتماعی */}
          <div className="flex flex-col items-start">
            <h3 className="text-sm font-bold mb-3 text-white pb-1 border-b border-white/20 w-full">
              شبکه‌های اجتماعی
            </h3>
            <div className="flex flex-col gap-3 text-sky-100 pt-1">
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
                        return <Send className="w-4 h-4 shrink-0" />;
                      case 'instagram':
                        return <Instagram className="w-4 h-4 shrink-0" />;
                      case 'facebook':
                        return <Facebook className="w-4 h-4 shrink-0" />;
                      case 'youtube':
                        return <Youtube className="w-4 h-4 shrink-0" />;
                      case 'whatsapp':
                        return <MessageCircle className="w-4 h-4 shrink-0" />;
                      default:
                        return <Globe className="w-4 h-4 shrink-0" />;
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
                      className="inline-flex items-center gap-2 text-xs hover:text-white transition-colors"
                    >
                      {renderIcon()}
                      <span>{acc.name}</span>
                    </a>
                  );
                })}
            </div>
          </div>

          {/* Column 6: Logo + Search + Newsletter */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col gap-3">
            <IslamTimesLogo
              compact
              onClick={() => {
                onSelectSection('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            <form
              onSubmit={handleFooterSearch}
              className="flex items-center bg-white rounded overflow-hidden shadow-sm"
            >
              <button
                type="submit"
                aria-label="جستجو در سایت"
                className="bg-[#168ec2] hover:bg-[#0b5e85] text-white p-2 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                value={footerSearch}
                onChange={(e) => setFooterSearch(e.target.value)}
                placeholder="جستجو در سایت"
                className="flex-1 px-2.5 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none min-w-0"
              />
            </form>

            <form
              id="footer-newsletter"
              onSubmit={handleNewsletter}
              className="flex items-center bg-white rounded overflow-hidden shadow-sm"
            >
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#168ec2] hover:bg-[#0b5e85] text-white px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? '...' : 'عضویت'}
              </button>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="عضویت در خبرنامه"
                className="flex-1 px-2.5 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none min-w-0"
              />
            </form>

            {newsletterStatus && (
              <p
                className={`text-[11px] leading-5 ${
                  newsletterStatus.type === 'success'
                    ? 'text-emerald-200'
                    : 'text-rose-200'
                }`}
              >
                {newsletterStatus.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="w-full bg-[#111418] text-neutral-300 text-[11px] py-2.5 text-center" dir="ltr">
        Copyright © islamtimes.org - 2026, All rights reserved
      </div>
    </footer>
  );
}
