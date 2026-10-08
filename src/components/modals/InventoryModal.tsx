import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Material, InventoryTransactionType } from '../../types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  preselectedMaterial?: Material | null;
  onSubmitTransaction: (data: {
    materialId: string;
    materialName: string;
    type: InventoryTransactionType;
    quantity: number;
    beforeQuantity: number;
    afterQuantity: number;
    remarks: string;
  }) => Promise<void>;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  materials,
  preselectedMaterial,
  onSubmitTransaction,
}) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [type, setType] = useState<InventoryTransactionType>('purchase_in');
  const [quantity, setQuantity] = useState<number>(10); // meters
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentMaterial = materials.find(m => m.id === selectedMaterialId);

  useEffect(() => {
    if (preselectedMaterial) {
      setSelectedMaterialId(preselectedMaterial.id);
    } else if (materials.length > 0 && !selectedMaterialId) {
      setSelectedMaterialId(materials[0].id);
    }
    setError('');
  }, [preselectedMaterial, materials, isOpen]);

  if (!isOpen) return null;

  const beforeQty = currentMaterial?.stockQuantity || 0;
  // Calculate delta based on type
  const isPositive = type === 'purchase_in' || type === 'manual_in';
  const delta = isPositive ? Math.abs(quantity) : -Math.abs(quantity);
  const afterQty = Math.max(0, Number((beforeQty + delta).toFixed(2)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMaterial) {
      setError('请选择面料');
      return;
    }
    if (quantity <= 0) {
      setError('变动米数必须大于0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmitTransaction({
        materialId: currentMaterial.id,
        materialName: currentMaterial.name,
        type,
        quantity: delta,
        beforeQuantity: beforeQty,
        afterQuantity: afterQty,
        remarks: remarks.trim() || '日常出入库记账',
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '库存记录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold tracking-wide">面料库存变动登记 · 建立流水</h3>
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
            <label className="block text-xs font-medium text-stone-700 mb-1">选择面料</label>
            <select
              value={selectedMaterialId}
              onChange={e => setSelectedMaterialId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white font-medium"
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.brand} (当前库存: {m.stockQuantity}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">变动业务类型</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as InventoryTransactionType)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white"
            >
              <option value="purchase_in">采购新面料入库 (+)</option>
              <option value="manual_in">手工补库/赠送入库 (+)</option>
              <option value="order_consume">工坊裁剪领料消耗 (-)</option>
              <option value="manual_out">残损/抽样出库 (-)</option>
              <option value="audit_adjust">实物盘点校准差异 (修正)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              变动米数 (米/m) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 text-base font-bold border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 text-stone-900"
            />
          </div>

          {currentMaterial && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>变动前账面库存：</span>
                <strong>{beforeQty} 米</strong>
              </div>
              <div className="flex justify-between items-center text-stone-900 font-bold border-t border-stone-200 pt-1.5">
                <span>变动后结存库存：</span>
                <span className={afterQty <= currentMaterial.safetyStock ? 'text-rose-600 text-sm' : 'text-emerald-700 text-sm'}>
                  {afterQty} 米 {afterQty <= currentMaterial.safetyStock && '(低于安全库存!)'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">流水备注 / 批次凭证号</label>
            <input
              type="text"
              placeholder="如：意大利原厂发货箱单号 IT-202610，或某订单裁剪"
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
              {loading ? '正在写入流水...' : '确认更新库存流水'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
