import React, { useState, useRef } from 'react';
import { X, Layers, AlertCircle, Upload, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { Material } from '../../types';
import { storageService } from '../../services/storageService';

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const CreateMaterialModal: React.FC<CreateMaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Scabal');
  const [categories, setCategories] = useState<string[]>(['西服']);
  const [composition, setComposition] = useState('100% 羊毛');
  const [color, setColor] = useState('深灰');
  const [pattern, setPattern] = useState('细人字纹');
  const [weight, setWeight] = useState<number>(280);
  const [season, setSeason] = useState('四季');
  const [costPriceYuan, setCostPriceYuan] = useState<number>(450);
  const [salePriceYuan, setSalePriceYuan] = useState<number>(1200);
  const [stockQuantity, setStockQuantity] = useState<number>(25.0);
  const [safetyStock, setSafetyStock] = useState<number>(6.0);
  const [location, setLocation] = useState('A区-01架');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingImg(true);
      setError('');
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await storageService.uploadFile(files[i], 'materials');
        uploaded.push(res.url);
      }
      setImageUrls(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      setError(err?.message || '图片上传失败');
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const allCategories = ['西服', '衬衫', '大衣', '中式服装', '女装', '裤装', '其他'];

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter(c => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请填写真实面料品名');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        name: name.trim(),
        brand: brand.trim(),
        category: categories,
        composition: composition.trim(),
        color: color.trim(),
        pattern: pattern.trim(),
        weight: Number(weight),
        season: season.trim(),
        costPrice: Math.round(costPriceYuan * 100),
        salePrice: Math.round(salePriceYuan * 100),
        stockQuantity: Number(stockQuantity),
        safetyStock: Number(safetyStock),
        location: location.trim(),
        imageUrls: imageUrls,
        remarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '录入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold tracking-wide">录入新面料档案</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-stone-700 font-medium mb-1">
                面料全称品名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="如: VBC Super 110s 纯羊毛精纺深灰细条纹"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">面料品牌 / 原产地</label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">面料成分</label>
              <input
                type="text"
                value={composition}
                onChange={e => setComposition(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">颜色 / 花型</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="颜色"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="花型"
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">克重 (g/m) / 适用季节</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="克重"
                  value={weight}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="季节"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">进货成本 (元/米)</label>
              <input
                type="number"
                value={costPriceYuan}
                onChange={e => setCostPriceYuan(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">零售价格 (元/米)</label>
              <input
                type="number"
                value={salePriceYuan}
                onChange={e => setSalePriceYuan(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold text-amber-800"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">初始库存 (米)</label>
              <input
                type="number"
                step="0.5"
                value={stockQuantity}
                onChange={e => setStockQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">安全警戒库存 (米)</label>
              <input
                type="number"
                step="0.5"
                value={safetyStock}
                onChange={e => setSafetyStock(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 font-medium mb-1">存放库位 (如: A区-02号架)</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 font-medium mb-1">面料实物照片 (支持从本地文件夹上传多张)</label>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={e => handleImageUpload(e.target.files)}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImg}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  {uploadingImg ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : (
                    <Upload className="w-4 h-4 text-amber-600" />
                  )}
                  <span>{uploadingImg ? '照片上传中...' : '从本地文件夹选择图片'}</span>
                </button>
                <span className="text-[11px] text-stone-400">支持 JPG, JPEG, PNG, WEBP 高清实物拍摄图</span>
              </div>

              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 group">
                      <img src={url} alt={`面料图片 ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-white text-[9px] text-center font-bold">
                          主图
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-md transition-colors"
                        title="删除该张图片"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 font-medium mb-1">适用品类 (多选)</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      categories.includes(cat)
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 font-medium mb-1">面料工艺特性备注</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
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
              {loading ? '保存中...' : '确认录入面料'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
