import React, { useState } from 'react';
import {
  Wallet,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { Customer, WalletTransaction, WalletTransactionType } from '../../types';
import {
  formatMoney,
  formatDateTime,
  getPaymentMethodName,
} from '../../utils/formatters';

interface WalletsViewProps {
  customers: Customer[];
  transactions: WalletTransaction[];
  onOpenRecharge: (customer?: Customer) => void;
  onRefund: (customerId: string, amountCents: number, relatedOrderId: string, remarks: string) => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
}

export const WalletsView: React.FC<WalletsViewProps> = ({
  customers,
  transactions,
  onOpenRecharge,
  onRefund,
  onSelectCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | WalletTransactionType>('all');

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundCustomerId, setRefundCustomerId] = useState('');
  const [refundAmountYuan, setRefundAmountYuan] = useState<number>(1000);
  const [refundOrderId, setRefundOrderId] = useState('');
  const [refundRemarks, setRefundRemarks] = useState('客户退订定制冲正退款至余额');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');

  // Total balance in all accounts
  const totalBalanceCents = customers.reduce((sum, c) => sum + c.walletBalance, 0);
  const totalRechargeCents = transactions
    .filter(t => t.type === 'recharge')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalConsumeCents = Math.abs(
    transactions
      .filter(t => t.type === 'consume')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const filteredTransactions = transactions.filter(t => {
    const matchSearch =
      (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.relatedOrderId && t.relatedOrderId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundCustomerId) {
      setRefundError('请选择客户');
      return;
    }
    const cents = Math.round(refundAmountYuan * 100);
    if (cents <= 0) {
      setRefundError('退款金额必须大于0');
      return;
    }

    try {
      setRefundLoading(true);
      setRefundError('');
      await onRefund(refundCustomerId, cents, refundOrderId.trim(), refundRemarks.trim());
      setShowRefundModal(false);
      setRefundOrderId('');
      setRefundRemarks('');
    } catch (err: any) {
      setRefundError(err?.message || '退款冲正失败');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-amber-600" />
              <span>储值资金与双向记账流水管理</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              遵循会计双轨记账原则，严禁前端盲目覆盖余额，所有充值、消费与退款均采用原子事务写入不可篡改流水
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setShowRefundModal(true)}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>退款 / 冲正入账</span>
            </button>
            <button
              onClick={() => onOpenRecharge()}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>办理储值充值</span>
            </button>
          </div>
        </div>

        {/* 3 Fund Balance KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
            <span className="text-xs font-medium text-amber-800">当前工坊储值沉淀总资金</span>
            <p className="text-2xl font-bold text-amber-950 font-mono tracking-tight mt-1">
              {formatMoney(totalBalanceCents)}
            </p>
            <span className="text-[11px] text-amber-700 mt-0.5 block">
              分布在 {customers.filter(c => c.walletBalance > 0).length} 位VIP客户账户中
            </span>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <span className="text-xs font-medium text-stone-500">累计历史充值资金</span>
            <p className="text-xl font-bold text-stone-900 font-mono tracking-tight mt-1">
              {formatMoney(totalRechargeCents)}
            </p>
            <span className="text-[11px] text-stone-400 mt-0.5 block">微信/支付宝/现金手工核销</span>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <span className="text-xs font-medium text-stone-500">累计储值消费核销总额</span>
            <p className="text-xl font-bold text-stone-900 font-mono tracking-tight mt-1">
              {formatMoney(totalConsumeCents)}
            </p>
            <span className="text-[11px] text-stone-400 mt-0.5 block">用于定制西装、大衣及成衣结清</span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="按客户姓名、流水号 (如 WT-202605-01)、关联订单号搜索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50 font-medium text-stone-700"
            >
              <option value="all">全部变动类型</option>
              <option value="recharge">充值流水 (正向)</option>
              <option value="consume">消费扣款 (负向)</option>
              <option value="refund">退款冲正 (正向)</option>
              <option value="manual_adjust">手工账目调整</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200">
                <th className="py-3 px-4">流水编号</th>
                <th className="py-3 px-4">客户姓名</th>
                <th className="py-3 px-4">业务类型</th>
                <th className="py-3 px-4">变动金额</th>
                <th className="py-3 px-4">变动前余额</th>
                <th className="py-3 px-4">变动后余额</th>
                <th className="py-3 px-4">支付核销方式</th>
                <th className="py-3 px-4">关联订单</th>
                <th className="py-3 px-4">操作人 / 时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filteredTransactions.map(tx => {
                const cust = customers.find(c => c.id === tx.customerId);
                return (
                  <tr key={tx.id} className="hover:bg-stone-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-400">
                      {tx.transactionId}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {cust ? (
                        <button
                          onClick={() => onSelectCustomer(cust)}
                          className="hover:text-amber-800 hover:underline cursor-pointer"
                        >
                          {cust.name}
                        </button>
                      ) : (
                        tx.customerName || tx.customerId
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                        tx.type === 'recharge' ? 'bg-emerald-100 text-emerald-800' :
                        tx.type === 'refund' ? 'bg-blue-100 text-blue-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {tx.type === 'recharge' ? '充值入账' :
                         tx.type === 'consume' ? '定制消费' :
                         tx.type === 'refund' ? '退款冲正' : '手工调整'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={tx.amount > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {tx.amount > 0 ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-stone-500">
                      {formatMoney(tx.balanceBefore)}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                      {formatMoney(tx.balanceAfter)}
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {getPaymentMethodName(tx.paymentMethod)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-amber-800">
                      {tx.relatedOrderId || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-stone-500">
                      <div>{tx.operatorName || tx.operatorId}</div>
                      <span className="text-[10px] text-stone-400">{formatDateTime(tx.createdAt)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-stone-900">退款冲正入账</h4>
              <button onClick={() => setShowRefundModal(false)} className="text-stone-400">
                ×
              </button>
            </div>
            {refundError && (
              <p className="text-xs text-rose-600 p-2 bg-rose-50 rounded-md">{refundError}</p>
            )}
            <form onSubmit={handleRefundSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-stone-600 mb-1">退款客户</label>
                <select
                  value={refundCustomerId}
                  onChange={e => setRefundCustomerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="">请选择客户</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone} (余额: {formatMoney(c.walletBalance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-600 mb-1">退款金额 (元)</label>
                <input
                  type="number"
                  min="1"
                  value={refundAmountYuan}
                  onChange={e => setRefundAmountYuan(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-600 mb-1">关联原订单编号</label>
                <input
                  type="text"
                  placeholder="如: ORD-202609-001"
                  value={refundOrderId}
                  onChange={e => setRefundOrderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-600 mb-1">退款冲正原因</label>
                <input
                  type="text"
                  value={refundRemarks}
                  onChange={e => setRefundRemarks(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-3 py-1.5 text-xs bg-stone-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="px-4 py-1.5 text-xs bg-stone-900 text-white rounded-lg font-bold"
                >
                  {refundLoading ? '正在冲正...' : '确认退款并写入流水'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
