import { asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  articles,
  comments,
  newsSources,
  newsletterSubscribers,
  siteSettings,
  videoAnimations,
} from './schema.ts';
import { ensureSeeded } from './seed.ts';

export interface ArticleFilters {
  section?: string;
  search?: string;
  language?: string;
  includeDrafts?: boolean;
  status?: 'published' | 'draft';
}

let sequentialCodesChecked = false;

async function ensureSequentialArticleCodes() {
  if (sequentialCodesChecked) return;
  try {
    const alreadyDone = await getSettingJson<boolean>('sequential_codes_v1');
    if (alreadyDone) {
      sequentialCodesChecked = true;
      return;
    }

    const allRows = await db
      .select({ id: articles.id, code: articles.code })
      .from(articles)
      .orderBy(asc(articles.id));

    if (allRows.length > 0) {
      const needsRenumber = allRows.some((row, idx) => row.code !== String(idx + 1));
      if (needsRenumber) {
        for (const row of allRows) {
          await db
            .update(articles)
            .set({ code: `tmp-seq-${row.id}` })
            .where(eq(articles.id, row.id));
        }
        for (let i = 0; i < allRows.length; i += 1) {
          await db
            .update(articles)
            .set({ code: String(i + 1) })
            .where(eq(articles.id, allRows[i].id));
        }
      }
    }

    await saveSettingJson('sequential_codes_v1', true);
    sequentialCodesChecked = true;
  } catch (error) {
    console.error('Failed to migrate sequential article codes:', error);
  }
}

async function getNextSequentialArticleCode(): Promise<string> {
  const rows = await db.select({ code: articles.code }).from(articles);
  let maxCode = 0;
  for (const row of rows) {
    const trimmed = (row.code || '').trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number.parseInt(trimmed, 10);
      if (Number.isFinite(n) && n > maxCode) {
        maxCode = n;
      }
    }
  }
  return String(maxCode + 1);
}

