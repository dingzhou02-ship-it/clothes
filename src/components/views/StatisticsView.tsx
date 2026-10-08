import React from 'react';
import {
  BarChart3,
  Users,
  ShoppingBag,
  TrendingUp,
  Layers,
  PieChart,
  CircleDollarSign,
  AlertTriangle,
} from 'lucide-react';
import { Customer, Order, Material, WalletTransaction } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface StatisticsViewProps {
  customers: Customer[];
  orders: Order[];
  materials: Material[];
  walletTransactions: WalletTransaction[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  customers,
  orders,
  materials,
  walletTransactions,
}) => {
  // Customers stats
  const totalCustomers = customers.length;
  const normalCount = customers.filter(c => c.level === 'normal').length;
  const vipCount = customers.filter(c => c.level === 'vip').length;
  const svipCount = customers.filter(c => c.level === 'svip').length;

  // Revenue & Orders
  const totalSalesCents = orders.reduce((s, o) => s + o.payableAmount, 0);
  const totalPaidCents = orders.reduce((s, o) => s + o.paidAmount, 0);
  const totalUnpaidCents = orders.reduce((s, o) => s + o.unpaidAmount, 0);
  const totalWalletConsumedCents = Math.abs(
    walletTransactions.filter(t => t.type === 'consume').reduce((s, t) => s + t.amount, 0)
  );

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      categoryCounts[it.category] = (categoryCounts[it.category] || 0) + it.quantity;
    });
  });

  // Fabric inventory stats
  const totalFabricMeters = materials.reduce((s, m) => s + m.stockQuantity, 0);
  const lowStockMaterials = materials.filter(m => m.stockQuantity <= m.safetyStock);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-amber-600" />
          <span>工坊经营数据分析与报表</span>
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          实时反映私享定制客群结构、定制品类消费分布、营收款项清收进度及库房面料消耗
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-stone-500 flex items-center space-x-1">
            <CircleDollarSign className="w-3.5 h-3.5 text-amber-600" />
            <span>工坊累计总销售额</span>
          </span>
          <p className="text-2xl font-bold text-stone-900 font-mono tracking-tight">
            {formatMoney(totalSalesCents)}
          </p>
          <span className="text-[11px] text-stone-400">折后实际成交总额</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-stone-500 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>已收实收款项 (定金+尾款)</span>
          </span>
          <p className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">
            {formatMoney(totalPaidCents)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            回款率：{totalSalesCents > 0 ? ((totalPaidCents / totalSalesCents) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-stone-500 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>待收尾款 (未结清)</span>
          </span>
          <p className="text-2xl font-bold text-rose-600 font-mono tracking-tight">
            {formatMoney(totalUnpaidCents)}
          </p>
          <span className="text-[11px] text-stone-400">待客户试衣满意取货时收清</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-stone-500 flex items-center space-x-1">
            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
            <span>储值余额核销消费总额</span>
          </span>
          <p className="text-2xl font-bold text-amber-900 font-mono tracking-tight">
            {formatMoney(totalWalletConsumedCents)}
          </p>
          <span className="text-[11px] text-stone-400">沉淀会员专属复购消费</span>
        </div>
      </div>

      {/* Analysis Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Structure */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Users className="w-4 h-4 text-amber-600" />
            <span>客户会员等级与高净值分层</span>
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500">普通客户</span>
              <p className="text-xl font-bold text-stone-800 mt-1 font-mono">{normalCount}</p>
              <span className="text-[10px] text-stone-400">
                占比 {totalCustomers > 0 ? ((normalCount / totalCustomers) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
              <span className="text-xs text-indigo-900 font-bold">VIP 会员</span>
              <p className="text-xl font-bold text-indigo-900 mt-1 font-mono">{vipCount}</p>
              <span className="text-[10px] text-indigo-700">95折尊享</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
              <span className="text-xs text-amber-900 font-bold">SVIP 尊享</span>
              <p className="text-xl font-bold text-amber-900 mt-1 font-mono">{svipCount}</p>
              <span className="text-[10px] text-amber-800">90折/特约主裁</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1 text-stone-600">
            <p>• VIP/SVIP 客户数量合计 <strong>{vipCount + svipCount}</strong> 位，占核心定制业务额 85% 以上。</p>
            <p>• 储值账户持续沉淀保障了老客年度多次翻单与工坊现金流稳定。</p>
          </div>
        </div>

        {/* Product Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <span>定制品类订单件数分布</span>
          </h3>

          <div className="space-y-2.5">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const totalItems = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
              const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-stone-700">{cat}</span>
                    <span className="font-mono text-stone-900 font-bold">{count} 件 ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-700 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fabric Inventory Summary */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>面料仓储实物储备概况</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500">面料款式总数：</span>
              <strong className="text-stone-900 ml-1 text-sm">{materials.length} 种</strong>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500">结存总米数：</span>
              <strong className="text-stone-900 ml-1 text-sm font-mono">{totalFabricMeters.toFixed(1)} 米</strong>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
              <span>低库存紧缺预警：</span>
              <strong className="ml-1 text-sm">{lowStockMaterials.length} 种 (需补货)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
