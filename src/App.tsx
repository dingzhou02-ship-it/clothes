import React, { useState, useEffect } from 'react';
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

function MainApp() {
  const { isAuthenticated, loading: authLoading } = useAuth();

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

      setCustomers(custList);
      setMaterials(matList);
      setInventoryTransactions(invTxList);
      setStyles(styList);
      setOrders(ordList);
      setWalletTransactions(walTxList);
      setCustomerFiles(fileList);
      setSettings(stg);
    } catch (e) {
      console.error('Error loading store data:', e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

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
    if (selectedCustomer) {
      storeService.getMeasurementsByCustomerId(selectedCustomer.id).then(setMeasurements);
      storeService.getCustomerImages(selectedCustomer.id).then(setCustomerImages);
    } else {
      // Load all measurements across boutique
      Promise.all(
        customers.map(c => storeService.getMeasurementsByCustomerId(c.id))
      ).then(results => {
        setMeasurements(results.flat());
      });
    }
  }, [selectedCustomer, customers]);

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

  // Action Handlers
  const handleSaveCustomer = async (data: any) => {
    if (editingCustomer) {
      const updated = await storeService.updateCustomer(editingCustomer.id, data);
      setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      if (selectedCustomer?.id === updated.id) setSelectedCustomer(updated);
    } else {
      const created = await storeService.createCustomer(data);
      setCustomers(prev => [created, ...prev]);
      setSelectedCustomer(created);
    }
  };

  const handleSaveMeasurement = async (data: any) => {
    const created = await storeService.createMeasurement(data);
    setMeasurements(prev => [created, ...prev]);
    // Refresh customers list because lastMeasurementDate updated
    const refreshed = await storeService.getCustomers();
    setCustomers(refreshed);
    if (selectedCustomer?.id === data.customerId) {
      const updatedCust = refreshed.find(c => c.id === data.customerId);
      if (updatedCust) setSelectedCustomer(updatedCust);
    }
  };

  const handleSetCurrentMeasurement = async (measurementId: string) => {
    if (!selectedCustomer) return;
    await storeService.setCurrentMeasurement(measurementId, selectedCustomer.id);
    const updated = await storeService.getMeasurementsByCustomerId(selectedCustomer.id);
    setMeasurements(updated);
  };

  const handleCreateOrder = async (orderPayload: any) => {
    const created = await storeService.createOrder(orderPayload);
    setOrders(prev => [created, ...prev]);
    // Refresh customers and wallet transactions
    const [refreshedCust, refreshedTxs] = await Promise.all([
      storeService.getCustomers(),
      storeService.getWalletTransactions(),
    ]);
    setCustomers(refreshedCust);
    setWalletTransactions(refreshedTxs);
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
            operatorId: 'staff-01',
            operatorName: '裁缝师',
            remarks: `定制订单 ${created.orderId} 裁剪消耗`,
          });
        }
      }
    }
    const refreshedMats = await storeService.getMaterials();
    const refreshedInvTxs = await storeService.getInventoryTransactions();
    setMaterials(refreshedMats);
    setInventoryTransactions(refreshedInvTxs);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, note: string) => {
    const updated = await storeService.updateOrderStatus(orderId, status, note);
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
  };

  const handleAddOrderPayment = async (
    orderId: string,
    amountCents: number,
    method: PaymentMethod,
    stage: PaymentStage,
    remarks?: string
  ) => {
    const updated = await storeService.addOrderPayment(orderId, amountCents, method, stage, remarks);
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);

    // Refresh customers and transactions
    const [refreshedCust, refreshedTxs] = await Promise.all([
      storeService.getCustomers(),
      storeService.getWalletTransactions(),
    ]);
    setCustomers(refreshedCust);
    setWalletTransactions(refreshedTxs);
  };

  const handleRecharge = async (
    customerId: string,
    amountCents: number,
    method: PaymentMethod,
    remarks: string
  ) => {
    const tx = await storeService.rechargeWallet(customerId, amountCents, method, remarks);
    setWalletTransactions(prev => [tx, ...prev]);
    const refreshed = await storeService.getCustomers();
    setCustomers(refreshed);
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
    const tx = await storeService.refundWallet(customerId, amountCents, relatedOrderId, remarks);
    setWalletTransactions(prev => [tx, ...prev]);
    const refreshed = await storeService.getCustomers();
    setCustomers(refreshed);
    if (selectedCustomer?.id === customerId) {
      const currentCust = refreshed.find(c => c.id === customerId);
      if (currentCust) setSelectedCustomer(currentCust);
    }
  };

  const handleInventoryTransaction = async (data: any) => {
    const tx = await storeService.createInventoryTransaction(data);
    setInventoryTransactions(prev => [tx, ...prev]);
    const refreshedMats = await storeService.getMaterials();
    setMaterials(refreshedMats);
  };

  const handleUploadArchive = async (data: any) => {
    const created = await storeService.createCustomerFile(data);
    setCustomerFiles(prev => [created, ...prev]);
  };

  const handleAddImage = async (
    customerId: string,
    imageType: any,
    imageUrl: string,
    title: string,
    remarks: string
  ) => {
    const created = await storeService.createCustomerImage({
      customerId,
      imageType,
      imageUrl,
      title,
      remarks,
      operatorId: 'staff-01',
    });
    setCustomerImages(prev => [created, ...prev]);
  };

  const handleUpdateSettings = async (newSettings: Partial<StoreSetting>) => {
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
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* Fixed Sidebar (Section 4) */}
      <div className={`${isMobileSidebarOpen ? 'block fixed inset-0 z-40' : 'hidden lg:flex'}`}>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-stone-100/90">
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
                />
              )}

              {currentNav === 'styles' && (
                <StylesView
                  styles={styles}
                  onOpenCreateStyle={() => setIsCreateStyleOpen(true)}
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
          setMaterials(prev => [created, ...prev]);
        }}
      />

      <CreateStyleModal
        isOpen={isCreateStyleOpen}
        onClose={() => setIsCreateStyleOpen(false)}
        onSave={async data => {
          const created = await storeService.createStyle(data);
          setStyles(prev => [created, ...prev]);
        }}
      />
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
