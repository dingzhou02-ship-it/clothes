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
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { storageService } from './storageService';
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
  RoleDefinition,
  StaffUser,
  AuthorizedPhone,
  DataAccessScope,
  DEFAULT_STORE_ID,
  LegacyDataInspectionSummary,
} from '../types';
export type { LegacyDataInspectionSummary };
import { normalizePhoneToE164, validatePhoneNumber } from '../utils/phoneUtils';
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
  SEED_ROLES,
  SEED_OPERATORS,
} from './seedData';

// Local storage key for fallback persistence
const LOCAL_STORAGE_PREFIX = 'qicai_tailor_';

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

class StoreService {
  // Unauthenticated initial memory is strictly empty so no sensitive data exists before login
  private inMemoryCustomers: Customer[] = [];
  private inMemoryMeasurements: Measurement[] = [];
  private inMemoryMaterials: Material[] = [];
  private inMemoryInventoryTransactions: InventoryTransaction[] = [];
  private inMemoryStyles: Style[] = [];
  private inMemoryOrders: Order[] = [];
  private inMemoryWallets: Map<string, Wallet> = new Map();
  private inMemoryWalletTransactions: WalletTransaction[] = [];
  private inMemoryFiles: CustomerFile[] = [];
  private inMemoryImages: CustomerImage[] = [];
  private inMemorySettings: StoreSetting = { ...INITIAL_SETTINGS };
  private inMemoryAuditLogs: AuditLog[] = [];
  private inMemoryRoles: RoleDefinition[] = [...SEED_ROLES];
  private inMemoryOperators: StaffUser[] = [];
  private inMemoryAuthorizedPhones: AuthorizedPhone[] = [];
  private currentOperator: {
    uid: string;
    name: string;
    role: 'admin' | 'staff';
    storeId: string;
    accessScope: DataAccessScope;
  } = {
    uid: '',
    name: '',
    role: 'staff',
    storeId: DEFAULT_STORE_ID,
    accessScope: 'store',
  };
  private isInitialized = false;

  constructor() {
    // Do not pre-load sensitive customer records into memory before authentication
  }

  public setCurrentOperator(
    uid: string,
    name: string,
    storeId: string = DEFAULT_STORE_ID,
    accessScope: DataAccessScope = 'store',
    role: 'admin' | 'staff' = 'staff'
  ) {
    this.currentOperator = {
      uid,
      name,
      role,
      storeId: storeId || DEFAULT_STORE_ID,
      accessScope: accessScope || 'store',
    };
    storageService.setStorageScope(this.currentOperator.storeId, uid, this.currentOperator.accessScope, role);
  }

  public getCurrentOperatorContext() {
    return { ...this.currentOperator };
  }

  /**
   * 账号级与店铺级数据访问范围校验
   * 1. 未登录用户严禁访问任何业务记录
   * 2. 尚未完成归属迁移的历史旧数据（无 storeId 字段）仅限管理员读取与迁移，绝不暴露给新普通账号
   * 3. 已归属数据必须匹配当前账号的 storeId
   * 4. 若当前账号处于个人数据隔离模式 (accessScope === 'personal')，则仅能访问 ownerUid === 当前用户 UID 的记录
   */
  public canAccessRecord(record?: { storeId?: string; ownerUid?: string } | null): boolean {
    if (!record) return false;
    const activeUid = auth.currentUser?.uid || this.currentOperator.uid;
    if (!activeUid) return false;

    const isAdmin = this.currentOperator.role === 'admin';
    const userStoreId = this.currentOperator.storeId || DEFAULT_STORE_ID;
    const scope = this.currentOperator.accessScope || 'store';

    // Unmigrated legacy data without storeId is strictly isolated to Admin only until migration completes
    if (!record.storeId) {
      return isAdmin;
    }

    if (record.storeId !== userStoreId) {
      return false;
    }

    if (!isAdmin && scope === 'personal') {
      return !!record.ownerUid && record.ownerUid === activeUid;
    }

    return true;
  }

