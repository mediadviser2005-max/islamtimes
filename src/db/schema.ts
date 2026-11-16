import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsSources = pgTable('news_sources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  url: text('url').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  language: text('language').notNull().default('fa'),
  section: text('section').notNull(),
  subsection: text('subsection').notNull(),
  kicker: text('kicker').notNull().default(''),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  lead: text('lead').notNull(),
  body: text('body').notNull(),
  imageUrl: text('image_url').notNull(),
  authorName: text('author_name').notNull(),
  authorAvatar: text('author_avatar').notNull(),
  sourceId: integer('source_id').references(() => newsSources.id, { onDelete: 'set null' }),
  sourceName: text('source_name').notNull().default('اسلام تایمز'),
  sourceUrl: text('source_url').notNull().default(''),
  contentOrigin: text('content_origin').notNull().default(''),
  articleType: text('article_type').notNull().default('خبر'),
  status: text('status').notNull().default('published'),
  publishedLabel: text('published_label').notNull(),
  tags: text('tags').notNull().default('[]'),
  attachments: text('attachments').notNull().default('[]'),
  galleryImages: text('gallery_images').notNull().default('[]'),
  videos: text('videos').notNull().default('[]'),
  isFeatured: boolean('is_featured').notNull().default(false),
  isHeroMain: boolean('is_hero_main').notNull().default(false),
  isVideo: boolean('is_video').notNull().default(false),
  videoDuration: text('video_duration'),
  views: integer('views').notNull().default(120),
  likes: integer('likes').notNull().default(5),
  createdAt: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .references(() => articles.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id').references(() => users.id),
  parentId: integer('parent_id'),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  showEmail: boolean('show_email').notNull().default(false),
  content: text('content').notNull(),
  likes: integer('likes').notNull().default(0),
  dislikes: integer('dislikes').notNull().default(0),
  publishedLabel: text('published_label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videoAnimations = pgTable('video_animations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),
  sourceImageUrl: text('source_image_url'),
  videoData: text('video_data').notNull(),
  mimeType: text('mime_type').notNull().default('video/mp4'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  language: text('language').notNull().default('fa'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  videoAnimations: many(videoAnimations),
}));

export const newsSourcesRelations = relations(newsSources, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  comments: many(comments),
  source: one(newsSources, {
    fields: [articles.sourceId],
    references: [newsSources.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const videoAnimationsRelations = relations(videoAnimations, ({ one }) => ({
  user: one(users, {
    fields: [videoAnimations.userId],
    references: [users.id],
  }),
}));
