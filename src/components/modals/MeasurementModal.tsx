import React, { useState } from 'react';
import { X, Ruler, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Customer, CustomMeasurementItem } from '../../types';

interface MeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onSave: (data: any) => Promise<void>;
  operatorName?: string;
}

export const MeasurementModal: React.FC<MeasurementModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSave,
  operatorName = '刘师傅(主裁)',
}) => {
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCurrent, setIsCurrent] = useState(true);
  const [height, setHeight] = useState<string>('178');
  const [weight, setWeight] = useState<string>('74');
  const [shoulder, setShoulder] = useState<string>('46.5');
  const [chest, setChest] = useState<string>('101');
  const [waist, setWaist] = useState<string>('86');
  const [hips, setHips] = useState<string>('99');
  const [sleeveLength, setSleeveLength] = useState<string>('61.5');
  const [clothLength, setClothLength] = useState<string>('74.5');
  const [upperArm, setUpperArm] = useState<string>('33.5');
  const [wrist, setWrist] = useState<string>('17.5');

  // Custom items
  const [customItems, setCustomItems] = useState<CustomMeasurementItem[]>([
    { name: '领围', value: 41, unit: 'cm', remark: '放量2cm' },
    { name: '裤长', value: 102, unit: 'cm', remark: '微悬口' },
    { name: '大腿围', value: 58.5, unit: 'cm', remark: '舒适' },
  ]);

  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddCustomItem = () => {
    setCustomItems([...customItems, { name: '', value: 0, unit: 'cm', remark: '' }]);
  };

  const handleRemoveCustomItem = (idx: number) => {
    setCustomItems(customItems.filter((_, i) => i !== idx));
  };

  const handleCustomItemChange = (idx: number, field: keyof CustomMeasurementItem, val: any) => {
    const updated = [...customItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setCustomItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureDate) {
      setError('请选择量体日期');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const filteredCustom = customItems.filter(i => i.name.trim() !== '' && Number(i.value) > 0);

      await onSave({
        customerId: customer.id,
        customerName: customer.name,
        measureDate,
        isCurrent,
        operatorId: 'staff-01',
        operatorName,
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        shoulder: shoulder ? Number(shoulder) : undefined,
        chest: chest ? Number(chest) : undefined,
        waist: waist ? Number(waist) : undefined,
        hips: hips ? Number(hips) : undefined,
        sleeveLength: sleeveLength ? Number(sleeveLength) : undefined,
        clothLength: clothLength ? Number(clothLength) : undefined,
        upperArm: upperArm ? Number(upperArm) : undefined,
        wrist: wrist ? Number(wrist) : undefined,
        customItems: filteredCustom,
        remarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '保存量体失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-stone-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white shrink-0">
          <div className="flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold tracking-wide">
                录入量体记录 · {customer.name} ({customer.phone})
              </h3>
              <p className="text-xs text-stone-300">
                量体数据多版本独立归档，历史记录不覆盖，支持对比与追溯
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Top meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">量体日期 *</label>
              <input
                type="date"
                required
                value={measureDate}
                onChange={e => setMeasureDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">量体师 (操作人)</label>
              <input
                type="text"
                value={operatorName}
                readOnly
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-stone-100 text-stone-600"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={e => setIsCurrent(e.target.checked)}
                  className="w-4 h-4 text-stone-900 rounded-sm focus:ring-stone-800"
                />
                <span className="text-sm font-medium text-stone-800 flex items-center space-x-1">
                  <span>设为当前主生效量体</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                </span>
              </label>
            </div>
          </div>

          {/* Standard body sizes */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 border-b border-stone-200 pb-2 mb-3 flex items-center justify-between">
              <span>核心体型尺寸 (标准单位: cm / kg)</span>
              <span className="text-xs font-normal text-stone-500">西装/衬衫制版核心依据</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">身高 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">体重 (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">肩宽 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={shoulder}
                  onChange={e => setShoulder(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium text-amber-900 bg-amber-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">净胸围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={chest}
                  onChange={e => setChest(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium text-amber-900 bg-amber-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">腰围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={e => setWaist(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium text-amber-900 bg-amber-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">臀围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={hips}
                  onChange={e => setHips(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">袖长 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sleeveLength}
                  onChange={e => setSleeveLength(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">衣长 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={clothLength}
                  onChange={e => setClothLength(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">上臂围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={upperArm}
                  onChange={e => setUpperArm(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">手腕围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={wrist}
                  onChange={e => setWrist(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-stone-800 text-center font-medium"
                />
              </div>
            </div>
          </div>

          {/* Custom measurement items (measurementItems) */}
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900">个性化制版扩充项 (自定义部位)</h4>
                <p className="text-xs text-stone-500">支持裤长、领围、大腿围、前胸宽、后背宽等特殊项目</p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-2.5 py-1 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-md flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加测量部位</span>
              </button>
            </div>

            <div className="space-y-2">
              {customItems.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-stone-50 p-2 rounded-lg border border-stone-200">
                  <input
                    type="text"
                    placeholder="部位名称 (如: 领围)"
                    value={item.name}
                    onChange={e => handleCustomItemChange(idx, 'name', e.target.value)}
                    className="w-32 px-2.5 py-1.5 text-xs border border-stone-300 rounded-md bg-white font-medium"
                  />
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="数值"
                      value={item.value || ''}
                      onChange={e => handleCustomItemChange(idx, 'value', Number(e.target.value))}
                      className="w-20 px-2 py-1.5 text-xs border border-stone-300 rounded-md bg-white text-center font-semibold text-stone-900"
                    />
                    <span className="text-xs text-stone-500">{item.unit || 'cm'}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="工艺说明 (如: 净体+2cm放量/高腰/微喇)"
                    value={item.remark || ''}
                    onChange={e => handleCustomItemChange(idx, 'remark', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-stone-300 rounded-md bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomItem(idx)}
                    className="text-stone-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              本次量体师建议与体型特征说明
            </label>
            <textarea
              rows={2}
              placeholder="例：右肩胛骨微倾，右肩加垫片0.5cm平衡；挺胸体态，前腰节放长1cm防后翘等。"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs cursor-pointer flex items-center space-x-1"
            >
              {loading ? <span>保存中...</span> : <span>保存量体档案</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
