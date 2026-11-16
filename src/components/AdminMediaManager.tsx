/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import {
  AdminMediaItem,
  AdminMediaSummary,
  toPersianDigits,
} from '../types/news';

interface AdminMediaManagerProps {
  tabLabel: string;
  tabDescription?: string;
  isEditingHeader: boolean;
  headerLabelDraft: string;
  headerDescDraft: string;
  savingHeader: boolean;
  onStartEditHeader: () => void;
  onHeaderLabelChange: (val: string) => void;
  onHeaderDescChange: (val: string) => void;
  onSaveHeader: () => void;
  onCancelEditHeader: () => void;
  getAdminToken: () => string | null;
  onCountChange?: (totalCount: number) => void;
}

const EMPTY_SUMMARY: AdminMediaSummary = {
  totalCount: 0,
  totalBytes: 0,
  imageCount: 0,
  videoCount: 0,
  attachmentCount: 0,
  unusedCount: 0,
  unusedBytes: 0,
};

export function AdminMediaManager({
  tabLabel,
  tabDescription,
  isEditingHeader,
  headerLabelDraft,
  headerDescDraft,
  savingHeader,
  onStartEditHeader,
  onHeaderLabelChange,
  onHeaderDescChange,
  onSaveHeader,
  onCancelEditHeader,
  getAdminToken,
  onCountChange,
}: AdminMediaManagerProps) {
  const [files, setFiles] = useState<AdminMediaItem[]>([]);
  const [summary, setSummary] = useState<AdminMediaSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'attachment'>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'largest'>('newest');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    mode: 'single' | 'selected' | 'all-unused';
    items: Array<{ folder: string; filename: string }>;
    hasUsedItems: boolean;
    label: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '۰ بایت';
    if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
    return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(2))} مگابایت`;
  };

  const formatPersianDate = (ms: number) => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ms));
    } catch {
      return '';
    }
  };

  const formatAgeLabel = (ms: number) => {
    const diffDays = Math.floor((Date.now() - ms) / 86400000);
    if (diffDays <= 0) return 'امروز';
    if (diffDays === 1) return 'دیروز';
    if (diffDays < 30) return `${toPersianDigits(diffDays)} روز پیش`;
    const months = Math.floor(diffDays / 30);
    return `${toPersianDigits(months)} ماه پیش`;
  };

  const loadMedia = useCallback(async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در دریافت لیست فایل‌ها');
      }
      const nextFiles = Array.isArray(data.files) ? (data.files as AdminMediaItem[]) : [];
      const nextSummary = (data.summary as AdminMediaSummary) || EMPTY_SUMMARY;
      setFiles(nextFiles);
      setSummary(nextSummary);
      setSelectedIds((prev) => prev.filter((id) => nextFiles.some((f) => f.id === id)));
      if (onCountChange) {
        onCountChange(nextSummary.totalCount);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'دریافت فایل‌ها ناموفق بود.',
      });
    } finally {
      setLoading(false);
    }
  }, [getAdminToken, onCountChange]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = files.filter((item) => {
      if (typeFilter !== 'all' && item.mediaType !== typeFilter) return false;
      if (usageFilter === 'unused' && item.isUsed) return false;
      if (usageFilter === 'used' && !item.isUsed) return false;

      if (!q) return true;
      const usedText = item.usedBy.map((u) => `${u.code} ${u.title}`).join(' ');
      const hay = `${item.filename} ${item.folder} ${item.variantLabel || ''} ${item.url} ${usedText}`.toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...list];
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => a.modifiedAt - b.modifiedAt);
    } else if (sortBy === 'largest') {
      sorted.sort((a, b) => b.size - a.size);
    } else {
      sorted.sort((a, b) => b.modifiedAt - a.modifiedAt);
    }
    return sorted;
  }, [files, searchQuery, typeFilter, usageFilter, sortBy]);

  const executeDelete = async (
    items: Array<{ folder: string; filename: string }>,
    force: boolean
  ) => {
    const token = getAdminToken();
    if (!token || items.length === 0) return;

    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'حذف فایل‌ها ناموفق بود.');
      }
      const nextFiles = Array.isArray(data.files) ? (data.files as AdminMediaItem[]) : [];
      const nextSummary = (data.summary as AdminMediaSummary) || EMPTY_SUMMARY;
      setFiles(nextFiles);
      setSummary(nextSummary);
      setSelectedIds([]);
      setConfirmAction(null);
      if (onCountChange) {
        onCountChange(nextSummary.totalCount);
      }

      const deletedCount = Array.isArray(data.deletedIds) ? data.deletedIds.length : 0;
      const freed = typeof data.freedBytes === 'number' ? data.freedBytes : 0;
      setFeedback({
        type: 'success',
        text:
          deletedCount > 0
            ? `${toPersianDigits(deletedCount)} فایل با موفقیت حذف شد و ${formatFileSize(freed)} فضا آزاد گردید.`
            : 'فایلی برای حذف وجود نداشت.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'حذف فایل‌ها با خطا مواجه شد.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredFiles.map((f) => f.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectAllUnused = () => {
    const unusedIds = files.filter((f) => !f.isUsed).map((f) => f.id);
    setSelectedIds(unusedIds);
  };

  const handleCopyUrl = async (file: AdminMediaItem) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${file.url}`);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId((curr) => (curr === file.id ? null : curr)), 1800);
    } catch {
      // clipboard unavailable
    }
  };

  const openDeleteConfirmForSelected = () => {
    const selectedFiles = files.filter((f) => selectedIds.includes(f.id));
    if (selectedFiles.length === 0) return;
    setConfirmAction({
      mode: 'selected',
      items: selectedFiles.map((f) => ({ folder: f.folder, filename: f.filename })),
      hasUsedItems: selectedFiles.some((f) => f.isUsed),
      label: `${toPersianDigits(selectedFiles.length)} فایل انتخاب‌شده`,
    });
  };

  const openDeleteConfirmForAllUnused = () => {
    const unusedFiles = files.filter((f) => !f.isUsed);
    if (unusedFiles.length === 0) return;
    setConfirmAction({
      mode: 'all-unused',
      items: unusedFiles.map((f) => ({ folder: f.folder, filename: f.filename })),
      hasUsedItems: false,
      label: `همه ${toPersianDigits(unusedFiles.length)} فایل بدون استفاده (${formatFileSize(summary.unusedBytes)})`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px]">
          {isEditingHeader ? (
            <div className="space-y-2 max-w-xl">
              <input
                type="text"
                value={headerLabelDraft}
                onChange={(e) => onHeaderLabelChange(e.target.value)}
                placeholder="نام منو..."
                className="w-full rounded border border-[#0b5e85] px-2.5 py-1 text-sm font-bold text-neutral-900"
              />
              <input
                type="text"
                value={headerDescDraft}
                onChange={(e) => onHeaderDescChange(e.target.value)}
                placeholder="متن توضیحی زیر منو..."
                className="w-full rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={savingHeader}
                  onClick={onSaveHeader}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  ذخیره
                </button>
                <button
                  type="button"
                  onClick={onCancelEditHeader}
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
                <h2 className="text-sm font-bold text-neutral-900">{tabLabel}</h2>
                <button
                  type="button"
                  onClick={onStartEditHeader}
                  title="ویرایش عنوان و متن توضیحی"
                  className="p-1 rounded text-neutral-400 hover:text-[#0b5e85] hover:bg-sky-50 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              {tabDescription && (
                <p className="text-neutral-500 text-xs mt-0.5">{tabDescription}</p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadMedia}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی لیست</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-neutral-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-neutral-500 font-medium">کل فایل‌ها و فضای اشغالی</p>
            <h3 className="text-base font-extrabold text-[#0b5e85] mt-1 tabular-nums">
              {toPersianDigits(summary.totalCount)} فایل
            </h3>
            <p className="text-[11px] text-neutral-600 mt-0.5 tabular-nums">
              حجم کل: {formatFileSize(summary.totalBytes)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#0b5e85]/10 text-[#0b5e85] flex items-center justify-center">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-neutral-500 font-medium">عکس‌های آپلودشده</p>
            <h3 className="text-base font-extrabold text-emerald-700 mt-1 tabular-nums">
              {toPersianDigits(summary.imageCount)} عکس
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">تصاویر اصلی و گالری</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-neutral-500 font-medium">ویدیوها و ضمیمه‌ها</p>
            <h3 className="text-base font-extrabold text-[#d41a24] mt-1 tabular-nums">
              {toPersianDigits(summary.videoCount)} ویدیو
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 tabular-nums">
              {toPersianDigits(summary.attachmentCount)} فایل ضمیمه
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-rose-100 text-[#d41a24] flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-800 font-medium">فایل‌های بدون استفاده</p>
            <h3 className="text-base font-extrabold text-amber-700 mt-1 tabular-nums">
              {toPersianDigits(summary.unusedCount)} فایل
            </h3>
            <p className="text-[11px] text-amber-700/90 mt-0.5 tabular-nums">
              قابل پاک‌سازی: {formatFileSize(summary.unusedBytes)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <FolderOpen className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-[#d41a24]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-0.5 hover:opacity-70 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Confirm Deletion Banner */}
      {confirmAction && (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-rose-950">
            <AlertTriangle className="w-5 h-5 text-[#d41a24] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                آیا از حذف دائمی {confirmAction.label} اطمینان دارید؟
              </p>
              {confirmAction.hasUsedItems && (
                <p className="text-[11px] text-[#d41a24] font-semibold mt-0.5">
                  هشدار: برخی از فایل‌های انتخاب‌شده هم‌اکنون در اخبار یا پیشنویس‌ها استفاده می‌شوند و حذف آن‌ها باعث نمایش نیافتن تصویر/ویدیو در آن مطالب می‌شود.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmAction(null)}
              className="px-3 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => executeDelete(confirmAction.items, confirmAction.hasUsedItems)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>تأیید و حذف دائمی</span>
            </button>
          </div>
        </div>
      )}

      {/* Search, Filter & Bulk Actions Bar */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس نام فایل، نوع، کد خبر یا عنوان مطلب..."
              className="w-full rounded border border-neutral-300 bg-white pr-9 pl-8 py-1.5 text-xs focus:outline-none focus:border-[#0b5e85]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                title="پاک کردن جست‌وجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {(
              [
                { id: 'all', label: 'همه' },
                { id: 'image', label: 'عکس‌ها' },
                { id: 'video', label: 'ویدیوها' },
                { id: 'attachment', label: 'ضمیمه‌ها' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeFilter(opt.id)}
                className={`px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                  typeFilter === opt.id
                    ? 'bg-[#0b5e85] text-white'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex flex-wrap items-center gap-2 text-xs">
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value as 'all' | 'unused' | 'used')}
              className="flex-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="unused">فقط بدون استفاده</option>
              <option value="used">فقط در حال استفاده</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'largest')}
              className="flex-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold"
            >
              <option value="newest">جدیدترین ابتدا</option>
              <option value="oldest">قدیمی‌ترین ابتدا</option>
              <option value="largest">حجم زیاد به کم</option>
            </select>
          </div>
        </div>

        {/* Selection & Cleanup Actions */}
        <div className="pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={filteredFiles.length === 0}
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-1 rounded border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-semibold cursor-pointer disabled:opacity-40"
            >
              {filteredFiles.length > 0 && filteredFiles.every((f) => selectedIds.includes(f.id))
                ? 'لغو انتخاب همه موارد'
                : `انتخاب همه (${toPersianDigits(filteredFiles.length)})`}
            </button>
            {summary.unusedCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllUnused}
                className="px-2.5 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold cursor-pointer"
              >
                انتخاب موارد بدون استفاده ({toPersianDigits(summary.unusedCount)})
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                لغو انتخاب ({toPersianDigits(selectedIds.length)})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                disabled={deleting}
                onClick={openDeleteConfirmForSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#d41a24] hover:bg-[#b5141d] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف انتخاب‌شده‌ها ({toPersianDigits(selectedIds.length)})</span>
              </button>
            )}
            {summary.unusedCount > 0 && (
              <button
                type="button"
                disabled={deleting}
                onClick={openDeleteConfirmForAllUnused}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاک‌سازی همه بدون استفاده‌ها</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {loading && files.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-10 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#0b5e85]" />
          <span>در حال بارگذاری لیست فایل‌ها و رسانه‌ها...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-neutral-300 p-10 text-center text-xs text-neutral-500 space-y-1.5">
          <FolderOpen className="w-8 h-8 mx-auto text-neutral-300" />
          <p className="font-semibold text-neutral-700">
            {files.length === 0
              ? 'هنوز هیچ عکس، ویدیو یا فایلی در سیستم آپلود نشده است.'
              : 'فایلی مطابق جست‌وجو یا فیلتر انتخاب‌شده یافت نشد.'}
          </p>
          <p className="text-[11px] text-neutral-400">
            {files.length === 0
              ? 'تصاویر، ویدیوها و ضمیمه‌هایی که در فرم انتشار مطلب بارگذاری می‌شوند به‌طور خودکار در اینجا لیست می‌شوند.'
              : 'عبارت جست‌وجو یا فیلتر وضعیت/نوع فایل را تغییر دهید.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const isSelected = selectedIds.includes(file.id);
            return (
              <div
                key={file.id}
                className={`bg-white rounded-lg border overflow-hidden shadow-xs flex flex-col transition-colors ${
                  isSelected
                    ? 'border-[#0b5e85] ring-2 ring-[#0b5e85]/20'
                    : file.isUsed
                      ? 'border-neutral-200'
                      : 'border-amber-200'
                }`}
              >
                {/* Visual Media Preview */}
                <div className="relative aspect-[16/10] bg-neutral-100 border-b border-neutral-100 overflow-hidden flex items-center justify-center">
                  {file.mediaType === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.filename}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : file.mediaType === 'video' ? (
                    <video
                      src={file.url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-500 gap-1.5 p-4">
                      <Paperclip className="w-8 h-8 text-[#0b5e85]/70" />
                      <span className="text-[11px] font-bold uppercase text-neutral-600">
                        {file.filename.split('.').pop() || 'FILE'}
                      </span>
                    </div>
                  )}

                  {/* Top-right selection checkbox */}
                  <label className="absolute top-2 right-2 bg-white/95 rounded px-1.5 py-1 shadow-xs border border-neutral-200 cursor-pointer flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(file.id)}
                      className="accent-[#0b5e85] w-3.5 h-3.5"
                    />
                  </label>

                  {/* Top-left usage status badge */}
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold shadow-xs ${
                      file.isUsed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {file.isUsed
                      ? `در حال استفاده (${toPersianDigits(file.usedBy.length)})`
                      : 'بدون استفاده'}
                  </span>

                  {/* Bottom-right variant/type badge */}
                  {file.variantLabel && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">
                      {file.variantLabel}
                    </span>
                  )}
                </div>

                {/* Metadata & Actions */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        dir="ltr"
                        title={file.filename}
                        className="font-mono text-[11px] font-bold text-neutral-800 truncate flex-1 text-left"
                      >
                        {file.filename}
                      </p>
                      <span className="text-[10px] font-bold text-[#0b5e85] bg-sky-50 px-1.5 py-0.5 rounded shrink-0 tabular-nums">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-neutral-500 tabular-nums">
                      <span>تاریخ: {formatPersianDate(file.modifiedAt)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-semibold">
                        {formatAgeLabel(file.modifiedAt)}
                      </span>
                    </div>

                    {file.usedBy.length > 0 ? (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded p-2 space-y-1">
                        <span className="block text-[10px] font-bold text-emerald-800">
                          استفاده‌شده در مطالب:
                        </span>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {file.usedBy.map((u) => (
                            <div
                              key={`${file.id}-art-${u.id}`}
                              className="flex items-center gap-1.5 text-[10px] text-neutral-700"
                            >
                              <FileText className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span className="font-bold tabular-nums shrink-0">
                                کد {toPersianDigits(u.code)}:
                              </span>
                              <span className="truncate">{u.title}</span>
                              {u.status === 'draft' && (
                                <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                                  پیشنویس
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/70 border border-amber-200 rounded px-2.5 py-1.5 text-[10px] text-amber-900 font-medium">
                        این فایل در هیچ خبر یا پیشنویسی استفاده نشده و قابل حذف است.
                      </div>
                    )}
                  </div>

                  {/* Card Footer Buttons */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(file)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-[10px] font-semibold cursor-pointer"
                        title="کپی نشانی فایل"
                      >
                        {copiedId === file.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === file.id ? 'کپی شد' : 'کپی لینک'}</span>
                      </button>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-[10px] font-semibold"
                        title="مشاهده فایل در تب جدید"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>باز کردن</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        if (!file.isUsed) {
                          executeDelete(
                            [{ folder: file.folder, filename: file.filename }],
                            false
                          );
                        } else {
                          setConfirmAction({
                            mode: 'single',
                            items: [{ folder: file.folder, filename: file.filename }],
                            hasUsedItems: true,
                            label: `فایل «${file.filename}»`,
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-[#d41a24] text-[#d41a24] hover:text-white border border-rose-200 text-[10px] font-bold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
