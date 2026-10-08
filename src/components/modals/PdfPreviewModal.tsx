import React, { useState } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, FileText, ExternalLink } from 'lucide-react';
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

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-4xl border border-stone-800 overflow-hidden flex flex-col h-[90vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-stone-950 text-white border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold truncate max-w-md">
                {file.fileName}
              </h3>
              <p className="text-[11px] text-stone-400">
                归档年份：{file.year} 年 · 客户：{file.customerName || file.customerId} · 上传于 {formatDate(file.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-stone-800 px-2 py-1 rounded-lg text-xs mr-2">
              <button
                onClick={() => setZoomLevel(Math.max(60, zoomLevel - 20))}
                className="p-1 hover:text-amber-400 cursor-pointer"
                title="缩小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-12 text-center text-[11px] font-mono">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(180, zoomLevel + 20))}
                className="p-1 hover:text-amber-400 cursor-pointer"
                title="放大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <a
              href={file.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="在新标签页中打开原件"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={() => window.print()}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="打印"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF / Scan Viewer Viewport */}
        <div className="flex-1 bg-stone-800 overflow-auto p-8 flex justify-center items-start">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-200 shadow-2xl bg-white w-full max-w-2xl min-h-[850px] p-8 text-stone-900 rounded-sm font-serif border border-stone-300"
          >
            {/* Paper Scan Emulation */}
            <div className="border-4 border-double border-stone-800 p-6 min-h-[780px] relative bg-amber-50/20">
              {/* Paper Watermark Stamp */}
              <div className="absolute top-10 right-10 rotate-12 border-2 border-red-700 text-red-700 px-3 py-1 rounded-sm text-xs font-sans font-bold uppercase tracking-widest opacity-85 pointer-events-none">
                工坊老纸质档案归档
              </div>

              <div className="text-center pb-4 border-b border-stone-400 mb-6">
                <h2 className="text-xl font-bold tracking-widest">
                  七彩布衣工坊 · 历史纸质定制单存根
                </h2>
                <p className="text-xs text-stone-600 mt-1">
                  HISTORICAL ARCHIVED WORKSHOP CONTRACT · {file.year}年度
                </p>
              </div>

              <div className="space-y-4 text-xs font-sans text-stone-800">
                <div className="grid grid-cols-2 gap-4 border-b border-stone-200 pb-3">
                  <div>档案名：<strong>{file.fileName}</strong></div>
                  <div>档案类型：<strong>{file.fileType === 'historical_order' ? '老订单存根' : '老手写量体单'}</strong></div>
                  <div>所属客户：<strong>{file.customerName || file.customerId}</strong></div>
                  <div>扫描录入时间：<strong>{formatDate(file.createdAt)}</strong></div>
                </div>

                <div className="p-4 bg-stone-100/70 border border-stone-300 rounded-sm font-mono text-xs leading-relaxed">
                  <p className="font-bold mb-2 font-sans text-stone-900">【老单扫描记录摘要与老裁缝师傅手记】</p>
                  <p className="text-stone-700 whitespace-pre-wrap">
                    {file.remarks || '本份纸质单据原件已存入工坊档案库，手绘版型图比例完好，可供老客定制翻单参考。'}
                  </p>
                </div>

                {/* Simulated Hand-drawn cutting pattern diagram */}
                <div className="border border-stone-300 rounded-sm p-4 bg-white text-center text-stone-500">
                  <div className="w-full h-64 border border-dashed border-stone-300 flex flex-col items-center justify-center bg-stone-50">
                    <FileText className="w-12 h-12 text-stone-400 mb-2" />
                    <p className="text-xs font-serif text-stone-700 font-bold">高保真原始扫描存根已安全归档至 Firebase Storage</p>
                    <p className="text-[11px] text-stone-400 mt-1">免 OCR 乱码，完整保持手写笔记与当时尺寸标注</p>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center space-x-1 px-3 py-1.5 bg-stone-900 text-white rounded-md text-xs hover:bg-stone-800"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>查看并下载 PDF 原始扫描文件</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] text-stone-400 font-sans border-t border-stone-300 pt-3">
                <span>七彩布衣工坊数字化档案库 · 永久存根</span>
                <span>档案编号：{file.fileId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
