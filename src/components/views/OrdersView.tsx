import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Printer,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import {
  formatMoney,
  formatDate,
  getOrderStatusBadge,
} from '../../utils/formatters';

interface OrdersViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onOpenCreateOrder: () => void;
  onOpenPrintOrder: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onSelectOrder,
  onOpenCreateOrder,
  onOpenPrintOrder,
  onDeleteOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =
        o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerPhone.includes(searchTerm);

      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header and Filter */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <span>定制订单管理</span>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
                共 {orders.length} 笔定制订单
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              记录订单完整生命周期状态、选配面料与工艺、下单当时量体快照及收款账目
            </p>
          </div>

          <button
            onClick={onOpenCreateOrder}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ 新建立项定制订单</span>
          </button>
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="按订单号 (如 ORD-202610-0001)、客户姓名、手机号搜索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50 font-medium text-stone-700"
            >
              <option value="all">全部订单状态</option>
              <option value="pending">待确认</option>
              <option value="placed">已下单</option>
              <option value="making">制作中 (裁剪制版)</option>
              <option value="processing">处理中 (试衣调整)</option>
              <option value="completed">已完成 (待取货)</option>
              <option value="picked_up">已取货 (交付结清)</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200">
                <th className="py-3 px-4">订单编号</th>
                <th className="py-3 px-4">客户信息</th>
                <th className="py-3 px-4">定制商品内容</th>
                <th className="py-3 px-4">订单状态</th>
                <th className="py-3 px-4">应付总额</th>
                <th className="py-3 px-4">已收款 (定金+尾款)</th>
                <th className="py-3 px-4">待收尾款</th>
                <th className="py-3 px-4">预计交付</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    未找到符合条件的定制订单
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const statusBadge = getOrderStatusBadge(o.status);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => onSelectOrder(o)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-500">
                        {o.orderId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-stone-900 group-hover:text-amber-900 block">
                          {o.customerName}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">{o.customerPhone}</span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-stone-800 truncate">
                          {o.items.map(it => `${it.productName} ×${it.quantity}`).join('、')}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">
                          面料: {o.items[0]?.materialNameSnapshot || '精选面料'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {formatMoney(o.payableAmount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                        {formatMoney(o.paidAmount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {o.unpaidAmount > 0 ? (
                          <span className="text-rose-600 font-bold">{formatMoney(o.unpaidAmount)}</span>
                        ) : (
                          <span className="text-stone-400">¥0.00</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-stone-500 font-mono">
                        {formatDate(o.estimatedDeliveryDate)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onOpenPrintOrder(o);
                            }}
                            className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                            title="A4打印"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onSelectOrder(o);
                            }}
                            className="px-2.5 py-1 text-xs text-stone-700 bg-stone-100 group-hover:bg-amber-100 group-hover:text-amber-900 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center space-x-0.5"
                          >
                            <span>详情</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteOrder && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onDeleteOrder(o);
                              }}
                              className="px-2 py-1 text-xs text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                              title="删除该定制订单"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>删除</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
