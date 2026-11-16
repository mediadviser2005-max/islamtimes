import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Loader2, Plus, Search, X } from 'lucide-react';
import { NewsSource } from '../types/news';

interface NewsSourceComboboxProps {
  sources: NewsSource[];
  value: string;
  selectedSourceId: number | null;
  onChange: (name: string, sourceId: number | null, url?: string) => void;
  onCreateSource: (name: string) => Promise<NewsSource | null>;
  placeholder?: string;
  disabled?: boolean;
}

export function NewsSourceCombobox({
  sources,
  value,
  selectedSourceId,
  onChange,
  onCreateSource,
  placeholder = 'جست‌وجو یا تایپ نام منبع جدید...',
  disabled = false,
}: NewsSourceComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [creating, setCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();

  const filteredSources = useMemo(() => {
    if (!trimmedQuery) return sources;
    const q = trimmedQuery.toLowerCase();
    return sources.filter(
      (src) =>
        src.name.toLowerCase().includes(q) ||
        (src.url && src.url.toLowerCase().includes(q))
    );
  }, [sources, trimmedQuery]);

  const exactMatch = useMemo(() => {
    if (!trimmedQuery) return null;
    const q = trimmedQuery.toLowerCase();
    return sources.find((src) => src.name.toLowerCase() === q) || null;
  }, [sources, trimmedQuery]);

  const canCreateNew = Boolean(trimmedQuery && !exactMatch);

  const handleSelectExisting = (src: NewsSource) => {
    setQuery(src.name);
    onChange(src.name, src.id, src.url || '');
    setIsOpen(false);
  };

  const handleCreateAndSelect = async () => {
    if (!trimmedQuery || creating || disabled) return;
    setCreating(true);
    try {
      const created = await onCreateSource(trimmedQuery);
      if (created) {
        setQuery(created.name);
        onChange(created.name, created.id, created.url || '');
        setIsOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange('', null, '');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  const totalOptions = filteredSources.length + (canCreateNew ? 1 : 0);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          dir="rtl"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            setQuery(nextVal);
            const matched = sources.find(
              (s) => s.name.toLowerCase() === nextVal.trim().toLowerCase()
            );
            onChange(nextVal, matched ? matched.id : null, matched ? matched.url || '' : undefined);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              return;
            }
            if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              setIsOpen(true);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (totalOptions > 0) {
                setHighlightedIndex((prev) => (prev + 1) % totalOptions);
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (totalOptions > 0) {
                setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
              }
            } else if (e.key === 'Enter' && isOpen) {
              e.preventDefault();
              if (canCreateNew && highlightedIndex === 0) {
                handleCreateAndSelect();
              } else {
                const idx = canCreateNew ? highlightedIndex - 1 : highlightedIndex;
                const chosen = filteredSources[idx];
                if (chosen) {
                  handleSelectExisting(chosen);
                } else if (canCreateNew) {
                  handleCreateAndSelect();
                }
              }
            }
          }}
          className="w-full rounded border border-neutral-300 bg-white pr-8 pl-12 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5e85]/25 focus:border-[#0b5e85] disabled:bg-neutral-100 disabled:text-neutral-400"
        />
        <div className="absolute left-2 flex items-center gap-1">
          {creating && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b5e85]" />}
          {query && !creating && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded text-neutral-400 hover:text-[#d41a24] cursor-pointer"
              title="پاک کردن منبع"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((o) => !o)}
            className="p-0.5 text-neutral-500 hover:text-neutral-800 cursor-pointer disabled:opacity-40"
            title="باز کردن فهرست منابع"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-neutral-300 bg-white shadow-lg max-h-60 overflow-y-auto text-xs">
          {canCreateNew && (
            <button
              type="button"
              disabled={creating}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateAndSelect}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-right border-b border-neutral-100 cursor-pointer transition-colors ${
                highlightedIndex === 0
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>افزودن و ذخیره منبع جدید: «{trimmedQuery}»</span>
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                ذخیره خودکار
              </span>
            </button>
          )}

          {filteredSources.length === 0 && !canCreateNew ? (
            <div className="px-3 py-3 text-center text-neutral-400 text-[11px]">
              منبعی ثبت نشده است — نام منبع جدید را تایپ کنید.
            </div>
          ) : (
            filteredSources.map((src, i) => {
              const optionIndex = canCreateNew ? i + 1 : i;
              const isSelected =
                selectedSourceId === src.id ||
                value.trim().toLowerCase() === src.name.toLowerCase();
              const isHighlighted = highlightedIndex === optionIndex;

              return (
                <button
                  key={src.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectExisting(src)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-right cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-sky-50 text-[#0b5e85]'
                      : isSelected
                        ? 'bg-neutral-50 text-[#0b5e85] font-bold'
                        : 'text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate font-semibold">{src.name}</span>
                    {src.url && (
                      <span dir="ltr" className="text-[10px] text-neutral-400 truncate max-w-[160px]">
                        {src.url}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0b5e85] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
