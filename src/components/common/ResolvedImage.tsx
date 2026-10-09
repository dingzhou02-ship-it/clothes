import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { storageService } from '../../services/storageService';

interface ResolvedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  chunkCount?: number;
  fallbackText?: string;
}

export const ResolvedImage: React.FC<ResolvedImageProps> = ({
  src,
  chunkCount,
  alt = '',
  className = '',
  fallbackText = '暂无图片',
  ...rest
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setHasError(false);

    if (!src || !src.trim()) {
      setResolvedUrl(null);
      setLoading(false);
      return;
    }

    const trimmed = src.trim();
    if (
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('blob:')
    ) {
      setResolvedUrl(trimmed);
      setLoading(false);
      return;
    }

    setLoading(true);
    storageService
      .resolveFileUrl(trimmed, chunkCount)
      .then(url => {
        if (active) {
          setResolvedUrl(url && url.trim() ? url : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [src, chunkCount]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-stone-100 text-stone-400 text-xs ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-amber-600 mb-1" />
        <span className="text-[11px]">加载图片中...</span>
      </div>
    );
  }

  if (!resolvedUrl || hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-stone-100 text-stone-400 text-xs ${className}`}>
        <ImageIcon className="w-6 h-6 mb-1 text-stone-300" />
        <span className="text-[11px]">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...rest}
    />
  );
};
