import React, { useState } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, FileText, Image as ImageIcon, ExternalLink, RotateCw } from 'lucide-react';
import { CustomerFile } from '../../types';
import { formatDate } from '../../utils/formatters';

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

  if (!isOpen || !file) return null;

  const lowerName = file.fileName.toLowerCase();
  const isImage =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    file.fileUrl.startsWith('data:image/');

  const isPdf =
    lowerName.endsWith('.pdf') ||
    file.fileUrl.startsWith('data:application/pdf') ||
    (!isImage && file.fileType === 'historical_order');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.fileUrl;
    link.download = file.fileName || '档案文件';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

            <a
              href={file.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="新窗口全屏打开"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

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
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={file.fileUrl}
                alt={file.fileName}
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-stone-800"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col bg-stone-950 rounded-xl overflow-hidden border border-stone-800">
              <iframe
                src={file.fileUrl}
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
