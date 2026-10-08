import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Printer,
  Calendar,
  Clock,
  CreditCard,
  Ruler,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Order, OrderStatus, PaymentMethod, PaymentStage, StoreSetting } from '../../types';
import {
  formatMoney,
  formatDate,
  formatDateTime,
  getOrderStatusBadge,
  getPaymentMethodName,
} from '../../utils/formatters';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  settings: StoreSetting;
  onUpdateStatus: (orderId: string, status: OrderStatus, note: string) => Promise<void>;
  onAddPayment: (orderId: string, amountCents: number, method: PaymentMethod, stage: PaymentStage, remarks?: string) => Promise<void>;
  onOpenPrint: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
  onUpdateStatus,
  onAddPayment,
  onOpenPrint,
}) => {
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusNote, setStatusNote] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Add payment states
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmountYuan, setPaymentAmountYuan] = useState<number>(order.unpaidAmount / 100);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [paymentStage, setPaymentStage] = useState<PaymentStage>('final');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const statusBadge = getOrderStatusBadge(order.status);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatusLoading(true);
      await onUpdateStatus(order.id, newStatus, statusNote.trim() || `状态更新为 ${newStatus}`);
      setShowStatusUpdate(false);
      setStatusNote('');
    } catch (err: any) {
      setError(err?.message || '更新状态失败');
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(paymentAmountYuan * 100);
    if (amountCents <= 0) {
      setError('收款金额必须大于0');
      return;
    }
    if (amountCents > order.unpaidAmount) {
      setError(`收款金额超出待付尾款 (${formatMoney(order.unpaidAmount)})`);
      return;
    }

    try {
      setPaymentLoading(true);
      setError('');
      await onAddPayment(order.id, amountCents, paymentMethod, paymentStage, paymentRemarks);
      setShowAddPayment(false);
      setPaymentRemarks('');
    } catch (err: any) {
      setError(err?.message || '收款记录失败');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold tracking-wide">
                  定制订单详情 · {order.orderId}
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusBadge.bg}`}>
                  {statusBadge.text}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                客户：{order.customerName} ({order.customerPhone}) · 预计试身/交付：{formatDate(order.estimatedDeliveryDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenPrint(order)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>A4打印单据</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Financial summary banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <span className="text-xs text-stone-500">原价总计</span>
              <p className="text-base font-bold text-stone-800">{formatMoney(order.totalAmount)}</p>
            </div>
            <div>
              <span className="text-xs text-stone-500">应付总额</span>
              <p className="text-base font-bold text-stone-900">{formatMoney(order.payableAmount)}</p>
            </div>
            <div>
              <span className="text-xs text-stone-500">已收款 (定金+尾款)</span>
              <p className="text-base font-bold text-emerald-700">{formatMoney(order.paidAmount)}</p>
            </div>
            <div>
              <span className="text-xs text-stone-500">待收尾款</span>
              <p className="text-base font-bold text-rose-600">{formatMoney(order.unpaidAmount)}</p>
            </div>
          </div>

          {/* Order Items with Measurement Snapshot */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3 border-l-3 border-amber-600 pl-2">
              订单商品明细与量体快照 (历史不可变)
            </h4>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 border border-stone-200 rounded-xl bg-white shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded-sm">
                          {item.category}
                        </span>
                        <h5 className="font-bold text-stone-900">{item.productName}</h5>
                        <span className="text-xs text-stone-500">× {item.quantity}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        面料：<strong>{item.materialNameSnapshot || '定制精选'}</strong> · 款式：<strong>{item.styleNameSnapshot || '工坊版型'}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-stone-500">小计</span>
                      <p className="font-bold text-stone-900">{formatMoney(item.subtotal)}</p>
                    </div>
                  </div>

                  {/* Measurement Snapshot Section */}
                  {item.measurementDataSnapshot && (
                    <div className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-lg text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-amber-900 font-semibold mb-1">
                        <Ruler className="w-3.5 h-3.5 text-amber-700" />
                        <span>下单当时固化的量体数据快照：</span>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[11px] text-stone-700">
                        <span>胸围: <strong>{item.measurementDataSnapshot.chest || '-'}cm</strong></span>
                        <span>腰围: <strong>{item.measurementDataSnapshot.waist || '-'}cm</strong></span>
                        <span>肩宽: <strong>{item.measurementDataSnapshot.shoulder || '-'}cm</strong></span>
                        <span>袖长: <strong>{item.measurementDataSnapshot.sleeveLength || '-'}cm</strong></span>
                        <span>衣长: <strong>{item.measurementDataSnapshot.clothLength || '-'}cm</strong></span>
                        <span>臀围: <strong>{item.measurementDataSnapshot.hips || '-'}cm</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Custom options */}
                  {item.customOptions && (
                    <div className="text-xs text-stone-600 pt-1 border-t border-stone-100">
                      {Object.entries(item.customOptions).map(([k, v]) => (
                        <p key={k}>
                          <span className="text-stone-400">{k}：</span>
                          <span className="text-stone-800">{v}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payments section */}
          <div>
            <div className="flex items-center justify-between mb-3 border-l-3 border-amber-600 pl-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                收款与结算明细 ({order.payments.length}笔)
              </h4>
              {order.unpaidAmount > 0 && !showAddPayment && (
                <button
                  type="button"
                  onClick={() => setShowAddPayment(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>收尾款 / 录入付款</span>
                </button>
              )}
            </div>

            {/* Add payment drawer */}
            {showAddPayment && (
              <form onSubmit={handlePaymentSubmit} className="p-4 mb-3 bg-stone-100 border border-stone-300 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold text-stone-900">录入新收款 (待收: {formatMoney(order.unpaidAmount)})</h5>
                  <button type="button" onClick={() => setShowAddPayment(false)} className="text-stone-500 hover:text-stone-800 text-xs">
                    取消
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">收款金额 (元)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={order.unpaidAmount / 100}
                      value={paymentAmountYuan}
                      onChange={e => setPaymentAmountYuan(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">支付方式</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                    >
                      <option value="wallet">储值余额扣减</option>
                      <option value="cash">现金收款</option>
                      <option value="wechat">微信支付 (手工核销)</option>
                      <option value="alipay">支付宝 (手工核销)</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">款项性质</label>
                    <select
                      value={paymentStage}
                      onChange={e => setPaymentStage(e.target.value as PaymentStage)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                    >
                      <option value="final">尾款结清</option>
                      <option value="deposit">定金追缴</option>
                      <option value="additional">加急/加面料工费</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      placeholder="收款备注 (如: 到店试衣满意收尾款)"
                      value={paymentRemarks}
                      onChange={e => setPaymentRemarks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 cursor-pointer"
                  >
                    {paymentLoading ? '收款处理中...' : '确认收款并记账'}
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
              {order.payments.map((p, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-bold text-stone-800">
                        {p.stage === 'deposit' ? '定金' : p.stage === 'final' ? '尾款' : '全款'}
                      </span>
                      <span className="text-stone-500">· {getPaymentMethodName(p.paymentMethod)}</span>
                      {p.walletTransactionId && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200">
                          储值流水: {p.walletTransactionId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400">
                      {formatDateTime(p.createdAt)} · 操作人: {p.operatorId} {p.remarks && `(${p.remarks})`}
                    </p>
                  </div>
                  <span className="font-bold text-emerald-700 text-sm">{formatMoney(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status timeline */}
          <div>
            <div className="flex items-center justify-between mb-3 border-l-3 border-amber-600 pl-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                订单生命周期流转记录
              </h4>
              {!showStatusUpdate && (
                <button
                  type="button"
                  onClick={() => setShowStatusUpdate(true)}
                  className="text-xs text-amber-800 hover:underline cursor-pointer font-medium"
                >
                  变更订单状态
                </button>
              )}
            </div>

            {showStatusUpdate && (
              <form onSubmit={handleStatusSubmit} className="p-4 mb-3 bg-stone-100 border border-stone-300 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold text-stone-900">更新状态</h5>
                  <button type="button" onClick={() => setShowStatusUpdate(false)} className="text-stone-500 text-xs">
                    取消
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">选择新状态</label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as OrderStatus)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                    >
                      <option value="pending">待确认</option>
                      <option value="placed">已下单</option>
                      <option value="making">制作中 (裁剪制版)</option>
                      <option value="processing">处理中 (毛样试身)</option>
                      <option value="completed">已完成 (待取货)</option>
                      <option value="picked_up">已取货 (交付完毕)</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">变动说明 / 车间节点反馈</label>
                    <input
                      type="text"
                      placeholder="如：毛样试衣完毕，无修改，准备收针"
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="submit"
                    disabled={statusLoading}
                    className="px-3.5 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {statusLoading ? '保存中...' : '提交状态变更'}
                  </button>
                </div>
              </form>
            )}

            <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-3">
              {order.statusHistory.map((sh, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs">
                  <div className="mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-800">
                        {getOrderStatusBadge(sh.status as OrderStatus).text}
                      </span>
                      <span className="text-[11px] text-stone-400">{formatDateTime(sh.timestamp)}</span>
                    </div>
                    <p className="text-stone-600 mt-0.5">{sh.note}</p>
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
