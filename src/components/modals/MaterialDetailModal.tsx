import React, { useState, useRef } from 'react';
import {
  X,
  Layers,
  Upload,
  Trash2,
  CheckCircle2,
  Star,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Material } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { storageService } from '../../services/storageService';

interface MaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onUpdateMaterial: (materialId: string, updates: Partial<Material>) => Promise<void>;
  onOpenInventoryModal?: (material: Material) => void;
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  isOpen,
  onClose,
  material,
  onUpdateMaterial,
  onOpenInventoryModal,
}) => {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !material) return null;

  const images = material.imageUrls || [];
  const currentImage = images[selectedImgIndex] || images[0] || '';

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError('');
      setSuccessMsg('');

      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 0.3) / files.length) * 100));
        const res = await storageService.uploadFile(file, 'materials');
        uploadedUrls.push(res.url);
      }

      setUploadProgress(100);
      const newUrls = [...images, ...uploadedUrls];
      await onUpdateMaterial(material.id, { imageUrls: newUrls });
      setSelectedImgIndex(newUrls.length - 1);
      setSuccessMsg(`成功上传并绑定 ${uploadedUrls.length} 张面料高清实物图！`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err?.message || '面料图片上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (indexToDelete: number) => {
    if (!window.confirm('确定要删除这张面料照片吗？')) return;
    try {
      const urlToDelete = images[indexToDelete];
      const newUrls = images.filter((_, idx) => idx !== indexToDelete);
      await onUpdateMaterial(material.id, { imageUrls: newUrls });
      await storageService.deleteFile(urlToDelete);
      setSelectedImgIndex(prev => Math.max(0, Math.min(prev, newUrls.length - 1)));
      setSuccessMsg('面料图片已成功删除');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      setError(err?.message || '删除图片失败');
    }
  };

  const handleSetPrimary = async (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    const targetUrl = images[indexToPrimary];
    const remaining = images.filter((_, idx) => idx !== indexToPrimary);
    const newUrls = [targetUrl, ...remaining];
    await onUpdateMaterial(material.id, { imageUrls: newUrls });
    setSelectedImgIndex(0);
    setSuccessMsg('已将该图片设为面料封面首图');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold tracking-wide">
                面料实物档案与花色图集 · {material.name}
              </h3>
              <p className="text-[11px] text-stone-300 font-mono">
                编号：{material.materialId} · 品牌：{material.brand}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Top Section: Photo Viewer & Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left 7 cols: Main Photo Showcase */}
            <div className="md:col-span-7 space-y-3">
              <div className="relative aspect-4/3 sm:aspect-16/10 bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 shadow-inner flex items-center justify-center group">
                {currentImage ? (
                  <>
                    <img
                      src={currentImage}
                      alt={material.name}
                      className="w-full h-full object-contain sm:object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-stone-950/75 text-white text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-xs font-mono">
                      图 {selectedImgIndex + 1} / {images.length}
                      {selectedImgIndex === 0 && ' · 封面主图'}
                    </div>

                    <div className="absolute bottom-3 right-3 flex items-center space-x-2 bg-stone-950/70 p-1.5 rounded-xl backdrop-blur-xs">
                      {selectedImgIndex !== 0 && (
                        <button
                          onClick={() => handleSetPrimary(selectedImgIndex)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                          title="设为封面首图"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>设为主图</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(selectedImgIndex)}
                        className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-600/80 rounded-lg cursor-pointer transition-colors"
                        title="删除当前图片"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImgIndex((selectedImgIndex - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full cursor-pointer transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedImgIndex((selectedImgIndex + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full cursor-pointer transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center p-6 text-stone-400 space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-stone-500" />
                    <p className="text-xs">暂未上传该面料实物实拍图</p>
                    <p className="text-[11px] text-stone-500">点击下方按钮直接从电脑/手机选择照片上传</p>
                  </div>
                )}
              </div>

              {/* Thumbnails Strip & Upload Button */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
                {/* Hidden input for local file selection */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={e => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-16 w-20 shrink-0 border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-xl bg-stone-50 hover:bg-stone-100 flex flex-col items-center justify-center text-stone-600 transition-colors cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-stone-500 mb-0.5" />
                      <span className="text-[10px] font-bold">本地加图</span>
                    </>
                  )}
                </button>

                {images.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImgIndex(idx)}
                    className={`h-16 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                      selectedImgIndex === idx
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`缩略图 ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-white text-[9px] text-center font-bold">
                        主图
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {uploading && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-amber-900">
                    <span>面料照片正在上传并同步存储...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-1.5 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Specs Card */}
            <div className="md:col-span-5 bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-4">
              <div>
                <span className="text-xs font-mono text-stone-400">#{material.materialId}</span>
                <h4 className="text-base font-bold text-stone-900">{material.name}</h4>
                <p className="text-xs font-semibold text-amber-800">{material.brand}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {material.category.map(c => (
                    <span key={c} className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded-md font-medium text-stone-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-stone-200 pt-3">
                <div className="bg-white p-2 rounded-lg border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">面料成分</span>
                  <strong className="text-stone-800">{material.composition}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">克重</span>
                  <strong className="text-stone-800">{material.weight} g/m</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">花色纹理</span>
                  <strong className="text-stone-800">{material.pattern}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">颜色</span>
                  <strong className="text-stone-800">{material.color}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">适用季节</span>
                  <strong className="text-stone-800">{material.season}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">展厅/库位</span>
                  <strong className="text-stone-800">{material.location}</strong>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-stone-500">当前实物结存：</span>
                  <span className={`text-base font-bold font-mono ${material.stockQuantity <= material.safetyStock ? 'text-rose-600' : 'text-stone-900'}`}>
                    {material.stockQuantity} 米
                  </span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>安全警戒库存：</span>
                  <span>{material.safetyStock} 米</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>定制零售标价：</span>
                  <span className="font-bold text-amber-900">{formatMoney(material.salePrice)} / 米</span>
                </div>
              </div>

              {onOpenInventoryModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInventoryModal(material);
                  }}
                  className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  登记该面料出入库 / 盘点
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-400">
            支持随时追加拍摄实物高清细节图，照片保存在云端系统，手机与电脑实时同步。
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
