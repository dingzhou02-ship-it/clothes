import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShoppingBag, Layers, Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './components/views/LoginView';
import { WorkbenchView } from './components/views/WorkbenchView';
import { CustomersView } from './components/views/CustomersView';
import { CustomerDetailView } from './components/views/CustomerDetailView';
import { MeasurementsView } from './components/views/MeasurementsView';
import { OrdersView } from './components/views/OrdersView';
import { MaterialsView } from './components/views/MaterialsView';
import { StylesView } from './components/views/StylesView';
import { WalletsView } from './components/views/WalletsView';
import { ArchivesView } from './components/views/ArchivesView';
import { StatisticsView } from './components/views/StatisticsView';
import { SettingsView } from './components/views/SettingsView';

// Modals
import { CustomerModal } from './components/modals/CustomerModal';
import { MeasurementModal } from './components/modals/MeasurementModal';
import { MeasurementPrintModal } from './components/modals/MeasurementPrintModal';
import { CreateOrderModal } from './components/modals/CreateOrderModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { OrderPrintModal } from './components/modals/OrderPrintModal';
import { RechargeModal } from './components/modals/RechargeModal';
import { InventoryModal } from './components/modals/InventoryModal';
import { ArchiveUploadModal } from './components/modals/ArchiveUploadModal';
import { PdfPreviewModal } from './components/modals/PdfPreviewModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { CreateMaterialModal } from './components/modals/CreateMaterialModal';
import { CreateStyleModal } from './components/modals/CreateStyleModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';

// Services & types
import { storeService } from './services/storeService';
import {
  Customer,
  Measurement,
  Material,
  InventoryTransaction,
  Style,
  Order,
  OrderStatus,
  WalletTransaction,
  CustomerFile,
  CustomerImage,
  StoreSetting,
  PaymentMethod,
  PaymentStage,
} from './types';
import { INITIAL_SETTINGS } from './services/seedData';

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

