import React from 'react';
import {
  Users,
  UserPlus,
  ShoppingBag,
  CircleDollarSign,
  Clock,
  AlertTriangle,
  Award,
  Crown,
  ChevronRight,
  Plus,
  Search,
  Wallet,
  Upload,
  Ruler,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Customer, Order, Material, OrderStatus } from '../../types';
import { formatMoney, formatDate, getOrderStatusBadge } from '../../utils/formatters';

interface WorkbenchViewProps {
  customers: Customer[];
  orders: Order[];
  materials: Material[];
  onOpenCreateCustomer: () => void;
  onOpenCreateOrder: () => void;
  onOpenGlobalSearch: () => void;
  onOpenRecharge: () => void;
  onOpenUploadArchive: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectOrder: (order: Order) => void;
  onSelectMaterial: (material: Material) => void;
  onNavigate: (view: string) => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  customers,
  orders,
  materials,
  onOpenCreateCustomer,
  onOpenCreateOrder,
  onOpenGlobalSearch,
  onOpenRecharge,
  onOpenUploadArchive,
  onSelectCustomer,
  onSelectOrder,
  onSelectMaterial,
  onNavigate,
}) => {
  // Statistics
  const totalCustomers = customers.length;
  const vipCount = customers.filter(c => c.level === 'vip').length;
  const svipCount = customers.filter(c => c.level === 'svip').length;

  // Monthly stats
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthCustomers = customers.filter(c => c.createdAt.startsWith(currentMonthStr)).length;
  const thisMonthOrders = orders.filter(o => o.createdAt.startsWith(currentMonthStr));
  const thisMonthSalesCents = thisMonthOrders.reduce((sum, o) => sum + o.payableAmount, 0);

  const makingOrders = orders.filter(o => o.status === 'making');
  const totalUnpaidCents = orders.reduce((sum, o) => sum + o.unpaidAmount, 0);

  // Status breakdown
  const statusCounts: Record<OrderStatus, number> = {
    pending: orders.filter(o => o.status === 'pending').length,
    placed: orders.filter(o => o.status === 'placed').length,
    making: orders.filter(o => o.status === 'making').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    picked_up: orders.filter(o => o.status === 'picked_up').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Low stock alert materials
  const lowStockMaterials = materials.filter(m => m.stockQuantity <= m.safetyStock);

  // Recent customers
  const recentCustomers = [...customers].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 5 Quick Action Shortcuts (Section 36) */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-4.5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold tracking-wide flex items-center space-x-2">
              <span>快捷业务操作入口</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                店员专属工具
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              高频核心工作流一键发起，优化工坊日常服务接待效率
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onOpenCreateCustomer}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ 新建客户</span>
            </button>

            <button
              onClick={onOpenCreateOrder}
              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <span>+ 新建订单</span>
            </button>

            <button
              onClick={onOpenGlobalSearch}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-stone-400" />
              <span>客户全局搜索</span>
            </button>

            <button
              onClick={onOpenRecharge}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>储值充值</span>
            </button>

            <button
              onClick={onOpenUploadArchive}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>上传历史档案</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 8 Stats KPI Cards (Section 5) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: '客户总数', value: totalCustomers, unit: '人', icon: Users, color: 'text-stone-900', bg: 'bg-stone-100' },
          { label: '本月新增客户', value: thisMonthCustomers, unit: '人', icon: UserPlus, color: 'text-amber-800', bg: 'bg-amber-50' },
          { label: '本月订单数', value: thisMonthOrders.length, unit: '单', icon: ShoppingBag, color: 'text-blue-800', bg: 'bg-blue-50' },
          { label: '本月销售额', value: formatMoney(thisMonthSalesCents), unit: '', icon: CircleDollarSign, color: 'text-emerald-800', bg: 'bg-emerald-50' },
          { label: '制作中订单', value: makingOrders.length, unit: '件', icon: Clock, color: 'text-purple-800', bg: 'bg-purple-50' },
          { label: '待收款金额', value: formatMoney(totalUnpaidCents), unit: '', icon: AlertTriangle, color: 'text-rose-800', bg: 'bg-rose-50' },
          { label: 'VIP客户', value: vipCount, unit: '人', icon: Award, color: 'text-indigo-800', bg: 'bg-indigo-50' },
          { label: 'SVIP尊享', value: svipCount, unit: '人', icon: Crown, color: 'text-amber-900', bg: 'bg-amber-100' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[11px] font-medium text-stone-500">{stat.label}</span>
              <div className={`p-1 rounded-md ${stat.bg}`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
            </div>
            <div>
              <span className={`text-base font-bold ${stat.color} tracking-tight`}>
                {stat.value}
              </span>
              {stat.unit && <span className="text-[10px] text-stone-400 ml-1">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Orders Flow & Today's Work & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Orders Lifecycle & Today's Work */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Distribution Bar */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                <span>订单全流程状态分布</span>
                <span className="text-xs font-normal text-stone-400 font-mono">
                  (共 {orders.length} 笔订单)
                </span>
              </h3>
              <button
                onClick={() => onNavigate('orders')}
                className="text-xs text-amber-800 hover:underline flex items-center space-x-0.5 font-medium cursor-pointer"
              >
                <span>查看全部订单</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center">
              {[
                { status: 'pending', label: '待确认', count: statusCounts.pending, bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                { status: 'placed', label: '已下单', count: statusCounts.placed, bg: 'bg-blue-50 text-blue-800 border-blue-200' },
                { status: 'making', label: '制作中', count: statusCounts.making, bg: 'bg-purple-50 text-purple-800 border-purple-200' },
                { status: 'processing', label: '处理中', count: statusCounts.processing, bg: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
                { status: 'completed', label: '已完成', count: statusCounts.completed, bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                { status: 'picked_up', label: '已取货', count: statusCounts.picked_up, bg: 'bg-stone-100 text-stone-800 border-stone-200' },
                { status: 'cancelled', label: '已取消', count: statusCounts.cancelled, bg: 'bg-rose-50 text-rose-800 border-rose-200' },
              ].map(st => (
                <div
                  key={st.status}
                  onClick={() => onNavigate('orders')}
                  className={`p-3 rounded-xl border ${st.bg} cursor-pointer hover:shadow-xs transition-transform transform active:scale-95`}
                >
                  <p className="text-lg font-bold">{st.count}</p>
                  <p className="text-[11px] font-medium mt-0.5">{st.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Tasks & Urgent Orders */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                工坊重点订单与待收尾款提醒
              </h3>
              <span className="text-xs text-stone-400">优先处理制作中与待结清款项</span>
            </div>

            <div className="divide-y divide-stone-100">
              {orders.slice(0, 4).map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectOrder(o)}
                  className="py-3 flex items-center justify-between hover:bg-stone-50 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-stone-900">{o.orderId}</span>
                      <span className="text-xs font-medium text-stone-700">· {o.customerName}</span>
                      <span className={`text-[10px] px-2 py-0.2 rounded-full border ${getOrderStatusBadge(o.status).bg}`}>
                        {getOrderStatusBadge(o.status).text}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {o.items.map(it => it.productName).join(' + ')}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      预计试身/交付：{formatDate(o.estimatedDeliveryDate)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-stone-500">应付：{formatMoney(o.payableAmount)}</p>
                    {o.unpaidAmount > 0 ? (
                      <p className="text-xs font-bold text-rose-600">
                        待收尾款: {formatMoney(o.unpaidAmount)}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600">已结清</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Inventory Alerts & Recent Customers */}
        <div className="space-y-6">
          {/* Inventory Safety Alerts (Section 5) */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>面料库存预警 (低于安全线)</span>
              </h3>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {lowStockMaterials.length} 种缺货预警
              </span>
            </div>

            {lowStockMaterials.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">所有面料库存均在安全线以上</p>
            ) : (
              <div className="space-y-2.5">
                {lowStockMaterials.map(m => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMaterial(m)}
                    className="p-3 rounded-lg border border-rose-100 bg-rose-50/40 hover:bg-rose-50 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-stone-900 truncate max-w-[200px]">
                        {m.name}
                      </h4>
                      <span className="text-xs font-bold text-rose-700 bg-white px-2 py-0.5 rounded-sm border border-rose-200">
                        仅存 {m.stockQuantity} 米
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>品牌: {m.brand}</span>
                      <span>安全警戒线: {m.safetyStock} 米</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('materials')}
              className="w-full mt-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg text-center font-medium cursor-pointer border border-stone-200"
            >
              前往面料库办理采购入库
            </button>
          </div>

          {/* Recent Customers (Section 5) */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">最近接待档案客户</h3>
              <button
                onClick={() => onNavigate('customers')}
                className="text-xs text-amber-800 hover:underline cursor-pointer font-medium"
              >
                查看全部
              </button>
            </div>

            <div className="space-y-2">
              {recentCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className="p-2.5 rounded-lg border border-stone-100 hover:border-stone-300 hover:bg-stone-50 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                      {c.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center space-x-1.5">
                        <span>{c.name}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded-sm uppercase font-mono">
                          {c.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-mono">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-700">{formatMoney(c.walletBalance)}</p>
                    <p className="text-[10px] text-stone-400">{c.orderCount} 笔定制</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
