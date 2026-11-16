export function IslamTimesLogo({
  compact = false,
  onClick,
}: {
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm cursor-pointer shrink-0"
      aria-label="صفحه نخست اسلام تایمز"
    >
      <div className="flex flex-col items-start" dir="ltr">
        <span
          className="text-white/95 font-medium self-end mb-0.5 leading-none"
          style={{ fontSize: compact ? '11px' : '13px', fontFamily: 'Vazirmatn, sans-serif' }}
          dir="rtl"
        >
          فارسی
        </span>
        <div className="flex items-baseline gap-1.5 leading-none select-none">
          <span
            className={`font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-sky-100 drop-shadow-sm ${
              compact ? 'text-2xl' : 'text-3xl md:text-[34px]'
            }`}
            style={{
              WebkitTextStroke: '1px rgba(255,255,255,0.9)',
              letterSpacing: '0.06em',
            }}
          >
            ISLAM
          </span>
          <span
            className={`font-semibold text-white tracking-tight ${
              compact ? 'text-xs' : 'text-sm md:text-base'
            }`}
          >
            Times
          </span>
        </div>
      </div>
    </button>
  );
}