function MainApp() {
  const { isAuthenticated, loading: authLoading, currentUser, hasPermission } = useAuth();

  // Navigation & Selected Views
  const [currentNav, setCurrentNav] = useState<NavItemKey>('workbench');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [customerFiles, setCustomerFiles] = useState<CustomerFile[]>([]);
  const [customerImages, setCustomerImages] = useState<CustomerImage[]>([]);
  const [settings, setSettings] = useState<StoreSetting>(INITIAL_SETTINGS);

  // Modals Visibility
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
  const [measurementTargetCustomer, setMeasurementTargetCustomer] = useState<Customer | null>(null);

  const [isMeasurementPrintOpen, setIsMeasurementPrintOpen] = useState(false);
  const [printingMeasurement, setPrintingMeasurement] = useState<Measurement | null>(null);
  const [printingCustomer, setPrintingCustomer] = useState<Customer | null>(null);

  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [orderTargetCustomer, setOrderTargetCustomer] = useState<Customer | null>(null);

  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [isOrderPrintOpen, setIsOrderPrintOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeTargetCustomer, setRechargeTargetCustomer] = useState<Customer | null>(null);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryTargetMaterial, setInventoryTargetMaterial] = useState<Material | null>(null);

  const [isArchiveUploadOpen, setIsArchiveUploadOpen] = useState(false);
  const [archiveTargetCustomer, setArchiveTargetCustomer] = useState<Customer | null>(null);

  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CustomerFile | null>(null);

  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [isCreateStyleOpen, setIsCreateStyleOpen] = useState(false);

  // Confirm Delete Modal State
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Mobile sidebar
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load all initial data from storeService
  const loadAllData = async () => {
    try {
      await storeService.initializeDatabase();
      const [
        custList,
        matList,
        invTxList,
        styList,
        ordList,
        walTxList,
        fileList,
        stg,
      ] = await Promise.all([
        storeService.getCustomers(),
        storeService.getMaterials(),
        storeService.getInventoryTransactions(),
        storeService.getStyles(),
        storeService.getOrders(),
        storeService.getWalletTransactions(),
        storeService.getCustomerFiles(),
        storeService.getSettings(),
      ]);

      setCustomers(dedupeById(custList));
      setMaterials(dedupeById(matList));
      setInventoryTransactions(dedupeById(invTxList));
      setStyles(dedupeById(styList));
      setOrders(dedupeById(ordList));
      setWalletTransactions(dedupeById(walTxList));
      setCustomerFiles(dedupeById(fileList));
      setSettings(stg);
    } catch (e) {
      console.error('Error loading store data:', e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear all sensitive business states from React memory upon logout or unauthenticated state
      setCustomers([]);
      setMeasurements([]);
      setMaterials([]);
      setInventoryTransactions([]);
      setStyles([]);
      setOrders([]);
      setWalletTransactions([]);
      setCustomerFiles([]);
      setCustomerImages([]);
      setSelectedCustomer(null);
      setSelectedOrder(null);
      return;
    }

    loadAllData();

    // Establish real-time multi-device sync across PC, iPad, and iPhone
    const unsubscribeRealtime = storeService.subscribeToRealtimeUpdates({
      onCustomers: list => {
        const unique = dedupeById(list);
        setCustomers(unique);
        setSelectedCustomer(prev => (prev ? unique.find(c => c.id === prev.id) || prev : null));
      },
      onMeasurements: list => {
        const unique = dedupeById(list);
        setSelectedCustomer(currentSelected => {
          if (currentSelected) {
            setMeasurements(unique.filter(m => m.customerId === currentSelected.id));
          } else {
            setMeasurements(unique);
          }
          return currentSelected;
        });
      },
      onMaterials: list => setMaterials(dedupeById(list)),
      onInventoryTransactions: list => setInventoryTransactions(dedupeById(list)),
      onStyles: list => setStyles(dedupeById(list)),
      onOrders: list => {
        const unique = dedupeById(list);
        setOrders(unique);
        setSelectedOrder(prev => (prev ? unique.find(o => o.id === prev.id) || prev : null));
      },
      onWalletTransactions: list => setWalletTransactions(dedupeById(list)),
      onCustomerFiles: list => setCustomerFiles(dedupeById(list)),
      onCustomerImages: list => {
        const unique = dedupeById(list);
        setSelectedCustomer(currentSelected => {
          if (currentSelected) {
            setCustomerImages(unique.filter(img => img.customerId === currentSelected.id));
          }
          return currentSelected;
        });
      },
      onSettings: stg => setSettings(stg),
    });

    return () => {
      unsubscribeRealtime();
    };
  }, [isAuthenticated]);

  // Keyboard shortcut: Cmd+K / Ctrl+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync selectedCustomer measurements and images
  useEffect(() => {
    if (!isAuthenticated) return;
    if (selectedCustomer) {
      storeService.getMeasurementsByCustomerId(selectedCustomer.id).then(list => setMeasurements(dedupeById(list)));
      storeService.getCustomerImages(selectedCustomer.id).then(list => setCustomerImages(dedupeById(list)));
    } else {
      // Load all measurements across boutique
      Promise.all(
        customers.map(c => storeService.getMeasurementsByCustomerId(c.id))
      ).then(results => {
        setMeasurements(dedupeById(results.flat()));
      });
    }
  }, [selectedCustomer, customers, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white text-xs font-mono">
        正在连接七彩布衣工坊安全云端系统...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Action Handlers with Role Permission Checks
  const handleSaveCustomer = async (data: any) => {
    if (editingCustomer) {
      if (!hasPermission('customerEdit')) {
        throw new Error('权限不足：当前角色无权修改客户资料');
      }
      const updated = await storeService.updateCustomer(editingCustomer.id, data);
      setCustomers(prev => dedupeById(prev.map(c => (c.id === updated.id ? updated : c))));
      if (selectedCustomer?.id === updated.id) setSelectedCustomer(updated);
    } else {
      if (!hasPermission('customerCreate')) {
        throw new Error('权限不足：当前角色无权新增客户档案');
      }
      const created = await storeService.createCustomer(data);
      setCustomers(prev => dedupeById([created, ...prev]));
      setSelectedCustomer(created);
    }
  };

  const handleSaveMeasurement = async (data: any) => {
    if (!hasPermission('measurementCreate')) {
      throw new Error('权限不足：当前角色无权新增量体记录');
    }
    const created = await storeService.createMeasurement(data);
    setMeasurements(prev => dedupeById([created, ...prev]));
    // Refresh customers list because lastMeasurementDate updated
    const refreshed = await storeService.getCustomers();
    setCustomers(dedupeById(refreshed));
    if (selectedCustomer?.id === data.customerId) {
      const updatedCust = refreshed.find(c => c.id === data.customerId);
      if (updatedCust) setSelectedCustomer(updatedCust);
    }
  };

  const handleSetCurrentMeasurement = async (measurementId: string) => {
    if (!selectedCustomer) return;
    if (!hasPermission('measurementEdit')) return;
    await storeService.setCurrentMeasurement(measurementId, selectedCustomer.id);
    const updated = await storeService.getMeasurementsByCustomerId(selectedCustomer.id);
    setMeasurements(dedupeById(updated));
  };

  const handleCreateOrder = async (orderPayload: any) => {
    if (!hasPermission('orderCreate')) {
      throw new Error('权限不足：当前角色无权创建定制订单');
    }
    const created = await storeService.createOrder(orderPayload);
    setOrders(prev => dedupeById([created, ...prev]));
    // Refresh customers and wallet transactions
    const [refreshedCust, refreshedTxs] = await Promise.all([
      storeService.getCustomers(),
      storeService.getWalletTransactions(),
    ]);
    setCustomers(dedupeById(refreshedCust));
    setWalletTransactions(dedupeById(refreshedTxs));
    if (selectedCustomer?.id === orderPayload.customerId) {
      const currentCust = refreshedCust.find(c => c.id === orderPayload.customerId);
      if (currentCust) setSelectedCustomer(currentCust);
    }
    // Also deduct fabric inventory if linked
    for (const item of created.items) {
      if (item.materialId) {
        const mat = materials.find(m => m.id === item.materialId);
        if (mat) {
          const usedMeters = item.category === '西服' ? 3.2 : item.category === '大衣' ? 2.8 : 1.5;
          await storeService.createInventoryTransaction({
            materialId: mat.id,
            materialName: mat.name,
            type: 'order_consume',
            quantity: -usedMeters,
            beforeQuantity: mat.stockQuantity,
            afterQuantity: Math.max(0, mat.stockQuantity - usedMeters),
            relatedOrderId: created.orderId,
            operatorId: currentUser?.uid || 'staff-01',
            operatorName: currentUser?.displayName || '裁缝师',
            remarks: `定制订单 ${created.orderId} 裁剪消耗`,
          });
        }
      }
    }
    const refreshedMats = await storeService.getMaterials();
    const refreshedInvTxs = await storeService.getInventoryTransactions();
    setMaterials(dedupeById(refreshedMats));
    setInventoryTransactions(dedupeById(refreshedInvTxs));
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, note: string) => {
    if (!hasPermission('orderEdit')) return;
    const updated = await storeService.updateOrderStatus(orderId, status, note);
    setOrders(prev => dedupeById(prev.map(o => (o.id === updated.id ? updated : o))));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
  };

  const handleAddOrderPayment = async (
    orderId: string,
    amountCents: number,
    method: PaymentMethod,
    stage: PaymentStage,
    remarks?: string
  ) => {
    if (!hasPermission('orderEdit')) return;
    const updated = await storeService.addOrderPayment(orderId, amountCents, method, stage, remarks);
    setOrders(prev => dedupeById(prev.map(o => (o.id === updated.id ? updated : o))));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);

    // Refresh customers and transactions
    const [refreshedCust, refreshedTxs] = await Promise.all([
      storeService.getCustomers(),
      storeService.getWalletTransactions(),
    ]);
    setCustomers(dedupeById(refreshedCust));
    setWalletTransactions(dedupeById(refreshedTxs));
  };

  const handleRecharge = async (
    customerId: string,
    amountCents: number,
    method: PaymentMethod,
    remarks: string
  ) => {
    if (!hasPermission('walletRecharge')) {
      throw new Error('权限不足：当前角色无权办理储值充值');
    }
    const tx = await storeService.rechargeWallet(customerId, amountCents, method, remarks);
    setWalletTransactions(prev => dedupeById([tx, ...prev]));
    const refreshed = await storeService.getCustomers();
    setCustomers(dedupeById(refreshed));
    if (selectedCustomer?.id === customerId) {
      const currentCust = refreshed.find(c => c.id === customerId);
      if (currentCust) setSelectedCustomer(currentCust);
    }
  };

  const handleRefund = async (
    customerId: string,
    amountCents: number,
    relatedOrderId: string,
    remarks: string
  ) => {
    if (!hasPermission('walletRefund')) {
      throw new Error('权限不足：仅授权角色可执行储值退款冲正操作');
    }
    const tx = await storeService.refundWallet(customerId, amountCents, relatedOrderId, remarks);
    setWalletTransactions(prev => dedupeById([tx, ...prev]));
    const refreshed = await storeService.getCustomers();
    setCustomers(dedupeById(refreshed));
    if (selectedCustomer?.id === customerId) {
      const currentCust = refreshed.find(c => c.id === customerId);
      if (currentCust) setSelectedCustomer(currentCust);
    }
  };

  const handleInventoryTransaction = async (data: any) => {
    if (!hasPermission('materialEdit')) {
      throw new Error('权限不足：当前角色无权执行面料出入库操作');
    }
    const tx = await storeService.createInventoryTransaction(data);
    setInventoryTransactions(prev => dedupeById([tx, ...prev]));
    const refreshedMats = await storeService.getMaterials();
    setMaterials(dedupeById(refreshedMats));
  };

  const handleUploadArchive = async (data: any) => {
    if (!hasPermission('archiveUpload')) {
      throw new Error('权限不足：当前角色无权上传客户历史档案');
    }
    const created = await storeService.createCustomerFile(data);
    setCustomerFiles(prev => dedupeById([created, ...prev]));
  };

  const handleAddImage = async (
    customerId: string,
    imageType: any,
    imageUrl: string,
    title: string,
    remarks: string
  ) => {
    if (!hasPermission('archiveUpload')) return;
    const created = await storeService.createCustomerImage({
      customerId,
      imageType,
      imageUrl,
      title,
      remarks,
      operatorId: currentUser?.uid || 'staff-01',
    });
    setCustomerImages(prev => dedupeById([created, ...prev]));
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除客户「${customer.name}」`,
      description: `删除客户（编号：${customer.customerId}，手机：${customer.phone}）将同时清理其关联的量体记录、历史订单及档案附件，且不可恢复。确定要删除吗？`,
      confirmLabel: '确认删除客户',
      onConfirm: async () => {
        await storeService.deleteCustomer(customer.id);
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        setOrders(prev => prev.filter(o => o.customerId !== customer.id));
        setMeasurements(prev => prev.filter(m => m.customerId !== customer.id));
        setCustomerFiles(prev => prev.filter(f => f.customerId !== customer.id));
        setCustomerImages(prev => prev.filter(img => img.customerId !== customer.id));
        if (selectedCustomer?.id === customer.id) {
          setSelectedCustomer(null);
        }
      },
    });
  };

  const handleDeleteOrder = (order: Order) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除订单 #${order.orderId}`,
      description: `即将删除客户「${order.customerName}」的定制订单（金额：¥${(order.finalAmount / 100).toFixed(2)}）。删除后会自动重算该客户的订单统计数据。确定要删除此订单吗？`,
      confirmLabel: '确认删除订单',
      onConfirm: async () => {
        await storeService.deleteOrder(order.id);
        setOrders(prev => prev.filter(o => o.id !== order.id));
        if (selectedOrder?.id === order.id) {
          setIsOrderDetailOpen(false);
          setSelectedOrder(null);
        }
        const refreshedCust = await storeService.getCustomers();
        setCustomers(dedupeById(refreshedCust));
        if (selectedCustomer?.id === order.customerId) {
          const updatedCust = refreshedCust.find(c => c.id === order.customerId);
          if (updatedCust) setSelectedCustomer(updatedCust);
        }
      },
    });
  };

  const handleDeleteMaterial = (material: Material) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除面料「${material.name}」`,
      description: `即将从面料台账中删除面料（编号：${material.materialCode}，品牌：${material.brand || '工坊甄选'}）。此操作不可恢复，确定要删除吗？`,
      confirmLabel: '确认删除面料',
      onConfirm: async () => {
        await storeService.deleteMaterial(material.id);
        setMaterials(prev => prev.filter(m => m.id !== material.id));
      },
    });
  };

  const handleDeleteStyle = (style: Style) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除款式「${style.name}」`,
      description: `即将从定制款式库中删除「${style.name}」（品类：${style.category}）。此操作不可恢复，确定要删除吗？`,
      confirmLabel: '确认删除款式',
      onConfirm: async () => {
        await storeService.deleteStyle(style.id);
        setStyles(prev => prev.filter(s => s.id !== style.id));
      },
    });
  };

  const handleDeleteMeasurement = (measurement: Measurement) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除量体记录 #${measurement.measurementId}`,
      description: `即将删除客户「${measurement.customerName || ''}」于 ${measurement.measureDate} 的量体记录。若该记录为当前生效数据，系统将自动顺延最新一份量体记录为当前生效。`,
      confirmLabel: '确认删除量体单',
      onConfirm: async () => {
        await storeService.deleteMeasurement(measurement.id);
        setMeasurements(prev => prev.filter(m => m.id !== measurement.id));
        if (selectedCustomer) {
          const updatedList = await storeService.getMeasurementsByCustomerId(selectedCustomer.id);
          setMeasurements(dedupeById(updatedList));
        }
      },
    });
  };

  const handleDeleteCustomerFile = (file: CustomerFile) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除历史档案「${file.fileName}」`,
      description: `即将删除客户「${file.customerName || ''}」的 ${file.year} 年历史档案文件及其云端存储数据。此操作不可恢复，确定要删除吗？`,
      confirmLabel: '确认删除档案',
      onConfirm: async () => {
        await storeService.deleteCustomerFile(file.id);
        setCustomerFiles(prev => prev.filter(f => f.id !== file.id));
      },
    });
  };

  const handleDeleteCustomerImage = (image: CustomerImage) => {
    setDeleteDialog({
      isOpen: true,
      title: `确认删除照片「${image.title}」`,
      description: `即将从客户影像记录中删除此张照片。此操作不可恢复，确定要删除吗？`,
      confirmLabel: '确认删除照片',
      onConfirm: async () => {
        await storeService.deleteCustomerImage(image.id);
        setCustomerImages(prev => prev.filter(i => i.id !== image.id));
      },
    });
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<Material>) => {
    if (!hasPermission('materialEdit')) return;
    const updated = await storeService.updateMaterial(id, updates);
    setMaterials(prev => prev.map(m => (m.id === updated.id ? updated : m)));
  };

  const handleUpdateSettings = async (newSettings: Partial<StoreSetting>) => {
    if (!hasPermission('settingsManage')) {
      throw new Error('权限不足：当前角色无权修改系统设置');
    }
    const updated = await storeService.updateSettings(newSettings);
    setSettings(updated);
  };

  const handleResetSeedData = () => {
    storeService.resetToSeedData();
    loadAllData();
    setSelectedCustomer(null);
  };

  const handleExportBackup = () => {
    const jsonStr = storeService.exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qicai_tailoring_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lowStockCount = materials.filter(m => m.stockQuantity <= m.safetyStock).length;

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden relative">
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity cursor-pointer"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Responsive drawer on mobile, static on desktop) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar
          currentNav={currentNav}
          onSelectNav={key => {
            setCurrentNav(key);
            setSelectedCustomer(null);
            setIsMobileSidebarOpen(false);
          }}
          customerCount={customers.length}
          orderCount={orders.length}
          lowStockCount={lowStockCount}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Section 4) */}
        <Header
          currentNav={currentNav}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onOpenCreateCustomer={() => {
            setEditingCustomer(null);
            setIsCustomerModalOpen(true);
          }}
          onOpenCreateOrder={() => {
            setOrderTargetCustomer(selectedCustomer || customers[0] || null);
            setIsCreateOrderOpen(true);
          }}
          onOpenRecharge={() => {
            setRechargeTargetCustomer(selectedCustomer || null);
            setIsRechargeModalOpen(true);
          }}
          onOpenAddMeasurement={() => {
            const cust = selectedCustomer || customers[0];
            if (cust) {
              setMeasurementTargetCustomer(cust);
              setIsMeasurementModalOpen(true);
            }
          }}
          onOpenUploadArchive={() => {
            setArchiveTargetCustomer(selectedCustomer || null);
            setIsArchiveUploadOpen(true);
          }}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Viewport View Switcher */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-stone-100/90 pb-24 lg:pb-8">
          {/* Customer Detail View has top priority if a customer is selected */}
          {selectedCustomer ? (
            <CustomerDetailView
              customer={selectedCustomer}
              measurements={measurements.filter(m => m.customerId === selectedCustomer.id)}
              orders={orders.filter(o => o.customerId === selectedCustomer.id)}
              walletTransactions={walletTransactions.filter(w => w.customerId === selectedCustomer.id)}
              files={customerFiles.filter(f => f.customerId === selectedCustomer.id)}
              images={customerImages}
              onBack={() => setSelectedCustomer(null)}
              onEditCustomer={c => {
                setEditingCustomer(c);
                setIsCustomerModalOpen(true);
              }}
              onOpenCreateOrder={c => {
                setOrderTargetCustomer(c);
                setIsCreateOrderOpen(true);
              }}
              onOpenAddMeasurement={c => {
                setMeasurementTargetCustomer(c);
                setIsMeasurementModalOpen(true);
              }}
              onOpenRecharge={c => {
                setRechargeTargetCustomer(c);
                setIsRechargeModalOpen(true);
              }}
              onOpenUploadArchive={c => {
                setArchiveTargetCustomer(c);
                setIsArchiveUploadOpen(true);
              }}
              onOpenPrintMeasurement={m => {
                setPrintingMeasurement(m);
                setPrintingCustomer(selectedCustomer);
                setIsMeasurementPrintOpen(true);
              }}
              onOpenPrintOrder={o => {
                setPrintingOrder(o);
                setIsOrderPrintOpen(true);
              }}
              onSelectOrder={o => {
                setSelectedOrder(o);
                setIsOrderDetailOpen(true);
              }}
              onOpenPdfPreview={f => {
                setPreviewFile(f);
                setIsPdfPreviewOpen(true);
              }}
              onSetCurrentMeasurement={handleSetCurrentMeasurement}
              onAddImage={handleAddImage}
              onDeleteCustomer={handleDeleteCustomer}
              onDeleteOrder={handleDeleteOrder}
              onDeleteMeasurement={handleDeleteMeasurement}
              onDeleteFile={handleDeleteCustomerFile}
              onDeleteImage={handleDeleteCustomerImage}
            />
          ) : (
            <>
              {currentNav === 'workbench' && (
                <WorkbenchView
                  customers={customers}
                  orders={orders}
                  materials={materials}
                  onOpenCreateCustomer={() => {
                    setEditingCustomer(null);
                    setIsCustomerModalOpen(true);
                  }}
                  onOpenCreateOrder={() => {
                    setOrderTargetCustomer(customers[0] || null);
                    setIsCreateOrderOpen(true);
                  }}
                  onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
                  onOpenRecharge={() => {
                    setRechargeTargetCustomer(null);
                    setIsRechargeModalOpen(true);
                  }}
                  onOpenUploadArchive={() => {
                    setArchiveTargetCustomer(null);
                    setIsArchiveUploadOpen(true);
                  }}
                  onSelectCustomer={c => setSelectedCustomer(c)}
                  onSelectOrder={o => {
                    setSelectedOrder(o);
                    setIsOrderDetailOpen(true);
                  }}
                  onSelectMaterial={m => {
                    setCurrentNav('materials');
                  }}
                  onNavigate={key => setCurrentNav(key as NavItemKey)}
                />
              )}

              {currentNav === 'customers' && (
                <CustomersView
                  customers={customers}
                  onSelectCustomer={c => setSelectedCustomer(c)}
                  onOpenCreateCustomer={() => {
                    setEditingCustomer(null);
                    setIsCustomerModalOpen(true);
                  }}
                  onDeleteCustomer={handleDeleteCustomer}
                />
              )}

              {currentNav === 'measurements' && (
                <MeasurementsView
                  measurements={measurements}
                  customers={customers}
                  onSelectCustomer={c => setSelectedCustomer(c)}
                  onOpenAddMeasurement={c => {
                    setMeasurementTargetCustomer(c);
                    setIsMeasurementModalOpen(true);
                  }}
                  onOpenPrintMeasurement={(m, c) => {
                    setPrintingMeasurement(m);
                    setPrintingCustomer(c);
                    setIsMeasurementPrintOpen(true);
                  }}
                  onDeleteMeasurement={handleDeleteMeasurement}
                />
              )}

              {currentNav === 'orders' && (
                <OrdersView
                  orders={orders}
                  onSelectOrder={o => {
                    setSelectedOrder(o);
                    setIsOrderDetailOpen(true);
                  }}
                  onOpenCreateOrder={() => {
                    setOrderTargetCustomer(customers[0] || null);
                    setIsCreateOrderOpen(true);
                  }}
                  onOpenPrintOrder={o => {
                    setPrintingOrder(o);
                    setIsOrderPrintOpen(true);
                  }}
                  onDeleteOrder={handleDeleteOrder}
                />
              )}

              {currentNav === 'materials' && (
                <MaterialsView
                  materials={materials}
                  transactions={inventoryTransactions}
                  onOpenCreateMaterial={() => setIsCreateMaterialOpen(true)}
                  onOpenInventoryModal={m => {
                    setInventoryTargetMaterial(m || null);
                    setIsInventoryModalOpen(true);
                  }}
                  onUpdateMaterial={handleUpdateMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                />
              )}

              {currentNav === 'styles' && (
                <StylesView
                  styles={styles}
                  onOpenCreateStyle={() => setIsCreateStyleOpen(true)}
                  onDeleteStyle={handleDeleteStyle}
                />
              )}

              {currentNav === 'wallets' && (
                <WalletsView
                  customers={customers}
                  transactions={walletTransactions}
                  onOpenRecharge={c => {
                    setRechargeTargetCustomer(c || null);
                    setIsRechargeModalOpen(true);
                  }}
                  onRefund={handleRefund}
                  onSelectCustomer={c => setSelectedCustomer(c)}
                />
              )}

              {currentNav === 'archives' && (
                <ArchivesView
                  files={customerFiles}
                  customers={customers}
                  onOpenUploadArchive={() => {
                    setArchiveTargetCustomer(null);
                    setIsArchiveUploadOpen(true);
                  }}
                  onOpenPdfPreview={f => {
                    setPreviewFile(f);
                    setIsPdfPreviewOpen(true);
                  }}
                  onSelectCustomer={c => setSelectedCustomer(c)}
                  onDeleteFile={handleDeleteCustomerFile}
                />
              )}

              {currentNav === 'statistics' && (
                <StatisticsView
                  customers={customers}
                  orders={orders}
                  materials={materials}
                  walletTransactions={walletTransactions}
                />
              )}

              {currentNav === 'settings' && (
                <SettingsView
                  settings={settings}
                  customers={customers}
                  onUpdateSettings={handleUpdateSettings}
                  onResetSeedData={handleResetSeedData}
                  onExportBackup={handleExportBackup}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
      />

      {measurementTargetCustomer && (
        <MeasurementModal
          isOpen={isMeasurementModalOpen}
          onClose={() => setIsMeasurementModalOpen(false)}
          customer={measurementTargetCustomer}
          onSave={handleSaveMeasurement}
        />
      )}

      {printingMeasurement && printingCustomer && (
        <MeasurementPrintModal
          isOpen={isMeasurementPrintOpen}
          onClose={() => setIsMeasurementPrintOpen(false)}
          customer={printingCustomer}
          measurement={printingMeasurement}
          settings={settings}
        />
      )}

      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        customers={customers}
        materials={materials}
        styles={styles}
        settings={settings}
        preselectedCustomer={orderTargetCustomer}
        onOrderCreated={handleCreateOrder}
        getMeasurementsForCustomer={cid => storeService.getMeasurementsByCustomerId(cid)}
      />

      {selectedOrder && (
        <OrderDetailModal
          isOpen={isOrderDetailOpen}
          onClose={() => setIsOrderDetailOpen(false)}
          order={selectedOrder}
          settings={settings}
          onUpdateStatus={handleUpdateOrderStatus}
          onAddPayment={handleAddOrderPayment}
          onOpenPrint={o => {
            setPrintingOrder(o);
            setIsOrderPrintOpen(true);
          }}
          onDeleteOrder={handleDeleteOrder}
        />
      )}

      {printingOrder && (
        <OrderPrintModal
          isOpen={isOrderPrintOpen}
          onClose={() => setIsOrderPrintOpen(false)}
          order={printingOrder}
          settings={settings}
        />
      )}

      <RechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        customers={customers}
        preselectedCustomer={rechargeTargetCustomer}
        onRecharge={handleRecharge}
      />

      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        materials={materials}
        preselectedMaterial={inventoryTargetMaterial}
        onSubmitTransaction={handleInventoryTransaction}
      />

      <ArchiveUploadModal
        isOpen={isArchiveUploadOpen}
        onClose={() => setIsArchiveUploadOpen(false)}
        customers={customers}
        preselectedCustomer={archiveTargetCustomer}
        onUploadSuccess={handleUploadArchive}
      />

      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        file={previewFile}
      />

      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        customers={customers}
        orders={orders}
        materials={materials}
        styles={styles}
        onSelectCustomer={c => setSelectedCustomer(c)}
        onSelectOrder={o => {
          setSelectedOrder(o);
          setIsOrderDetailOpen(true);
        }}
        onSelectMaterial={m => {
          setCurrentNav('materials');
        }}
      />

      <CreateMaterialModal
        isOpen={isCreateMaterialOpen}
        onClose={() => setIsCreateMaterialOpen(false)}
        onSave={async data => {
          const created = await storeService.createMaterial(data);
          setMaterials(prev => dedupeById([created, ...prev]));
        }}
      />

      <CreateStyleModal
        isOpen={isCreateStyleOpen}
        onClose={() => setIsCreateStyleOpen(false)}
        onSave={async data => {
          const created = await storeService.createStyle(data);
          setStyles(prev => dedupeById([created, ...prev]));
        }}
      />

      {deleteDialog && (
        <ConfirmDeleteModal
          isOpen={deleteDialog.isOpen}
          title={deleteDialog.title}
          description={deleteDialog.description}
          confirmLabel={deleteDialog.confirmLabel}
          onClose={() => setDeleteDialog(null)}
          onConfirm={deleteDialog.onConfirm}
        />
      )}

      {/* Mobile Quick Bottom Navigation Bar for iPhone / iPad */}
      <nav
        aria-label="移动端快速导航"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 flex items-center justify-around px-2 py-1.5 pb-safe text-stone-400 select-none shadow-lg"
      >
        <button
          onClick={() => {
            setCurrentNav('workbench');
            setSelectedCustomer(null);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] min-w-[54px] cursor-pointer transition-colors ${
            currentNav === 'workbench' && !selectedCustomer ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>工作台</span>
        </button>

        <button
          onClick={() => {
            setCurrentNav('customers');
            setSelectedCustomer(null);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] min-w-[54px] cursor-pointer transition-colors ${
            currentNav === 'customers' || selectedCustomer ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>客户</span>
        </button>

        <button
          onClick={() => {
            setCurrentNav('orders');
            setSelectedCustomer(null);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] min-w-[54px] cursor-pointer transition-colors ${
            currentNav === 'orders' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>订单</span>
        </button>

        <button
          onClick={() => {
            setCurrentNav('materials');
            setSelectedCustomer(null);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] min-w-[54px] cursor-pointer transition-colors ${
            currentNav === 'materials' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>面料</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] min-w-[54px] text-stone-300 hover:text-white cursor-pointer transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5 text-amber-500" />
          <span>更多菜单</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
