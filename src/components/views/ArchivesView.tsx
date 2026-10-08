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
} from 'lucide-react';
import { CustomerFile, Customer } from '../../types';
import { formatDate } from '../../utils/formatters';

interface ArchivesViewProps {
  files: CustomerFile[];
  customers: Customer[];
  onOpenUploadArchive: () => void;
  onOpenPdfPreview: (file: CustomerFile) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({
  files,
  customers,
  onOpenUploadArchive,
  onOpenPdfPreview,
  onSelectCustomer,
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
              “扫描 → PDF → 上传 → 归档”，免 OCR 乱码，按客户与年份自动建树，方便随时调阅老纸质单据手记
            </p>
          </div>

          <button
            onClick={onOpenUploadArchive}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>+ 录入老纸质订单扫描件</span>
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

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map(file => {
          const cust = customers.find(c => c.id === file.customerId);
          return (
            <div
              key={file.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 hover:border-stone-400 transition-all shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md font-mono">
                        {file.year}年度
                      </span>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded-md">
                        {file.fileType === 'historical_order' ? '订单存根' : '手写量体'}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-stone-900 line-clamp-2">
                      {file.fileName}
                    </h3>
                  </div>
                </div>

                {cust && (
                  <div className="p-2.5 bg-stone-50 rounded-lg text-xs flex justify-between items-center">
                    <span className="text-stone-500">所属客户：</span>
                    <button
                      onClick={() => onSelectCustomer(cust)}
                      className="font-bold text-stone-800 hover:text-amber-800 hover:underline cursor-pointer"
                    >
                      {cust.name} ({cust.phone})
                    </button>
                  </div>
                )}

                {file.remarks && (
                  <p className="text-[11px] text-stone-600 bg-amber-50/30 p-2.5 rounded-lg border border-amber-100/60 leading-relaxed">
                    <strong>老单手记：</strong> {file.remarks}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-stone-400">
                  {formatDate(file.createdAt)} · {(file.fileSize / 1024 / 1024).toFixed(1)}MB
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenPdfPreview(file)}
                    className="px-2.5 py-1 text-xs bg-stone-900 hover:bg-stone-800 text-white rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>查看原件</span>
                  </button>
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-stone-500 hover:text-stone-900 rounded-md cursor-pointer"
                    title="下载文件"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
