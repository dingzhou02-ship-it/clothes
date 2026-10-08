# 七彩布衣数字化管理系统 - 数据库设计规格书 (DATABASE.md)

本系统采用 Google Cloud Firestore 作为主数据库。所有金额字段均以**整数“分”**存储；所有时间戳均采用 ISO 8601 字符串或 Firestore Timestamp。

---

## 1. 集合清单 (Collections)

| 集合名称 (Collection) | 说明 | 安全权限 |
| :--- | :--- | :--- |
| `users` | 店内员工/店长账号 | 仅已登录店员可读，管理员可分配 |
| `admins` | 超级管理员白名单 | 仅管理员可写 |
| `customers` | 客户基础资料主表 | 登录店员读写，软删除/管理员删除 |
| `measurements` | 客户多次历史量体数据 | 历史多版本，登录店员可读写 |
| `materials` | 面料档案及当前库存 | 登录店员可读写 |
| `inventoryTransactions` | 面料出入库/裁剪消耗不可变流水 | 登录店员可写，**禁止修改与删除** |
| `styles` | 款式目录及定制工艺参数库 | 登录店员可读写 |
| `orders` | 定制订单主表（含状态生命周期） | 登录店员可读写 |
| `orderItems` | 订单商品行项目（含面料与量体快照） | 登录店员可读写 |
| `orderPayments` | 订单定金/尾款实收台账 | 登录店员可写，**禁止修改与删除** |
| `wallets` | 客户储值账户余额主表 | 事务内读写，**禁止删除** |
| `walletTransactions` | 储值充值/消费/退款不可变流水 | 事务内写入，**禁止修改与删除** |
| `paymentOrders` | 预留微信/支付宝网关支付订单 | 登录店员/服务端读写 |
| `customerFiles` | 老纸质订单扫描件/PDF 归档元数据 | 登录店员可读写 |
| `customerImages` | 客户试衣照/成衣实物照片 | 登录店员可读写 |
| `settings` | 店铺基本信息及会员折扣规则 | 登录店员可读，管理员可修改 |
| `auditLogs` | 系统操作不可变审计日志 | 登录店员可写，**禁止修改与删除** |

---

## 2. 核心集合字段定义

### 2.1 `customers` (客户表)
```typescript
interface Customer {
  id: string;                  // 文档ID (如 "C20261001")
  customerId: string;          // 客户业务编号 (如 "C20261001")
  name: string;                // 客户姓名 (如 "张华峰")
  phone: string;               // 手机号 (唯一识别标识)
  gender: 'male' | 'female' | 'other';
  level: 'normal' | 'vip' | 'svip'; // 会员等级 (可享受系统配置的折扣)
  birthday?: string;           // 生日 (如 "1985-06-18")
  occupation?: string;         // 职业 (如 "金融投资顾问")
  address?: string;            // 联系地址
  source?: string;             // 获客渠道 (老客转介绍、大众点评、自然进店等)
  remarks: string;             // 自由量体偏好备注 (如 "右肩偏低1cm，喜欢修身微收腰")
  orderCount: number;          // 历史累计订单数
  totalSpent: number;          // 累计消费总额 (分)
  walletBalance: number;       // 当前储值余额快照 (分)
  lastMeasurementDate?: string;// 最近一次量体日期
  lastOrderDate?: string;      // 最近一次下单日期
  isDeleted: boolean;          // 软删除标记
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 `measurements` (量体记录表)
```typescript
interface CustomMeasurementItem {
  name: string;                // 项目名称 (如 "领围", "肚围", "后背宽")
  value: number;               // 测量数值 (默认单位 cm)
  unit: string;                // 单位 (默认 "cm")
  remark?: string;             // 单项工艺备注 (如 "净体+3cm放量")
}

