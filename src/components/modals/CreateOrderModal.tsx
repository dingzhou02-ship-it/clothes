import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Trash2,
  Wallet as WalletIcon,
  Ruler,
  Layers,
  Sparkles,
  AlertCircle,
  Scissors,
} from 'lucide-react';
import {
  Customer,
  Material,
  Style,
  Measurement,
  StoreSetting,
  PaymentMethod,
} from '../../types';
import { formatMoney } from '../../utils/formatters';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  materials: Material[];
  styles: Style[];
  settings: StoreSetting;
  preselectedCustomer?: Customer | null;
  onOrderCreated: (orderData: any) => Promise<void>;
  getMeasurementsForCustomer: (customerId: string) => Promise<Measurement[]>;
}

interface OrderDraftItem {
  category: string;
  productName: string;
  quantity: number;
  materialId?: string;
  styleId?: string;
  measurementId?: string;
  unitPriceYuan: number;
  customOptionsText: string;
  remarks: string;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  customers,
  materials,
  styles,
  settings,
  preselectedCustomer,
  onOrderCreated,
  getMeasurementsForCustomer,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerMeasurements, setCustomerMeasurements] = useState<Measurement[]>([]);

  // Delivery date: default 30 days later
  const defaultDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(defaultDeliveryDate());

  // Items in order
  const [items, setItems] = useState<OrderDraftItem[]>([
    {
      category: '西服',
      productName: '双排扣全毛衬高定西服',
      quantity: 1,
      materialId: materials[0]?.id || '',
      styleId: styles[0]?.id || '',
      measurementId: '',
      unitPriceYuan: 12800,
      customOptionsText: '戗驳头9cm, 水牛角扣, 内袋刺绣姓名拼音',
      remarks: '半毛样试身一次',
    },
  ]);

  // Payment states
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(1.0);
  const [depositAmountYuan, setDepositAmountYuan] = useState<number>(5000);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<PaymentMethod>('wallet');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected customer object
  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [preselectedCustomer, customers, isOpen]);

  // Load measurements when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      getMeasurementsForCustomer(selectedCustomerId).then(list => {
        setCustomerMeasurements(list);
        const currentM = list.find(m => m.isCurrent) || list[0];
        // Set default measurement on all items if not set
        setItems(prev =>
          prev.map(item => ({
            ...item,
            measurementId: item.measurementId || currentM?.id || '',
          }))
        );
      });
    }
  }, [selectedCustomerId]);

  // Sync discount rate with customer level
  useEffect(() => {
    if (currentCustomer) {
      if (currentCustomer.level === 'svip') {
        setCustomDiscountRate(settings.svipDiscountRate || 0.9);
      } else if (currentCustomer.level === 'vip') {
        setCustomDiscountRate(settings.vipDiscountRate || 0.95);
      } else {
        setCustomDiscountRate(1.0);
      }
    }
  }, [currentCustomer, settings]);

  if (!isOpen) return null;

  // Calculation
  const totalListPriceYuan = items.reduce((sum, item) => sum + (item.unitPriceYuan || 0) * (item.quantity || 1), 0);
  const payableYuan = Math.round(totalListPriceYuan * customDiscountRate);
  const discountYuan = totalListPriceYuan - payableYuan;

  // Cents
  const totalAmountCents = Math.round(totalListPriceYuan * 100);
  const discountAmountCents = Math.round(discountYuan * 100);
  const payableAmountCents = Math.round(payableYuan * 100);
  const depositPaidCents = Math.round((depositAmountYuan || 0) * 100);

  const handleAddItem = () => {
    const currentM = customerMeasurements.find(m => m.isCurrent) || customerMeasurements[0];
    setItems([
      ...items,
      {
        category: '衬衫',
        productName: '定制温莎领商务衬衫',
        quantity: 1,
        materialId: materials[1]?.id || '',
        styleId: styles[2]?.id || '',
        measurementId: currentM?.id || '',
        unitPriceYuan: 1200,
        customOptionsText: '法式双叠袖, 白蝶贝纽扣',
        remarks: '',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof OrderDraftItem, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      setError('请选择客户');
      return;
    }
    if (items.length === 0) {
      setError('请至少添加一件定制商品');
      return;
    }
    if (depositPaidCents > payableAmountCents) {
      setError('定金金额不能大于应付总金额');
      return;
    }
    // Check wallet balance if payment method is wallet
    if (depositPaymentMethod === 'wallet' && depositPaidCents > (currentCustomer.walletBalance || 0)) {
      setError(`储值余额不足！当前账户余额 ${formatMoney(currentCustomer.walletBalance)}，本次需支付定金 ${formatMoney(depositPaidCents)}。请充值或选择其他支付方式。`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Build items with frozen measurement snapshots (historical immutability!)
      const processedItems = items.map(draft => {
        const mat = materials.find(m => m.id === draft.materialId);
        const sty = styles.find(s => s.id === draft.styleId);
        const meas = customerMeasurements.find(m => m.id === draft.measurementId);

        // Snapshot key measurements
        const measurementSnapshot = meas
          ? {
              height: meas.height,
              weight: meas.weight,
              shoulder: meas.shoulder,
              chest: meas.chest,
              waist: meas.waist,
              hips: meas.hips,
              sleeveLength: meas.sleeveLength,
              clothLength: meas.clothLength,
              upperArm: meas.upperArm,
              wrist: meas.wrist,
              customItems: meas.customItems,
              remarks: meas.remarks,
            }
          : undefined;

        const subtotalCents = Math.round(draft.unitPriceYuan * draft.quantity * customDiscountRate * 100);

        return {
          category: draft.category,
          productName: draft.productName,
          quantity: draft.quantity,
          materialId: draft.materialId,
          materialNameSnapshot: mat?.name || '未知面料',
          styleId: draft.styleId,
          styleNameSnapshot: sty?.name || '经典款式',
          measurementIdSnapshot: draft.measurementId,
          measurementDataSnapshot: measurementSnapshot,
          unitPrice: Math.round(draft.unitPriceYuan * 100),
          discountRate: customDiscountRate,
          subtotal: subtotalCents,
          customOptions: {
            '工艺要求': draft.customOptionsText,
          },
          remarks: draft.remarks,
        };
      });

      await onOrderCreated({
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        customerPhone: currentCustomer.phone,
        items: processedItems,
        totalAmount: totalAmountCents,
        discountAmount: discountAmountCents,
        payableAmount: payableAmountCents,
        depositPaidAmount: depositPaidCents,
        depositPaymentMethod,
        estimatedDeliveryDate,
        remarks: orderRemarks.trim(),
        operatorId: 'staff-01',
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white shrink-0">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold tracking-wide">
                新建高级定制订单 (分栏高效录入)
              </h3>
              <p className="text-xs text-stone-300">
                支持商品/面料/款式/多次量体快照固化关联，支持定金与储值核销
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          {/* Left Column: Customer & Items */}
          <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-stone-200 space-y-6 overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer selector */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <label className="block text-xs font-bold text-stone-700 mb-2">
                选择下单客户 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-800 bg-white font-medium"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone} ({c.level.toUpperCase()} - 余额: {formatMoney(c.walletBalance)})
                    </option>
                  ))}
                </select>

                {currentCustomer && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs">
                    <div>
                      <span className="text-stone-500">会员级别：</span>
                      <strong className="text-stone-800 uppercase">{currentCustomer.level}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500">储值余额：</span>
                      <strong className="text-amber-700 font-bold">{formatMoney(currentCustomer.walletBalance)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  <span>定制商品明细 ({items.length}件)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加商品项</span>
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs space-y-3 relative hover:border-stone-400 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-sm">
                        商品 #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1 rounded-sm cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">服装品类</label>
                        <select
                          value={item.category}
                          onChange={e => handleItemChange(idx, 'category', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                        >
                          {['西服', '衬衫', '大衣', '中式服装', '女装', '裤装', '其他'].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] text-stone-500 mb-1">定制商品品名</label>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                          placeholder="如：双排扣全毛衬高定西服"
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">选配面料</label>
                        <select
                          value={item.materialId}
                          onChange={e => handleItemChange(idx, 'materialId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                        >
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} (库存: {m.stockQuantity}m)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">款式版型</label>
                        <select
                          value={item.styleId}
                          onChange={e => handleItemChange(idx, 'styleId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                        >
                          {styles.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">
                          绑定量体记录 (拍摄历史快照)
                        </label>
                        <select
                          value={item.measurementId}
                          onChange={e => handleItemChange(idx, 'measurementId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded-lg bg-amber-50/50 text-amber-950 font-medium"
                        >
                          {customerMeasurements.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.measureDate} {m.isCurrent ? '(当前主量体)' : '(历史记录)'}
                            </option>
                          ))}
                          {customerMeasurements.length === 0 && (
                            <option value="">暂无量体记录 (建议先录入)</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">定制单价 (元)</label>
                        <input
                          type="number"
                          value={item.unitPriceYuan}
                          onChange={e => handleItemChange(idx, 'unitPriceYuan', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">数量</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-500 mb-1">小计 (原价)</label>
                        <div className="px-2.5 py-1.5 text-xs bg-stone-100 rounded-lg font-semibold text-stone-800">
                          ¥{((item.unitPriceYuan || 0) * (item.quantity || 1)).toLocaleString()}
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] text-stone-500 mb-1">定制专属工艺参数要求</label>
                        <input
                          type="text"
                          placeholder="如：戗驳头9cm，真开衩，天然水牛角扣，左内袋刺绣签名"
                          value={item.customOptionsText}
                          onChange={e => handleItemChange(idx, 'customOptionsText', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Deposit, and Settlement Summary */}
          <div className="w-full lg:w-96 bg-stone-50 p-6 flex flex-col justify-between space-y-6 shrink-0">
            <div className="space-y-5">
              <h4 className="text-sm font-bold text-stone-900 border-b border-stone-200 pb-2">
                结算与订单概览
              </h4>

              {/* Price Breakdown */}
              <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>商品原价总计：</span>
                  <span className="font-semibold text-stone-900">¥{totalListPriceYuan.toLocaleString()}.00</span>
                </div>

                <div className="flex justify-between items-center text-stone-600">
                  <span>会员专属折扣：</span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      currentCustomer?.level === 'svip' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                      currentCustomer?.level === 'vip' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {currentCustomer?.level === 'svip' ? 'SVIP尊享' : currentCustomer?.level === 'vip' ? 'VIP客户' : '普通客户'}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="5.0"
                      max="10.0"
                      value={(customDiscountRate * 10).toFixed(1)}
                      onChange={e => {
                        const val = Number(e.target.value);
                        if (val > 0) setCustomDiscountRate(Number((val / 10).toFixed(3)));
                      }}
                      className="w-16 px-1.5 py-0.5 text-xs border border-stone-300 rounded-md text-center font-bold"
                    />
                    <span className="text-stone-700 font-bold text-xs">折</span>
                  </div>
                </div>

                {discountYuan > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>优惠减免金额：</span>
                    <span className="font-semibold">-¥{discountYuan.toLocaleString()}.00</span>
                  </div>
                )}

                <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                  <span className="font-bold text-stone-800 text-sm">应付总金额：</span>
                  <span className="text-xl font-bold text-amber-700">
                    ¥{payableYuan.toLocaleString()}.00
                  </span>
                </div>
              </div>

              {/* Deposit section */}
              <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-800">本次收取定金 (元)</label>
                  <button
                    type="button"
                    onClick={() => setDepositAmountYuan(payableYuan)}
                    className="text-[11px] text-amber-700 hover:underline cursor-pointer"
                  >
                    全额付清
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max={payableYuan}
                  value={depositAmountYuan}
                  onChange={e => setDepositAmountYuan(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-bold text-stone-900"
                />

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">支付方式</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'wallet', label: '储值余额', icon: WalletIcon },
                      { id: 'wechat', label: '微信(手工)', icon: Sparkles },
                      { id: 'alipay', label: '支付宝(手工)', icon: Sparkles },
                      { id: 'cash', label: '现金', icon: Layers },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDepositPaymentMethod(m.id as PaymentMethod)}
                        className={`px-2.5 py-2 text-xs font-medium rounded-lg border flex items-center justify-center space-x-1 cursor-pointer transition-colors ${
                          depositPaymentMethod === m.id
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <m.icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {depositPaymentMethod === 'wallet' && currentCustomer && (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                    <p className="flex justify-between">
                      <span>当前可用储值：</span>
                      <strong>{formatMoney(currentCustomer.walletBalance)}</strong>
                    </p>
                    {depositPaidCents > currentCustomer.walletBalance && (
                      <p className="text-rose-600 font-bold mt-1">⚠️ 储值余额不足，请先充值！</p>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery date & remarks */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">预计试身/交付日期</label>
                  <input
                    type="date"
                    required
                    value={estimatedDeliveryDate}
                    onChange={e => setEstimatedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">全单备注说明</label>
                  <textarea
                    rows={2}
                    placeholder="客户加急要求、交付叮嘱等..."
                    value={orderRemarks}
                    onChange={e => setOrderRemarks(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-stone-200 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-bold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-md cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? <span>创建中...</span> : <span>确认生成定制订单</span>}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                放弃取消
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
