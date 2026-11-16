/**
 * Client-side automatic image cropping, resizing, and compression utilities.
 */

export const MAX_MEDIA_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

export const LARGE_IMAGE_WIDTH = 1200;
export const LARGE_IMAGE_HEIGHT = 750; // 16:10

export const SMALL_IMAGE_WIDTH = 480;
export const SMALL_IMAGE_HEIGHT = 320; // 3:2

export const GALLERY_IMAGE_WIDTH = 960;
export const GALLERY_IMAGE_HEIGHT = 720; // 4:3

export const INLINE_IMAGE_MAX_WIDTH = 1000;

export type ImageOptimizePreset = 'large' | 'small' | 'gallery' | 'inline';

export interface ProcessedImageResult {
  file: File;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  optimizedSize: number;
  wasCropped: boolean;
  wasResized: boolean;
}

const SKIP_RASTERIZE_TYPES = new Set(['image/svg+xml', 'image/gif']);

export function getSmallVariantUrl(url: string): string {
  if (!url) return url;
  const match = url.match(/^(\/uploads\/images\/[^/?#]+)-lg(\.[a-z0-9]+)$/i);
  if (!match) return url;
  return `${match[1]}-sm${match[2]}`;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('خواندن و پردازش تصویر انتخاب‌شده امکان‌پذیر نیست.'));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function encodeCanvasOptimized(
  canvas: HTMLCanvasElement,
  baseName: string,
  targetQuality = 0.84
): Promise<{ file: File; size: number }> {
  let blob = await canvasToBlob(canvas, 'image/webp', targetQuality);
  let ext = '.webp';
  let mime = 'image/webp';

  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
    ext = '.jpg';
    mime = 'image/jpeg';
  }

  if (!blob) {
    throw new Error('تبدیل و فشرده‌سازی تصویر ناموفق بود.');
  }

  const safeBase = baseName.replace(/\.[^.]+$/, '').trim() || 'image';
  const outFile = new File([blob], `${safeBase}${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });

  return { file: outFile, size: outFile.size };
}

function renderPresetFromImage(
  img: HTMLImageElement,
  originalName: string,
  originalSize: number,
  preset: ImageOptimizePreset
): Promise<ProcessedImageResult> {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  if (!srcW || !srcH) {
    throw new Error('ابعاد تصویر انتخاب‌شده نامعتبر است.');
  }

  let sx = 0;
  let sy = 0;
  let sWidth = srcW;
  let sHeight = srcH;
  let destW = srcW;
  let destH = srcH;
  let wasCropped = false;

  if (preset === 'inline') {
    if (srcW > INLINE_IMAGE_MAX_WIDTH) {
      destW = INLINE_IMAGE_MAX_WIDTH;
      destH = Math.max(1, Math.round((srcH * INLINE_IMAGE_MAX_WIDTH) / srcW));
    }
  } else {
    const targetMaxW =
      preset === 'large'
        ? LARGE_IMAGE_WIDTH
        : preset === 'small'
          ? SMALL_IMAGE_WIDTH
          : GALLERY_IMAGE_WIDTH;
    const targetMaxH =
      preset === 'large'
        ? LARGE_IMAGE_HEIGHT
        : preset === 'small'
          ? SMALL_IMAGE_HEIGHT
          : GALLERY_IMAGE_HEIGHT;

    const targetRatio = targetMaxW / targetMaxH;
    const srcRatio = srcW / srcH;

    // Tolerance of 1.5% so images matching the exact aspect ratio don't get cropped unnecessarily
    const ratioDiff = Math.abs(srcRatio - targetRatio) / targetRatio;

    if (ratioDiff > 0.015) {
      wasCropped = true;
      if (srcRatio > targetRatio) {
        // Wider than target -> crop left & right evenly
        sHeight = srcH;
        sWidth = Math.max(1, Math.round(srcH * targetRatio));
        sx = Math.max(0, Math.round((srcW - sWidth) / 2));
        sy = 0;
      } else {
        // Taller than target -> crop top & bottom evenly
        sWidth = srcW;
        sHeight = Math.max(1, Math.round(srcW / targetRatio));
        sx = 0;
        sy = Math.max(0, Math.round((srcH - sHeight) / 2));
      }
    }

    if (sWidth > targetMaxW || sHeight > targetMaxH) {
      destW = targetMaxW;
      destH = targetMaxH;
    } else {
      destW = sWidth;
      destH = Math.max(1, Math.round(sWidth / targetRatio));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = destW;
  canvas.height = destH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('مرورگر امکان پردازش تصویر را ندارد.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, destW, destH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, destW, destH);

  const quality = preset === 'small' ? 0.82 : 0.84;
  return encodeCanvasOptimized(canvas, originalName, quality).then(({ file, size }) => ({
    file,
    width: destW,
    height: destH,
    originalWidth: srcW,
    originalHeight: srcH,
    originalSize,
    optimizedSize: size,
    wasCropped,
    wasResized: destW !== srcW || destH !== srcH,
  }));
}

export async function optimizeAndCropImage(
  file: File,
  preset: ImageOptimizePreset
): Promise<ProcessedImageResult> {
  if (SKIP_RASTERIZE_TYPES.has(file.type)) {
    return {
      file,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      originalSize: file.size,
      optimizedSize: file.size,
      wasCropped: false,
      wasResized: false,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(objectUrl);
    return await renderPresetFromImage(img, file.name, file.size, preset);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareArticleMainImages(file: File): Promise<{
  large: ProcessedImageResult;
  small: ProcessedImageResult | null;
}> {
  if (SKIP_RASTERIZE_TYPES.has(file.type)) {
    const passthrough: ProcessedImageResult = {
      file,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      originalSize: file.size,
      optimizedSize: file.size,
      wasCropped: false,
      wasResized: false,
    };
    return { large: passthrough, small: null };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(objectUrl);
    const large = await renderPresetFromImage(img, file.name, file.size, 'large');
    const small = await renderPresetFromImage(img, file.name, file.size, 'small');
    return { large, small };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
