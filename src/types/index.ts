export type CustomerLevel = 'normal' | 'vip' | 'svip';
export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  gender: Gender;
  level: CustomerLevel;
  birthday?: string;
  occupation?: string;
  address?: string;
  source?: string;
  remarks: string;
  orderCount: number;
  totalSpent: number; // 分 (Cents)
  walletBalance: number; // 分 (Cents)
  lastMeasurementDate?: string;
  lastOrderDate?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomMeasurementItem {
  name: string;
  value: number;
  unit: string;
  remark?: string;
}

export interface Measurement {
  id: string;
  measurementId: string;
  customerId: string;
  customerName?: string;
  isCurrent: boolean;
  measureDate: string;
  operatorId: string;
  operatorName: string;
  height?: number; // cm
  weight?: number; // kg
  shoulder?: number; // cm
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  sleeveLength?: number; // cm
  clothLength?: number; // cm
  upperArm?: number; // cm
  wrist?: number; // cm
  customItems: CustomMeasurementItem[];
  remarks?: string;
  createdAt: string;
}

export interface Material {
  id: string;
  materialId: string;
  name: string;
  brand: string;
  category: string[]; // ["西服", "衬衫", "大衣", "中式服装", "女装", "裤装", "其他"]
  composition: string;
  color: string;
  pattern: string;
  weight: number; // g/m
  season: string;
  costPrice: number; // 分/米
  salePrice: number; // 分/米
  stockQuantity: number; // 米 (保留小数)
  safetyStock: number; // 米
  location: string;
  imageUrls: string[];
  remarks?: string;
  isDeleted: boolean;
  updatedAt: string;
}

export type InventoryTransactionType =
  | 'purchase_in'
  | 'manual_in'
  | 'order_consume'
  | 'manual_out'
  | 'audit_adjust';

export interface InventoryTransaction {
  id: string;
  transactionId: string;
  materialId: string;
  materialName?: string;
  type: InventoryTransactionType;
  quantity: number; // 米 (正/负)
  beforeQuantity: number;
  afterQuantity: number;
  relatedOrderId?: string;
  operatorId: string;
  operatorName?: string;
  createdAt: string;
  remarks: string;
}

export interface Style {
  id: string;
  styleId: string;
  name: string;
  category: string; // "西服" | "衬衫" | "大衣" | "中式服装" | "女装" | "裤装" | "其他"
  imageUrl?: string;
  description: string;
  parameters: Record<string, string>; // e.g. { "版型": "修身", "驳头": "平驳头 8.5cm", "门襟": "单排两粒扣" }
  status: 'active' | 'inactive';
  createdAt: string;
}

export type OrderStatus =
  | 'pending' // 待确认
  | 'placed' // 已下单
  | 'making' // 制作中
  | 'processing' // 处理中
  | 'completed' // 已完成
  | 'picked_up' // 已取货
  | 'cancelled'; // 已取消

export type PaymentMethod = 'wallet' | 'cash' | 'wechat' | 'alipay' | 'other';
export type PaymentStage = 'deposit' | 'final' | 'full' | 'additional';

export interface OrderItem {
  id: string;
  orderId: string;
  category: string;
  productName: string;
  quantity: number;
  materialId?: string;
  materialNameSnapshot?: string;
  styleId?: string;
  styleNameSnapshot?: string;
  measurementIdSnapshot?: string;
  measurementDataSnapshot?: Partial<Measurement>; // 当时量体瞬时数据快照 (历史不可变)
  unitPrice: number; // 分
  discountRate: number; // e.g. 0.95
  subtotal: number; // 分
  customOptions?: Record<string, string>;
  remarks?: string;
}

export interface OrderPayment {
  id: string;
  paymentId: string;
  orderId: string;
  customerId: string;
  stage: PaymentStage;
  amount: number; // 分
  paymentMethod: PaymentMethod;
  walletTransactionId?: string;
  operatorId: string;
  createdAt: string;
  remarks?: string;
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  totalAmount: number; // 分 (原价总计)
  discountAmount: number; // 分 (优惠金额)
  payableAmount: number; // 分 (应付金额)
  paidAmount: number; // 分 (已收款)
  unpaidAmount: number; // 分 (待收尾款)
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  estimatedDeliveryDate: string;
  statusHistory: {
    status: OrderStatus;
    operatorId: string;
    timestamp: string;
    note: string;
  }[];
  items: OrderItem[];
  payments: OrderPayment[];
  remarks?: string;
  operatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string; // same as customerId
  customerId: string;
  balance: number; // 分
  totalRecharged: number; // 分
  totalConsumed: number; // 分
  version: number;
  updatedAt: string;
}

export type WalletTransactionType =
  | 'recharge'
  | 'consume'
  | 'refund'
  | 'manual_adjust';

export interface WalletTransaction {
  id: string;
  transactionId: string;
  customerId: string;
  customerName?: string;
  type: WalletTransactionType;
  amount: number; // 分 (充值/退款为正，消费为负)
  balanceBefore: number; // 分
  balanceAfter: number; // 分
  paymentMethod: PaymentMethod;
  relatedOrderId?: string;
  paymentOrderId?: string;
  operatorId: string;
  operatorName?: string;
  createdAt: string;
  remarks: string;
}

export interface PaymentOrder {
  id: string;
  paymentOrderId: string;
  customerId: string;
  amount: number; // 分
  provider: 'mock' | 'wechat' | 'alipay';
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  providerTransactionId?: string;
  createdAt: string;
  paidAt?: string;
  relatedWalletTransactionId?: string;
  remarks?: string;
}

export interface CustomerFile {
  id: string;
  fileId: string;
  customerId: string;
  customerName?: string;
  fileName: string;
  fileType: 'historical_order' | 'historical_measurement' | 'other';
  year: number; // e.g. 2024
  fileUrl: string;
  fileSize: number;
  operatorId: string;
  remarks?: string;
  createdAt: string;
}

export interface CustomerImage {
  id: string;
  imageId: string;
  customerId: string;
  imageType: 'front' | 'side' | 'back' | 'finished' | 'other';
  imageUrl: string;
  title: string;
  remarks?: string;
  operatorId: string;
  createdAt: string;
}

export interface StoreSetting {
  id: string;
  shopName: string;
  phone: string;
  address: string;
  businessHours: string;
  vipDiscountRate: number; // e.g. 0.95
  svipDiscountRate: number; // e.g. 0.90
  defaultSafetyStock: number; // e.g. 10 (m)
  printHeader: string;
  printFooter: string;
}

export interface AuditLog {
  id: string;
  logId: string;
  operatorId: string;
  operatorName?: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  details: string;
}

export interface StaffUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
}
