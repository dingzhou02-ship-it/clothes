import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Upload, AlertCircle, CheckCircle2, Image as ImageIcon, FileCheck, Loader2 } from 'lucide-react';
import { Customer } from '../../types';
import { storageService } from '../../services/storageService';

interface ArchiveUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  preselectedCustomer?: Customer | null;
  onUploadSuccess: (data: {
    customerId: string;
    customerName: string;
    fileName: string;
    fileType: 'historical_order' | 'historical_measurement' | 'other';
    year: number;
    fileUrl: string;
    fileSize: number;
    remarks: string;
  }) => Promise<void>;
}

export const ArchiveUploadModal: React.FC<ArchiveUploadModalProps> = ({
  isOpen,
  onClose,
  customers,
  preselectedCustomer,
  onUploadSuccess,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'historical_order' | 'historical_measurement' | 'other'>('historical_order');
  const [remarks, setRemarks] = useState('');
  
  // Real File Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
    setError('');
    setSelectedFile(null);
    setUploadProgress(0);
  }, [preselectedCustomer, customers, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const lower = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lower.endsWith(ext));
    if (!isValid) {
      setError('格式不支持：仅支持 PDF、JPG、JPEG、PNG、WEBP 格式文件');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('文件过大：单个文件大小请勿超过 25MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    if (!fileName.trim()) {
      setFileName(file.name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      setError('请选择所属客户');
      return;
    }
    if (!selectedFile) {
      setError('请先点击或拖拽选择本地档案文件（PDF 或 照片）');
      return;
    }
    if (!fileName.trim()) {
      setError('请填写档案或扫描件文件名称');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadProgress(10);

      // Upload file to storage (Firebase Storage with seamless local fallback)
      const uploadRes = await storageService.uploadFile(selectedFile, 'archives', progress => {
        setUploadProgress(progress);
      });

      await onUploadSuccess({
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        fileName: fileName.trim(),
        fileType,
        year: Number(year),
        fileUrl: uploadRes.url,
        fileSize: uploadRes.size,
        remarks: remarks.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || '归档上传失败，请检查网络或重试');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isPdf = selectedFile?.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold tracking-wide">上传纸质档案扫描件 / 照片 (PDF/原件归档)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">所属客户</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800 bg-white font-medium"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone} ({c.customerId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">原始订单年份 (自动建树)</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800 bg-white font-semibold"
              >
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">档案类型</label>
              <select
                value={fileType}
                onChange={e => setFileType(e.target.value as any)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800 bg-white"
              >
                <option value="historical_order">历史纸质订单存根</option>
                <option value="historical_measurement">历史手写量体单</option>
                <option value="other">工坊手绘版型 / 面料小样照片</option>
              </select>
            </div>
          </div>

          {/* Interactive File Picker Area */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              选择本地档案文件 <span className="text-rose-500">*</span>
            </label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
                    : 'border-stone-300 bg-stone-50 hover:bg-stone-100 hover:border-stone-400'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto mb-3 flex items-center justify-center text-amber-600 border border-stone-200">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-stone-800">
                  点击从电脑/手机选择本地文件 或 拖拽至此处
                </p>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  支持 PDF、JPG、JPEG、PNG、WEBP 格式（在 iPhone 上支持选择照片/相机/文件）
                </p>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-3 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800"
                >
                  浏览本地文件夹
                </button>
              </div>
            ) : (
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={`p-2.5 rounded-xl text-white shrink-0 ${isPdf ? 'bg-rose-600' : 'bg-blue-600'}`}>
                    {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-stone-400 font-mono">
                      {formatFileSize(selectedFile.size)} · {isPdf ? 'PDF 文档' : '图片文件'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-100"
                  >
                    更换
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    disabled={loading}
                    className="p-1 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="移除所选文件"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              文件标题名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="如：2023年冬季三件套手工量体单及面料存根.pdf"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">档案备注与工艺细节摘要</label>
            <textarea
              rows={2}
              disabled={loading}
              placeholder="如：纸质单字迹微淡，当时采用Scabal面料，右肩胛骨微倾"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800 bg-white"
            />
          </div>

          {/* Upload progress indicator */}
          {loading && (
            <div className="space-y-1.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
                <span className="flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在上传并归档文件至安全存储...</span>
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 rounded-xl hover:bg-stone-800 shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>上传中 {uploadProgress}%</span>
                </>
              ) : (
                <span>确认上传归档</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
