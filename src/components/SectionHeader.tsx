import { ChevronLeft } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  dark?: boolean;
  onMore?: () => void;
  actionSlot?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  dark = false,
  onMore,
  actionSlot,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 mb-3.5 sm:mb-4">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span
          className="inline-block w-2 h-2 rounded-full bg-[#d41a24] shrink-0"
          aria-hidden="true"
        />
        <h2
          className={`text-[15px] sm:text-base md:text-lg font-bold tracking-tight truncate sm:whitespace-nowrap ${
            dark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-bold text-[#d41a24] truncate sm:whitespace-nowrap">
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 shrink-0" />
            <span className="truncate">{subtitle}</span>
          </span>
        )}
      </div>

      <div
        className={`flex-1 min-w-[16px] h-px ${dark ? 'bg-neutral-700' : 'bg-neutral-200'}`}
      />

      {actionSlot}

      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className={`text-xs font-semibold sm:font-medium whitespace-nowrap shrink-0 px-1.5 py-1 -my-1 sm:p-0 sm:m-0 transition-colors cursor-pointer ${
            dark
              ? 'text-neutral-300 hover:text-white'
              : 'text-neutral-600 sm:text-neutral-500 hover:text-[#d41a24]'
          }`}
        >
          بیشتر
        </button>
      )}
    </div>
  );
}