interface Measurement {
  id: string;                  // 文档ID (如 "M20261007-01")
  measurementId: string;
  customerId: string;          // 关联客户ID
  isCurrent: boolean;          // 是否为当前默认生效量体
  measureDate: string;         // 量体日期 (如 "2026-10-07")
  operatorId: string;          // 量体师傅UID
  operatorName: string;        // 量体师傅姓名
  height?: number;             // 身高 (cm)
  weight?: number;             // 体重 (kg)
  shoulder?: number;           // 肩宽 (cm)
  chest?: number;              // 胸围 (cm)
  waist?: number;              // 腰围 (cm)
  hips?: number;               // 臀围 (cm)
  sleeveLength?: number;       // 袖长 (cm)
  clothLength?: number;        // 衣长 (cm)
  upperArm?: number;           // 上臂围 (cm)
  wrist?: number;              // 手腕围 (cm)
  customItems: CustomMeasurementItem[]; // 自定义测量项
  remarks?: string;            // 整体版型建议 (如 "后背平坦，前胸丰满，需按修身版制版")
  createdAt: string;
}
```

### 2.3 `materials` (面料库) 与 `inventoryTransactions` (面料流水)
```typescript
interface Material {
  id: string;
  materialId: string;          // 编号 (如 "FB-VIT-001")
  name: string;                // 面料品名 (如 "VBC 110支羊毛精纺深灰条纹")
  brand: string;               // 品牌 (如 "Vitale Barberis Canonico")
  category: string[];          // 适用服装类型 (["西服", "裤装", "大衣"])
  composition: string;         // 成分 (如 "100% 澳大利亚美利奴羊毛")
  color: string;               // 颜色
  pattern: string;             // 花型 (纯色/条纹/格纹/人字纹等)
  weight: number;              // 克重 (g/m)
  season: string;              // 季节 (四季 / 春夏 / 秋冬)
  costPrice: number;           // 进货成本 (分/米)
  salePrice: number;           // 零售价格 (分/米)
  stockQuantity: number;       // 当前实际库存量 (米，支持小数)
  safetyStock: number;         // 安全警戒库存 (米)
  location: string;            // 货架库位 (如 "A区-3号展架")
  imageUrls: string[];         // 高清面料图
  remarks?: string;
  isDeleted: boolean;
  updatedAt: string;
}

interface InventoryTransaction {
  id: string;
  transactionId: string;
  materialId: string;
  type: 'purchase_in' | 'manual_in' | 'order_consume' | 'manual_out' | 'audit_adjust';
  quantity: number;            // 变动米数 (入库/调整增加为正，出库/消耗为负)
  beforeQuantity: number;      // 变动前米数
  afterQuantity: number;       // 变动后米数
  relatedOrderId?: string;     // 关联订单ID (裁剪消耗必填)
  operatorId: string;
  createdAt: string;
  remarks: string;
}
```

### 2.4 `orders` (订单表) 与 `orderItems` (商品明细快照)
```typescript
interface Order {
  id: string;
  orderId: string;             // 订单编号 (如 "ORD-202610-0001")
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: 'pending' | 'placed' | 'making' | 'processing' | 'completed' | 'picked_up' | 'cancelled';
  totalAmount: number;         // 原价总计 (分)
  discountAmount: number;      // 优惠总额 (分)
  payableAmount: number;       // 实际应付总额 (分)
  paidAmount: number;          // 累计已收款 (分)
  unpaidAmount: number;        // 待收尾款 (分)
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  estimatedDeliveryDate: string; // 预计交付/试身日期
  statusHistory: {
    status: string;
    operatorId: string;
    timestamp: string;
    note: string;
  }[];
  remarks?: string;
  operatorId: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  category: string;            // 品类 (西服、衬衫、裤装等)
  productName: string;         // 项目名称 (如 "双排扣全毛衬定制西服")
  quantity: number;
  materialId: string;
  materialNameSnapshot: string;// 面料名称快照
  styleId: string;
  styleNameSnapshot: string;   // 款式名称快照
  measurementIdSnapshot: string; // 当时选用的量体记录ID
  measurementDataSnapshot: any;// 关键尺寸瞬时深拷贝快照 (历史不可变)
  unitPrice: number;           // 单价 (分)
  discountRate: number;        // 折扣 (如 0.95)
  subtotal: number;            // 小计 (分)
  customOptions: Record<string, string>; // 领型、驳头、扣眼等工艺参数
  remarks?: string;
}
```

### 2.5 `wallets` 与 `walletTransactions` (储值双轨架构)
```typescript
interface Wallet {
  id: string;                  // 同 customerId
  customerId: string;
  balance: number;             // 当前可用余额 (分)
  totalRecharged: number;      // 历史累计充值 (分)
  totalConsumed: number;       // 历史累计消费 (分)
  version: number;             // 乐观锁版本号
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  transactionId: string;
  customerId: string;
  type: 'recharge' | 'consume' | 'refund' | 'manual_adjust';
  amount: number;              // 变动金额 (分，充值/退款为正，消费为负)
  balanceBefore: number;       // 变动前余额 (分)
  balanceAfter: number;        // 变动后余额 (分)
  paymentMethod: 'wallet' | 'cash' | 'wechat' | 'alipay' | 'other';
  relatedOrderId?: string;     // 消费或退款关联的订单
  paymentOrderId?: string;     // 预留网关订单关联
  operatorId: string;
  createdAt: string;
  remarks: string;
}
```

### 2.6 `customerFiles` (历史纸质档案归档)
```typescript
interface CustomerFile {
  id: string;
  fileId: string;
  customerId: string;
  fileName: string;            // 文件名 (如 "2022年春季订制西服纸质单据.pdf")
  fileType: 'historical_order' | 'historical_measurement' | 'other';
  year: number;                // 归档年份 (如 2022)
  fileUrl: string;             // 存储访问 URL (Firebase Storage)
  fileSize: number;            // 字节数
  operatorId: string;
  remarks?: string;
  createdAt: string;
}
```
