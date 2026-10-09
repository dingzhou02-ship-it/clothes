import React, { useState } from 'react';
import {
  FileText,
  Search,
  Upload,
  Eye,
  Download,
  Calendar,
  FolderOpen,
  Filter,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { CustomerFile, Customer } from '../../types';
import { formatDate } from '../../utils/formatters';
import { storageService } from '../../services/storageService';
import { ArchiveFileCardPreview } from '../common/ArchiveFileCardPreview';

interface ArchivesViewProps {
  files: CustomerFile[];
  customers: Customer[];
  onOpenUploadArchive: () => void;
  onOpenPdfPreview: (file: CustomerFile) => void;
  onSelectCustomer: (customer: Customer) => void;
  onDeleteFile?: (file: CustomerFile) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({
  files,
  customers,
  onOpenUploadArchive,
  onOpenPdfPreview,
  onSelectCustomer,
  onDeleteFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const availableYears = Array.from(new Set(files.map(f => f.year))).sort((a, b) => b - a);

  const filteredFiles = files.filter(f => {
    const cust = customers.find(c => c.id === f.customerId);
    const search = searchTerm.toLowerCase();
    const matchSearch =
      f.fileName.toLowerCase().includes(search) ||
      (f.customerName && f.customerName.toLowerCase().includes(search)) ||
      (cust && cust.phone.includes(search)) ||
      (f.remarks && f.remarks.toLowerCase().includes(search));

    const matchYear = selectedYear === 'all' || f.year === selectedYear;
    const matchType = typeFilter === 'all' || f.fileType === typeFilter;

    return matchSearch && matchYear && matchType;
  });

  const formatArchiveSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              <span>历史纸质档案数字化归档库</span>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
                已安全归档 {files.length} 份原件扫描件
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              上传的纸质档案照片与扫描件直接以清晰图片形式呈现，无需点进内层即可直接查阅手写单据与批注
            </p>
          </div>

          <button
            onClick={onOpenUploadArchive}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>+ 上传纸质订单扫描件 / 照片</span>
          </button>
        </div>

        {/* Years Bar (Section 23) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-2 border-t border-stone-100">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
              selectedYear === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部历史年份 ({files.length})
          </button>
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                selectedYear === yr
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {yr} 年度 ({files.filter(f => f.year === yr).length})
            </button>
          ))}
        </div>

        {/* Search & Type filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="搜索档案文件名、客户姓名、手记备注..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50 font-medium text-stone-700"
            >
              <option value="all">全部档案类型</option>
              <option value="historical_order">历史纸质订单存根</option>
              <option value="historical_measurement">历史手写量体单</option>
              <option value="other">工坊手绘图纸/其他</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files Grid - Direct Image Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredFiles.map(file => {
          const cust = customers.find(c => c.id === file.customerId);
          return (
            <div
              key={file.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 hover:border-stone-400 transition-all shadow-xs flex flex-col justify-between space-y-3.5"
            >
              <div className="space-y-3">
                {/* Top Meta Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold bg-stone-900 text-amber-400 px-2 py-0.5 rounded-md font-mono">
                        {file.year}年度
                      </span>
                      <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                        {file.fileType === 'historical_order'
                          ? '历史订单存根'
                          : file.fileType === 'historical_measurement'
                          ? '手写量体单'
                          : '手绘图纸/其他'}
                      </span>
                      {cust && (
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(cust)}
                          className="text-xs font-bold text-stone-800 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                          客户：{cust.name} ({cust.phone})
                        </button>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 break-all">
                      {file.fileName}
                    </h3>
                  </div>
                </div>

                {/* Direct Inline Image Presentation — No need to click inside to view */}
                <ArchiveFileCardPreview
                  file={file}
                  onOpenFullPreview={onOpenPdfPreview}
                  maxHeightClass="max-h-[520px]"
                />

                {file.remarks && (
                  <p className="text-xs text-stone-700 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100 leading-relaxed">
                    <strong>老单手记：</strong> {file.remarks}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-stone-400 font-mono">
                  {formatDate(file.createdAt)} · {formatArchiveSize(file.fileSize)}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => storageService.downloadFile(file.fileUrl, file.fileName, file.chunkCount)}
                    className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                    title="下载原文件"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下载</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPdfPreview(file)}
                    className="px-2.5 py-1 text-xs bg-stone-900 hover:bg-stone-800 text-white rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>全屏大图</span>
                  </button>
                  {onDeleteFile && (
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file)}
                      className="px-2 py-1 text-xs text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                      title="删除该档案"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
