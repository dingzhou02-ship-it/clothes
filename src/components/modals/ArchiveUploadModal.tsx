import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Customer } from '../../types';
import { storageService, UploadResult } from '../../services/storageService';

type UploadStage =
  | 'idle'
  | 'uploading_file'
  | 'file_uploaded'
  | 'saving_metadata'
  | 'verifying_read'
  | 'completed'
  | 'failed_upload'
  | 'failed_metadata';

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
    mimeType?: string;
    storageMode?: 'firebase_storage' | 'firestore_chunks' | 'data_url' | 'external_url';
    chunkCount?: number;
    verifyStatus?: 'verified' | 'pending';
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
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<UploadResult | null>(null);
  const [stage, setStage] = useState<UploadStage>('idle');
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
    setLocalPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setUploadedResult(null);
    setStage('idle');
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

    if (file.size > 15 * 1024 * 1024) {
      setError('文件过大：单个文件大小请勿超过 15MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    setLocalPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith('image/') || !file.name.toLowerCase().endsWith('.pdf')
        ? URL.createObjectURL(file)
        : null;
    });
    setUploadedResult(null);
    setStage('idle');
    setUploadProgress(0);
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

  const executeUploadFlow = async (reuseUploaded?: UploadResult | null) => {
    if (!currentCustomer) {
      setError('请选择所属客户');
      return;
    }
    if (!selectedFile && !reuseUploaded) {
      setError('请先点击或拖拽选择本地档案文件（PDF 或 照片）');
      return;
    }
    if (!fileName.trim()) {
      setError('请填写档案或扫描件文件名称');
      return;
    }

    setLoading(true);
    setError('');

    let currentUpload = reuseUploaded || uploadedResult;

    try {
      // Stage 1: Upload File to Cloud Chunks (if not already uploaded)
      if (!currentUpload && selectedFile) {
        setStage('uploading_file');
        setUploadProgress(0);
        currentUpload = await storageService.uploadFile(selectedFile, 'archives', progress => {
          setUploadProgress(progress);
        });
        setUploadedResult(currentUpload);
        setStage('file_uploaded');
      }
    } catch (uploadErr: any) {
      setStage('failed_upload');
      setError(uploadErr?.message || '文件上传至云端存储失败，请检查网络或重试');
      setLoading(false);
      return;
    }

    if (!currentUpload) {
      setStage('failed_upload');
      setError('未获取到已上传的文件数据，请重试');
      setLoading(false);
      return;
    }

    try {
      // Stage 2: Save Metadata Record to Firestore and link customer
      setStage('saving_metadata');
      await onUploadSuccess({
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        fileName: fileName.trim(),
        fileType,
        year: Number(year),
        fileUrl: currentUpload.url,
        fileSize: currentUpload.size,
        mimeType: currentUpload.type,
        storageMode: currentUpload.storageType,
        chunkCount: currentUpload.chunkCount,
        verifyStatus: 'verified',
        remarks: remarks.trim(),
      });

      // Stage 3: Verify file is readable from cloud
      setStage('verifying_read');
      const readable = await storageService.verifyFileReadable(
        currentUpload.url,
        currentUpload.chunkCount
      );
      if (!readable) {
        throw new Error('档案记录已保存，但云端读取校验未通过，请点击重试校验');
      }

      setStage('completed');
      setTimeout(() => {
        onClose();
      }, 450);
    } catch (metaErr: any) {
      setStage('failed_metadata');
      setError(
        metaErr?.message ||
          '文件已上传成功，但写入客户档案记录失败。您可以直接点击“仅重试保存档案记录”恢复，无需重新上传文件。'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeUploadFlow(uploadedResult);
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
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`p-2.5 rounded-xl text-white shrink-0 ${isPdf ? 'bg-rose-600' : 'bg-blue-600'}`}>
                      {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-stone-400 font-mono">
                        {formatFileSize(selectedFile.size)} · {isPdf ? 'PDF 文档' : '图片档案（上传后将直接以高清图片形式呈现）'}
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
                      onClick={() => {
                        setSelectedFile(null);
                        if (localPreviewUrl) {
                          URL.revokeObjectURL(localPreviewUrl);
                          setLocalPreviewUrl(null);
                        }
                      }}
                      disabled={loading}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="移除所选文件"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {localPreviewUrl && !isPdf && (
                  <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-900/95 flex items-center justify-center max-h-60">
                    <img
                      src={localPreviewUrl}
                      alt={selectedFile.name}
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                )}
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

          {/* 3-Stage Upload & Verification Status Indicator */}
          {stage !== 'idle' && (
            <div className="space-y-2.5 p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                <span className="flex items-center space-x-1.5">
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  ) : stage === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {stage === 'uploading_file' && '阶段 1/3：正在将文件分片上传至云端安全存储...'}
                    {stage === 'file_uploaded' && '阶段 1/3：文件已上传成功，准备写入档案记录...'}
                    {stage === 'saving_metadata' && '阶段 2/3：正在将档案元数据写入云端数据库并关联客户...'}
                    {stage === 'verifying_read' && '阶段 3/3：正在校验云端档案完整性与可读取状态...'}
                    {stage === 'completed' && '全部完成：文件已上传、档案记录已保存且校验可正常读取！'}
                    {stage === 'failed_upload' && '上传中断：文件上传至云端存储未完成'}
                    {stage === 'failed_metadata' && '待恢复：文件已上传成功，但档案记录写入未完成'}
                  </span>
                </span>
                <span className="font-mono text-amber-700 font-bold">{uploadProgress}%</span>
              </div>

              <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    stage === 'completed'
                      ? 'bg-emerald-600'
                      : stage === 'failed_upload' || stage === 'failed_metadata'
                      ? 'bg-rose-500'
                      : 'bg-amber-600'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* 3 Distinct Status Checkpoints */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-lg border ${
                    uploadedResult
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : stage === 'uploading_file'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-white border-stone-200 text-stone-400'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">1. 文件上传成功</span>
                </div>
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-lg border ${
                    stage === 'verifying_read' || stage === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : stage === 'saving_metadata'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : stage === 'failed_metadata'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-white border-stone-200 text-stone-400'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">2. 档案记录保存</span>
                </div>
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-lg border ${
                    stage === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : stage === 'verifying_read'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-white border-stone-200 text-stone-400'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="truncate">3. 档案正常读取</span>
                </div>
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

            {stage === 'failed_metadata' && uploadedResult && (
              <button
                type="button"
                disabled={loading}
                onClick={() => executeUploadFlow(uploadedResult)}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>仅重试保存档案记录 (无需重传文件)</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 rounded-xl hover:bg-stone-800 shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在处理 ({uploadProgress}%)</span>
                </>
              ) : stage === 'failed_upload' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>重新上传文件</span>
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
