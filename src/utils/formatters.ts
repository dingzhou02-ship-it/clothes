import { CustomerLevel, OrderStatus, PaymentMethod } from '../types';

export const formatMoney = (cents: number | undefined | null): string => {
  if (cents === undefined || cents === null || isNaN(cents)) return '¥0.00';
  const yuan = cents / 100;
  return `¥${yuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toISOString().split('T')[0];
  } catch (e) {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return dateString;
  }
};

export const getCustomerLevelBadge = (level: CustomerLevel) => {
  switch (level) {
    case 'svip':
      return {
        text: 'SVIP 尊享',
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-600',
      };
    case 'vip':
      return {
        text: 'VIP 会员',
        bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        dot: 'bg-indigo-600',
      };
    default:
      return {
        text: '普通客户',
        bg: 'bg-stone-100 text-stone-700 border-stone-300',
        dot: 'bg-stone-400',
      };
  }
};

export const getOrderStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return { text: '待确认', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'placed':
      return { text: '已下单', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'making':
      return { text: '制作中', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'processing':
      return { text: '处理中', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'completed':
      return { text: '已完成', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'picked_up':
      return { text: '已取货', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    case 'cancelled':
      return { text: '已取消', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { text: status, bg: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

export const getPaymentMethodName = (method: PaymentMethod | string): string => {
  switch (method) {
    case 'wallet':
      return '储值余额';
    case 'cash':
      return '现金';
    case 'wechat':
      return '微信支付(手工核销)';
    case 'alipay':
      return '支付宝(手工核销)';
    case 'other':
      return '其他方式';
    default:
      return method;
  }
};
