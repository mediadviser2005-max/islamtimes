import { ExternalLink, Play, X } from 'lucide-react';
import { Article } from '../types/news';
import { SafeImage } from './SafeImage';

interface VideoPlayerModalProps {
  article: Article | null;
  onClose: () => void;
  onReadFullReport: (article: Article) => void;
}

export function VideoPlayerModal({
  article,
  onClose,
  onReadFullReport,
}: VideoPlayerModalProps) {
  if (!article) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#1b1b1b] text-white rounded-md shadow-2xl w-full max-w-3xl overflow-hidden border border-neutral-700">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d41a24]" />
            <h3 className="text-sm font-bold line-clamp-1">{article.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video bg-black overflow-hidden">
          <SafeImage
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#d41a24] text-white flex items-center justify-center shadow-lg mb-4">
              <Play className="w-7 h-7 fill-current mr-[-2px]" />
            </div>
            <p className="text-xs md:text-sm text-neutral-200 max-w-lg leading-6 mb-4">
              {article.lead}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReadFullReport(article);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-white text-neutral-900 text-xs font-bold hover:bg-neutral-100 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                مشاهده گزارش کامل خبر
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
