import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  createArticle,
  createComment,
  createNewsSource,
  deleteArticle,
  deleteNewsSource,
  getArticleById,
  getSettingJson,
  likeArticle,
  listAllComments,
  listArticles,
  listCommentsForArticle,
  listNewsSources,
  findOrCreateNewsSource,
  renameArticleTypeInArticles,
  saveSettingJson,
  subscribeNewsletter,
  updateArticle,
  updateNewsSource,
  voteComment,
  listAllArticlesMediaReferences,
} from './src/db/newsRepository.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { hasRichBodyContent, normalizeSitePlainText, sanitizeRichHtml } from './src/lib/richText.ts';
import {
  AdminMediaItem,
  AdminMediaSummary,
  AdminMediaUsageRef,
  AdminSidebarMenuItem,
  ArticleTypeOption,
  CustomShareChannel,
  DEFAULT_ARTICLE_TYPES,
  DEFAULT_SHARE_CHANNELS,
  isBreakingArticleType,
  MenuConfig,
  normalizeAdminSidebarMenus,
  normalizeMenuConfig,
  normalizeShareChannels,
  normalizeSiteSocialAccounts,
  SiteSocialAccount,
} from './src/types/news.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_TOKEN = 'islam_admin_secret_token_2026';

interface AdminRequest extends Request {
  isAdmin?: boolean;
}

const isAdminAuthorized = (req: Request): boolean => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.split('Bearer ')[1] === ADMIN_TOKEN;
};

const requireAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'دسترسی غیرمجاز. لطفاً از طریق پنل مدیریت وارد شوید.' });
  }
  const token = authHeader.split('Bearer ')[1];
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'توکن مدیریت نامعتبر است.' });
  }
  req.isAdmin = true;
  next();
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

  // Streaming Binary Upload (supports up to 500 MB videos & attachments + paired large/small images)
  app.post('/api/admin/upload-stream', requireAdmin, (req: AdminRequest, res) => {
    req.setTimeout(15 * 60 * 1000);
    res.setTimeout(15 * 60 * 1000);

    const contentLengthHeader = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(contentLengthHeader) && contentLengthHeader > MAX_UPLOAD_BYTES) {
      return res
        .status(413)
        .json({ error: 'حجم فایل انتخاب‌شده بیشتر از ۵۰۰ مگابایت است و مجاز به بارگذاری نیست.' });
    }

    const rawFileHeader =
      typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : '';
    let originalName = 'file.bin';
    if (rawFileHeader) {
      try {
        originalName = decodeURIComponent(rawFileHeader).trim() || 'file.bin';
      } catch {
        originalName = rawFileHeader.trim() || 'file.bin';
      }
    }

    const mimeType =
      typeof req.headers['x-mime-type'] === 'string' && req.headers['x-mime-type'].trim()
        ? req.headers['x-mime-type'].trim()
        : 'application/octet-stream';

    const folderRaw = typeof req.headers['x-folder'] === 'string' ? req.headers['x-folder'] : 'general';
    const allowedFolders = new Set(['images', 'attachments', 'gallery', 'videos', 'general']);
    const safeFolder = allowedFolders.has(folderRaw) ? folderRaw : 'general';

    const imageRole =
      typeof req.headers['x-image-role'] === 'string' ? req.headers['x-image-role'] : '';
    const companionFor =
      typeof req.headers['x-companion-for'] === 'string' ? req.headers['x-companion-for'].trim() : '';

    const targetDir = path.join(UPLOADS_DIR, safeFolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) || '';
    let storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    if (safeFolder === 'images') {
      if (imageRole === 'lg') {
        storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-lg${ext}`;
      } else if (
        imageRole === 'sm' &&
        /^[0-9]+-[a-z0-9]+-lg\.[a-z0-9]+$/i.test(companionFor)
      ) {
        const companionBase = companionFor.replace(/-lg\.[a-z0-9]+$/i, '');
        storedName = `${companionBase}-sm${ext}`;
      }
    }

    const targetPath = path.join(targetDir, storedName);
    const writeStream = fs.createWriteStream(targetPath);
    let receivedBytes = 0;
    let aborted = false;

    const cleanupPartial = () => {
      try {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      } catch {
        // ignore cleanup failure
      }
    };

    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_UPLOAD_BYTES) {
        aborted = true;
        writeStream.destroy();
        cleanupPartial();
        if (!res.headersSent) {
          res.status(413).json({
            error: 'حجم فایل انتخاب‌شده بیشتر از ۵۰۰ مگابایت است و مجاز به بارگذاری نیست.',
          });
        }
        req.destroy();
        return;
      }
      if (!writeStream.write(chunk)) {
        req.pause();
        writeStream.once('drain', () => {
          if (!aborted) req.resume();
        });
      }
    });

    req.on('end', () => {
      if (aborted) return;
      writeStream.end();
    });

    writeStream.on('finish', () => {
      if (aborted) return;
      if (receivedBytes === 0) {
        cleanupPartial();
        if (!res.headersSent) {
          res.status(400).json({ error: 'فایل انتخاب‌شده خالی یا نامعتبر است.' });
        }
        return;
      }
      if (!res.headersSent) {
        res.status(201).json({
          url: `/uploads/${safeFolder}/${storedName}`,
          storedName,
          name: originalName,
          size: receivedBytes,
          mimeType,
        });
      }
    });

    req.on('aborted', () => {
      aborted = true;
      writeStream.destroy();
      cleanupPartial();
    });

    req.on('error', () => {
      aborted = true;
      writeStream.destroy();
      cleanupPartial();
      if (!res.headersSent) {
        res.status(500).json({ error: 'خطا در دریافت فایل ارسالی' });
      }
    });

    writeStream.on('error', () => {
      aborted = true;
      cleanupPartial();
      if (!res.headersSent) {
        res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل روی سرور' });
      }
    });
  });

  app.use(express.json({ limit: '80mb' }));
  app.use(express.urlencoded({ extended: true, limit: '80mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Admin Login route
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === 'admin' && password === 'islamtimes1405') {
      return res.json({ token: ADMIN_TOKEN, username: 'admin' });
    }
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
  });

  // Menu Configuration API
  app.get('/api/menus', async (_req, res) => {
    try {
      const saved = await getSettingJson<MenuConfig>('menu_config');
      res.json({ menuConfig: normalizeMenuConfig(saved) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت تنظیمات منو';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/menus', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const rawConfig = req.body?.menuConfig as MenuConfig | undefined;
      if (!rawConfig || !Array.isArray(rawConfig.items)) {
        return res.status(400).json({ error: 'ساختار تنظیمات منوها نامعتبر است.' });
      }
      const normalized = normalizeMenuConfig(rawConfig);
      const saved = await saveSettingJson<MenuConfig>('menu_config', normalized);
      res.json({ menuConfig: saved });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ذخیره تنظیمات منو';
      res.status(500).json({ error: message });
    }
  });

  // Article Types Configuration API
  app.get('/api/article-types', async (_req, res) => {
    try {
      const saved = await getSettingJson<ArticleTypeOption[]>('article_types');
      const types =
        Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_ARTICLE_TYPES;
      res.json({ articleTypes: types });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت انواع مطلب';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/article-types', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const incoming = req.body?.articleTypes as ArticleTypeOption[] | undefined;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res
          .status(400)
          .json({ error: 'حداقل یک نوع مطلب باید در سامانه وجود داشته باشد.' });
      }
      const cleaned = incoming
        .map((t, idx) => ({
          id: String(t.id || `type-${Date.now()}-${idx}`),
          name: String(t.name || '').trim(),
          code: String(t.code || `type-${idx + 1}`).trim(),
          description: String(t.description || '').trim(),
          isDefault: Boolean(t.isDefault),
        }))
        .filter((t) => t.name.length > 0);

      if (cleaned.length === 0) {
        return res.status(400).json({ error: 'عنوان نوع مطلب نمی‌تواند خالی باشد.' });
      }
      if (!cleaned.some((t) => t.isDefault)) {
        cleaned[0].isDefault = true;
      }

      const renamedFrom =
        typeof req.body?.renamedFrom === 'string' ? req.body.renamedFrom.trim() : '';
      const renamedTo =
        typeof req.body?.renamedTo === 'string' ? req.body.renamedTo.trim() : '';
      if (renamedFrom && renamedTo && renamedFrom !== renamedTo) {
        await renameArticleTypeInArticles(renamedFrom, renamedTo);
      }

      const saved = await saveSettingJson<ArticleTypeOption[]>('article_types', cleaned);
      res.json({ articleTypes: saved });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ذخیره انواع مطلب';
      res.status(500).json({ error: message });
    }
  });

  // Admin Panel Sidebar Menu Configuration API
  app.get('/api/admin/sidebar-menus', async (_req, res) => {
    try {
      const saved = await getSettingJson<AdminSidebarMenuItem[]>('admin_sidebar_menus');
      res.json({ sidebarMenus: normalizeAdminSidebarMenus(saved) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت منوهای پنل مدیریت';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/admin/sidebar-menus', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const incoming = req.body?.sidebarMenus;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ error: 'ساختار منوهای پنل مدیریت نامعتبر است.' });
      }
      const normalized = normalizeAdminSidebarMenus(incoming);
      const saved = await saveSettingJson<AdminSidebarMenuItem[]>(
        'admin_sidebar_menus',
        normalized
      );
      res.json({ sidebarMenus: saved });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ذخیره منوهای پنل مدیریت';
      res.status(500).json({ error: message });
    }
  });

  // Custom Social Share Channels API
  app.get('/api/share-channels', async (_req, res) => {
    try {
      const saved = await getSettingJson<CustomShareChannel[]>('custom_share_channels');
      const seededV2 = await getSettingJson<boolean>('share_channels_regional_v2_seeded');
      let channels = normalizeShareChannels(saved);

      if (!seededV2) {
        if (Array.isArray(saved) && saved.length > 0) {
          const existingIds = new Set(channels.map((c) => c.id));
          const missingDefaults = DEFAULT_SHARE_CHANNELS.filter((d) => !existingIds.has(d.id));
          if (missingDefaults.length > 0) {
            channels = [...channels, ...missingDefaults];
            await saveSettingJson<CustomShareChannel[]>('custom_share_channels', channels);
          }
        } else {
          await saveSettingJson<CustomShareChannel[]>(
            'custom_share_channels',
            DEFAULT_SHARE_CHANNELS
          );
        }
        await saveSettingJson<boolean>('share_channels_regional_v2_seeded', true);
      }

      res.json({ channels });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت شبکه‌های اشتراک‌گذاری';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/share-channels', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const incoming = req.body?.channels;
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'ساختار فهرست شبکه‌ها نامعتبر است.' });
      }
      const normalized = normalizeShareChannels(incoming);
      const saved = await saveSettingJson<CustomShareChannel[]>(
        'custom_share_channels',
        normalized
      );
      res.json({ channels: saved });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ذخیره شبکه‌های اشتراک‌گذاری';
      res.status(500).json({ error: message });
    }
  });

  // Official Islam Times Social Networks API
  app.get('/api/site-socials', async (_req, res) => {
    try {
      const saved = await getSettingJson<SiteSocialAccount[]>('site_social_accounts');
      res.json({ accounts: normalizeSiteSocialAccounts(saved) });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'خطا در دریافت شبکه‌های اجتماعی سایت';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/site-socials', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const incoming = req.body?.accounts;
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'ساختار فهرست شبکه‌های اجتماعی سایت نامعتبر است.' });
      }
      const normalized = normalizeSiteSocialAccounts(incoming);
      const saved = await saveSettingJson<SiteSocialAccount[]>(
        'site_social_accounts',
        normalized
      );
      res.json({ accounts: saved });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'خطا در ذخیره شبکه‌های اجتماعی سایت';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/comments', requireAdmin, async (_req: AdminRequest, res) => {
    try {
      const allComments = await listAllComments();
      res.json({ comments: allComments });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت نظرات';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/news', async (req, res) => {
    try {
      const section = typeof req.query.section === 'string' ? req.query.section : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const language = typeof req.query.language === 'string' ? req.query.language : 'fa';
      const canSeeDrafts = isAdminAuthorized(req);
      const includeDrafts =
        canSeeDrafts &&
        (req.query.includeDrafts === '1' || req.query.includeDrafts === 'true');
      const statusParam =
        canSeeDrafts && (req.query.status === 'draft' || req.query.status === 'published')
          ? req.query.status
          : undefined;
      const items = await listArticles({
        section,
        search,
        language,
        includeDrafts,
        status: statusParam,
      });
      res.json({ articles: items });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت اخبار';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/news/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه خبر نامعتبر است.' });
      }
      const article = await getArticleById(id, { allowDraft: isAdminAuthorized(req) });
      if (!article) {
        return res.status(404).json({ error: 'خبر مورد نظر یافت نشد.' });
      }
      const articleComments = await listCommentsForArticle(id);
      res.json({ article, comments: articleComments });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت جزئیات خبر';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/news/:id/like', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه خبر نامعتبر است.' });
      }
      const updated = await likeArticle(id);
      if (!updated) {
        return res.status(404).json({ error: 'خبر یافت نشد.' });
      }
      res.json({ article: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ثبت واکنش';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/comments/:id/vote', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const type = req.body?.type === 'dislike' ? 'dislike' : 'like';
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه نظر نامعتبر است.' });
      }
      const updated = await voteComment(id, type);
      if (!updated) {
        return res.status(404).json({ error: 'نظر یافت نشد.' });
      }
      res.json({ comment: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ثبت رأی';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/newsletter', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'لطفاً یک نشانی ایمیل معتبر وارد کنید.' });
      }
      const result = await subscribeNewsletter(email, 'fa');
      res.status(201).json({ subscriber: result, message: 'عضویت شما در خبرنامه اسلام تایمز با موفقیت ثبت شد.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در عضویت خبرنامه';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/comments', async (req, res) => {
    try {
      const authorName =
        typeof req.body?.authorName === 'string' && req.body.authorName.trim()
          ? req.body.authorName.trim()
          : 'کاربر اسلام تایمز';
      const authorEmail =
        typeof req.body?.authorEmail === 'string' && req.body.authorEmail.trim()
          ? req.body.authorEmail.trim()
          : 'user@example.com';
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      const showEmail = Boolean(req.body?.showEmail);
      const articleId = Number(req.body?.articleId);
      const parentId = req.body?.parentId ? Number(req.body.parentId) : null;

      if (!Number.isInteger(articleId) || articleId <= 0 || !content) {
        return res.status(400).json({ error: 'متن نظر و شناسه خبر الزامی است.' });
      }

      // Ensure a visitor user record exists in DB
      const dbUser = await getOrCreateUser(
        'visitor-' + Math.random().toString(36).substring(7),
        authorEmail,
        authorName,
        null
      );

      const created = await createComment({
        articleId,
        userId: dbUser.id,
        parentId,
        authorName,
        authorEmail,
        showEmail,
        content,
      });

      res.status(201).json({ comment: created });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ارسال نظر';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin Media & File Upload
  app.post('/api/admin/upload', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const originalName =
        typeof req.body?.filename === 'string' && req.body.filename.trim()
          ? req.body.filename.trim()
          : 'file.bin';
      const mimeType =
        typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
          ? req.body.mimeType.trim()
          : 'application/octet-stream';
      const rawBase64 = typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64 : '';
      const folderRaw = typeof req.body?.folder === 'string' ? req.body.folder : 'general';
      const allowedFolders = new Set(['images', 'attachments', 'gallery', 'videos', 'general']);
      const safeFolder = allowedFolders.has(folderRaw) ? folderRaw : 'general';

      if (!rawBase64) {
        return res.status(400).json({ error: 'محتوای فایل برای آپلود ارسال نشده است.' });
      }

      const cleanBase64 = rawBase64.includes(';base64,')
        ? rawBase64.split(';base64,')[1]
        : rawBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length === 0) {
        return res.status(400).json({ error: 'فایل انتخاب‌شده خالی یا نامعتبر است.' });
      }
      if (buffer.length > 50 * 1024 * 1024) {
        return res.status(400).json({ error: 'حداکثر حجم مجاز هر فایل ۵۰ مگابایت است.' });
      }

      const targetDir = path.join(UPLOADS_DIR, safeFolder);
      fs.mkdirSync(targetDir, { recursive: true });

      const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) || '';
      const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      fs.writeFileSync(path.join(targetDir, storedName), buffer);

      res.status(201).json({
        url: `/uploads/${safeFolder}/${storedName}`,
        name: originalName,
        size: buffer.length,
        mimeType,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در آپلود فایل';
      res.status(500).json({ error: message });
    }
  });

  // Media Files Inventory & Deletion Helpers
  const MEDIA_FOLDERS = ['images', 'gallery', 'videos', 'attachments', 'general'] as const;
  type MediaFolder = (typeof MEDIA_FOLDERS)[number];
  const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp']);
  const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v', '.ogv']);

  const detectMediaType = (
    folder: MediaFolder,
    filename: string
  ): 'image' | 'video' | 'attachment' => {
    const ext = path.extname(filename).toLowerCase();
    if (VIDEO_EXTS.has(ext) || folder === 'videos') return 'video';
    if (IMAGE_EXTS.has(ext) || folder === 'images' || folder === 'gallery') return 'image';
    return 'attachment';
  };

  const collectUploadedMediaFiles = async (): Promise<{
    files: AdminMediaItem[];
    summary: AdminMediaSummary;
  }> => {
    const articleRefs = await listAllArticlesMediaReferences();
    const searchableArticles = articleRefs.map((art) => ({
      ref: {
        id: art.id,
        code: art.code || String(art.id),
        title: art.title || '',
        status: (art.status === 'draft' ? 'draft' : 'published') as 'published' | 'draft',
      },
      haystack: [
        art.imageUrl || '',
        art.body || '',
        art.galleryImages || '',
        art.videos || '',
        art.attachments || '',
      ].join('\n'),
    }));

    const files: AdminMediaItem[] = [];
    for (const folder of MEDIA_FOLDERS) {
      const dirPath = path.join(UPLOADS_DIR, folder);
      if (!fs.existsSync(dirPath)) continue;
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(dirPath);
      } catch {
        continue;
      }

      for (const filename of entries) {
        if (!filename || filename.startsWith('.')) continue;
        const fullPath = path.join(dirPath, filename);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }
        if (!stat.isFile()) continue;

        const url = `/uploads/${folder}/${filename}`;
        const companionLargeUrl =
          folder === 'images' && /-sm(\.[a-z0-9]+)$/i.test(filename)
            ? `/uploads/images/${filename.replace(/-sm(\.[a-z0-9]+)$/i, '-lg$1')}`
            : null;

        const usedBy: AdminMediaUsageRef[] = [];
        for (const item of searchableArticles) {
          if (
            item.haystack.includes(url) ||
            (companionLargeUrl && item.haystack.includes(companionLargeUrl))
          ) {
            usedBy.push(item.ref);
          }
        }

        const variantLabel =
          folder === 'images' && /-lg\.[a-z0-9]+$/i.test(filename)
            ? 'عکس بزرگ (۱۶:۱۰)'
            : folder === 'images' && /-sm\.[a-z0-9]+$/i.test(filename)
              ? 'عکس کوچک (۳:۲)'
              : folder === 'gallery'
                ? 'گالری عکس'
                : folder === 'videos'
                  ? 'ویدیو'
                  : folder === 'attachments'
                    ? 'فایل ضمیمه'
                    : 'سایر';

        files.push({
          id: `${folder}/${filename}`,
          filename,
          folder,
          mediaType: detectMediaType(folder, filename),
          url,
          size: stat.size,
          createdAt: stat.birthtimeMs || stat.mtimeMs,
          modifiedAt: stat.mtimeMs,
          isUsed: usedBy.length > 0,
          usedBy,
          variantLabel,
        });
      }
    }

    files.sort((a, b) => b.modifiedAt - a.modifiedAt);

    const summary: AdminMediaSummary = {
      totalCount: files.length,
      totalBytes: files.reduce((sum, f) => sum + f.size, 0),
      imageCount: files.filter((f) => f.mediaType === 'image').length,
      videoCount: files.filter((f) => f.mediaType === 'video').length,
      attachmentCount: files.filter((f) => f.mediaType === 'attachment').length,
      unusedCount: files.filter((f) => !f.isUsed).length,
      unusedBytes: files.filter((f) => !f.isUsed).reduce((sum, f) => sum + f.size, 0),
    };

    return { files, summary };
  };

  app.get('/api/admin/media', requireAdmin, async (_req, res) => {
    try {
      const result = await collectUploadedMediaFiles();
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت لیست فایل‌ها و رسانه‌ها';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/admin/media', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const force = Boolean(req.body?.force);
      if (incomingItems.length === 0) {
        return res.status(400).json({ error: 'هیچ فایلی برای حذف انتخاب نشده است.' });
      }

      const current = await collectUploadedMediaFiles();
      const fileMap = new Map(current.files.map((f) => [f.id, f]));

      const deletedIds: string[] = [];
      const skipped: Array<{ id: string; reason: string }> = [];
      let freedBytes = 0;
      const alreadyRemovedPaths = new Set<string>();

      for (const entry of incomingItems) {
        const folder = typeof entry?.folder === 'string' ? entry.folder.trim() : '';
        const filename = typeof entry?.filename === 'string' ? entry.filename.trim() : '';
        if (
          !MEDIA_FOLDERS.includes(folder as MediaFolder) ||
          !filename ||
          path.basename(filename) !== filename ||
          filename.includes('..') ||
          filename.includes('/') ||
          filename.includes('\\')
        ) {
          continue;
        }

        const itemId = `${folder}/${filename}`;
        const meta = fileMap.get(itemId);
        const resolvedFolderDir = path.resolve(UPLOADS_DIR, folder);
        const resolvedTarget = path.resolve(resolvedFolderDir, filename);
        if (!resolvedTarget.startsWith(`${resolvedFolderDir}${path.sep}`)) {
          continue;
        }

        if (meta?.isUsed && !force) {
          skipped.push({
            id: itemId,
            reason: 'این فایل در یک یا چند مطلب در حال استفاده است.',
          });
          continue;
        }

        if (alreadyRemovedPaths.has(resolvedTarget)) {
          continue;
        }

        if (fs.existsSync(resolvedTarget)) {
          const stat = fs.statSync(resolvedTarget);
          fs.unlinkSync(resolvedTarget);
          alreadyRemovedPaths.add(resolvedTarget);
          deletedIds.push(itemId);
          freedBytes += stat.size;

          // If deleting a -lg image, also clean up its paired -sm variant if present and not directly referenced
          if (folder === 'images' && /-lg(\.[a-z0-9]+)$/i.test(filename)) {
            const smName = filename.replace(/-lg(\.[a-z0-9]+)$/i, '-sm$1');
            const smId = `images/${smName}`;
            const smPath = path.resolve(resolvedFolderDir, smName);
            const smMeta = fileMap.get(smId);
            if (
              !alreadyRemovedPaths.has(smPath) &&
              fs.existsSync(smPath) &&
              (!smMeta?.isUsed || force)
            ) {
              const smStat = fs.statSync(smPath);
              fs.unlinkSync(smPath);
              alreadyRemovedPaths.add(smPath);
              deletedIds.push(smId);
              freedBytes += smStat.size;
            }
          }
        }
      }

      const refreshed = await collectUploadedMediaFiles();
      res.json({
        deletedIds,
        skipped,
        freedBytes,
        files: refreshed.files,
        summary: refreshed.summary,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در حذف فایل‌های انتخاب‌شده';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin News Publishing
  app.post('/api/news', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const kicker =
        typeof req.body?.kicker === 'string' ? normalizeSitePlainText(req.body.kicker, true) : '';
      const title =
        typeof req.body?.title === 'string' ? normalizeSitePlainText(req.body.title, true) : '';
      const subtitle =
        typeof req.body?.subtitle === 'string'
          ? normalizeSitePlainText(req.body.subtitle, true)
          : '';
      const lead =
        typeof req.body?.lead === 'string' ? normalizeSitePlainText(req.body.lead, false) : '';
      const rawBody = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      const body = sanitizeRichHtml(rawBody);
      const section = typeof req.body?.section === 'string' ? req.body.section.trim() : '';
      const subsection =
        typeof req.body?.subsection === 'string' ? req.body.subsection.trim() : '';
      const imageUrl =
        typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
      const tagsRaw = Array.isArray(req.body?.tags) ? req.body.tags : [];
      const attachmentsRaw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
      const galleryRaw = Array.isArray(req.body?.galleryImages) ? req.body.galleryImages : [];
      const videosRaw = Array.isArray(req.body?.videos) ? req.body.videos : [];

      const status: 'published' | 'draft' =
        req.body?.status === 'draft' ? 'draft' : 'published';

      const savedTypes = await getSettingJson<ArticleTypeOption[]>('article_types');
      const activeTypes =
        Array.isArray(savedTypes) && savedTypes.length > 0
          ? savedTypes
          : DEFAULT_ARTICLE_TYPES;
      const rawType =
        typeof req.body?.articleType === 'string' ? req.body.articleType.trim() : '';
      const matchedType =
        activeTypes.find((t) => t.name === rawType) ||
        activeTypes.find(
          (t) =>
            t.name.replace(/\s+/g, '') === rawType.replace(/\s+/g, '') && rawType.length > 0
        );
      const articleType = matchedType ? matchedType.name : '';
      const isBreaking = isBreakingArticleType(articleType);

      if (status === 'draft') {
        if (!title) {
          return res.status(400).json({ error: 'برای ذخیره پیش‌نویس، وارد کردن تیتر مطلب الزامی است.' });
        }
      } else {
        if (!articleType) {
          return res.status(400).json({ error: 'انتخاب نوع مطلب الزامی است.' });
        }
        if (isBreaking) {
          if (!title) {
            return res
              .status(400)
              .json({ error: 'برای انتشار خبر فوری، وارد کردن تیتر مطلب الزامی است.' });
          }
        } else {
          if (!section) {
            return res.status(400).json({ error: 'انتخاب منوی اصلی الزامی است.' });
          }
          if (!title || !hasRichBodyContent(body)) {
            return res.status(400).json({ error: 'تیتر و متن مطلب الزامی است.' });
          }
        }
      }

      const authorName =
        typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
      const authorAvatar =
        typeof req.body?.authorAvatar === 'string' ? req.body.authorAvatar.trim() : '';
      const sourceId =
        typeof req.body?.sourceId === 'number' && Number.isInteger(req.body.sourceId)
          ? req.body.sourceId
          : null;
      const sourceName =
        typeof req.body?.sourceName === 'string'
          ? normalizeSitePlainText(req.body.sourceName, true)
          : '';
      const rawSourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl.trim() : '';
      const sourceUrl = rawSourceUrl
        ? /^https?:\/\//i.test(rawSourceUrl)
          ? rawSourceUrl
          : `https://${rawSourceUrl}`
        : '';
      const contentOrigin =
        req.body?.contentOrigin === 'quoted' || req.body?.contentOrigin === 'original'
          ? req.body.contentOrigin
          : '';

      const attachments = attachmentsRaw
        .filter((item: unknown) => item && typeof item === 'object' && (item as { url?: unknown }).url)
        .map((item: { id?: unknown; name?: unknown; url?: unknown; size?: unknown; mimeType?: unknown }, idx: number) => ({
          id: String(item.id || `att-${Date.now()}-${idx}`),
          name: String(item.name || `فایل ضمیمه ${idx + 1}`),
          url: String(item.url),
          size: typeof item.size === 'number' ? item.size : undefined,
          mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
        }));

      const galleryImages = galleryRaw
        .filter((item: unknown) => item && typeof item === 'object' && (item as { url?: unknown }).url)
        .map((item: { id?: unknown; url?: unknown; caption?: unknown }, idx: number) => ({
          id: String(item.id || `gal-${Date.now()}-${idx}`),
          url: String(item.url),
          caption: typeof item.caption === 'string' ? item.caption : '',
        }));

      const videos = videosRaw
        .filter((item: unknown) => item && typeof item === 'object' && (item as { url?: unknown }).url)
        .map((item: { id?: unknown; url?: unknown; title?: unknown; mimeType?: unknown }, idx: number) => ({
          id: String(item.id || `vid-${Date.now()}-${idx}`),
          url: String(item.url),
          title: typeof item.title === 'string' ? item.title : '',
          mimeType: typeof item.mimeType === 'string' ? item.mimeType : 'video/mp4',
        }));

      const article = await createArticle({
        section,
        subsection,
        kicker,
        title,
        subtitle,
        lead,
        body,
        imageUrl,
        authorName,
        authorAvatar,
        sourceId,
        sourceName,
        sourceUrl,
        contentOrigin,
        articleType,
        status,
        isVideo: articleType === 'ویدیو' || articleType === 'ویدئو' || videos.length > 0,
        tags: tagsRaw.map((t: unknown) => String(t)).filter(Boolean),
        attachments,
        galleryImages,
        videos,
      });

      res.status(201).json({ article });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ثبت خبر';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/news/:id', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه مطلب نامعتبر است.' });
      }

      const kicker =
        typeof req.body?.kicker === 'string' ? normalizeSitePlainText(req.body.kicker, true) : '';
      const title =
        typeof req.body?.title === 'string' ? normalizeSitePlainText(req.body.title, true) : '';
      const subtitle =
        typeof req.body?.subtitle === 'string'
          ? normalizeSitePlainText(req.body.subtitle, true)
          : '';
      const lead =
        typeof req.body?.lead === 'string' ? normalizeSitePlainText(req.body.lead, false) : '';
      const rawBody = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      const body = sanitizeRichHtml(rawBody);
      const section = typeof req.body?.section === 'string' ? req.body.section.trim() : '';
      const subsection =
        typeof req.body?.subsection === 'string' ? req.body.subsection.trim() : '';
      const imageUrl =
        typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
      const tagsRaw = Array.isArray(req.body?.tags) ? req.body.tags : [];
      const attachmentsRaw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
      const galleryRaw = Array.isArray(req.body?.galleryImages) ? req.body.galleryImages : [];
      const videosRaw = Array.isArray(req.body?.videos) ? req.body.videos : [];
      const status: 'published' | 'draft' =
        req.body?.status === 'draft' ? 'draft' : 'published';

      const savedTypes = await getSettingJson<ArticleTypeOption[]>('article_types');
      const activeTypes =
        Array.isArray(savedTypes) && savedTypes.length > 0
          ? savedTypes
          : DEFAULT_ARTICLE_TYPES;
      const rawType =
        typeof req.body?.articleType === 'string' ? req.body.articleType.trim() : '';
      const matchedType =
        activeTypes.find((t) => t.name === rawType) ||
        activeTypes.find(
          (t) =>
            t.name.replace(/\s+/g, '') === rawType.replace(/\s+/g, '') && rawType.length > 0
        );
      const articleType = matchedType ? matchedType.name : '';
      const isBreaking = isBreakingArticleType(articleType);

      if (status === 'draft') {
        if (!title) {
          return res.status(400).json({ error: 'برای ذخیره پیش‌نویس، وارد کردن تیتر مطلب الزامی است.' });
        }
      } else {
        if (!articleType) {
          return res.status(400).json({ error: 'انتخاب نوع مطلب الزامی است.' });
        }
        if (isBreaking) {
          if (!title) {
            return res
              .status(400)
              .json({ error: 'برای انتشار خبر فوری، وارد کردن تیتر مطلب الزامی است.' });
          }
        } else {
          if (!section) {
            return res.status(400).json({ error: 'انتخاب منوی اصلی الزامی است.' });
          }
          if (!title || !hasRichBodyContent(body)) {
            return res.status(400).json({ error: 'تیتر و متن مطلب الزامی است.' });
          }
        }
      }

      const authorName =
        typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
      const sourceId =
        typeof req.body?.sourceId === 'number' && Number.isInteger(req.body.sourceId)
          ? req.body.sourceId
          : null;
      const sourceName =
        typeof req.body?.sourceName === 'string'
          ? normalizeSitePlainText(req.body.sourceName, true)
          : '';
      const rawSourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl.trim() : '';
      const sourceUrl = rawSourceUrl
        ? /^https?:\/\//i.test(rawSourceUrl)
          ? rawSourceUrl
          : `https://${rawSourceUrl}`
        : '';
      const contentOrigin =
        req.body?.contentOrigin === 'quoted' || req.body?.contentOrigin === 'original'
          ? req.body.contentOrigin
          : '';

      const attachments = attachmentsRaw
        .filter((item: unknown) => item && typeof item === 'object' && (item as { url?: unknown }).url)
        .map((item: { id?: unknown; name?: unknown; url?: unknown; size?: unknown; mimeType?: unknown }, idx: number) => ({
          id: String(item.id || `att-${Date.now()}-${idx}`),
          name: String(item.name || `فایل ضمیمه ${idx + 1}`),
          url: String(item.url),
          size: typeof item.size === 'number' ? item.size : undefined,
          mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
        }));

      const galleryImages = galleryRaw
        .filter((item: unknown) => item && typeof item === 'object' && (item as { url?: unknown }).url)
        .map((item: { id?: unknown; url?: unknown; caption?: unknown }, idx: number) => ({
          id: String(item.id || `gal-${Date.now()}-${idx}`),
          url: String(item.url),
          caption: typeof item.caption === 'string' ? item.caption : '',
        }));

      const videos = videosRaw
        .filter((item: unknown) => item && typeof item === 'object' && (item as { url?: unknown }).url)
        .map((item: { id?: unknown; url?: unknown; title?: unknown; mimeType?: unknown }, idx: number) => ({
          id: String(item.id || `vid-${Date.now()}-${idx}`),
          url: String(item.url),
          title: typeof item.title === 'string' ? item.title : '',
          mimeType: typeof item.mimeType === 'string' ? item.mimeType : 'video/mp4',
        }));

      const updated = await updateArticle(id, {
        section,
        subsection,
        kicker,
        title,
        subtitle,
        lead,
        body,
        imageUrl,
        authorName,
        sourceId,
        sourceName,
        sourceUrl,
        contentOrigin,
        articleType,
        status,
        isVideo: articleType === 'ویدیو' || articleType === 'ویدئو' || videos.length > 0,
        tags: tagsRaw.map((t: unknown) => String(t)).filter(Boolean),
        attachments,
        galleryImages,
        videos,
      });

      if (!updated) {
        return res.status(404).json({ error: 'مطلب مورد نظر یافت نشد.' });
      }

      res.json({ article: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ویرایش مطلب';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/news/:id', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه خبر نامعتبر است.' });
      }
      const deleted = await deleteArticle(id);
      if (!deleted) {
        return res.status(404).json({ error: 'خبر مورد نظر یافت نشد.' });
      }
      res.json({ deletedId: id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در حذف خبر';
      res.status(500).json({ error: message });
    }
  });

  // News Sources CRUD API
  const normalizeSourceUrlInput = (raw: unknown): string => {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  app.get('/api/sources', async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const sources = await listNewsSources(search);
      res.json({ sources });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در دریافت منابع خبری';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/sources', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const name =
        typeof req.body?.name === 'string' ? normalizeSitePlainText(req.body.name, true) : '';
      const url = normalizeSourceUrlInput(req.body?.url);
      const autoCreate = Boolean(req.body?.autoCreate);

      if (!name) {
        return res.status(400).json({ error: 'نام منبع خبری الزامی است.' });
      }

      if (autoCreate) {
        const result = await findOrCreateNewsSource(name, url);
        return res.status(result?.created ? 201 : 200).json({
          source: result?.source,
          created: Boolean(result?.created),
        });
      }

      const source = await createNewsSource({ name, url });
      res.status(201).json({ source, created: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ثبت منبع خبری';
      res.status(400).json({ error: message });
    }
  });

  app.put('/api/sources/:id', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه منبع نامعتبر است.' });
      }
      const name =
        typeof req.body?.name === 'string' ? normalizeSitePlainText(req.body.name, true) : '';
      const url = normalizeSourceUrlInput(req.body?.url);
      if (!name) {
        return res.status(400).json({ error: 'نام منبع خبری الزامی است.' });
      }
      const updated = await updateNewsSource(id, { name, url });
      if (!updated) {
        return res.status(404).json({ error: 'منبع خبری مورد نظر یافت نشد.' });
      }
      res.json({ source: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در ویرایش منبع خبری';
      res.status(400).json({ error: message });
    }
  });

  app.delete('/api/sources/:id', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'شناسه منبع نامعتبر است.' });
      }
      const deleted = await deleteNewsSource(id);
      if (!deleted) {
        return res.status(404).json({ error: 'منبع خبری مورد نظر یافت نشد.' });
      }
      res.json({ deletedId: id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'خطا در حذف منبع خبری';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Islam Times server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
