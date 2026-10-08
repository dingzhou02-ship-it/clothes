import { PaymentMethod } from '../types';

export interface CreatePaymentParams {
  customerId: string;
  customerName: string;
  amount: number; // 分
  provider: 'mock' | 'wechat' | 'alipay';
  stage: 'recharge' | 'order_deposit' | 'order_final';
  relatedOrderId?: string;
  operatorId: string;
  remarks?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentOrderId: string;
  amount: number;
  provider: 'mock' | 'wechat' | 'alipay';
  status: 'paid' | 'pending' | 'failed';
  message: string;
  paidAt?: string;
}

export interface IPaymentService {
  createPaymentOrder(params: CreatePaymentParams): Promise<string>;
  confirmManualPayment(paymentOrderId: string, manualMethod: PaymentMethod): Promise<PaymentResult>;
}

export class MockPaymentService implements IPaymentService {
  private activeOrders: Map<string, CreatePaymentParams> = new Map();

  async createPaymentOrder(params: CreatePaymentParams): Promise<string> {
    const paymentOrderId = `PAY-ORD-${Date.now()}`;
    this.activeOrders.set(paymentOrderId, params);
    return paymentOrderId;
  }

  async confirmManualPayment(paymentOrderId: string, manualMethod: PaymentMethod): Promise<PaymentResult> {
    const order = this.activeOrders.get(paymentOrderId);
    const now = new Date().toISOString();

    if (!order) {
      return {
        success: true,
        paymentOrderId,
        amount: 0,
        provider: 'mock',
        status: 'paid',
        message: '店员手工核销已确认',
        paidAt: now,
      };
    }

    return {
      success: true,
      paymentOrderId,
      amount: order.amount,
      provider: order.provider,
      status: 'paid',
      message: `店员已核对手工支付到账凭据 (${manualMethod})，记账成功`,
      paidAt: now,
    };
  }
}

export const paymentService = new MockPaymentService();
