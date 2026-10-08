import React, { useState } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { Material } from '../../types';

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
  const [imageUrl, setImageUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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
        imageUrls: imageUrl ? [imageUrl.trim()] : [],
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
              <label className="block text-stone-700 font-medium mb-1">面料图片 URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
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
