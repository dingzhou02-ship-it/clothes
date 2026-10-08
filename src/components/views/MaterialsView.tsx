import React, { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  History,
  Tag,
} from 'lucide-react';
import { Material, InventoryTransaction } from '../../types';
import { formatMoney, formatDateTime } from '../../utils/formatters';

interface MaterialsViewProps {
  materials: Material[];
  transactions: InventoryTransaction[];
  onOpenCreateMaterial: () => void;
  onOpenInventoryModal: (material?: Material) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  materials,
  transactions,
  onOpenCreateMaterial,
  onOpenInventoryModal,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredMaterials = materials.filter(m => {
    const matchSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.materialId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' || m.category.includes(selectedCategory);
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-amber-600" />
              <span>面料档案与库存流水</span>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
                {materials.length} 种在库面料
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              以米(m)为单位严密核算，每一米面料的出库消耗、采购入库与盘点均严格留存不可变审计流水
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => onOpenInventoryModal()}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer"
            >
              出入库 / 盘点校准
            </button>
            <button
              onClick={onOpenCreateMaterial}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ 录入新面料</span>
            </button>
          </div>
        </div>

        {/* Tab switch & filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              面料图文花色库 ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              出入库变动历史流水 ({transactions.length})
            </button>
          </div>

          {activeTab === 'catalog' && (
            <div className="flex items-center space-x-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-stone-200 rounded-lg bg-stone-50"
              >
                <option value="all">全部品类适用</option>
                <option value="西服">西服适用</option>
                <option value="衬衫">衬衫适用</option>
                <option value="大衣">大衣适用</option>
                <option value="中式服装">中式服装适用</option>
                <option value="裤装">裤装适用</option>
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="搜索面料品名、品牌..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 text-xs border border-stone-200 rounded-lg bg-stone-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Catalog */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map(m => {
            const isLowStock = m.stockQuantity <= m.safetyStock;
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:border-stone-400 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Fabric Photo */}
                  <div className="h-44 bg-stone-100 overflow-hidden relative">
                    {m.imageUrls && m.imageUrls[0] ? (
                      <img
                        src={m.imageUrls[0]}
                        alt={m.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                        暂无面料照片
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {m.category.map(cat => (
                        <span key={cat} className="bg-stone-900/80 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs font-medium">
                          {cat}
                        </span>
                      ))}
                    </div>
                    {isLowStock && (
                      <div className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center space-x-1 shadow-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>库存紧缺预警</span>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <span className="text-[11px] font-mono text-stone-400">#{m.materialId}</span>
                      <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{m.name}</h3>
                      <p className="text-xs font-semibold text-amber-800">{m.brand}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-stone-600 border-t border-stone-100 pt-2">
                      <div>成分：<span className="text-stone-800 font-medium">{m.composition}</span></div>
                      <div>克重：<span className="text-stone-800 font-medium">{m.weight}g/m</span></div>
                      <div>花色：<span className="text-stone-800 font-medium">{m.pattern}</span></div>
                      <div>季节：<span className="text-stone-800 font-medium">{m.season}</span></div>
                      <div className="col-span-2">库位：<span className="text-stone-800 font-medium">{m.location}</span></div>
                    </div>

                    {m.remarks && (
                      <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg">
                        {m.remarks}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer with stock & actions */}
                <div className="p-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-[11px] text-stone-500">结存库存：</span>
                      <span className={`text-base font-bold font-mono ${isLowStock ? 'text-rose-600' : 'text-stone-900'}`}>
                        {m.stockQuantity} 米
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400">安全线: {m.safetyStock}m · 售价: {formatMoney(m.salePrice)}/m</span>
                  </div>

                  <button
                    onClick={() => onOpenInventoryModal(m)}
                    className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-xs"
                  >
                    增减库存
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Inventory Transactions Ledger */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">流水编号</th>
                  <th className="py-3 px-4">面料品名</th>
                  <th className="py-3 px-4">操作类型</th>
                  <th className="py-3 px-4">变动米数</th>
                  <th className="py-3 px-4">变动前库存</th>
                  <th className="py-3 px-4">变动后库存</th>
                  <th className="py-3 px-4">关联订单</th>
                  <th className="py-3 px-4">操作人</th>
                  <th className="py-3 px-4">时间 / 备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-stone-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-400">
                      {tx.transactionId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      {tx.materialName || tx.materialId}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                        tx.quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {tx.type === 'purchase_in' ? '采购入库' :
                         tx.type === 'order_consume' ? '裁剪消耗' :
                         tx.type === 'manual_in' ? '手工入库' :
                         tx.type === 'manual_out' ? '手工出库' : '盘点校准'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={tx.quantity > 0 ? 'text-emerald-700' : 'text-stone-800'}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} 米
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-500">{tx.beforeQuantity} 米</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{tx.afterQuantity} 米</td>
                    <td className="py-3.5 px-4 font-mono text-amber-800">
                      {tx.relatedOrderId || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{tx.operatorName || tx.operatorId}</td>
                    <td className="py-3.5 px-4 text-stone-500">
                      <div>{tx.remarks}</div>
                      <span className="text-[10px] text-stone-400">{formatDateTime(tx.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
