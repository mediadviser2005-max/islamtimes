import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { getSmallVariantUrl } from '../lib/imageOptimizer';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'large' | 'small';
}

export function SafeImage({ src, alt, className = '', size = 'large' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const [fallbackToOriginal, setFallbackToOriginal] = useState(false);

  useEffect(() => {
    setFailed(false);
    setFallbackToOriginal(false);
  }, [src, size]);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-200 via-sky-50 to-slate-300 text-slate-500 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Newspaper className="w-6 h-6 opacity-60" />
      </div>
    );
  }

  const preferredSrc = size === 'small' && !fallbackToOriginal ? getSmallVariantUrl(src) : src;

  return (
    <img
      src={preferredSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (preferredSrc !== src) {
          setFallbackToOriginal(true);
        } else {
          setFailed(true);
        }
      }}
      className={className}
    />
  );
}
