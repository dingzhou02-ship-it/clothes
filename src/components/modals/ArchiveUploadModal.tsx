import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, AlertCircle } from 'lucide-react';
import { Customer } from '../../types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
    setError('');
  }, [preselectedCustomer, customers, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      setError('请选择客户');
      return;
    }
    if (!fileName.trim()) {
      setError('请填写档案或扫描件文件名称');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Simulated clean PDF URL or actual blob
      const samplePdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

      await onUploadSuccess({
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        fileName: fileName.trim(),
        fileType,
        year: Number(year),
        fileUrl: samplePdfUrl,
        fileSize: Math.floor(Math.random() * 2000000) + 500000,
        remarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '归档上传失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold tracking-wide">上传纸质档案扫描件 (PDF归档)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">所属客户</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white font-medium"
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
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white font-semibold"
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
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white"
              >
                <option value="historical_order">历史纸质订单存根</option>
                <option value="historical_measurement">历史手写量体单</option>
                <option value="other">工坊手绘版型/面料小样档案</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              文件标题名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="如：2023年冬季三件套手工量体单及面料存根.pdf"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-700">点击上传或将 PDF/扫描件拖拽至此处</p>
            <p className="text-[11px] text-stone-400 mt-1">支持 PDF 文件与高清扫描件（不进行失真OCR，原图存档）</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">档案备注与工艺细节摘要</label>
            <textarea
              rows={2}
              placeholder="如：纸质单字迹微淡，当时采用Scabal面料，右肩胛骨微倾"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 rounded-lg hover:bg-stone-800 shadow-xs cursor-pointer"
            >
              {loading ? '上传归档中...' : '确认归档'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
