import React, { useState, useEffect } from 'react';
import { X, Wallet, Sparkles, Layers, AlertCircle, CheckCircle } from 'lucide-react';
import { Customer, PaymentMethod } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  preselectedCustomer?: Customer | null;
  onRecharge: (customerId: string, amountCents: number, method: PaymentMethod, remarks: string) => Promise<void>;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  customers,
  preselectedCustomer,
  onRecharge,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amountYuan, setAmountYuan] = useState<number>(10000); // default 10,000 元
  const [method, setMethod] = useState<PaymentMethod>('wechat');
  const [remarks, setRemarks] = useState('尊享储值充值');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
    setError('');
    setSuccessMsg('');
  }, [preselectedCustomer, customers, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      setError('请选择充值客户');
      return;
    }
    const amountCents = Math.round((amountYuan || 0) * 100);
    if (amountCents <= 0) {
      setError('充值金额必须大于0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onRecharge(currentCustomer.id, amountCents, method, remarks.trim());
      setSuccessMsg(`充值成功！已为 ${currentCustomer.name} 记账增加 ${formatMoney(amountCents)}，并生成不可篡改储值流水。`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || '充值处理失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold tracking-wide">
              客户储值充值 · 资金流水录入
            </h3>
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

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">充值客户</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white font-medium"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone} (当前余额: {formatMoney(c.walletBalance)})
                </option>
              ))}
            </select>
          </div>

          {currentCustomer && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex justify-between items-center text-xs">
              <span className="text-stone-500">充值前账户可用余额：</span>
              <strong className="text-stone-900 text-sm">{formatMoney(currentCustomer.walletBalance)}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              充值金额 (元) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="100"
              step="100"
              required
              value={amountYuan}
              onChange={e => setAmountYuan(Number(e.target.value))}
              className="w-full px-3 py-2 text-base font-bold border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 text-stone-900"
            />
            {/* Quick amount shortcuts */}
            <div className="flex space-x-2 mt-2">
              {[5000, 10000, 20000, 50000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountYuan(val)}
                  className="px-2.5 py-1 text-xs border border-stone-200 rounded-md hover:bg-stone-100 cursor-pointer font-medium text-stone-700"
                >
                  ¥{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">收款结算方式</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'wechat', label: '微信支付 (手工核销)', icon: Sparkles },
                { id: 'alipay', label: '支付宝 (手工核销)', icon: Sparkles },
                { id: 'cash', label: '现金实收', icon: Layers },
                { id: 'other', label: '银行转账/其他', icon: Layers },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as PaymentMethod)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                    method === m.id
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              * 第一阶段采用店员核对后手工记账模式；系统已预留未来微信/支付宝扫码即时通知网关架构。
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">充值备注与活动赠送说明</label>
            <input
              type="text"
              placeholder="如：充值1万元赠送高支衬衫定制一件"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          {currentCustomer && amountYuan > 0 && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-900">
              <div className="flex justify-between font-medium">
                <span>充值后预计余额：</span>
                <strong className="text-amber-800 text-sm font-bold">
                  {formatMoney((currentCustomer.walletBalance || 0) + amountYuan * 100)}
                </strong>
              </div>
              <p className="text-[10px] text-amber-700">
                系统将通过原子事务同时更新客户余额与储值不可变审计流水。
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs cursor-pointer flex items-center space-x-1"
            >
              {loading ? <span>处理中...</span> : <span>确认充值并写入流水</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
