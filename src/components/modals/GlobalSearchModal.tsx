import React, { useState, useMemo } from 'react';
import { Search, X, User, ShoppingBag, Layers, Scissors, ArrowRight } from 'lucide-react';
import { Customer, Order, Material, Style } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  orders: Order[];
  materials: Material[];
  styles: Style[];
  onSelectCustomer: (customer: Customer) => void;
  onSelectOrder: (order: Order) => void;
  onSelectMaterial: (material: Material) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  orders,
  materials,
  styles,
  onSelectCustomer,
  onSelectOrder,
  onSelectMaterial,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const trimmed = searchTerm.trim().toLowerCase();

  const matchedCustomers = useMemo(() => {
    if (!trimmed) return [];
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(trimmed) ||
        c.phone.includes(trimmed) ||
        c.customerId.toLowerCase().includes(trimmed)
    ).slice(0, 5);
  }, [customers, trimmed]);

  const matchedOrders = useMemo(() => {
    if (!trimmed) return [];
    return orders.filter(
      o =>
        o.orderId.toLowerCase().includes(trimmed) ||
        o.customerName.toLowerCase().includes(trimmed) ||
        o.customerPhone.includes(trimmed)
    ).slice(0, 5);
  }, [orders, trimmed]);

  const matchedMaterials = useMemo(() => {
    if (!trimmed) return [];
    return materials.filter(
      m =>
        m.name.toLowerCase().includes(trimmed) ||
        m.materialId.toLowerCase().includes(trimmed) ||
        m.brand.toLowerCase().includes(trimmed)
    ).slice(0, 5);
  }, [materials, trimmed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200 bg-stone-50">
          <Search className="w-5 h-5 text-stone-400 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="输入客户姓名、手机号、客户编号、订单号、面料名称..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-hidden text-stone-900 placeholder-stone-400"
          />
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {!trimmed && (
            <div className="py-8 text-center text-xs text-stone-400">
              支持快速定位 500+ 位档案客户、定制订单以及库房面料...
            </div>
          )}

          {trimmed && matchedCustomers.length === 0 && matchedOrders.length === 0 && matchedMaterials.length === 0 && (
            <div className="py-8 text-center text-xs text-stone-500">
              未找到与 "{searchTerm}" 相关的内容，请尝试输入姓名或手机号
            </div>
          )}

          {/* Customers */}
          {matchedCustomers.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2">
                匹配客户 ({matchedCustomers.length})
              </span>
              <div className="mt-1 space-y-1">
                {matchedCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-stone-100 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-xs">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                          <span>{c.name}</span>
                          <span className="text-xs font-mono text-stone-500">{c.phone}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded-sm">
                            {c.level.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">
                          编号: {c.customerId} · 储值余额: {formatMoney(c.walletBalance)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {matchedOrders.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2">
                匹配订单 ({matchedOrders.length})
              </span>
              <div className="mt-1 space-y-1">
                {matchedOrders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => {
                      onSelectOrder(o);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-stone-100 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <ShoppingBag className="w-5 h-5 text-amber-700" />
                      <div>
                        <div className="text-sm font-bold text-stone-900">
                          {o.orderId} · {o.customerName}
                        </div>
                        <p className="text-xs text-stone-400">
                          应付: {formatMoney(o.payableAmount)} · 下单: {formatDate(o.createdAt)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {matchedMaterials.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2">
                匹配面料 ({matchedMaterials.length})
              </span>
              <div className="mt-1 space-y-1">
                {matchedMaterials.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectMaterial(m);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-stone-100 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Layers className="w-5 h-5 text-indigo-700" />
                      <div>
                        <div className="text-sm font-bold text-stone-900">{m.name}</div>
                        <p className="text-xs text-stone-400">
                          品牌: {m.brand} · 结存库存: {m.stockQuantity}m · 售价: {formatMoney(m.salePrice)}/m
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