export async function listArticles(filters: ArticleFilters = {}) {
  try {
    await ensureSeeded();
    await ensureSequentialArticleCodes();

    const lang = filters.language || 'fa';
    const [all, allSources] = await Promise.all([
      db
        .select()
        .from(articles)
        .where(eq(articles.language, lang))
        .orderBy(desc(articles.id)),
      db.select().from(newsSources),
    ]);
    const sourceUrlById = new Map(allSources.map((s) => [s.id, s.url || '']));

    return all
      .filter((item) => {
        const itemStatus = item.status === 'draft' ? 'draft' : 'published';
        if (filters.status) {
          if (itemStatus !== filters.status) return false;
        } else if (!filters.includeDrafts && itemStatus === 'draft') {
          return false;
        }
        if (filters.section && filters.section !== 'home' && filters.section !== 'all') {
          if (item.section !== filters.section) {
            return false;
          }
        }
        if (filters.search && filters.search.trim().length > 0) {
          const q = filters.search.trim().toLowerCase();
          const hay = `${item.code || ''} ${item.kicker || ''} ${item.title} ${item.subtitle || ''} ${item.lead} ${item.body} ${item.subsection} ${item.tags}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((item) => ({
        ...item,
        status: (item.status === 'draft' ? 'draft' : 'published') as 'published' | 'draft',
        sourceUrl:
          item.sourceUrl ||
          (item.sourceId ? sourceUrlById.get(item.sourceId) || '' : ''),
      }));
  } catch (error) {
    console.error('Database query failed in listArticles:', error);
    throw new Error('خطا در دریافت فهرست اخبار از پایگاه داده.', { cause: error });
  }
}

export async function getArticleById(
  id: number,
  options: { allowDraft?: boolean } = {}
) {
  try {
    await ensureSeeded();
    await ensureSequentialArticleCodes();
    const rows = await db.select().from(articles).where(eq(articles.id, id));
    if (!rows.length) return null;

    const initialStatus = rows[0].status === 'draft' ? 'draft' : 'published';
    if (initialStatus === 'draft' && !options.allowDraft) {
      return null;
    }

    let article = rows[0];
    if (initialStatus !== 'draft') {
      await db
        .update(articles)
        .set({ views: sql`${articles.views} + 1` })
        .where(eq(articles.id, id));

      const updated = await db.select().from(articles).where(eq(articles.id, id));
      article = updated[0] || rows[0];
    }

    let resolvedSourceUrl = article.sourceUrl || '';
    if (!resolvedSourceUrl && article.sourceId) {
      const srcRows = await db
        .select()
        .from(newsSources)
        .where(eq(newsSources.id, article.sourceId))
        .limit(1);
      if (srcRows[0]?.url) {
        resolvedSourceUrl = srcRows[0].url;
      }
    }
    return {
      ...article,
      status: (article.status === 'draft' ? 'draft' : 'published') as 'published' | 'draft',
      sourceUrl: resolvedSourceUrl,
    };
  } catch (error) {
    console.error('Database query failed in getArticleById:', error);
    throw new Error('خطا در دریافت جزئیات خبر.', { cause: error });
  }
}

export async function createArticle(input: {
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
  sourceName?: string;
  sourceUrl?: string;
  contentOrigin?: string;
  articleType?: string;
  status?: 'published' | 'draft';
  tags: string[];
  attachments?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string }>;
  galleryImages?: Array<{ id: string; url: string; caption?: string }>;
  videos?: Array<{ id: string; url: string; title?: string; mimeType?: string }>;
  isVideo?: boolean;
}) {
  try {
    await ensureSeeded();
    await ensureSequentialArticleCodes();
    const code = await getNextSequentialArticleCode();
    const nowLabel = 'پنجشنبه ۱۴ فروردین ۱۴۰۵ ساعت ۲۲:۳۰';
    const resolvedKicker = typeof input.kicker === 'string' ? input.kicker.trim() : '';
    const resolvedSubtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
    const resolvedType = typeof input.articleType === 'string' ? input.articleType.trim() : '';
    const resolvedStatus: 'published' | 'draft' =
      input.status === 'draft' ? 'draft' : 'published';
    const resolvedOrigin =
      input.contentOrigin === 'quoted' || input.contentOrigin === 'original'
        ? input.contentOrigin
        : '';

    let resolvedSourceName = typeof input.sourceName === 'string' ? input.sourceName.trim() : '';
    let resolvedSourceUrl = typeof input.sourceUrl === 'string' ? input.sourceUrl.trim() : '';
    let resolvedSourceId: number | null =
      typeof input.sourceId === 'number' && Number.isInteger(input.sourceId) && input.sourceId > 0
        ? input.sourceId
        : null;

    if (resolvedOrigin === 'original') {
      resolvedSourceId = null;
      resolvedSourceName = '';
      resolvedSourceUrl = '';
    } else if (resolvedSourceName) {
      const ensured = await findOrCreateNewsSource(resolvedSourceName, resolvedSourceUrl);
      if (ensured?.source) {
        resolvedSourceId = ensured.source.id;
        resolvedSourceName = ensured.source.name;
        resolvedSourceUrl = ensured.source.url || resolvedSourceUrl;
      }
    } else if (resolvedSourceId) {
      const rows = await db.select().from(newsSources).where(eq(newsSources.id, resolvedSourceId));
      if (rows.length > 0) {
        resolvedSourceName = rows[0].name;
        if (resolvedSourceUrl && rows[0].url !== resolvedSourceUrl) {
          await db
            .update(newsSources)
            .set({ url: resolvedSourceUrl })
            .where(eq(newsSources.id, resolvedSourceId));
        } else {
          resolvedSourceUrl = rows[0].url || '';
        }
      } else {
        resolvedSourceId = null;
      }
    }

    const cleanAttachments = Array.isArray(input.attachments) ? input.attachments : [];
    const cleanGallery = Array.isArray(input.galleryImages) ? input.galleryImages : [];
    const cleanVideos = Array.isArray(input.videos) ? input.videos : [];

    const inserted = await db
      .insert(articles)
      .values({
        code,
        language: 'fa',
        section: input.section,
        subsection: input.subsection,
        kicker: resolvedKicker,
        title: input.title,
        subtitle: resolvedSubtitle,
        lead: input.lead,
        body: input.body,
        imageUrl: input.imageUrl,
        authorName: input.authorName,
        authorAvatar: input.authorAvatar,
        sourceId: resolvedSourceId,
        sourceName: resolvedSourceName,
        sourceUrl: resolvedSourceUrl,
        contentOrigin: resolvedOrigin,
        articleType: resolvedType,
        status: resolvedStatus,
        publishedLabel: nowLabel,
        tags: JSON.stringify(input.tags),
        attachments: JSON.stringify(cleanAttachments),
        galleryImages: JSON.stringify(cleanGallery),
        videos: JSON.stringify(cleanVideos),
        isFeatured: resolvedStatus === 'published',
        isHeroMain: false,
        isVideo:
          input.isVideo !== undefined
            ? Boolean(input.isVideo)
            : resolvedType === 'ویدیو' || resolvedType === 'ویدئو' || cleanVideos.length > 0,
        views: 1,
        likes: 0,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database insert failed in createArticle:', error);
    throw new Error('خطا در انتشار خبر جدید.', { cause: error });
  }
}

export async function updateArticle(
  id: number,
  input: {
    section: string;
    subsection: string;
    kicker?: string;
    title: string;
    subtitle?: string;
    lead: string;
    body: string;
    imageUrl: string;
    authorName: string;
    sourceId?: number | null;
    sourceName?: string;
    sourceUrl?: string;
    contentOrigin?: string;
    articleType?: string;
    status?: 'published' | 'draft';
    tags: string[];
    attachments?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string }>;
    galleryImages?: Array<{ id: string; url: string; caption?: string }>;
    videos?: Array<{ id: string; url: string; title?: string; mimeType?: string }>;
    isVideo?: boolean;
  }
) {
  try {
    const resolvedKicker = typeof input.kicker === 'string' ? input.kicker.trim() : '';
    const resolvedSubtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
    const resolvedType = typeof input.articleType === 'string' ? input.articleType.trim() : '';
    const resolvedStatus: 'published' | 'draft' =
      input.status === 'draft' ? 'draft' : 'published';
    const resolvedOrigin =
      input.contentOrigin === 'quoted' || input.contentOrigin === 'original'
        ? input.contentOrigin
        : '';
    let resolvedSourceName = typeof input.sourceName === 'string' ? input.sourceName.trim() : '';
    let resolvedSourceUrl = typeof input.sourceUrl === 'string' ? input.sourceUrl.trim() : '';
    let resolvedSourceId: number | null =
      typeof input.sourceId === 'number' && Number.isInteger(input.sourceId) && input.sourceId > 0
        ? input.sourceId
        : null;

    if (resolvedOrigin === 'original') {
      resolvedSourceId = null;
      resolvedSourceName = '';
      resolvedSourceUrl = '';
    } else if (resolvedSourceName) {
      const ensured = await findOrCreateNewsSource(resolvedSourceName, resolvedSourceUrl);
      if (ensured?.source) {
        resolvedSourceId = ensured.source.id;
        resolvedSourceName = ensured.source.name;
        resolvedSourceUrl = ensured.source.url || resolvedSourceUrl;
      }
    } else if (resolvedSourceId) {
      const rows = await db.select().from(newsSources).where(eq(newsSources.id, resolvedSourceId));
      if (rows.length > 0) {
        resolvedSourceName = rows[0].name;
        if (resolvedSourceUrl && rows[0].url !== resolvedSourceUrl) {
          await db
            .update(newsSources)
            .set({ url: resolvedSourceUrl })
            .where(eq(newsSources.id, resolvedSourceId));
        } else {
          resolvedSourceUrl = rows[0].url || '';
        }
      } else {
        resolvedSourceId = null;
      }
    }

    const cleanAttachments = Array.isArray(input.attachments) ? input.attachments : [];
    const cleanGallery = Array.isArray(input.galleryImages) ? input.galleryImages : [];
    const cleanVideos = Array.isArray(input.videos) ? input.videos : [];

    const updated = await db
      .update(articles)
      .set({
        section: input.section,
        subsection: input.subsection,
        kicker: resolvedKicker,
        title: input.title,
        subtitle: resolvedSubtitle,
        lead: input.lead,
        body: input.body,
        imageUrl: input.imageUrl,
        authorName: input.authorName,
        sourceId: resolvedSourceId,
        sourceName: resolvedSourceName,
        sourceUrl: resolvedSourceUrl,
        contentOrigin: resolvedOrigin,
        articleType: resolvedType,
        status: resolvedStatus,
        isFeatured: resolvedStatus === 'published',
        tags: JSON.stringify(input.tags),
        attachments: JSON.stringify(cleanAttachments),
        galleryImages: JSON.stringify(cleanGallery),
        videos: JSON.stringify(cleanVideos),
        isVideo:
          input.isVideo !== undefined
            ? Boolean(input.isVideo)
            : resolvedType === 'ویدیو' || resolvedType === 'ویدئو' || cleanVideos.length > 0,
      })
      .where(eq(articles.id, id))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('Database update failed in updateArticle:', error);
    throw new Error('خطا در ویرایش مطلب.', { cause: error });
  }
}

export async function likeArticle(id: number) {
  try {
    const updated = await db
      .update(articles)
      .set({ likes: sql`${articles.likes} + 1` })
      .where(eq(articles.id, id))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database update failed in likeArticle:', error);
    throw new Error('خطا در ثبت واکنش به خبر.', { cause: error });
  }
}

export async function listCommentsForArticle(articleId: number) {
  try {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.articleId, articleId))
      .orderBy(desc(comments.id));
  } catch (error) {
    console.error('Database query failed in listCommentsForArticle:', error);
    throw new Error('خطا در دریافت نظرات خبر.', { cause: error });
  }
}

export async function createComment(input: {
  articleId: number;
  userId: number;
  parentId?: number | null;
  authorName: string;
  authorEmail: string;
  showEmail: boolean;
  content: string;
}) {
  try {
    const inserted = await db
      .insert(comments)
      .values({
        articleId: input.articleId,
        userId: input.userId,
        parentId: input.parentId ?? null,
        authorName: input.authorName,
        authorEmail: input.authorEmail,
        showEmail: input.showEmail,
        content: input.content,
        likes: 0,
        dislikes: 0,
        publishedLabel: 'پنجشنبه ۱۴ فروردین ۱۴۰۵',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database insert failed in createComment:', error);
    throw new Error('خطا در ثبت نظر در پایگاه داده.', { cause: error });
  }
}

export async function voteComment(commentId: number, type: 'like' | 'dislike') {
  try {
    const updated = await db
      .update(comments)
      .set(
        type === 'like'
          ? { likes: sql`${comments.likes} + 1` }
          : { dislikes: sql`${comments.dislikes} + 1` }
      )
      .where(eq(comments.id, commentId))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database update failed in voteComment:', error);
    throw new Error('خطا در ثبت رأی نظر.', { cause: error });
  }
}

export async function subscribeNewsletter(email: string, language = 'fa') {
  try {
    const inserted = await db
      .insert(newsletterSubscribers)
      .values({ email, language })
      .onConflictDoNothing()
      .returning();
    return inserted[0] || { email, language, alreadySubscribed: true };
  } catch (error) {
    console.error('Database insert failed in subscribeNewsletter:', error);
    throw new Error('خطا در ثبت ایمیل خبرنامه.', { cause: error });
  }
}

export async function saveVideoAnimation(input: {
  userId: number;
  title: string;
  prompt: string;
  aspectRatio: string;
  sourceImageUrl?: string | null;
  videoData: string;
  mimeType: string;
}) {
  try {
    const inserted = await db
      .insert(videoAnimations)
      .values({
        userId: input.userId,
        title: input.title,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        sourceImageUrl: input.sourceImageUrl || null,
        videoData: input.videoData,
        mimeType: input.mimeType,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database insert failed in saveVideoAnimation:', error);
    throw new Error('خطا در ذخیره ویدئوی تولیدشده در پایگاه داده.', { cause: error });
  }
}

export async function listUserVideos(userId: number) {
  try {
    return await db
      .select()
      .from(videoAnimations)
      .where(eq(videoAnimations.userId, userId))
      .orderBy(desc(videoAnimations.id));
  } catch (error) {
    console.error('Database query failed in listUserVideos:', error);
    throw new Error('خطا در دریافت آرشیو ویدئوهای کاربر.', { cause: error });
  }
}

export async function listVideos() {
  try {
    return await db
      .select()
      .from(videoAnimations)
      .orderBy(desc(videoAnimations.id));
  } catch (error) {
    console.error('Database query failed in listVideos:', error);
    throw new Error('خطا در دریافت آرشیو ویدئوها.', { cause: error });
  }
}

export async function searchArticlesSql(query: string) {
  try {
    await ensureSeeded();
    await ensureSequentialArticleCodes();
    const q = `%${query.trim()}%`;
    const rows = await db
      .select()
      .from(articles)
      .where(
        or(
          ilike(articles.code, q),
          ilike(articles.kicker, q),
          ilike(articles.title, q),
          ilike(articles.subtitle, q),
          ilike(articles.lead, q),
          ilike(articles.subsection, q)
        )
      )
      .orderBy(desc(articles.id));
    return rows.filter((item) => item.status !== 'draft');
  } catch (error) {
    console.error('Database query failed in searchArticlesSql:', error);
    throw new Error('خطا در جستجوی اخبار.', { cause: error });
  }
}

export async function deleteArticle(id: number) {
  try {
    const deleted = await db
      .delete(articles)
      .where(eq(articles.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database delete failed in deleteArticle:', error);
    throw new Error('خطا در حذف خبر.', { cause: error });
  }
}

export async function getSettingJson<T>(key: string): Promise<T | null> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key));
    if (!rows.length) return null;
    return JSON.parse(rows[0].value) as T;
  } catch (error) {
    console.error(`Database query failed in getSettingJson(${key}):`, error);
    return null;
  }
}

export async function saveSettingJson<T>(key: string, data: T): Promise<T> {
  try {
    const serialized = JSON.stringify(data);
    await db
      .insert(siteSettings)
      .values({ key, value: serialized, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: serialized, updatedAt: new Date() },
      });
    return data;
  } catch (error) {
    console.error(`Database save failed in saveSettingJson(${key}):`, error);
    throw new Error('خطا در ذخیره تنظیمات سایت در پایگاه داده.', { cause: error });
  }
}

export async function listAllComments() {
  try {
    return await db
      .select()
      .from(comments)
      .orderBy(desc(comments.id));
  } catch (error) {
    console.error('Database query failed in listAllComments:', error);
    return [];
  }
}

export async function renameArticleTypeInArticles(oldName: string, newName: string) {
  try {
    await db
      .update(articles)
      .set({ articleType: newName })
      .where(eq(articles.articleType, oldName));
  } catch (error) {
    console.error('Database update failed in renameArticleTypeInArticles:', error);
  }
}

let sourcesInitializedCheck = false;

async function ensureSourcesInitialized() {
  if (sourcesInitializedCheck) return;
  try {
    const initializedFlag = await getSettingJson<boolean>('sources_initialized');
    if (initializedFlag) {
      sourcesInitializedCheck = true;
      return;
    }

    const existingSources = await db.select().from(newsSources).limit(1);
    if (existingSources.length === 0) {
      const distinctRows = await db
        .selectDistinct({ sourceName: articles.sourceName })
        .from(articles);

      const seenNames = new Set<string>();
      for (const row of distinctRows) {
        const cleanName = (row.sourceName || '').trim();
        if (!cleanName || seenNames.has(cleanName.toLowerCase())) continue;
        seenNames.add(cleanName.toLowerCase());
        const defaultUrl = cleanName === 'اسلام تایمز' ? 'https://islamtimes.org' : '';
        await db
          .insert(newsSources)
          .values({ name: cleanName, url: defaultUrl })
          .onConflictDoNothing();
      }
    }

    await saveSettingJson('sources_initialized', true);
    sourcesInitializedCheck = true;
  } catch (error) {
    console.error('Failed to initialize news sources:', error);
  }
}

export async function listNewsSources(search?: string) {
  try {
    await ensureSourcesInitialized();
    const trimmed = typeof search === 'string' ? search.trim() : '';
    if (trimmed) {
      const q = `%${trimmed}%`;
      return await db
        .select()
        .from(newsSources)
        .where(or(ilike(newsSources.name, q), ilike(newsSources.url, q)))
        .orderBy(asc(newsSources.name), desc(newsSources.id));
    }
    return await db
      .select()
      .from(newsSources)
      .orderBy(desc(newsSources.id));
  } catch (error) {
    console.error('Database query failed in listNewsSources:', error);
    throw new Error('خطا در دریافت فهرست منابع خبری از پایگاه داده.', { cause: error });
  }
}

export async function findOrCreateNewsSource(name: string, url = '') {
  const cleanName = name.trim();
  const cleanUrl = url.trim();
  if (!cleanName) return null;

  try {
    const existing = await db
      .select()
      .from(newsSources)
      .where(ilike(newsSources.name, cleanName))
      .limit(1);

    if (existing.length > 0) {
      if (cleanUrl && existing[0].url !== cleanUrl) {
        const updatedExisting = await db
          .update(newsSources)
          .set({ url: cleanUrl })
          .where(eq(newsSources.id, existing[0].id))
          .returning();
        await db
          .update(articles)
          .set({ sourceUrl: cleanUrl })
          .where(eq(articles.sourceId, existing[0].id));
        return { source: updatedExisting[0] || existing[0], created: false };
      }
      return { source: existing[0], created: false };
    }

    const inserted = await db
      .insert(newsSources)
      .values({ name: cleanName, url: cleanUrl })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      return { source: inserted[0], created: true };
    }

    const fallback = await db
      .select()
      .from(newsSources)
      .where(ilike(newsSources.name, cleanName))
      .limit(1);
    return fallback[0] ? { source: fallback[0], created: false } : null;
  } catch (error) {
    console.error('Database error in findOrCreateNewsSource:', error);
    throw new Error('خطا در ثبت یا بازیابی منبع خبر.', { cause: error });
  }
}

export async function createNewsSource(input: { name: string; url?: string }) {
  const cleanName = input.name.trim();
  const cleanUrl = (input.url || '').trim();
  if (!cleanName) {
    throw new Error('نام منبع خبری الزامی است.');
  }

  const existing = await db
    .select()
    .from(newsSources)
    .where(ilike(newsSources.name, cleanName))
    .limit(1);
  if (existing.length > 0) {
    throw new Error('منبع خبری با این نام قبلاً ثبت شده است.');
  }

  const inserted = await db
    .insert(newsSources)
    .values({ name: cleanName, url: cleanUrl })
    .returning();
  return inserted[0];
}

export async function updateNewsSource(id: number, input: { name: string; url?: string }) {
  const cleanName = input.name.trim();
  const cleanUrl = (input.url || '').trim();
  if (!cleanName) {
    throw new Error('نام منبع خبری الزامی است.');
  }

  const existingById = await db
    .select()
    .from(newsSources)
    .where(eq(newsSources.id, id))
    .limit(1);
  if (!existingById.length) {
    return null;
  }

  const conflict = await db
    .select()
    .from(newsSources)
    .where(ilike(newsSources.name, cleanName))
    .limit(1);
  if (conflict.length > 0 && conflict[0].id !== id) {
    throw new Error('منبع خبری دیگری با این نام وجود دارد.');
  }

  const updated = await db
    .update(newsSources)
    .set({ name: cleanName, url: cleanUrl })
    .where(eq(newsSources.id, id))
    .returning();

  if (
    updated[0] &&
    (existingById[0].name !== cleanName || (existingById[0].url || '') !== cleanUrl)
  ) {
    await db
      .update(articles)
      .set({ sourceName: cleanName, sourceUrl: cleanUrl })
      .where(eq(articles.sourceId, id));
  }

  return updated[0] || null;
}

export async function deleteNewsSource(id: number) {
  try {
    const deleted = await db
      .delete(newsSources)
      .where(eq(newsSources.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database delete failed in deleteNewsSource:', error);
    throw new Error('خطا در حذف منبع خبری.', { cause: error });
  }
}

export async function listAllArticlesMediaReferences() {
  try {
    await ensureSeeded();
    return await db
      .select({
        id: articles.id,
        code: articles.code,
        title: articles.title,
        status: articles.status,
        imageUrl: articles.imageUrl,
        body: articles.body,
        galleryImages: articles.galleryImages,
        videos: articles.videos,
        attachments: articles.attachments,
      })
      .from(articles);
  } catch (error) {
    console.error('Database query failed in listAllArticlesMediaReferences:', error);
    throw new Error('خطا در بررسی وضعیت استفاده فایل‌ها.', { cause: error });
  }
}
