import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, Image as ImageIcon, ExternalLink, RotateCw, Loader2, AlertCircle } from 'lucide-react';
import { CustomerFile } from '../../types';
import { formatDate } from '../../utils/formatters';
import { storageService } from '../../services/storageService';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: CustomerFile | null;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    if (isOpen && file) {
      setZoomLevel(100);
      setRotation(0);
      setLoadError('');
      setResolvedUrl(null);
      setLoadingUrl(true);
      storageService
        .resolveFileUrl(file.fileUrl, file.chunkCount)
        .then(url => {
          if (active) {
            if (url && url.trim().length > 0) {
              setResolvedUrl(url);
            } else {
              setLoadError('未能获取到有效的档案预览地址');
            }
            setLoadingUrl(false);
          }
        })
        .catch((err: any) => {
          if (active) {
            setLoadError(err?.message || '读取云端档案失败，请稍后重试');
            setLoadingUrl(false);
          }
        });
    } else {
      setResolvedUrl(null);
      setLoadingUrl(false);
    }
    return () => {
      active = false;
    };
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const lowerName = file.fileName.toLowerCase();
  const isImage =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    file.mimeType?.startsWith('image/') ||
    file.fileUrl.startsWith('data:image/');

  const isPdf =
    lowerName.endsWith('.pdf') ||
    file.mimeType === 'application/pdf' ||
    file.fileUrl.startsWith('data:application/pdf') ||
    (!isImage && file.fileType === 'historical_order');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = async () => {
    try {
      await storageService.downloadFile(file.fileUrl, file.fileName, file.chunkCount);
    } catch (err: any) {
      setLoadError(err?.message || '下载档案失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-stone-800 overflow-hidden flex flex-col h-[94vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-stone-950 text-white border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${isImage ? 'bg-amber-600' : 'bg-rose-600'}`}>
              {isImage ? <ImageIcon className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md text-white">
                {file.fileName}
              </h3>
              <p className="text-[11px] text-stone-400 truncate">
                {file.year} 年度档案 · 客户：{file.customerName || file.customerId} · {formatFileSize(file.fileSize)} · 上传于 {formatDate(file.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {isImage && (
              <>
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-1.5 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer hidden sm:flex items-center"
                  title="旋转90度"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="flex items-center space-x-1 bg-stone-800 px-2 py-1 rounded-lg text-xs">
                  <button
                    onClick={() => setZoomLevel(Math.max(40, zoomLevel - 20))}
                    className="p-1 hover:text-amber-400 cursor-pointer"
                    title="缩小"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-[11px] font-mono">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(250, zoomLevel + 20))}
                    className="p-1 hover:text-amber-400 cursor-pointer"
                    title="放大"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleDownload}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1 text-xs px-2.5"
              title="下载文件到本地"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">下载</span>
            </button>

            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="新窗口全屏打开"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Content Area */}
        <div className="flex-1 bg-stone-900/90 overflow-auto p-2 sm:p-6 flex items-center justify-center relative">
          {loadingUrl || (!resolvedUrl && !loadError) ? (
            <div className="text-center text-stone-300 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs font-mono">正在从云端安全存储加载并重组档案分片...</p>
            </div>
          ) : loadError ? (
            <div className="text-center p-8 bg-stone-800 rounded-2xl max-w-md border border-rose-500/40 text-white space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200">{loadError}</p>
            </div>
          ) : isImage && resolvedUrl ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={resolvedUrl}
                alt={file.fileName}
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-stone-800"
              />
            </div>
          ) : isPdf && resolvedUrl ? (
            <div className="w-full h-full flex flex-col bg-stone-950 rounded-xl overflow-hidden border border-stone-800">
              <iframe
                src={resolvedUrl}
                title={file.fileName}
                className="w-full h-full border-0 rounded-xl bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-stone-800 rounded-2xl max-w-md border border-stone-700 text-white space-y-4">
              <FileText className="w-16 h-16 text-amber-400 mx-auto" />
              <div>
                <h4 className="text-base font-bold">{file.fileName}</h4>
                <p className="text-xs text-stone-400 mt-1">该文件格式可直接点击下方按钮下载至电脑或手机查看</p>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl inline-flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>立即下载该档案</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        {file.remarks && (
          <div className="px-6 py-2.5 bg-stone-950/80 border-t border-stone-800/80 text-xs text-stone-400 flex items-center justify-between">
            <span className="truncate">备注细节：{file.remarks}</span>
            <span className="text-[11px] text-stone-500 shrink-0 ml-4 font-mono">
              编号: {file.fileId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
