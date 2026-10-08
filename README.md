# 七彩布衣数字化管理系统

高端服装定制工坊（Bespoke Tailoring Boutique）专属内部运营管理系统。专为 Windows/Mac 桌面浏览器与 iPad 触控浏览器优化开发。

---

## 核心业务链条

```
客户档案 ──> 多次量体档案 ──> 高定面料库 ──> 款式工艺库 ──> 定制订单立项
   │               │              │               │            │
   ▼               ▼              ▼               ▼            ▼
储值账户 ◄── 历史不可变快照 ── 出入库流水 ── 工艺参数配置 ── 定金/尾款核销
   │                                                           │
   ▼                                                           ▼
双向记账流水                                              A4定制联打印
```

---

## 系统特性

1. **真实资金安全与整数“分”模型**：
   - 所有金额一律以整数分（Cents）在前端与 Firestore 中流转运算（如 ¥68.00 存为 `6800`），杜绝浮点数精度误差。
   - 储值系统采用“账户（`wallets`）+ 双向不可变流水（`walletTransactions`）”双轨设计，严禁前端直接盲目覆盖余额。
   - 余额变动全部通过原子事务执行，会计勾稽关系严格满足 `balanceAfter = balanceBefore + amount`。

2. **多次量体历史不可变快照**：
   - 客户可拥有无限次历史量体记录，默认采用“当前生效”量体。
   - 下单时将当时采用的体型数据（胸围、腰围、肩宽、袖长、特殊部位放量）瞬时深拷贝至订单商品快照中，后续翻单修改不影响历史真实记录。

3. **老纸质订单免 OCR 高保真归档**：
   - 针对几千份历史纸质老订单，采用“扫描 → PDF → 上传 → 自动按客户+年份归纳建树”的机制，支持在线高清翻阅与原件下载。

4. **面料出入库审计流水**：
   - 每一米面料的采购入库、工坊裁剪消耗、盘点校准均产生 `inventoryTransactions` 流水，低于安全警戒线时工作台即时告警。

5. **iPad 触控与桌面双重优化**：
   - 触控目标 $\ge 42\text{px}$，横向自适应滚动，支持快捷键 `⌘K` 全局搜索。
   - 内置 `@media print` A4 打印样式，量体单与订单定制联排版高雅精细。

---

## 技术架构

- **前端**：React 19 + TypeScript + Tailwind CSS 4 + Vite 8
- **云数据库**：Google Cloud Firestore (Enterprise Edition)
- **认证**：Firebase Authentication (Google 登录 / 店员身份快速切换)
- **文件存储**：Firebase Storage
- **安全规则**：Firestore Security Rules (零信任 ABAC 架构，流水记录只写不可篡改)

---

## 规格文档

- [系统架构规格书 (docs/ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [数据库全量集合字段说明 (docs/DATABASE.md)](./docs/DATABASE.md)
- [支付网关集成与未来演化规范 (docs/PAYMENT.md)](./docs/PAYMENT.md)

---

## 启动与运行

```bash
# 启动开发服务器 (默认端口 3000)
npm run dev

# 编译验证
npm run build

# 语法与类型校验
npm run lint
```
