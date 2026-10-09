import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
} from 'lucide-react';
import { CustomerFile } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDate } from '../../utils/formatters';

interface ArchiveFileCardPreviewProps {
  file: CustomerFile;
  onOpenFullPreview?: (file: CustomerFile) => void;
  maxHeightClass?: string;
}

export const ArchiveFileCardPreview: React.FC<ArchiveFileCardPreviewProps> = ({
  file,
  onOpenFullPreview,
  maxHeightClass = 'max-h-[460px]',
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(100);

  const lowerName = (file.fileName || '').toLowerCase();
  const lowerUrl = (file.fileUrl || '').toLowerCase();

  const isLegacySeedDummyPdf = lowerUrl.includes('w3.org/wai/er/tests/xhtml/testfiles/resources/pdf/dummy.pdf');

  const isImage =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    file.mimeType?.startsWith('image/') ||
    lowerUrl.startsWith('data:image/') ||
    lowerUrl.includes('mime=image');

  const isPdf =
    !isImage &&
    !isLegacySeedDummyPdf &&
    (lowerName.endsWith('.pdf') ||
      file.mimeType === 'application/pdf' ||
      lowerUrl.startsWith('data:application/pdf') ||
      lowerUrl.includes('mime=application%2fpdf'));

  useEffect(() => {
    let active = true;
    setError('');
    setRotation(0);
    setZoom(100);

    if (!file.fileUrl || !file.fileUrl.trim() || isLegacySeedDummyPdf) {
      setResolvedUrl(null);
      setLoading(false);
      return;
    }

    const raw = file.fileUrl.trim();
    if (raw.startsWith('data:image/') || raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('blob:')) {
      setResolvedUrl(raw);
      setLoading(false);
      return;
    }

    setLoading(true);
    storageService
      .resolveFileUrl(raw, file.chunkCount)
      .then(url => {
        if (active) {
          if (url && url.trim()) {
            setResolvedUrl(url);
          } else {
            setError('档案图片地址为空');
          }
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message || '读取云端档案图片失败');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [file.fileUrl, file.chunkCount, isLegacySeedDummyPdf]);

  if (loading) {
    return (
      <div className="w-full h-56 rounded-xl bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-500 space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        <span className="text-xs font-mono">正在加载档案原件图片...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-44 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col items-center justify-center text-rose-600 p-4 text-center space-y-1.5">
        <AlertCircle className="w-6 h-6" />
        <span className="text-xs font-medium">{error}</span>
      </div>
    );
  }

  // Direct inline image rendering (for all uploaded photos/scans)
  if ((isImage || (!isPdf && !isLegacySeedDummyPdf)) && resolvedUrl) {
    return (
      <div className="relative group rounded-xl overflow-hidden bg-stone-900/95 border border-stone-200 shadow-xs">
        <div className={`w-full overflow-auto flex items-center justify-center p-2 ${maxHeightClass} min-h-[220px]`}>
          <img
            src={resolvedUrl}
            alt={file.fileName}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className={`w-full h-auto ${maxHeightClass} object-contain rounded-lg select-none`}
          />
        </div>

        {/* Floating direct toolbar on top-right of the image so user can rotate/zoom right on the card */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1 bg-stone-950/80 text-white px-2 py-1 rounded-lg backdrop-blur-xs text-[11px] shadow-md">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setZoom(prev => Math.max(60, prev - 20));
            }}
            className="p-1 hover:text-amber-400 cursor-pointer"
            title="缩小图片"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] px-1">{zoom}%</span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setZoom(prev => Math.min(220, prev + 20));
            }}
            className="p-1 hover:text-amber-400 cursor-pointer"
            title="放大图片"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setRotation(prev => (prev + 90) % 360);
            }}
            className="p-1 hover:text-amber-400 cursor-pointer border-l border-stone-700 pl-1.5"
            title="旋转90度"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          {onOpenFullPreview && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onOpenFullPreview(file);
              }}
              className="p-1 hover:text-amber-400 cursor-pointer border-l border-stone-700 pl-1.5"
              title="全屏放大检视"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Direct inline PDF rendering
  if (isPdf && resolvedUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
        <iframe
          src={resolvedUrl}
          title={file.fileName}
          className="w-full h-80 border-0 bg-white"
        />
        {onOpenFullPreview && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenFullPreview(file);
            }}
            className="absolute bottom-2.5 right-2.5 bg-stone-900/85 hover:bg-stone-900 text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-md cursor-pointer backdrop-blur-xs"
          >
            <Maximize2 className="w-3 h-3 text-amber-400" />
            <span>全屏阅读</span>
          </button>
        )}
      </div>
    );
  }

  // Visual scanned paper sheet presentation for legacy seed records
  return (
    <div className="relative rounded-xl overflow-hidden bg-[#faf6ee] border-2 border-[#e6dcc8] p-4 shadow-inner text-stone-800 font-serif space-y-2.5">
      <div className="flex items-center justify-between border-b border-dashed border-[#d5c7ad] pb-2">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-sm border border-amber-300/60">
            七彩布衣工坊 · 纸质原件扫描底单
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-stone-600">{file.year} 年度存档</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-white/70 p-2.5 rounded-lg border border-[#ebe2d0]">
        <div>
          <span className="text-stone-400 text-[10px] block">客户姓名</span>
          <strong className="text-stone-900">{file.customerName || file.customerId}</strong>
        </div>
        <div>
          <span className="text-stone-400 text-[10px] block">档案类别</span>
          <strong className="text-stone-900">
            {file.fileType === 'historical_order'
              ? '历史纸质定制单存根'
              : file.fileType === 'historical_measurement'
              ? '历史手写量体单'
              : '工坊制版手稿'}
          </strong>
        </div>
        <div className="col-span-2">
          <span className="text-stone-400 text-[10px] block">原件卷宗名</span>
          <span className="font-semibold text-stone-800 text-xs">{file.fileName}</span>
        </div>
      </div>

      <div className="p-3 bg-white/90 rounded-lg border border-[#e5dac3] text-xs leading-relaxed text-stone-700 min-h-[68px]">
        <span className="text-[10px] font-bold text-amber-900 block mb-0.5">工坊师傅手记 / 版型批注：</span>
        {file.remarks || '纸质手写原件已数字化归档保存，字迹与纸样尺寸完整留存。'}
      </div>

      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 font-mono">
        <span>档案号：{file.fileId}</span>
        <span>建档日期：{formatDate(file.createdAt)}</span>
      </div>
    </div>
  );
};
