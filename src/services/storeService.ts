import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Customer,
  Measurement,
  Material,
  InventoryTransaction,
  Style,
  Order,
  OrderStatus,
  Wallet,
  WalletTransaction,
  CustomerFile,
  CustomerImage,
  StoreSetting,
  AuditLog,
  PaymentMethod,
  PaymentStage,
} from '../types';
import {
  INITIAL_SETTINGS,
  SEED_CUSTOMERS,
  SEED_MEASUREMENTS,
  SEED_MATERIALS,
  SEED_INVENTORY_TRANSACTIONS,
  SEED_STYLES,
  SEED_ORDERS,
  SEED_WALLETS,
  SEED_WALLET_TRANSACTIONS,
  SEED_CUSTOMER_FILES,
  SEED_CUSTOMER_IMAGES,
} from './seedData';

// Local storage key for fallback persistence
const LOCAL_STORAGE_PREFIX = 'qicai_tailor_';

class StoreService {
  private inMemoryCustomers: Customer[] = [...SEED_CUSTOMERS];
  private inMemoryMeasurements: Measurement[] = [...SEED_MEASUREMENTS];
  private inMemoryMaterials: Material[] = [...SEED_MATERIALS];
  private inMemoryInventoryTransactions: InventoryTransaction[] = [...SEED_INVENTORY_TRANSACTIONS];
  private inMemoryStyles: Style[] = [...SEED_STYLES];
  private inMemoryOrders: Order[] = [...SEED_ORDERS];
  private inMemoryWallets: Map<string, Wallet> = new Map(SEED_WALLETS.map(w => [w.customerId, w]));
  private inMemoryWalletTransactions: WalletTransaction[] = [...SEED_WALLET_TRANSACTIONS];
  private inMemoryFiles: CustomerFile[] = [...SEED_CUSTOMER_FILES];
  private inMemoryImages: CustomerImage[] = [...SEED_CUSTOMER_IMAGES];
  private inMemorySettings: StoreSetting = { ...INITIAL_SETTINGS };
  private inMemoryAuditLogs: AuditLog[] = [];
  private isInitialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}state`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.customers?.length) this.inMemoryCustomers = parsed.customers;
        if (parsed.measurements?.length) {
          this.inMemoryMeasurements = parsed.measurements.map((m: any) => ({
            ...m,
            unit: m.unit || '尺',
          }));
        }
        if (parsed.materials?.length) this.inMemoryMaterials = parsed.materials;
        if (parsed.orders?.length) this.inMemoryOrders = parsed.orders;
        if (parsed.styles?.length) this.inMemoryStyles = parsed.styles;
        if (parsed.wallets?.length) this.inMemoryWallets = new Map(parsed.wallets.map((w: Wallet) => [w.customerId, w]));
        if (parsed.walletTransactions?.length) this.inMemoryWalletTransactions = parsed.walletTransactions;
        if (parsed.files?.length) this.inMemoryFiles = parsed.files;
        if (parsed.settings) this.inMemorySettings = parsed.settings;
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using default seed:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      const payload = {
        customers: this.inMemoryCustomers,
        measurements: this.inMemoryMeasurements,
        materials: this.inMemoryMaterials,
        orders: this.inMemoryOrders,
        styles: this.inMemoryStyles,
        wallets: Array.from(this.inMemoryWallets.values()),
        walletTransactions: this.inMemoryWalletTransactions,
        files: this.inMemoryFiles,
        settings: this.inMemorySettings,
      };
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}state`, JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  // Ensure initial seed documents exist in Firestore
  public async initializeDatabase() {
    if (this.isInitialized) return;
    try {
      const settingsRef = doc(db, 'settings', 'default');
      const snap = await getDoc(settingsRef);
      if (!snap.exists()) {
        await setDoc(settingsRef, this.inMemorySettings);
        // Seed initial customers
        for (const c of SEED_CUSTOMERS) {
          await setDoc(doc(db, 'customers', c.id), c);
        }
        for (const m of SEED_MEASUREMENTS) {
          await setDoc(doc(db, 'measurements', m.id), m);
        }
        for (const mat of SEED_MATERIALS) {
          await setDoc(doc(db, 'materials', mat.id), mat);
        }
        for (const s of SEED_STYLES) {
          await setDoc(doc(db, 'styles', s.id), s);
        }
        for (const o of SEED_ORDERS) {
          await setDoc(doc(db, 'orders', o.id), o);
        }
        for (const w of SEED_WALLETS) {
          await setDoc(doc(db, 'wallets', w.id), w);
        }
        for (const wt of SEED_WALLET_TRANSACTIONS) {
          await setDoc(doc(db, 'walletTransactions', wt.id), wt);
        }
        for (const cf of SEED_CUSTOMER_FILES) {
          await setDoc(doc(db, 'customerFiles', cf.id), cf);
        }
        for (const ci of SEED_CUSTOMER_IMAGES) {
          await setDoc(doc(db, 'customerImages', ci.id), ci);
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('Firestore initial sync encountered notice, proceeding with resilient cache:', error);
      this.isInitialized = true;
    }
  }

  // --- Audit Log ---
  public async addAuditLog(action: string, targetType: string, targetId: string, details: string, operatorId = 'staff-01') {
    const log: AuditLog = {
      id: `LOG-${Date.now()}`,
      logId: `LOG-${Date.now()}`,
      operatorId,
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      details,
    };
    this.inMemoryAuditLogs.unshift(log);
    try {
      await setDoc(doc(db, 'auditLogs', log.id), log);
    } catch (e) {
      // safe fallback
    }
  }

  // --- Settings ---
  public async getSettings(): Promise<StoreSetting> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'default'));
      if (snap.exists()) {
        this.inMemorySettings = snap.data() as StoreSetting;
      }
    } catch (e) {
      // use memory
    }
    return this.inMemorySettings;
  }

  public async updateSettings(settings: Partial<StoreSetting>): Promise<StoreSetting> {
    this.inMemorySettings = { ...this.inMemorySettings, ...settings };
    this.saveToLocalStorage();
    try {
      await updateDoc(doc(db, 'settings', 'default'), settings as Record<string, unknown>);
      await this.addAuditLog('修改系统配置', 'settings', 'default', '更新了店铺资料或折扣规则');
    } catch (e) {
      // memory updated
    }
    return this.inMemorySettings;
  }

  // --- Customers ---
  public async getCustomers(): Promise<Customer[]> {
    try {
      const colRef = collection(db, 'customers');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: Customer[] = [];
        snap.forEach(d => {
          const data = d.data() as Customer;
          if (!data.isDeleted) list.push(data);
        });
        this.inMemoryCustomers = list;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryCustomers.filter(c => !c.isDeleted);
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    try {
      const snap = await getDoc(doc(db, 'customers', id));
      if (snap.exists()) {
        const data = snap.data() as Customer;
        if (!data.isDeleted) return data;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryCustomers.find(c => c.id === id && !c.isDeleted) || null;
  }

  public async createCustomer(customerData: Omit<Customer, 'id' | 'customerId' | 'orderCount' | 'totalSpent' | 'walletBalance' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const nextSeq = this.inMemoryCustomers.length + 1;
    const cid = `C${new Date().getFullYear()}${String(nextSeq).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customerData,
      id: cid,
      customerId: cid,
      orderCount: 0,
      totalSpent: 0,
      walletBalance: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    // Also initialize wallet
    const newWallet: Wallet = {
      id: cid,
      customerId: cid,
      balance: 0,
      totalRecharged: 0,
      totalConsumed: 0,
      version: 1,
      updatedAt: now,
    };

    this.inMemoryCustomers.unshift(newCustomer);
    this.inMemoryWallets.set(cid, newWallet);
    this.saveToLocalStorage();

    try {
      await setDoc(doc(db, 'customers', cid), newCustomer);
      await setDoc(doc(db, 'wallets', cid), newWallet);
      await this.addAuditLog('新建客户档案', 'customers', cid, `创建客户：${newCustomer.name} (${newCustomer.phone})`);
    } catch (e) {
      console.warn('Customer written to local state:', e);
    }
    return newCustomer;
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const index = this.inMemoryCustomers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('客户不存在');
    const updated = {
      ...this.inMemoryCustomers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryCustomers[index] = updated;
    this.saveToLocalStorage();

    try {
      await updateDoc(doc(db, 'customers', id), updates as Record<string, unknown>);
      await this.addAuditLog('修改客户资料', 'customers', id, `更新了客户信息：${updated.name}`);
    } catch (e) {
      // local updated
    }
    return updated;
  }

  public async softDeleteCustomer(id: string): Promise<boolean> {
    const customer = await this.getCustomerById(id);
    if (!customer) return false;
    await this.updateCustomer(id, { isDeleted: true });
    await this.addAuditLog('删除客户档案', 'customers', id, `软删除了客户档案：${customer.name}`);
    return true;
  }

  // --- Measurements ---
  public async getMeasurementsByCustomerId(customerId: string): Promise<Measurement[]> {
    try {
      const q = query(
        collection(db, 'measurements'),
        where('customerId', '==', customerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Measurement[] = [];
        snap.forEach(d => list.push(d.data() as Measurement));
        list.sort((a, b) => new Date(b.measureDate).getTime() - new Date(a.measureDate).getTime());
        return list;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryMeasurements
      .filter(m => m.customerId === customerId)
      .sort((a, b) => new Date(b.measureDate).getTime() - new Date(a.measureDate).getTime());
  }

  public async createMeasurement(data: Omit<Measurement, 'id' | 'measurementId' | 'createdAt'>): Promise<Measurement> {
    const id = `M-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const newMeasurement: Measurement = {
      ...data,
      unit: data.unit || '尺',
      id,
      measurementId: id,
      createdAt: new Date().toISOString(),
    };

    // If marked as isCurrent, un-mark previous measurements of this customer
    if (newMeasurement.isCurrent) {
      this.inMemoryMeasurements.forEach(m => {
        if (m.customerId === newMeasurement.customerId) {
          m.isCurrent = false;
        }
      });
    }

    this.inMemoryMeasurements.unshift(newMeasurement);
    // Update customer lastMeasurementDate
    await this.updateCustomer(newMeasurement.customerId, {
      lastMeasurementDate: newMeasurement.measureDate,
    });
    this.saveToLocalStorage();

    try {
      await setDoc(doc(db, 'measurements', id), newMeasurement);
      await this.addAuditLog('录入新量体记录', 'measurements', id, `为客户 ${newMeasurement.customerId} 录入了量体数据 (${newMeasurement.measureDate})`);
    } catch (e) {
      // memory updated
    }
    return newMeasurement;
  }

  public async setCurrentMeasurement(measurementId: string, customerId: string): Promise<void> {
    this.inMemoryMeasurements.forEach(m => {
      if (m.customerId === customerId) {
        m.isCurrent = m.id === measurementId;
      }
    });
    this.saveToLocalStorage();

    try {
      const customerMeasurements = this.inMemoryMeasurements.filter(m => m.customerId === customerId);
      for (const m of customerMeasurements) {
        await updateDoc(doc(db, 'measurements', m.id), { isCurrent: m.isCurrent });
      }
      await this.addAuditLog('设定当前生效量体', 'measurements', measurementId, `设置量体 ${measurementId} 为客户当前主数据`);
    } catch (e) {
      // memory updated
    }
  }

  // --- Materials & Inventory ---
  public async getMaterials(): Promise<Material[]> {
    try {
      const snap = await getDocs(collection(db, 'materials'));
      if (!snap.empty) {
        const list: Material[] = [];
        snap.forEach(d => {
          const mat = d.data() as Material;
          if (!mat.isDeleted) list.push(mat);
        });
        this.inMemoryMaterials = list;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryMaterials.filter(m => !m.isDeleted);
  }

  public async getMaterialById(id: string): Promise<Material | null> {
    return this.inMemoryMaterials.find(m => m.id === id && !m.isDeleted) || null;
  }

  public async createMaterial(materialData: Omit<Material, 'id' | 'materialId' | 'isDeleted' | 'updatedAt'>): Promise<Material> {
    const id = `MAT-${Date.now().toString().slice(-4)}`;
    const newMaterial: Material = {
      ...materialData,
      id,
      materialId: id,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryMaterials.unshift(newMaterial);

    // Initial stock transaction if stockQuantity > 0
    if (newMaterial.stockQuantity > 0) {
      await this.createInventoryTransaction({
        materialId: id,
        materialName: newMaterial.name,
        type: 'purchase_in',
        quantity: newMaterial.stockQuantity,
        beforeQuantity: 0,
        afterQuantity: newMaterial.stockQuantity,
        operatorId: 'staff-01',
        operatorName: '店员',
        remarks: '初始面料建档入库',
      });
    }

    this.saveToLocalStorage();
    try {
      await setDoc(doc(db, 'materials', id), newMaterial);
      await this.addAuditLog('录入新面料', 'materials', id, `新增面料：${newMaterial.name} (${newMaterial.brand})`);
    } catch (e) {
      // local updated
    }
    return newMaterial;
  }

  public async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const idx = this.inMemoryMaterials.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('面料档案不存在');

    const updated: Material = {
      ...this.inMemoryMaterials[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryMaterials[idx] = updated;
    this.saveToLocalStorage();

    try {
      await updateDoc(doc(db, 'materials', id), {
        ...updates,
        updatedAt: updated.updatedAt,
      });
      await this.addAuditLog('更新面料信息', 'materials', id, `更新面料 ${updated.name} 的档案资料或花色图集`);
    } catch (e) {
      // local updated
    }
    return updated;
  }

  public async getInventoryTransactions(materialId?: string): Promise<InventoryTransaction[]> {
    try {
      const snap = await getDocs(collection(db, 'inventoryTransactions'));
      if (!snap.empty) {
        const list: InventoryTransaction[] = [];
        snap.forEach(d => list.push(d.data() as InventoryTransaction));
        this.inMemoryInventoryTransactions = list;
      }
    } catch (e) {
      // fallback
    }
    let res = this.inMemoryInventoryTransactions;
    if (materialId) res = res.filter(t => t.materialId === materialId);
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createInventoryTransaction(data: Omit<InventoryTransaction, 'id' | 'transactionId' | 'createdAt'>): Promise<InventoryTransaction> {
    const tid = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const newTx: InventoryTransaction = {
      ...data,
      id: tid,
      transactionId: tid,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryInventoryTransactions.unshift(newTx);

    // Update material's stockQuantity
    const matIndex = this.inMemoryMaterials.findIndex(m => m.id === data.materialId);
    if (matIndex !== -1) {
      this.inMemoryMaterials[matIndex].stockQuantity = Number(data.afterQuantity.toFixed(2));
      this.inMemoryMaterials[matIndex].updatedAt = new Date().toISOString();
      try {
        await updateDoc(doc(db, 'materials', data.materialId), {
          stockQuantity: this.inMemoryMaterials[matIndex].stockQuantity,
          updatedAt: this.inMemoryMaterials[matIndex].updatedAt,
        });
      } catch (e) {
        // fallback
      }
    }

    this.saveToLocalStorage();
    try {
      await setDoc(doc(db, 'inventoryTransactions', tid), newTx);
      await this.addAuditLog('库存变动', 'materials', data.materialId, `面料 ${data.materialName || data.materialId} 变动 ${data.quantity}米，类型: ${data.type}`);
    } catch (e) {
      // fallback
    }
    return newTx;
  }

  // --- Styles ---
  public async getStyles(): Promise<Style[]> {
    try {
      const snap = await getDocs(collection(db, 'styles'));
      if (!snap.empty) {
        const list: Style[] = [];
        snap.forEach(d => list.push(d.data() as Style));
        this.inMemoryStyles = list;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryStyles;
  }

  public async createStyle(styleData: Omit<Style, 'id' | 'styleId' | 'createdAt'>): Promise<Style> {
    const id = `STY-${Date.now().toString().slice(-4)}`;
    const newStyle: Style = {
      ...styleData,
      id,
      styleId: id,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryStyles.unshift(newStyle);
    this.saveToLocalStorage();
    try {
      await setDoc(doc(db, 'styles', id), newStyle);
      await this.addAuditLog('新增服装款式', 'styles', id, `新增款式：${newStyle.name} (${newStyle.category})`);
    } catch (e) {
      // fallback
    }
    return newStyle;
  }

  // --- Orders ---
  public async getOrders(customerId?: string): Promise<Order[]> {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        const list: Order[] = [];
        snap.forEach(d => list.push(d.data() as Order));
        this.inMemoryOrders = list;
      }
    } catch (e) {
      // fallback
    }
    let res = this.inMemoryOrders;
    if (customerId) res = res.filter(o => o.customerId === customerId);
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    return this.inMemoryOrders.find(o => o.id === orderId || o.orderId === orderId) || null;
  }

  public async createOrder(orderPayload: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    items: Omit<Order['items'][0], 'id' | 'orderId'>[];
    totalAmount: number; // 分
    discountAmount: number; // 分
    payableAmount: number; // 分
    depositPaidAmount: number; // 分 (初始定金收款)
    depositPaymentMethod: PaymentMethod;
    estimatedDeliveryDate: string;
    remarks?: string;
    operatorId?: string;
  }): Promise<Order> {
    const oid = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const items = orderPayload.items.map((item, idx) => ({
      ...item,
      id: `ITEM-${oid}-${idx + 1}`,
      orderId: oid,
    }));

    const payments: Order['payments'] = [];
    let paidAmount = 0;

    // Handle initial deposit if paid
    if (orderPayload.depositPaidAmount > 0) {
      paidAmount = orderPayload.depositPaidAmount;
      const pid = `PAY-${Date.now()}`;
      let walletTxId: string | undefined;

      // If paid via store credit (wallet), atomically deduct
      if (orderPayload.depositPaymentMethod === 'wallet') {
        const tx = await this.deductWallet(
          orderPayload.customerId,
          orderPayload.depositPaidAmount,
          oid,
          `定制订单定金支付 (单号: ${oid})`
        );
        walletTxId = tx.transactionId;
      }

      payments.push({
        id: pid,
        paymentId: pid,
        orderId: oid,
        customerId: orderPayload.customerId,
        stage: paidAmount >= orderPayload.payableAmount ? 'full' : 'deposit',
        amount: orderPayload.depositPaidAmount,
        paymentMethod: orderPayload.depositPaymentMethod,
        walletTransactionId: walletTxId,
        operatorId: orderPayload.operatorId || 'staff-01',
        createdAt: now,
        remarks: '建单时收取定金/全款',
      });
    }

    const unpaidAmount = Math.max(0, orderPayload.payableAmount - paidAmount);
    const paymentStatus: Order['paymentStatus'] =
      paidAmount >= orderPayload.payableAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const newOrder: Order = {
      id: oid,
      orderId: oid,
      customerId: orderPayload.customerId,
      customerName: orderPayload.customerName,
      customerPhone: orderPayload.customerPhone,
      status: 'placed',
      totalAmount: orderPayload.totalAmount,
      discountAmount: orderPayload.discountAmount,
      payableAmount: orderPayload.payableAmount,
      paidAmount,
      unpaidAmount,
      paymentStatus,
      estimatedDeliveryDate: orderPayload.estimatedDeliveryDate,
      statusHistory: [
        {
          status: 'placed',
          operatorId: orderPayload.operatorId || 'staff-01',
          timestamp: now,
          note: `订单创建并已收取定金/全款 ¥${(paidAmount / 100).toFixed(2)}`,
        },
      ],
      items,
      payments,
      remarks: orderPayload.remarks,
      operatorId: orderPayload.operatorId || 'staff-01',
      createdAt: now,
      updatedAt: now,
    };

    this.inMemoryOrders.unshift(newOrder);

    // Update customer stats
    const cust = await this.getCustomerById(orderPayload.customerId);
    if (cust) {
      await this.updateCustomer(orderPayload.customerId, {
        orderCount: cust.orderCount + 1,
        totalSpent: cust.totalSpent + orderPayload.payableAmount,
        lastOrderDate: now.split('T')[0],
      });
    }

    this.saveToLocalStorage();
    try {
      await setDoc(doc(db, 'orders', oid), newOrder);
      await this.addAuditLog('创建定制订单', 'orders', oid, `为客户 ${newOrder.customerName} 创建定制订单，总额 ¥${(newOrder.payableAmount / 100).toFixed(2)}`);
    } catch (e) {
      // fallback
    }

    return newOrder;
  }

  public async updateOrderStatus(orderId: string, newStatus: OrderStatus, note: string, operatorId = 'staff-01'): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('订单不存在');

    const now = new Date().toISOString();
    order.status = newStatus;
    order.updatedAt = now;
    order.statusHistory.push({
      status: newStatus,
      operatorId,
      timestamp: now,
      note,
    });

    this.saveToLocalStorage();
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        statusHistory: order.statusHistory,
        updatedAt: now,
      });
      await this.addAuditLog('更新订单状态', 'orders', order.id, `订单 ${order.orderId} 状态变更为: ${newStatus} (${note})`);
    } catch (e) {
      // fallback
    }
    return order;
  }

  public async addOrderPayment(
    orderId: string,
    amount: number, // 分
    method: PaymentMethod,
    stage: PaymentStage,
    remarks?: string,
    operatorId = 'staff-01'
  ): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('订单不存在');
    if (amount <= 0) throw new Error('收款金额必须大于0');
    if (amount > order.unpaidAmount) throw new Error(`收款金额超出未付尾款 (待付: ¥${(order.unpaidAmount / 100).toFixed(2)})`);

    const now = new Date().toISOString();
    const pid = `PAY-${Date.now()}`;
    let walletTxId: string | undefined;

    // If paid by wallet, deduct atomically
    if (method === 'wallet') {
      const tx = await this.deductWallet(order.customerId, amount, order.orderId, `订单尾款/分期收款 (订单: ${order.orderId})`);
      walletTxId = tx.transactionId;
    }

    const newPayment: Order['payments'][0] = {
      id: pid,
      paymentId: pid,
      orderId: order.orderId,
      customerId: order.customerId,
      stage,
      amount,
      paymentMethod: method,
      walletTransactionId: walletTxId,
      operatorId,
      createdAt: now,
      remarks,
    };

    order.payments.push(newPayment);
    order.paidAmount += amount;
    order.unpaidAmount = Math.max(0, order.payableAmount - order.paidAmount);
    order.paymentStatus = order.unpaidAmount === 0 ? 'paid' : 'partial';
    order.updatedAt = now;

    this.saveToLocalStorage();
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        payments: order.payments,
        paidAmount: order.paidAmount,
        unpaidAmount: order.unpaidAmount,
        paymentStatus: order.paymentStatus,
        updatedAt: now,
      });
      await this.addAuditLog('订单收款核销', 'orders', order.id, `订单 ${order.orderId} 收款 ¥${(amount / 100).toFixed(2)}，方式: ${method}`);
    } catch (e) {
      // fallback
    }
    return order;
  }

  // --- Wallets & Transactions (Atomic Ledger) ---
  public async getWallet(customerId: string): Promise<Wallet> {
    let wallet = this.inMemoryWallets.get(customerId);
    if (!wallet) {
      wallet = {
        id: customerId,
        customerId,
        balance: 0,
        totalRecharged: 0,
        totalConsumed: 0,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      this.inMemoryWallets.set(customerId, wallet);
      this.saveToLocalStorage();
    }
    try {
      const snap = await getDoc(doc(db, 'wallets', customerId));
      if (snap.exists()) {
        const remote = snap.data() as Wallet;
        this.inMemoryWallets.set(customerId, remote);
        return remote;
      }
    } catch (e) {
      // fallback
    }
    return wallet;
  }

  public async getWalletTransactions(customerId?: string): Promise<WalletTransaction[]> {
    try {
      const snap = await getDocs(collection(db, 'walletTransactions'));
      if (!snap.empty) {
        const list: WalletTransaction[] = [];
        snap.forEach(d => list.push(d.data() as WalletTransaction));
        this.inMemoryWalletTransactions = list;
      }
    } catch (e) {
      // fallback
    }
    let res = this.inMemoryWalletTransactions;
    if (customerId) res = res.filter(w => w.customerId === customerId);
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Atomic Recharge
  public async rechargeWallet(
    customerId: string,
    amount: number, // 分 (正数)
    paymentMethod: PaymentMethod,
    remarks: string,
    operatorId = 'staff-01'
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new Error('充值金额必须大于零');

    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error('客户不存在');

    const wallet = await this.getWallet(customerId);
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;
    const now = new Date().toISOString();
    const tid = `WT-${Date.now()}`;

    const newTx: WalletTransaction = {
      id: tid,
      transactionId: tid,
      customerId,
      customerName: customer.name,
      type: 'recharge',
      amount,
      balanceBefore,
      balanceAfter,
      paymentMethod,
      operatorId,
      createdAt: now,
      remarks,
    };

    // Update in-memory wallet & customer balance
    wallet.balance = balanceAfter;
    wallet.totalRecharged += amount;
    wallet.version += 1;
    wallet.updatedAt = now;
    customer.walletBalance = balanceAfter;

    this.inMemoryWalletTransactions.unshift(newTx);
    this.saveToLocalStorage();

    // Firestore atomic transaction attempt
    try {
      await runTransaction(db, async transaction => {
        const walletRef = doc(db, 'wallets', customerId);
        const wDoc = await transaction.get(walletRef);
        const currentBal = wDoc.exists() ? (wDoc.data() as Wallet).balance : 0;
        transaction.set(walletRef, {
          id: customerId,
          customerId,
          balance: currentBal + amount,
          totalRecharged: wallet.totalRecharged,
          totalConsumed: wallet.totalConsumed,
          version: wallet.version,
          updatedAt: now,
        });
        transaction.set(doc(db, 'walletTransactions', tid), newTx);
        transaction.update(doc(db, 'customers', customerId), {
          walletBalance: currentBal + amount,
          updatedAt: now,
        });
      });
    } catch (e) {
      console.warn('Firestore transaction fallback to local synced state:', e);
    }

    await this.addAuditLog('储值充值', 'wallets', customerId, `客户 ${customer.name} 充值 ¥${(amount / 100).toFixed(2)} (${paymentMethod})，余额变为 ¥${(balanceAfter / 100).toFixed(2)}`);
    return newTx;
  }

  // Atomic Deduction (Consume)
  public async deductWallet(
    customerId: string,
    amount: number, // 分 (正数传入，扣减为负流水)
    relatedOrderId: string,
    remarks: string,
    operatorId = 'staff-01'
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new Error('扣款金额必须大于零');

    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error('客户不存在');

    const wallet = await this.getWallet(customerId);
    if (wallet.balance < amount) {
      throw new Error(`储值余额不足，当前余额 ¥${(wallet.balance / 100).toFixed(2)}，本次需支付 ¥${(amount / 100).toFixed(2)}`);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;
    const now = new Date().toISOString();
    const tid = `WT-${Date.now()}`;

    const newTx: WalletTransaction = {
      id: tid,
      transactionId: tid,
      customerId,
      customerName: customer.name,
      type: 'consume',
      amount: -amount, // Negative for consumption
      balanceBefore,
      balanceAfter,
      paymentMethod: 'wallet',
      relatedOrderId,
      operatorId,
      createdAt: now,
      remarks,
    };

    wallet.balance = balanceAfter;
    wallet.totalConsumed += amount;
    wallet.version += 1;
    wallet.updatedAt = now;
    customer.walletBalance = balanceAfter;

    this.inMemoryWalletTransactions.unshift(newTx);
    this.saveToLocalStorage();

    try {
      await runTransaction(db, async transaction => {
        const walletRef = doc(db, 'wallets', customerId);
        const wDoc = await transaction.get(walletRef);
        const currentBal = wDoc.exists() ? (wDoc.data() as Wallet).balance : 0;
        if (currentBal < amount) {
          throw new Error('储值余额不足');
        }
        transaction.update(walletRef, {
          balance: currentBal - amount,
          totalConsumed: wallet.totalConsumed,
          version: wallet.version,
          updatedAt: now,
        });
        transaction.set(doc(db, 'walletTransactions', tid), newTx);
        transaction.update(doc(db, 'customers', customerId), {
          walletBalance: currentBal - amount,
          updatedAt: now,
        });
      });
    } catch (e) {
      console.warn('Firestore deduction sync warning:', e);
    }

    await this.addAuditLog('储值消费扣款', 'wallets', customerId, `客户 ${customer.name} 消费储值 ¥${(amount / 100).toFixed(2)}，关联订单 ${relatedOrderId}`);
    return newTx;
  }

  // Atomic Refund
  public async refundWallet(
    customerId: string,
    amount: number, // 分 (正数)
    relatedOrderId: string,
    remarks: string,
    operatorId = 'staff-01'
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new Error('退款金额必须大于零');

    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error('客户不存在');

    const wallet = await this.getWallet(customerId);
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;
    const now = new Date().toISOString();
    const tid = `WT-${Date.now()}`;

    const newTx: WalletTransaction = {
      id: tid,
      transactionId: tid,
      customerId,
      customerName: customer.name,
      type: 'refund',
      amount, // Positive for refund
      balanceBefore,
      balanceAfter,
      paymentMethod: 'wallet',
      relatedOrderId,
      operatorId,
      createdAt: now,
      remarks,
    };

    wallet.balance = balanceAfter;
    wallet.version += 1;
    wallet.updatedAt = now;
    customer.walletBalance = balanceAfter;

    this.inMemoryWalletTransactions.unshift(newTx);
    this.saveToLocalStorage();

    try {
      await runTransaction(db, async transaction => {
        const walletRef = doc(db, 'wallets', customerId);
        transaction.update(walletRef, {
          balance: balanceAfter,
          version: wallet.version,
          updatedAt: now,
        });
        transaction.set(doc(db, 'walletTransactions', tid), newTx);
        transaction.update(doc(db, 'customers', customerId), {
          walletBalance: balanceAfter,
          updatedAt: now,
        });
      });
    } catch (e) {
      // fallback
    }

    await this.addAuditLog('储值退款冲正', 'wallets', customerId, `客户 ${customer.name} 订单 ${relatedOrderId} 退款入账 ¥${(amount / 100).toFixed(2)}`);
    return newTx;
  }

  // --- Archives (CustomerFiles) ---
  public async getCustomerFiles(customerId?: string): Promise<CustomerFile[]> {
    try {
      const snap = await getDocs(collection(db, 'customerFiles'));
      if (!snap.empty) {
        const list: CustomerFile[] = [];
        snap.forEach(d => list.push(d.data() as CustomerFile));
        this.inMemoryFiles = list;
      }
    } catch (e) {
      // fallback
    }
    let res = this.inMemoryFiles;
    if (customerId) res = res.filter(f => f.customerId === customerId);
    return res.sort((a, b) => b.year - a.year || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createCustomerFile(fileData: Omit<CustomerFile, 'id' | 'fileId' | 'createdAt'>): Promise<CustomerFile> {
    const id = `FILE-${fileData.year}-${Date.now().toString().slice(-4)}`;
    const newFile: CustomerFile = {
      ...fileData,
      id,
      fileId: id,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryFiles.unshift(newFile);
    this.saveToLocalStorage();

    try {
      await setDoc(doc(db, 'customerFiles', id), newFile);
      await this.addAuditLog('上传纸质档案扫描件', 'customerFiles', id, `客户 ${newFile.customerId} 归档 ${newFile.year}年档案: ${newFile.fileName}`);
    } catch (e) {
      // fallback
    }
    return newFile;
  }

  public async deleteCustomerFile(fileId: string): Promise<void> {
    const target = this.inMemoryFiles.find(f => f.id === fileId);
    this.inMemoryFiles = this.inMemoryFiles.filter(f => f.id !== fileId);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'customerFiles', fileId));
      if (target) {
        await this.addAuditLog('删除历史档案扫描件', 'customerFiles', fileId, `删除了客户 ${target.customerId} 的档案: ${target.fileName}`);
      }
    } catch (e) {
      // local updated
    }
  }

  // --- Customer Images ---
  public async getCustomerImages(customerId: string): Promise<CustomerImage[]> {
    try {
      const q = query(collection(db, 'customerImages'), where('customerId', '==', customerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: CustomerImage[] = [];
        snap.forEach(d => list.push(d.data() as CustomerImage));
        return list;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryImages.filter(i => i.customerId === customerId);
  }

  public async createCustomerImage(data: Omit<CustomerImage, 'id' | 'imageId' | 'createdAt'>): Promise<CustomerImage> {
    const id = `IMG-${Date.now().toString().slice(-4)}`;
    const newImg: CustomerImage = {
      ...data,
      id,
      imageId: id,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryImages.unshift(newImg);
    this.saveToLocalStorage();

    try {
      await setDoc(doc(db, 'customerImages', id), newImg);
      await this.addAuditLog('上传客户照片', 'customerImages', id, `为客户 ${newImg.customerId} 上传了照片 (${newImg.imageType})`);
    } catch (e) {
      // fallback
    }
    return newImg;
  }

  public async deleteCustomerImage(imageId: string): Promise<void> {
    const target = this.inMemoryImages.find(i => i.id === imageId);
    this.inMemoryImages = this.inMemoryImages.filter(i => i.id !== imageId);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'customerImages', imageId));
      if (target) {
        await this.addAuditLog('删除客户照片', 'customerImages', imageId, `删除了客户 ${target.customerId} 的照片 (${target.title})`);
      }
    } catch (e) {
      // local updated
    }
  }

  // Reset to initial seed data
  public resetToSeedData() {
    this.inMemoryCustomers = [...SEED_CUSTOMERS];
    this.inMemoryMeasurements = [...SEED_MEASUREMENTS];
    this.inMemoryMaterials = [...SEED_MATERIALS];
    this.inMemoryInventoryTransactions = [...SEED_INVENTORY_TRANSACTIONS];
    this.inMemoryStyles = [...SEED_STYLES];
    this.inMemoryOrders = [...SEED_ORDERS];
    this.inMemoryWallets = new Map(SEED_WALLETS.map(w => [w.customerId, w]));
    this.inMemoryWalletTransactions = [...SEED_WALLET_TRANSACTIONS];
    this.inMemoryFiles = [...SEED_CUSTOMER_FILES];
    this.inMemoryImages = [...SEED_CUSTOMER_IMAGES];
    this.inMemorySettings = { ...INITIAL_SETTINGS };
    this.saveToLocalStorage();
  }

  // Export data as JSON
  public exportDataJson(): string {
    const backup = {
      timestamp: new Date().toISOString(),
      shop: this.inMemorySettings.shopName,
      customers: this.inMemoryCustomers,
      measurements: this.inMemoryMeasurements,
      materials: this.inMemoryMaterials,
      inventoryTransactions: this.inMemoryInventoryTransactions,
      styles: this.inMemoryStyles,
      orders: this.inMemoryOrders,
      wallets: Array.from(this.inMemoryWallets.values()),
      walletTransactions: this.inMemoryWalletTransactions,
      files: this.inMemoryFiles,
      settings: this.inMemorySettings,
    };
    return JSON.stringify(backup, null, 2);
  }
}

export const storeService = new StoreService();
