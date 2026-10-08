import React from 'react';
import { X, Printer } from 'lucide-react';
import { Order, StoreSetting } from '../../types';
import {
  formatMoney,
  formatDate,
  getOrderStatusBadge,
  getPaymentMethodName,
} from '../../utils/formatters';

interface OrderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  settings: StoreSetting;
}

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-stone-900 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">定制订单 A4 定制联打印预览</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>立即打印 (A4标准排版)</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Order Sheet */}
        <div className="p-8 overflow-y-auto bg-white text-stone-900 font-sans print:p-0">
          {/* Header */}
          <div className="text-center border-b-2 border-stone-900 pb-4 mb-6">
            <h1 className="text-2xl font-serif font-bold tracking-widest text-stone-900">
              {settings.shopName}
            </h1>
            <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">
              BESPOKE TAILORING WORKSHOP ORDER & CONTRACT
            </p>
            <div className="flex justify-between items-center text-xs text-stone-600 mt-4 px-2">
              <span>订单编号：<strong>{order.orderId}</strong></span>
              <span>下单日期：<strong>{formatDate(order.createdAt)}</strong></span>
              <span>预计试身/交付：<strong>{formatDate(order.estimatedDeliveryDate)}</strong></span>
              <span>
                状态：<strong>{getOrderStatusBadge(order.status).text}</strong>
              </span>
            </div>
          </div>

          {/* Customer info table */}
          <div className="border border-stone-300 rounded-lg p-3.5 mb-6 bg-stone-50/50 text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div><span className="text-stone-500">客户姓名：</span><strong className="text-sm">{order.customerName}</strong></div>
              <div><span className="text-stone-500">联系电话：</span><strong>{order.customerPhone}</strong></div>
              <div><span className="text-stone-500">客户编号：</span>{order.customerId}</div>
              <div className="col-span-3">
                <span className="text-stone-500">全单定制要求：</span>
                {order.remarks || '按标准工艺执行'}
              </div>
            </div>
          </div>

          {/* Items & Measurement Snapshot table */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 border-l-3 border-amber-600 pl-2">
              定制商品与当时量体快照 (Items & Frozen Sizing Snapshot)
            </h2>
            <table className="w-full text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-semibold text-center">
                  <th className="border border-stone-300 py-1.5 px-2 w-12">序号</th>
                  <th className="border border-stone-300 py-1.5 px-2 text-left">品名 / 品类</th>
                  <th className="border border-stone-300 py-1.5 px-2 text-left">选定面料与款式</th>
                  <th className="border border-stone-300 py-1.5 px-2 text-left">当时量体瞬时数据</th>
                  <th className="border border-stone-300 py-1.5 px-2 w-12">数量</th>
                  <th className="border border-stone-300 py-1.5 px-2 text-right">小计金额</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-stone-200">
                    <td className="border border-stone-300 py-2 text-center">{idx + 1}</td>
                    <td className="border border-stone-300 py-2 px-2">
                      <div className="font-bold">{item.productName}</div>
                      <div className="text-[11px] text-stone-500">品类: {item.category}</div>
                    </td>
                    <td className="border border-stone-300 py-2 px-2 text-stone-700">
                      <div>面料: <strong>{item.materialNameSnapshot}</strong></div>
                      <div>款式: {item.styleNameSnapshot}</div>
                      {item.customOptions && (
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          {Object.entries(item.customOptions).map(([k, v]) => `${k}:${v}`).join('; ')}
                        </div>
                      )}
                    </td>
                    <td className="border border-stone-300 py-2 px-2 text-stone-800 text-[11px]">
                      {item.measurementDataSnapshot ? (
                        <div>
                          <span>胸:{item.measurementDataSnapshot.chest || '-'} </span>
                          <span>腰:{item.measurementDataSnapshot.waist || '-'} </span>
                          <span>肩:{item.measurementDataSnapshot.shoulder || '-'} </span>
                          <span>袖:{item.measurementDataSnapshot.sleeveLength || '-'} </span>
                          <span>长:{item.measurementDataSnapshot.clothLength || '-'} </span>
                        </div>
                      ) : (
                        <span>标准成衣尺码</span>
                      )}
                    </td>
                    <td className="border border-stone-300 py-2 text-center">{item.quantity}</td>
                    <td className="border border-stone-300 py-2 px-2 text-right font-bold">
                      {formatMoney(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing & Payments summary */}
          <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
            {/* Payment history */}
            <div className="border border-stone-300 rounded-lg p-3 bg-stone-50/50">
              <h3 className="font-bold text-stone-800 mb-2">款项收款明细记录</h3>
              <div className="space-y-1.5">
                {order.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] border-b border-stone-200 pb-1">
                    <span>
                      {formatDate(p.createdAt)} · {p.stage === 'deposit' ? '定金' : '尾款'} ({getPaymentMethodName(p.paymentMethod)})
                    </span>
                    <strong className="text-stone-900">{formatMoney(p.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Total balance calculations */}
            <div className="border border-stone-300 rounded-lg p-3 space-y-1.5 text-right">
              <div className="flex justify-between text-stone-600">
                <span>商品原价总计：</span>
                <span>{formatMoney(order.totalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>会员专属优惠：</span>
                  <span>-{formatMoney(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-800 text-sm pt-1 border-t border-stone-200">
                <span>应付总金额：</span>
                <span>{formatMoney(order.payableAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>累计已收 (定金+尾款)：</span>
                <span className="font-bold">{formatMoney(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold">
                <span>尚欠尾款 (取货结清)：</span>
                <span>{formatMoney(order.unpaidAmount)}</span>
              </div>
            </div>
          </div>

          {/* Workshop Signature & Customer Agreement */}
          <div className="grid grid-cols-3 gap-8 pt-6 border-t border-stone-300 text-xs">
            <div className="text-center">
              <div className="border-b border-stone-400 pb-8 mb-1"></div>
              <p className="text-stone-600">经手店员 / 裁缝师</p>
            </div>
            <div className="text-center">
              <div className="border-b border-stone-400 pb-8 mb-1"></div>
              <p className="text-stone-600">制版裁剪车间签收</p>
            </div>
            <div className="text-center">
              <div className="border-b border-stone-400 pb-8 mb-1"></div>
              <p className="text-stone-600">定制顾客签名确认</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 mt-8">
            {settings.printFooter}
          </div>
        </div>
      </div>
    </div>
  );
};