  public clearSensitiveMemory() {
    this.inMemoryCustomers = [];
    this.inMemoryMeasurements = [];
    this.inMemoryMaterials = [];
    this.inMemoryInventoryTransactions = [];
    this.inMemoryStyles = [];
    this.inMemoryOrders = [];
    this.inMemoryWallets.clear();
    this.inMemoryWalletTransactions = [];
    this.inMemoryFiles = [];
    this.inMemoryImages = [];
    this.inMemoryAuditLogs = [];
    this.inMemoryOperators = [];
    this.inMemoryAuthorizedPhones = [];
    this.currentOperator = {
      uid: '',
      name: '',
      role: 'staff',
      storeId: DEFAULT_STORE_ID,
      accessScope: 'store',
    };
    this.isInitialized = false;
    storageService.clearMemoryCache();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}state`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.customers?.length) this.inMemoryCustomers = dedupeById(parsed.customers);
        if (parsed.measurements?.length) {
          this.inMemoryMeasurements = dedupeById(
            parsed.measurements.map((m: any) => ({
              ...m,
              unit: m.unit || '尺',
            }))
          );
        }
        if (parsed.materials?.length) this.inMemoryMaterials = dedupeById(parsed.materials);
        if (parsed.orders?.length) this.inMemoryOrders = dedupeById(parsed.orders);
        if (parsed.styles?.length) this.inMemoryStyles = dedupeById(parsed.styles);
        if (parsed.wallets?.length) this.inMemoryWallets = new Map(parsed.wallets.map((w: Wallet) => [w.customerId, w]));
        if (parsed.walletTransactions?.length) this.inMemoryWalletTransactions = dedupeById(parsed.walletTransactions);
        if (parsed.files?.length) this.inMemoryFiles = dedupeById(parsed.files);
        if (parsed.settings) this.inMemorySettings = parsed.settings;
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using default seed:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      const payload = {
        customers: dedupeById(this.inMemoryCustomers),
        measurements: dedupeById(this.inMemoryMeasurements),
        materials: dedupeById(this.inMemoryMaterials),
        orders: dedupeById(this.inMemoryOrders),
        styles: dedupeById(this.inMemoryStyles),
        wallets: Array.from(this.inMemoryWallets.values()),
        walletTransactions: dedupeById(this.inMemoryWalletTransactions),
        files: dedupeById(this.inMemoryFiles),
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
    if (!auth.currentUser) return;
    try {
      this.loadFromLocalStorage();
      const activeUid = auth.currentUser.uid;
      const activeStoreId = this.currentOperator.storeId || DEFAULT_STORE_ID;
      const isAdmin = this.currentOperator.role === 'admin';

      const settingsRef = doc(db, 'settings', 'default');
      const snap = await getDoc(settingsRef);
      if (!snap.exists() && isAdmin) {
        await setDoc(settingsRef, {
          ...this.inMemorySettings,
          storeId: activeStoreId,
          ownerUid: activeUid,
        });
        // Seed initial customers only when an empty database is first initialized by Admin
        for (const c of SEED_CUSTOMERS) {
          await setDoc(doc(db, 'customers', c.id), { ...c, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const m of SEED_MEASUREMENTS) {
          await setDoc(doc(db, 'measurements', m.id), { ...m, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const mat of SEED_MATERIALS) {
          await setDoc(doc(db, 'materials', mat.id), { ...mat, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const s of SEED_STYLES) {
          await setDoc(doc(db, 'styles', s.id), { ...s, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const o of SEED_ORDERS) {
          await setDoc(doc(db, 'orders', o.id), { ...o, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const w of SEED_WALLETS) {
          await setDoc(doc(db, 'wallets', w.id), { ...w, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const wt of SEED_WALLET_TRANSACTIONS) {
          await setDoc(doc(db, 'walletTransactions', wt.id), { ...wt, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const cf of SEED_CUSTOMER_FILES) {
          await setDoc(doc(db, 'customerFiles', cf.id), { ...cf, storeId: activeStoreId, ownerUid: activeUid });
        }
        for (const ci of SEED_CUSTOMER_IMAGES) {
          await setDoc(doc(db, 'customerImages', ci.id), { ...ci, storeId: activeStoreId, ownerUid: activeUid });
        }
      }
      // Ensure default roles exist in Firestore
      if (isAdmin) {
        for (const r of SEED_ROLES) {
          const rSnap = await getDoc(doc(db, 'roles', r.id));
          if (!rSnap.exists()) {
            await setDoc(doc(db, 'roles', r.id), r);
          }
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('Firestore initial sync encountered notice, proceeding with resilient cache:', error);
      this.isInitialized = true;
    }
  }

  /**
   * 迁移前自动备份本地数据，并将任何仅存在于浏览器本地 (localStorage) 的客户、量体、订单、储值及档案合并至云端 Firestore
   */
  public async migrateLocalDataToCloud(forceFullCheck = true): Promise<{
    backedUp: boolean;
    migratedCustomers: number;
    migratedMeasurements: number;
    migratedOrders: number;
    migratedFiles: number;
  }> {
    const summary = {
      backedUp: false,
      migratedCustomers: 0,
      migratedMeasurements: 0,
      migratedOrders: 0,
      migratedFiles: 0,
    };

    try {
      const rawLocal = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}state`);
      if (!rawLocal) return summary;

      // 1. Pre-migration safety backup in localStorage
      const backupKey = `${LOCAL_STORAGE_PREFIX}pre_cloud_backup`;
      if (!localStorage.getItem(backupKey) || forceFullCheck) {
        localStorage.setItem(backupKey, rawLocal);
        summary.backedUp = true;
      }

      const alreadyMigrated = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}cloud_migrated_v2`);
      if (alreadyMigrated && !forceFullCheck) return summary;

      const parsed = JSON.parse(rawLocal);

      // 2. Migrate Customers
      if (Array.isArray(parsed.customers)) {
        for (const c of parsed.customers as Customer[]) {
          if (!c?.id) continue;
          const snap = await getDoc(doc(db, 'customers', c.id));
          if (!snap.exists()) {
            await setDoc(doc(db, 'customers', c.id), c);
            summary.migratedCustomers++;
          }
        }
      }

      // 3. Migrate Measurements
      if (Array.isArray(parsed.measurements)) {
        for (const m of parsed.measurements as Measurement[]) {
          if (!m?.id) continue;
          const snap = await getDoc(doc(db, 'measurements', m.id));
          if (!snap.exists()) {
            await setDoc(doc(db, 'measurements', m.id), { ...m, unit: m.unit || '尺' });
            summary.migratedMeasurements++;
          }
        }
      }

      // 4. Migrate Orders
      if (Array.isArray(parsed.orders)) {
        for (const o of parsed.orders as Order[]) {
          if (!o?.id) continue;
          const snap = await getDoc(doc(db, 'orders', o.id));
          if (!snap.exists()) {
            await setDoc(doc(db, 'orders', o.id), o);
            summary.migratedOrders++;
          }
        }
      }

      // 5. Migrate Wallets & WalletTransactions
      if (Array.isArray(parsed.wallets)) {
        for (const w of parsed.wallets as Wallet[]) {
          if (!w?.id) continue;
          const snap = await getDoc(doc(db, 'wallets', w.id));
          if (!snap.exists()) {
            await setDoc(doc(db, 'wallets', w.id), w);
          }
        }
      }
      if (Array.isArray(parsed.walletTransactions)) {
        for (const wt of parsed.walletTransactions as WalletTransaction[]) {
          if (!wt?.id) continue;
          const snap = await getDoc(doc(db, 'walletTransactions', wt.id));
          if (!snap.exists()) {
            await setDoc(doc(db, 'walletTransactions', wt.id), wt);
          }
        }
      }

      // 6. Migrate CustomerFiles (excluding oversized raw DataURLs > 800KB which would exceed 1MB doc limit)
      if (Array.isArray(parsed.files)) {
        for (const f of parsed.files as CustomerFile[]) {
          if (!f?.id) continue;
          const snap = await getDoc(doc(db, 'customerFiles', f.id));
          if (!snap.exists() && (!f.fileUrl || f.fileUrl.length < 750 * 1024)) {
            await setDoc(doc(db, 'customerFiles', f.id), f);
            summary.migratedFiles++;
          }
        }
      }

      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}cloud_migrated_v2`, new Date().toISOString());
    } catch (e) {
      console.warn('Local data migration notice:', e);
    }

    return summary;
  }

  // --- Audit Log ---
  public async addAuditLog(
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    operatorId?: string,
    result: 'success' | 'failure' = 'success'
  ) {
    const opId = operatorId || auth.currentUser?.uid || this.currentOperator.uid || 'system';
    const opName = this.currentOperator.name || '工坊管理员';
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      logId: `LOG-${Date.now()}`,
      operatorId: opId,
      operatorName: opName,
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      details,
      result,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: opId,
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
    if (!auth.currentUser) return [];
    try {
      const colRef = collection(db, 'customers');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: Customer[] = [];
        snap.forEach(d => {
          const data = d.data() as Customer;
          if (!data.isDeleted && this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        this.inMemoryCustomers = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    return dedupeById(this.inMemoryCustomers.filter(c => !c.isDeleted && this.canAccessRecord(c)));
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    if (!auth.currentUser) return null;
    try {
      const snap = await getDoc(doc(db, 'customers', id));
      if (snap.exists()) {
        const data = snap.data() as Customer;
        if (!data.isDeleted && this.canAccessRecord(data)) return data;
        return null;
      }
    } catch (e) {
      // fallback
    }
    return this.inMemoryCustomers.find(c => c.id === id && !c.isDeleted && this.canAccessRecord(c)) || null;
  }

  public async createCustomer(customerData: Omit<Customer, 'id' | 'customerId' | 'orderCount' | 'totalSpent' | 'walletBalance' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期，严禁创建客户资料');
    const activeUid = auth.currentUser.uid;
    const activeStoreId = this.currentOperator.storeId || DEFAULT_STORE_ID;
    const yearPrefix = `C${new Date().getFullYear()}`;
    const maxSeq = this.inMemoryCustomers.reduce((max, c) => {
      if (c.id && c.id.startsWith(yearPrefix)) {
        const num = parseInt(c.id.slice(yearPrefix.length), 10);
        if (!isNaN(num) && num > max) return num;
      }
      return max;
    }, 1000);
    const nextSeq = maxSeq + 1;
    const cid = `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customerData,
      id: cid,
      customerId: cid,
      orderCount: 0,
      totalSpent: 0,
      walletBalance: 0,
      isDeleted: false,
      storeId: activeStoreId,
      ownerUid: activeUid,
      createdAt: now,
      updatedAt: now,
    };

    // Also initialize wallet with same scope
    const newWallet: Wallet = {
      id: cid,
      customerId: cid,
      balance: 0,
      totalRecharged: 0,
      totalConsumed: 0,
      version: 1,
      storeId: activeStoreId,
      ownerUid: activeUid,
      updatedAt: now,
    };

    this.inMemoryCustomers = dedupeById([newCustomer, ...this.inMemoryCustomers]);
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
    const localTarget = this.inMemoryCustomers[index];

    // Multi-device optimistic concurrency conflict check
    try {
      const cloudSnap = await getDoc(doc(db, 'customers', id));
      if (cloudSnap.exists()) {
        const cloudData = cloudSnap.data() as Customer;
        if (
          cloudData.updatedAt &&
          localTarget.updatedAt &&
          new Date(cloudData.updatedAt).getTime() > new Date(localTarget.updatedAt).getTime() + 1000
        ) {
          const confirmOverwrite = window.confirm(
            `【多设备并发冲突提醒】\n客户“${cloudData.name}”的资料刚刚在其他设备（如手机/iPad/电脑）上已被更新（云端更新时间：${new Date(
              cloudData.updatedAt
            ).toLocaleTimeString()}）。\n\n点击【确定】将用您当前修改的内容覆盖云端；点击【取消】将保留云端最新数据。`
          );
          if (!confirmOverwrite) {
            this.inMemoryCustomers[index] = cloudData;
            return cloudData;
          }
        }
      }
    } catch {
      // proceed if offline
    }

    const now = new Date().toISOString();
    const updated: Customer = {
      ...localTarget,
      ...updates,
      updatedAt: now,
    };
    this.inMemoryCustomers[index] = updated;
    this.saveToLocalStorage();

    try {
      await setDoc(doc(db, 'customers', id), updated, { merge: true });
      await this.addAuditLog('修改客户资料', 'customers', id, `更新了客户信息：${updated.name}`);
    } catch (e) {
      console.warn('Update customer sync warning:', e);
    }
    return updated;
  }

  public async softDeleteCustomer(id: string): Promise<boolean> {
    await this.deleteCustomer(id);
    return true;
  }

  public async deleteCustomer(id: string): Promise<void> {
    const target = this.inMemoryCustomers.find(c => c.id === id);
    this.inMemoryCustomers = this.inMemoryCustomers.filter(c => c.id !== id);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch {
      try {
        await updateDoc(doc(db, 'customers', id), { isDeleted: true, updatedAt: new Date().toISOString() });
      } catch (e) {
        console.warn('Delete customer sync warning:', e);
      }
    }

    await this.addAuditLog(
      '删除客户档案',
      'customers',
      id,
      `删除了客户档案：${target?.name || id} (${target?.phone || ''})`
    );
  }

  // --- Measurements ---
  public async getMeasurementsByCustomerId(customerId: string): Promise<Measurement[]> {
    if (!auth.currentUser) return [];
    try {
      const q = query(
        collection(db, 'measurements'),
        where('customerId', '==', customerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Measurement[] = [];
        snap.forEach(d => {
          const data = d.data() as Measurement;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id, unit: data.unit || '尺' });
          }
        });
        list.sort((a, b) => new Date(b.measureDate).getTime() - new Date(a.measureDate).getTime());
        return dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    return dedupeById(
      this.inMemoryMeasurements
        .filter(m => m.customerId === customerId && this.canAccessRecord(m))
        .sort((a, b) => new Date(b.measureDate).getTime() - new Date(a.measureDate).getTime())
    );
  }

  public async createMeasurement(data: Omit<Measurement, 'id' | 'measurementId' | 'createdAt'>): Promise<Measurement> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期，严禁创建量体记录');
    const id = `M-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const newMeasurement: Measurement = {
      ...data,
      unit: data.unit || '尺',
      id,
      measurementId: id,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser.uid,
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

    this.inMemoryMeasurements = dedupeById([newMeasurement, ...this.inMemoryMeasurements]);
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

  public async deleteMeasurement(measurementId: string): Promise<void> {
    const target = this.inMemoryMeasurements.find(m => m.id === measurementId);
    this.inMemoryMeasurements = this.inMemoryMeasurements.filter(m => m.id !== measurementId);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'measurements', measurementId));
      await this.addAuditLog(
        '删除量体记录',
        'measurements',
        measurementId,
        `删除了客户 ${target?.customerName || target?.customerId || ''} 的量体记录 (${target?.measureDate || measurementId})`
      );
    } catch (e) {
      console.warn('Delete measurement sync warning:', e);
    }
  }

  // --- Materials & Inventory ---
  public async getMaterials(): Promise<Material[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'materials'));
      if (!snap.empty) {
        const list: Material[] = [];
        snap.forEach(d => {
          const mat = d.data() as Material;
          if (!mat.isDeleted && this.canAccessRecord(mat)) {
            list.push({ ...mat, id: mat.id || d.id });
          }
        });
        this.inMemoryMaterials = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    return dedupeById(this.inMemoryMaterials.filter(m => !m.isDeleted && this.canAccessRecord(m)));
  }

  public async getMaterialById(id: string): Promise<Material | null> {
    if (!auth.currentUser) return null;
    return this.inMemoryMaterials.find(m => m.id === id && !m.isDeleted && this.canAccessRecord(m)) || null;
  }

  public async createMaterial(materialData: Omit<Material, 'id' | 'materialId' | 'isDeleted' | 'updatedAt'>): Promise<Material> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期，严禁创建面料档案');
    const id = `MAT-${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const newMaterial: Material = {
      ...materialData,
      id,
      materialId: id,
      isDeleted: false,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser.uid,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryMaterials = dedupeById([newMaterial, ...this.inMemoryMaterials]);

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

  public async deleteMaterial(id: string): Promise<void> {
    const target = this.inMemoryMaterials.find(m => m.id === id);
    this.inMemoryMaterials = this.inMemoryMaterials.filter(m => m.id !== id);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch {
      try {
        await updateDoc(doc(db, 'materials', id), { isDeleted: true, updatedAt: new Date().toISOString() });
      } catch (e) {
        console.warn('Delete material sync warning:', e);
      }
    }

    await this.addAuditLog(
      '删除面料档案',
      'materials',
      id,
      `删除了面料档案：${target?.name || id} (${target?.brand || ''})`
    );
  }

  public async getInventoryTransactions(materialId?: string): Promise<InventoryTransaction[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'inventoryTransactions'));
      if (!snap.empty) {
        const list: InventoryTransaction[] = [];
        snap.forEach(d => {
          const data = d.data() as InventoryTransaction;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        this.inMemoryInventoryTransactions = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    let res = dedupeById(this.inMemoryInventoryTransactions.filter(t => this.canAccessRecord(t)));
    if (materialId) res = res.filter(t => t.materialId === materialId);
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createInventoryTransaction(data: Omit<InventoryTransaction, 'id' | 'transactionId' | 'createdAt'>): Promise<InventoryTransaction> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期');
    const tid = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const newTx: InventoryTransaction = {
      ...data,
      id: tid,
      transactionId: tid,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryInventoryTransactions = dedupeById([newTx, ...this.inMemoryInventoryTransactions]);

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
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'styles'));
      if (!snap.empty) {
        const list: Style[] = [];
        snap.forEach(d => {
          const data = d.data() as Style;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        this.inMemoryStyles = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    return dedupeById(this.inMemoryStyles.filter(s => this.canAccessRecord(s)));
  }

  public async createStyle(styleData: Omit<Style, 'id' | 'styleId' | 'createdAt'>): Promise<Style> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期');
    const id = `STY-${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const newStyle: Style = {
      ...styleData,
      id,
      styleId: id,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryStyles = dedupeById([newStyle, ...this.inMemoryStyles]);
    this.saveToLocalStorage();
    try {
      await setDoc(doc(db, 'styles', id), newStyle);
      await this.addAuditLog('新增服装款式', 'styles', id, `新增款式：${newStyle.name} (${newStyle.category})`);
    } catch (e) {
      // fallback
    }
    return newStyle;
  }

  public async deleteStyle(id: string): Promise<void> {
    const target = this.inMemoryStyles.find(s => s.id === id);
    this.inMemoryStyles = this.inMemoryStyles.filter(s => s.id !== id);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'styles', id));
    } catch (e) {
      console.warn('Delete style sync warning:', e);
    }

    await this.addAuditLog(
      '删除服装款式',
      'styles',
      id,
      `删除了服装款式：${target?.name || id} (${target?.category || ''})`
    );
  }

  // --- Orders ---
  public async getOrders(customerId?: string): Promise<Order[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        const list: Order[] = [];
        snap.forEach(d => {
          const data = d.data() as Order;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        this.inMemoryOrders = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    let res = dedupeById(this.inMemoryOrders.filter(o => this.canAccessRecord(o)));
    if (customerId) res = res.filter(o => o.customerId === customerId);
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    if (!auth.currentUser) return null;
    return this.inMemoryOrders.find(o => (o.id === orderId || o.orderId === orderId) && this.canAccessRecord(o)) || null;
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
          operatorId: orderPayload.operatorId || auth.currentUser?.uid || 'staff-01',
          timestamp: now,
          note: `订单创建并已收取定金/全款 ¥${(paidAmount / 100).toFixed(2)}`,
        },
      ],
      items,
      payments,
      remarks: orderPayload.remarks,
      operatorId: orderPayload.operatorId || auth.currentUser?.uid || 'staff-01',
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser?.uid || this.currentOperator.uid,
      createdAt: now,
      updatedAt: now,
    };

    this.inMemoryOrders = dedupeById([newOrder, ...this.inMemoryOrders]);

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

  public async deleteOrder(orderId: string): Promise<void> {
    const target = this.inMemoryOrders.find(o => o.id === orderId || o.orderId === orderId);
    const actualId = target?.id || orderId;
    this.inMemoryOrders = this.inMemoryOrders.filter(o => o.id !== actualId && o.orderId !== orderId);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'orders', actualId));
    } catch (e) {
      console.warn('Delete order sync warning:', e);
    }

    if (target?.customerId) {
      const cust = await this.getCustomerById(target.customerId);
      if (cust) {
        await this.updateCustomer(target.customerId, {
          orderCount: Math.max(0, (cust.orderCount || 1) - 1),
          totalSpent: Math.max(0, (cust.totalSpent || 0) - (target.payableAmount || 0)),
        });
      }
    }

    await this.addAuditLog(
      '删除定制订单',
      'orders',
      actualId,
      `删除了客户 ${target?.customerName || ''} 的定制订单 (${target?.orderId || actualId})`
    );
  }

  // --- Wallets & Transactions (Atomic Ledger) ---
  public async getWallet(customerId: string): Promise<Wallet> {
    const activeStoreId = this.currentOperator.storeId || DEFAULT_STORE_ID;
    const activeUid = auth.currentUser?.uid || this.currentOperator.uid;
    let wallet = this.inMemoryWallets.get(customerId);
    if (!wallet) {
      wallet = {
        id: customerId,
        customerId,
        balance: 0,
        totalRecharged: 0,
        totalConsumed: 0,
        version: 1,
        storeId: activeStoreId,
        ownerUid: activeUid,
        updatedAt: new Date().toISOString(),
      };
      this.inMemoryWallets.set(customerId, wallet);
      this.saveToLocalStorage();
    }
    try {
      const snap = await getDoc(doc(db, 'wallets', customerId));
      if (snap.exists()) {
        const remote = snap.data() as Wallet;
        if (this.canAccessRecord(remote)) {
          this.inMemoryWallets.set(customerId, remote);
          return remote;
        }
      }
    } catch (e) {
      // fallback
    }
    return wallet;
  }

  public async getWalletTransactions(customerId?: string): Promise<WalletTransaction[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'walletTransactions'));
      if (!snap.empty) {
        const list: WalletTransaction[] = [];
        snap.forEach(d => {
          const data = d.data() as WalletTransaction;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        this.inMemoryWalletTransactions = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    let res = dedupeById(this.inMemoryWalletTransactions.filter(w => this.canAccessRecord(w)));
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
    if (!auth.currentUser) throw new Error('未登录或会话已过期');
    if (amount <= 0) throw new Error('充值金额必须大于零');

    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error('客户不存在或无权访问');

    const activeStoreId = this.currentOperator.storeId || DEFAULT_STORE_ID;
    const activeUid = auth.currentUser.uid;
    const wallet = await this.getWallet(customerId);
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;
    const now = new Date().toISOString();
    const tid = `WT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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
      operatorId: activeUid || operatorId,
      storeId: activeStoreId,
      ownerUid: customer.ownerUid || activeUid,
      createdAt: now,
      remarks,
    };

    // Update in-memory wallet & customer balance
    wallet.balance = balanceAfter;
    wallet.totalRecharged += amount;
    wallet.version += 1;
    wallet.storeId = activeStoreId;
    wallet.ownerUid = customer.ownerUid || activeUid;
    wallet.updatedAt = now;
    customer.walletBalance = balanceAfter;

    this.inMemoryWalletTransactions = dedupeById([newTx, ...this.inMemoryWalletTransactions]);
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
          storeId: activeStoreId,
          ownerUid: customer.ownerUid || activeUid,
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
    if (!auth.currentUser) throw new Error('未登录或会话已过期');
    if (amount <= 0) throw new Error('扣款金额必须大于零');

    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error('客户不存在或无权访问');

    const activeStoreId = this.currentOperator.storeId || DEFAULT_STORE_ID;
    const activeUid = auth.currentUser.uid;
    const wallet = await this.getWallet(customerId);
    if (wallet.balance < amount) {
      throw new Error(`储值余额不足，当前余额 ¥${(wallet.balance / 100).toFixed(2)}，本次需支付 ¥${(amount / 100).toFixed(2)}`);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;
    const now = new Date().toISOString();
    const tid = `WT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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
      operatorId: activeUid || operatorId,
      storeId: activeStoreId,
      ownerUid: customer.ownerUid || activeUid,
      createdAt: now,
      remarks,
    };

    wallet.balance = balanceAfter;
    wallet.totalConsumed += amount;
    wallet.version += 1;
    wallet.updatedAt = now;
    customer.walletBalance = balanceAfter;

    this.inMemoryWalletTransactions = dedupeById([newTx, ...this.inMemoryWalletTransactions]);
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
    const tid = `WT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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
      operatorId: auth.currentUser?.uid || operatorId,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: customer.ownerUid || auth.currentUser?.uid || this.currentOperator.uid,
      createdAt: now,
      remarks,
    };

    wallet.balance = balanceAfter;
    wallet.version += 1;
    wallet.updatedAt = now;
    customer.walletBalance = balanceAfter;

    this.inMemoryWalletTransactions = dedupeById([newTx, ...this.inMemoryWalletTransactions]);
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
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'customerFiles'));
      if (!snap.empty) {
        const list: CustomerFile[] = [];
        snap.forEach(d => {
          const data = d.data() as CustomerFile;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        this.inMemoryFiles = dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    let res = dedupeById(this.inMemoryFiles.filter(f => this.canAccessRecord(f)));
    if (customerId) res = res.filter(f => f.customerId === customerId);
    return res.sort((a, b) => b.year - a.year || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createCustomerFile(fileData: Omit<CustomerFile, 'id' | 'fileId' | 'createdAt'>): Promise<CustomerFile> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期，严禁上传档案');
    const id = `FILE-${fileData.year}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();
    const newFile: CustomerFile = {
      ...fileData,
      id,
      fileId: id,
      operatorId: auth.currentUser.uid || fileData.operatorId || this.currentOperator.uid,
      operatorName: fileData.operatorName || this.currentOperator.name || '工坊管理员',
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser.uid,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'customerFiles', id), newFile);
      this.inMemoryFiles = dedupeById([newFile, ...this.inMemoryFiles]);
      this.saveToLocalStorage();
      await this.addAuditLog(
        '上传纸质档案扫描件',
        'customerFiles',
        id,
        `客户 ${newFile.customerName || newFile.customerId} 归档 ${newFile.year}年档案: ${newFile.fileName}`
      );
      return newFile;
    } catch (e: any) {
      await this.addAuditLog(
        '上传纸质档案扫描件失败',
        'customerFiles',
        id,
        `写入档案记录失败: ${e?.message || '权限或网络异常'}`,
        undefined,
        'failure'
      );
      throw new Error(`写入云端档案记录失败：${e?.message || '请检查登录权限或网络连接'}`);
    }
  }

  public async deleteCustomerFile(fileId: string): Promise<void> {
    const target = this.inMemoryFiles.find(f => f.id === fileId);
    this.inMemoryFiles = this.inMemoryFiles.filter(f => f.id !== fileId);
    this.saveToLocalStorage();

    try {
      await deleteDoc(doc(db, 'customerFiles', fileId));
      if (target) {
        await storageService.deleteFile(target.fileUrl, target.chunkCount);
        await this.addAuditLog('删除历史档案扫描件', 'customerFiles', fileId, `删除了客户 ${target.customerId} 的档案: ${target.fileName}`);
      }
    } catch (e) {
      console.warn('Delete customer file warning:', e);
    }
  }

  // --- Customer Images ---
  public async getCustomerImages(customerId: string): Promise<CustomerImage[]> {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, 'customerImages'), where('customerId', '==', customerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: CustomerImage[] = [];
        snap.forEach(d => {
          const data = d.data() as CustomerImage;
          if (this.canAccessRecord(data)) {
            list.push({ ...data, id: data.id || d.id });
          }
        });
        return dedupeById(list);
      }
    } catch (e) {
      // fallback
    }
    return dedupeById(this.inMemoryImages.filter(i => i.customerId === customerId && this.canAccessRecord(i)));
  }

  public async createCustomerImage(data: Omit<CustomerImage, 'id' | 'imageId' | 'createdAt'>): Promise<CustomerImage> {
    if (!auth.currentUser) throw new Error('未登录或会话已过期');
    const id = `IMG-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const newImg: CustomerImage = {
      ...data,
      id,
      imageId: id,
      storeId: this.currentOperator.storeId || DEFAULT_STORE_ID,
      ownerUid: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryImages = dedupeById([newImg, ...this.inMemoryImages]);
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

  // --- Operators (Staff Users), Authorized Phones & Roles Management ---
  public async getOperators(): Promise<StaffUser[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const list: StaffUser[] = [];
        snap.forEach(d => {
          const op = d.data() as StaffUser;
          list.push({
            ...op,
            uid: op.uid || d.id,
            storeId: op.storeId || DEFAULT_STORE_ID,
            accessScope: op.accessScope || 'store',
          });
        });
        this.inMemoryOperators = dedupeById(list.map(o => ({ ...o, id: o.uid }))).map(({ id, ...rest }) => rest as StaffUser);
      }
    } catch {
      // fallback
    }
    return this.inMemoryOperators;
  }

  public async getAuthorizedPhones(): Promise<AuthorizedPhone[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'authorizedPhones'));
      if (!snap.empty) {
        const list: AuthorizedPhone[] = [];
        snap.forEach(d => {
          const item = d.data() as AuthorizedPhone;
          list.push({
            ...item,
            phone: item.phone || d.id,
            storeId: item.storeId || DEFAULT_STORE_ID,
            accessScope: item.accessScope || 'store',
          });
        });
        this.inMemoryAuthorizedPhones = list;
      } else {
        this.inMemoryAuthorizedPhones = [];
      }
    } catch {
      // fallback
    }
    return this.inMemoryAuthorizedPhones;
  }

  public async saveOperator(
    operator: StaffUser & { countryCode?: string },
    isNew = false
  ): Promise<StaffUser> {
    if (!auth.currentUser || this.currentOperator.role !== 'admin') {
      throw new Error('权限不足：仅激活状态的系统管理员可添加或修改授权账号');
    }

    const rawPhone = (operator.phone || operator.e164Phone || '').trim();
    const cleanEmail = (operator.email || '').trim().toLowerCase();

    if (!rawPhone && !cleanEmail) {
      throw new Error('请填写授权登录手机号码（必填）或授权邮箱');
    }

    let e164Phone = '';
    if (rawPhone) {
      const phoneCheck = validatePhoneNumber(rawPhone, operator.countryCode || '+86');
      if (!phoneCheck.valid) {
        throw new Error(phoneCheck.message || '手机号码格式不正确');
      }
      e164Phone = phoneCheck.e164;
    }

    const existingList = await this.getOperators();
    if (e164Phone) {
      const dupPhone = existingList.find(
        op =>
          normalizePhoneToE164(op.e164Phone || op.phone || '') === e164Phone &&
          op.uid !== operator.uid
      );
      if (dupPhone) {
        throw new Error(`手机号 "${e164Phone}" 已绑定给操作员 "${dupPhone.displayName}"，每个手机号仅能绑定唯一账号`);
      }
    }

    if (cleanEmail) {
      const dupEmail = existingList.find(
        op => op.email && op.email.trim().toLowerCase() === cleanEmail && op.uid !== operator.uid
      );
      if (dupEmail) {
        throw new Error(`邮箱 "${cleanEmail}" 已被操作员 "${dupEmail.displayName}" 使用`);
      }
    }

    const now = new Date().toISOString();
    const targetStoreId = operator.storeId || this.currentOperator.storeId || DEFAULT_STORE_ID;
    const targetScope: DataAccessScope = operator.accessScope || 'store';

    const payload: StaffUser = {
      uid: operator.uid,
      email: cleanEmail,
      displayName: operator.displayName.trim(),
      phone: e164Phone || rawPhone,
      e164Phone: e164Phone || undefined,
      avatarUrl: operator.avatarUrl || '',
      position: operator.position || (operator.role === 'admin' ? '工坊管理员' : '定制工坊操作员'),
      role: operator.role,
      roleId: operator.roleId || (operator.role === 'admin' ? 'role-admin' : 'role-staff'),
      roleName: operator.roleName || (operator.role === 'admin' ? '系统管理员' : '普通操作员'),
      status: operator.status,
      storeId: targetStoreId,
      accessScope: targetScope,
      boundUid: operator.boundUid || (operator.uid.startsWith('staff-') ? undefined : operator.uid),
      createdAt: operator.createdAt || now,
      lastLoginAt: operator.lastLoginAt,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', payload.uid), payload, { merge: true });

    // Write authorizedPhone record for Firebase Phone Auth verification & UID binding
    if (e164Phone) {
      const authPhoneDoc: AuthorizedPhone = {
        phone: e164Phone,
        displayName: payload.displayName,
        position: payload.position,
        email: cleanEmail || undefined,
        role: payload.role,
        roleId: payload.roleId || 'role-staff',
        roleName: payload.roleName || '普通操作员',
        status: payload.status,
        storeId: targetStoreId,
        accessScope: targetScope,
        boundUid: payload.boundUid || null,
        operatorId: payload.uid,
        authorizedByUid: auth.currentUser.uid,
        authorizedByName: this.currentOperator.name,
        createdAt: operator.createdAt || now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'authorizedPhones', e164Phone), authPhoneDoc, { merge: true });
    }

    // Write allowedEmails record if email is provided
    if (cleanEmail) {
      await setDoc(
        doc(db, 'allowedEmails', cleanEmail),
        {
          email: cleanEmail,
          phone: e164Phone || '',
          role: payload.role,
          status: payload.status,
          storeId: targetStoreId,
          accessScope: targetScope,
          operatorId: payload.uid,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    if (payload.role === 'admin' && payload.status === 'active') {
      await setDoc(doc(db, 'admins', payload.uid), payload, { merge: true });
    } else {
      try {
        await deleteDoc(doc(db, 'admins', payload.uid));
      } catch {
        // ignore
      }
    }

    const idx = this.inMemoryOperators.findIndex(o => o.uid === payload.uid);
    if (idx >= 0) {
      this.inMemoryOperators[idx] = payload;
    } else {
      this.inMemoryOperators.push(payload);
    }

    await this.addAuditLog(
      isNew ? '新增授权手机号账号' : '更新授权账号与范围配置',
      'users',
      payload.uid,
      `${isNew ? '授权新账号' : '更新账号'}：${payload.displayName} (手机: ${e164Phone || '未绑'}, 角色: ${
        payload.roleName || payload.role
      }, 范围: ${targetScope === 'personal' ? '个人隔离' : '店铺共享'}, 状态: ${payload.status})`
    );

    return payload;
  }

  public async deleteOperator(uid: string): Promise<void> {
    if (!auth.currentUser || this.currentOperator.role !== 'admin') {
      throw new Error('权限不足：仅系统管理员可撤销账号授权');
    }
    if (uid === auth.currentUser.uid) {
      throw new Error('安全保护：不能删除或撤销您当前正在登录使用的管理员账号');
    }
    const target = this.inMemoryOperators.find(o => o.uid === uid);
    this.inMemoryOperators = this.inMemoryOperators.filter(o => o.uid !== uid);

    await deleteDoc(doc(db, 'users', uid));
    const targetE164 = normalizePhoneToE164(target?.e164Phone || target?.phone || '');
    if (targetE164) {
      try {
        await deleteDoc(doc(db, 'authorizedPhones', targetE164));
      } catch {
        // ignore
      }
    }
    if (target?.email) {
      try {
        await deleteDoc(doc(db, 'allowedEmails', target.email.trim().toLowerCase()));
      } catch {
        // ignore
      }
    }
    try {
      await deleteDoc(doc(db, 'admins', uid));
    } catch {
      // ignore
    }
    await this.addAuditLog(
      '撤销并移除操作者账号',
      'users',
      uid,
      `已撤销账号访问授权：${target?.displayName || uid} (手机: ${targetE164 || '-'}, 邮箱: ${target?.email || '-'})`
    );
  }

  public async setAuthorizedPhoneStatus(
    e164Phone: string,
    status: 'active' | 'inactive' | 'revoked'
  ): Promise<void> {
    if (!auth.currentUser || this.currentOperator.role !== 'admin') {
      throw new Error('权限不足：仅激活状态的系统管理员可修改授权手机号状态');
    }
    const cleanPhone = normalizePhoneToE164(e164Phone);
    if (!cleanPhone) {
      throw new Error('无效的手机号码');
    }
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'authorizedPhones', cleanPhone),
      { status, updatedAt: now },
      { merge: true }
    );
    const matchingOp = this.inMemoryOperators.find(
      op => normalizePhoneToE164(op.e164Phone || op.phone || '') === cleanPhone
    );
    if (matchingOp) {
      matchingOp.status = status;
      matchingOp.updatedAt = now;
      await setDoc(
        doc(db, 'users', matchingOp.uid),
        { status, updatedAt: now },
        { merge: true }
      );
      if (status !== 'active') {
        try {
          await deleteDoc(doc(db, 'admins', matchingOp.uid));
        } catch {
          // ignore
        }
      }
    }
    await this.addAuditLog(
      status === 'active'
        ? '启用授权手机号'
        : status === 'revoked'
        ? '撤销授权手机号'
        : '停用授权手机号',
      'authorizedPhones',
      cleanPhone,
      `管理员将手机号 ${cleanPhone} 授权状态变更为：${status}`
    );
  }

  public async inspectLegacyDataScope(): Promise<LegacyDataInspectionSummary> {
    return this.inspectLegacyData();
  }

  /**
   * 检查现有云端数据库中的业务数据归属状态（客户、订单、量体、面料、款式、储值、历史档案、图片）
   */
  public async inspectLegacyData(): Promise<LegacyDataInspectionSummary> {
    const targetCollections: { name: string; label: string }[] = [
      { name: 'customers', label: '客户资料 (customers)' },
      { name: 'measurements', label: '量体记录 (measurements)' },
      { name: 'orders', label: '定制订单 (orders)' },
      { name: 'materials', label: '面料库存 (materials)' },
      { name: 'styles', label: '服装款式 (styles)' },
      { name: 'wallets', label: '储值账户 (wallets)' },
      { name: 'walletTransactions', label: '储值流水 (walletTransactions)' },
      { name: 'customerFiles', label: '历史档案 (customerFiles)' },
      { name: 'customerImages', label: '客户照片 (customerImages)' },
    ];

    let totalRecords = 0;
    let unmigratedCount = 0;
    let migratedCount = 0;
    const collectionsSummary: LegacyDataInspectionSummary['collections'] = [];

    for (const col of targetCollections) {
      try {
        const snap = await getDocs(collection(db, col.name));
        let colTotal = 0;
        let colUnmigrated = 0;
        let colMigrated = 0;
        snap.forEach(d => {
          const data = d.data() as Record<string, any>;
          if (data.isDeleted) return;
          colTotal++;
          if (data.storeId && data.ownerUid) {
            colMigrated++;
          } else {
            colUnmigrated++;
          }
        });
        totalRecords += colTotal;
        unmigratedCount += colUnmigrated;
        migratedCount += colMigrated;
        collectionsSummary.push({
          collectionName: col.name,
          label: col.label,
          total: colTotal,
          unmigrated: colUnmigrated,
          migrated: colMigrated,
        });
      } catch {
        collectionsSummary.push({
          collectionName: col.name,
          label: col.label,
          total: 0,
          unmigrated: 0,
          migrated: 0,
        });
      }
    }

    return {
      totalRecords,
      unmigratedCount,
      migratedCount,
      collections: collectionsSummary,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * 安全执行现有业务数据归属迁移（不删除、不覆盖已有业务字段，仅在备份后安全补齐 storeId 与 ownerUid）
   */
  public async executeDataScopeMigration(options: {
    mode: DataAccessScope;
    targetStoreId?: string;
  }): Promise<{
    backedUp: boolean;
    migratedTotal: number;
    details: Record<string, number>;
  }> {
    if (!auth.currentUser || this.currentOperator.role !== 'admin') {
      throw new Error('权限不足：仅系统管理员可执行历史数据归属迁移');
    }

    const adminUid = auth.currentUser.uid;
    const storeId = options.targetStoreId || this.currentOperator.storeId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();

    // 1. Pre-migration safety backup
    let backedUp = false;
    try {
      const fullJson = this.exportDataJson();
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}pre_scope_migration_backup`, fullJson);
      backedUp = true;
    } catch {
      // ignore local storage quota
    }

    const targetCollections = [
      'customers',
      'measurements',
      'orders',
      'materials',
      'inventoryTransactions',
      'styles',
      'wallets',
      'walletTransactions',
      'customerFiles',
      'customerImages',
      'fileChunks',
      'settings',
    ];

    const details: Record<string, number> = {};
    let migratedTotal = 0;

    for (const colName of targetCollections) {
      let count = 0;
      try {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          const data = docSnap.data() as Record<string, any>;
          if (!data.storeId || !data.ownerUid) {
            await setDoc(
              doc(db, colName, docSnap.id),
              {
                storeId: data.storeId || storeId,
                ownerUid: data.ownerUid || adminUid,
                scopeMigratedAt: now,
              },
              { merge: true }
            );
            count++;
            migratedTotal++;
          }
        }
      } catch (e) {
        console.warn(`Migration notice on collection ${colName}:`, e);
      }
      details[colName] = count;
    }

    await this.addAuditLog(
      '历史数据归属范围安全迁移',
      'system',
      storeId,
      `管理员完成现有数据归属迁移：模式=${
        options.mode === 'personal' ? '个人数据隔离模式' : '店铺共享模式'
      }，店铺ID=${storeId}，共归属 ${migratedTotal} 条历史记录`
    );

    return {
      backedUp,
      migratedTotal,
      details,
    };
  }

  public async getRoles(): Promise<RoleDefinition[]> {
    try {
      const snap = await getDocs(collection(db, 'roles'));
      if (!snap.empty) {
        const list: RoleDefinition[] = [];
        snap.forEach(d => list.push(d.data() as RoleDefinition));
        this.inMemoryRoles = list;
      }
    } catch {
      // fallback
    }
    return this.inMemoryRoles;
  }

  public async saveRole(role: RoleDefinition): Promise<RoleDefinition> {
    if (!auth.currentUser || this.currentOperator.role !== 'admin') {
      throw new Error('权限不足：仅管理员可修改角色权限配置');
    }
    const updated: RoleDefinition = {
      ...role,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'roles', updated.id), updated, { merge: true });
    const idx = this.inMemoryRoles.findIndex(r => r.id === updated.id);
    if (idx >= 0) {
      this.inMemoryRoles[idx] = updated;
    } else {
      this.inMemoryRoles.push(updated);
    }
    await this.addAuditLog(
      '调整角色与权限配置',
      'roles',
      updated.id,
      `更新角色权限矩阵：${updated.name} (${updated.roleKey})`
    );
    return updated;
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      if (!snap.empty) {
        const list: AuditLog[] = [];
        snap.forEach(d => {
          const log = d.data() as AuditLog;
          if (this.canAccessRecord(log)) {
            list.push(log);
          }
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.inMemoryAuditLogs = list.slice(0, 100);
      }
    } catch {
      // fallback
    }
    return this.inMemoryAuditLogs;
  }

  /**
   * 建立跨电脑、iPad、iPhone 的 Firestore 实时监听通道 (onSnapshot)
   * 严格按当前登录账号的 storeId 与 accessScope 过滤，未授权数据绝不流入页面状态
   */
  public subscribeToRealtimeUpdates(callbacks: {
    onCustomers?: (list: Customer[]) => void;
    onMeasurements?: (list: Measurement[]) => void;
    onMaterials?: (list: Material[]) => void;
    onInventoryTransactions?: (list: InventoryTransaction[]) => void;
    onStyles?: (list: Style[]) => void;
    onOrders?: (list: Order[]) => void;
    onWalletTransactions?: (list: WalletTransaction[]) => void;
    onCustomerFiles?: (list: CustomerFile[]) => void;
    onCustomerImages?: (list: CustomerImage[]) => void;
    onSettings?: (settings: StoreSetting) => void;
    onOperators?: (list: StaffUser[]) => void;
    onRoles?: (list: RoleDefinition[]) => void;
    onAuditLogs?: (list: AuditLog[]) => void;
  }): Unsubscribe {
    if (!auth.currentUser) return () => {};
    const unsubs: Unsubscribe[] = [];

    if (callbacks.onCustomers) {
      unsubs.push(
        onSnapshot(
          collection(db, 'customers'),
          snap => {
            const list: Customer[] = [];
            snap.forEach(d => {
              const c = d.data() as Customer;
              if (!c.isDeleted && this.canAccessRecord(c)) {
                list.push({ ...c, id: c.id || d.id });
              }
            });
            list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
            const unique = dedupeById(list);
            this.inMemoryCustomers = unique;
            this.saveToLocalStorage();
            callbacks.onCustomers?.(unique);
          },
          err => console.warn('Customers realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onMeasurements) {
      unsubs.push(
        onSnapshot(
          collection(db, 'measurements'),
          snap => {
            const list: Measurement[] = [];
            snap.forEach(d => {
              const m = d.data() as Measurement;
              if (this.canAccessRecord(m)) {
                list.push({ ...m, id: m.id || d.id, unit: m.unit || '尺' });
              }
            });
            list.sort((a, b) => new Date(b.measureDate).getTime() - new Date(a.measureDate).getTime());
            const unique = dedupeById(list);
            this.inMemoryMeasurements = unique;
            this.saveToLocalStorage();
            callbacks.onMeasurements?.(unique);
          },
          err => console.warn('Measurements realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onOrders) {
      unsubs.push(
        onSnapshot(
          collection(db, 'orders'),
          snap => {
            const list: Order[] = [];
            snap.forEach(d => {
              const o = d.data() as Order;
              if (this.canAccessRecord(o)) {
                list.push({ ...o, id: o.id || d.id });
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unique = dedupeById(list);
            this.inMemoryOrders = unique;
            this.saveToLocalStorage();
            callbacks.onOrders?.(unique);
          },
          err => console.warn('Orders realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onMaterials) {
      unsubs.push(
        onSnapshot(
          collection(db, 'materials'),
          snap => {
            const list: Material[] = [];
            snap.forEach(d => {
              const m = d.data() as Material;
              if (!m.isDeleted && this.canAccessRecord(m)) {
                list.push({ ...m, id: m.id || d.id });
              }
            });
            const unique = dedupeById(list);
            this.inMemoryMaterials = unique;
            this.saveToLocalStorage();
            callbacks.onMaterials?.(unique);
          },
          err => console.warn('Materials realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onInventoryTransactions) {
      unsubs.push(
        onSnapshot(
          collection(db, 'inventoryTransactions'),
          snap => {
            const list: InventoryTransaction[] = [];
            snap.forEach(d => {
              const tx = d.data() as InventoryTransaction;
              if (this.canAccessRecord(tx)) {
                list.push({ ...tx, id: tx.id || d.id });
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unique = dedupeById(list);
            this.inMemoryInventoryTransactions = unique;
            callbacks.onInventoryTransactions?.(unique);
          },
          err => console.warn('InventoryTransactions realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onStyles) {
      unsubs.push(
        onSnapshot(
          collection(db, 'styles'),
          snap => {
            const list: Style[] = [];
            snap.forEach(d => {
              const s = d.data() as Style;
              if (this.canAccessRecord(s)) {
                list.push({ ...s, id: s.id || d.id });
              }
            });
            const unique = dedupeById(list);
            this.inMemoryStyles = unique;
            this.saveToLocalStorage();
            callbacks.onStyles?.(unique);
          },
          err => console.warn('Styles realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onWalletTransactions) {
      unsubs.push(
        onSnapshot(
          collection(db, 'walletTransactions'),
          snap => {
            const list: WalletTransaction[] = [];
            snap.forEach(d => {
              const wt = d.data() as WalletTransaction;
              if (this.canAccessRecord(wt)) {
                list.push({ ...wt, id: wt.id || d.id });
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unique = dedupeById(list);
            this.inMemoryWalletTransactions = unique;
            this.saveToLocalStorage();
            callbacks.onWalletTransactions?.(unique);
          },
          err => console.warn('WalletTransactions realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onCustomerFiles) {
      unsubs.push(
        onSnapshot(
          collection(db, 'customerFiles'),
          snap => {
            const list: CustomerFile[] = [];
            snap.forEach(d => {
              const cf = d.data() as CustomerFile;
              if (this.canAccessRecord(cf)) {
                list.push({ ...cf, id: cf.id || d.id });
              }
            });
            list.sort((a, b) => b.year - a.year || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unique = dedupeById(list);
            this.inMemoryFiles = unique;
            this.saveToLocalStorage();
            callbacks.onCustomerFiles?.(unique);
          },
          err => console.warn('CustomerFiles realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onCustomerImages) {
      unsubs.push(
        onSnapshot(
          collection(db, 'customerImages'),
          snap => {
            const list: CustomerImage[] = [];
            snap.forEach(d => {
              const ci = d.data() as CustomerImage;
              if (this.canAccessRecord(ci)) {
                list.push({ ...ci, id: ci.id || d.id });
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unique = dedupeById(list);
            this.inMemoryImages = unique;
            callbacks.onCustomerImages?.(unique);
          },
          err => console.warn('CustomerImages realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onSettings) {
      unsubs.push(
        onSnapshot(
          doc(db, 'settings', 'default'),
          snap => {
            if (snap.exists()) {
              const stg = snap.data() as StoreSetting;
              this.inMemorySettings = stg;
              this.saveToLocalStorage();
              callbacks.onSettings?.(stg);
            }
          },
          err => console.warn('Settings realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onOperators) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          snap => {
            if (!snap.empty) {
              const list: StaffUser[] = [];
              snap.forEach(d => list.push(d.data() as StaffUser));
              this.inMemoryOperators = list;
              callbacks.onOperators?.(list);
            }
          },
          err => console.warn('Operators realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onRoles) {
      unsubs.push(
        onSnapshot(
          collection(db, 'roles'),
          snap => {
            if (!snap.empty) {
              const list: RoleDefinition[] = [];
              snap.forEach(d => list.push(d.data() as RoleDefinition));
              this.inMemoryRoles = list;
              callbacks.onRoles?.(list);
            }
          },
          err => console.warn('Roles realtime listener notice:', err.message)
        )
      );
    }

    if (callbacks.onAuditLogs) {
      unsubs.push(
        onSnapshot(
          collection(db, 'auditLogs'),
          snap => {
            if (!snap.empty) {
              const list: AuditLog[] = [];
              snap.forEach(d => {
                const log = d.data() as AuditLog;
                if (this.canAccessRecord(log)) {
                  list.push(log);
                }
              });
              list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              this.inMemoryAuditLogs = list.slice(0, 100);
              callbacks.onAuditLogs?.(this.inMemoryAuditLogs);
            }
          },
          err => console.warn('AuditLogs realtime listener notice:', err.message)
        )
      );
    }

    return () => {
      unsubs.forEach(u => u());
    };
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
