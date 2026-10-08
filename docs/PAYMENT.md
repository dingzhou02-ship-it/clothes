# 七彩布衣数字化管理系统 - 支付网关集成与储值演化规范 (PAYMENT.md)

## 1. 架构目标与阶段划分

本系统定位为真实的高端服装定制店内部经营管理系统。储值金与订单款项直接关联真实商户资金安全。

- **第一阶段（当前）**：
  - 核心在“账户 + 双向记账流水”的资金模型。
  - 支持**现金收款**与**微信/支付宝手工核销录入**。
  - 采用接口抽象服务 `PaymentService` 与 `MockPaymentService`，提供规范的数据契约。
  - **绝不**在前端伪造假冒的支付通道，明确标注“手工核销记账模式”。

- **第二阶段（未来规划）**：
  - 接入正式微信支付（JSAPI / Native 扫码付 / 付款码收银）及支付宝（当面付 / 扫码付）。
  - 服务端统一通过 Cloud Functions / Cloud Run 处理签名校验、发起统一下单、生成动态付款二维码，并异步接收商户平台官方 Webhook 回调通知。

---

## 2. 绝对安全红线 (Security Golden Rules)

在任何情况下，严禁触犯以下原则：

1. **零密钥泄露**：
   微信商户号证书私钥 (`apiclient_key.pem`)、APIv3 密钥、支付宝应用私钥 (`app_private_key.pem`)、支付宝公钥**绝不可**存在于前端打包代码或浏览器环境变量中。
2. **严禁前端直接改余额**：
   禁止前端根据“扫码成功”或“用户已付款”的客户端提示直接向数据库写余额。所有余额变动必须由受信任的服务端在事务中核验凭据后执行。
3. **幂等性与重试防护 (Idempotency)**：
   每次支付请求必须携带不可重复的 `paymentOrderId`。支付网关多次异步通知时，服务端需根据商户订单号做幂等判断，防止单笔充值多次入账。
4. **整数“分”精度安全**：
   支付金额一律以整数分传输（如 100 元为 10000 分），杜绝浮点数四舍五入丢分。

---

## 3. 未来微信与支付宝接入流程时序

```
店员/iPad客户端                服务端 (Cloud Functions)             微信/支付宝官方网关
      |                                  |                                   |
      | 1. 发起充值/定金请求 (含金额)      |                                   |
      |--------------------------------->|                                   |
      |                                  | 2. 创建状态为 pending 的支付订单   |
      |                                  | 3. 调用微信/支付宝统一下单 API      |
      |                                  |---------------------------------->|
      |                                  | 4. 返回支付二维码 URL / prepay_id  |
      |                                  |<----------------------------------|
      | 5. 返回二维码供顾客扫码          |                                   |
      |<---------------------------------|                                   |
      |                                  |                                   |
      | [顾客在手机上完成付款]           |                                   |
      |                                  | 6. 异步回调 Webhook 通知付款成功   |
      |                                  |<----------------------------------|
      |                                  | 7. 验签商户签名与实际金额匹配      |
      |                                  | 8. 开启 Firestore 事务:           |
      |                                  |    - 订单置为 paid                |
      |                                  |    - 充值入账至 wallets           |
      |                                  |    - 生成正向不可篡改流水         |
      | 9. Firestore 实时推送状态更新    |                                   |
      |<~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|                                   |
      | 10. 界面提示“到账成功”并打印单据 |                                   |
```

---

## 4. 抽象服务定义 (`PaymentService.ts`)

```typescript
export interface CreatePaymentParams {
  customerId: string;
  amount: number; // 整数（分）
  provider: 'mock' | 'wechat' | 'alipay';
  paymentStage: 'recharge' | 'order_deposit' | 'order_final';
  relatedOrderId?: string;
  operatorId: string;
  remarks?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentOrderId: string;
  providerTransactionId?: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  message?: string;
  paidAt?: string;
}

export interface IPaymentService {
  createPaymentOrder(params: CreatePaymentParams): Promise<string>;
  confirmPayment(paymentOrderId: string, manualMethod?: string): Promise<PaymentResult>;
  cancelPayment(paymentOrderId: string): Promise<boolean>;
}
```
通过该规范，系统未来切换至真实微信或支付宝商户服务时，仅需替换具体 Service 实现即可，业务调用代码零改动。
