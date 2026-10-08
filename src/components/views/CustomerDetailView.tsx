import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Ruler,
  ShoppingBag,
  Wallet,
  FileText,
  Image as ImageIcon,
  Plus,
  Printer,
  CheckCircle2,
  Download,
  Eye,
  CreditCard,
  Tag,
  Edit2,
  Trash2,
  X,
  Upload,
  Loader2,
} from 'lucide-react';
import { CustomerFile, CustomerImage, Customer, Measurement, Order, WalletTransaction } from '../../types';
import { storageService } from '../../services/storageService';
import {
  formatMoney,
  formatDate,
  formatDateTime,
  getCustomerLevelBadge,
  getOrderStatusBadge,
  getPaymentMethodName,
} from '../../utils/formatters';

interface CustomerDetailViewProps {
  customer: Customer;
  measurements: Measurement[];
  orders: Order[];
  walletTransactions: WalletTransaction[];
  files: CustomerFile[];
  images: CustomerImage[];
  onBack: () => void;
  onEditCustomer: (customer: Customer) => void;
  onOpenCreateOrder: (customer: Customer) => void;
  onOpenAddMeasurement: (customer: Customer) => void;
  onOpenRecharge: (customer: Customer) => void;
  onOpenUploadArchive: (customer: Customer) => void;
  onOpenPrintMeasurement: (measurement: Measurement) => void;
  onOpenPrintOrder: (order: Order) => void;
  onSelectOrder: (order: Order) => void;
  onOpenPdfPreview: (file: CustomerFile) => void;
  onSetCurrentMeasurement: (measurementId: string) => Promise<void>;
  onAddImage: (customerId: string, imageType: any, imageUrl: string, title: string, remarks: string) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
  onDeleteImage?: (imageId: string) => Promise<void>;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  measurements,
  orders,
  walletTransactions,
  files,
  images,
  onBack,
  onEditCustomer,
  onOpenCreateOrder,
  onOpenAddMeasurement,
  onOpenRecharge,
  onOpenUploadArchive,
  onOpenPrintMeasurement,
  onOpenPrintOrder,
  onSelectOrder,
  onOpenPdfPreview,
  onSetCurrentMeasurement,
  onAddImage,
  onDeleteFile,
  onDeleteImage,
}) => {
  const [activeTab, setActiveTab] = useState<
    'basic' | 'measurements' | 'orders' | 'wallet' | 'archives' | 'images'
  >('basic');

  // Year filter for archives (Section 23)
  const availableYears = Array.from(new Set(files.map(f => f.year))).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // New Image upload modal inside tab
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [newImgType, setNewImgType] = useState<'front' | 'side' | 'back' | 'finished' | 'other'>('finished');
  const [newImgUrl, setNewImgUrl] = useState('');
  const [newImgTitle, setNewImgTitle] = useState('');
  const [newImgRemarks, setNewImgRemarks] = useState('');
  const [imgLoading, setImgLoading] = useState(false);

  const levelBadge = getCustomerLevelBadge(customer.level);

  const filteredFiles = selectedYear === 'all' ? files : files.filter(f => f.year === selectedYear);

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImgUrl.trim()) return;
    try {
      setImgLoading(true);
      await onAddImage(customer.id, newImgType, newImgUrl.trim(), newImgTitle.trim() || '客户试装照', newImgRemarks.trim());
      setShowAddImageModal(false);
      setNewImgUrl('');
      setNewImgTitle('');
      setNewImgRemarks('');
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Back button and quick breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl transition-colors cursor-pointer flex items-center space-x-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回客户列表</span>
        </button>
        <span className="text-xs text-stone-400">/ 客户深度档案中心</span>
      </div>

      {/* Customer Header Banner (Section 35) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {customer.name[0]}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                  {customer.name}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${levelBadge.bg}`}>
                  {levelBadge.text}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {customer.gender === 'male' ? '男士' : customer.gender === 'female' ? '女士' : '其他'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-mono">
                <span>编号：<strong className="text-stone-700">{customer.customerId}</strong></span>
                <span>电话：<strong className="text-stone-700">{customer.phone}</strong></span>
                {customer.occupation && <span>职业：<strong className="text-stone-700">{customer.occupation}</strong></span>}
                {customer.birthday && <span>生日：{customer.birthday}</span>}
              </div>
            </div>
          </div>

          {/* Quick Balance & 5 Action Buttons (Section 35) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 px-4 text-right">
              <span className="text-[11px] font-medium text-amber-800">当前可用储值余额</span>
              <p className="text-xl font-bold text-amber-900 tracking-tight font-mono">
                {formatMoney(customer.walletBalance)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onOpenCreateOrder(customer)}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>新建订单</span>
              </button>

              <button
                onClick={() => onOpenAddMeasurement(customer)}
                className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-amber-600" />
                <span>新增量体</span>
              </button>

              <button
                onClick={() => onOpenRecharge(customer)}
                className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>储值充值</span>
              </button>

              <button
                onClick={() => onOpenUploadArchive(customer)}
                className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>上传档案</span>
              </button>

              <button
                onClick={() => setShowAddImageModal(true)}
                className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                <span>上传照片</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6 Tabs Navigation Bar (Section 6) */}
        <div className="flex border-b border-stone-200 mt-6 -mb-6 overflow-x-auto">
          {[
            { id: 'basic', label: '基本资料', icon: User, count: null },
            { id: 'measurements', label: '量体档案', icon: Ruler, count: measurements.length },
            { id: 'orders', label: '定制订单', icon: ShoppingBag, count: orders.length },
            { id: 'wallet', label: '储值账户与流水', icon: Wallet, count: walletTransactions.length },
            { id: 'archives', label: '纸质历史档案', icon: FileText, count: files.length },
            { id: 'images', label: '形象照片资料', icon: ImageIcon, count: images.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: 基本资料 (Basic Profile) */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">客户完整档案信息</h3>
              <button
                onClick={() => onEditCustomer(customer)}
                className="text-xs text-amber-800 hover:underline flex items-center space-x-1 cursor-pointer font-medium"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>编辑客户资料</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400">客户编号：</span>
                <span className="font-mono font-bold text-stone-800 ml-1">{customer.customerId}</span>
              </div>
              <div>
                <span className="text-stone-400">客户姓名：</span>
                <span className="font-bold text-stone-800 ml-1">{customer.name}</span>
              </div>
              <div>
                <span className="text-stone-400">手机号码：</span>
                <span className="font-mono text-stone-800 ml-1">{customer.phone}</span>
              </div>
              <div>
                <span className="text-stone-400">客户性别：</span>
                <span className="text-stone-800 ml-1">{customer.gender === 'male' ? '男士' : '女士'}</span>
              </div>
              <div>
                <span className="text-stone-400">会员级别：</span>
                <span className="text-stone-800 font-bold ml-1 uppercase">{customer.level}</span>
              </div>
              <div>
                <span className="text-stone-400">获客来源：</span>
                <span className="text-stone-800 ml-1">{customer.source || '自然到店'}</span>
              </div>
              <div>
                <span className="text-stone-400">出生日期：</span>
                <span className="text-stone-800 ml-1">{customer.birthday || '未登记'}</span>
              </div>
              <div>
                <span className="text-stone-400">职业/行业：</span>
                <span className="text-stone-800 ml-1">{customer.occupation || '未登记'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-stone-400">常住/收货地址：</span>
                <span className="text-stone-800 ml-1">{customer.address || '未填写'}</span>
              </div>
              <div>
                <span className="text-stone-400">首建档案时间：</span>
                <span className="text-stone-600 ml-1">{formatDate(customer.createdAt)}</span>
              </div>
              <div>
                <span className="text-stone-400">最近更新时间：</span>
                <span className="text-stone-600 ml-1">{formatDateTime(customer.updatedAt)}</span>
              </div>
            </div>

            {/* Custom Remarks & Tailoring Preferences (Section 6) */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>客户专属备注与着装偏好 (自由度高，不强制结构化)</span>
              </h4>
              <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                {customer.remarks || '暂无专属着装备注。可在编辑客户中补充习惯松紧度、垫肩习惯、袖长习惯等。'}
              </p>
            </div>
          </div>

          {/* Right summary card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
                消费与定制资产统计
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">累计定制订单数：</span>
                  <strong className="text-stone-900 text-sm font-mono">{customer.orderCount} 笔</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">历史累计消费金额：</span>
                  <strong className="text-stone-900 text-sm font-mono">{formatMoney(customer.totalSpent)}</strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                  <span className="text-stone-500">当前可用储值：</span>
                  <strong className="text-amber-800 text-base font-bold font-mono">
                    {formatMoney(customer.walletBalance)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">最近一次量体：</span>
                  <span className="text-stone-700">{formatDate(customer.lastMeasurementDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">最近一次下单：</span>
                  <span className="text-stone-700">{formatDate(customer.lastOrderDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 量体档案 (Multiple Historical Measurements - Section 8) */}
      {activeTab === 'measurements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                历史多次量体记录 ({measurements.length}次)
              </h3>
              <p className="text-xs text-stone-500">
                历史量体永不覆盖，默认采用标记为“当前生效”的尺寸；支持多次对比与打版打印
              </p>
            </div>
            <button
              onClick={() => onOpenAddMeasurement(customer)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>录入新量体记录</span>
            </button>
          </div>

          {measurements.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <Ruler className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">该客户暂无量体记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {measurements.map((m, idx) => (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs space-y-4 ${
                    m.isCurrent ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold text-stone-500">
                        #{m.measurementId}
                      </span>
                      <span className="text-sm font-bold text-stone-900">
                        量体日期：{formatDate(m.measureDate)}
                      </span>
                      {m.isCurrent ? (
                        <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>当前默认主量体</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                          历史版本
                        </span>
                      )}
                      <span className="text-xs text-stone-400">主裁：{m.operatorName}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!m.isCurrent && (
                        <button
                          onClick={() => onSetCurrentMeasurement(m.id)}
                          className="px-2.5 py-1 text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                        >
                          设为当前量体
                        </button>
                      )}
                      <button
                        onClick={() => onOpenPrintMeasurement(m)}
                        className="px-2.5 py-1 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>A4打印量体单</span>
                      </button>
                    </div>
                  </div>

                  {/* Body sizes table */}
                  {(() => {
                    const bodyUnit = m.unit || '尺';
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                            本次量体基准单位：{bodyUnit}
                          </span>
                          <span className="text-stone-400">（历史记录已保留当时单位，支持两位小数精密放量）</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 text-center text-xs">
                          {[
                            { label: '身高', val: m.height, unit: 'cm' },
                            { label: '体重', val: m.weight, unit: 'kg' },
                            { label: '肩宽', val: m.shoulder, unit: bodyUnit, highlight: true },
                            { label: '净胸围', val: m.chest, unit: bodyUnit, highlight: true },
                            { label: '腰围', val: m.waist, unit: bodyUnit, highlight: true },
                            { label: '臀围', val: m.hips, unit: bodyUnit },
                            { label: '袖长', val: m.sleeveLength, unit: bodyUnit },
                            { label: '衣长', val: m.clothLength, unit: bodyUnit },
                            { label: '上臂围', val: m.upperArm, unit: bodyUnit },
                            { label: '手腕围', val: m.wrist, unit: bodyUnit },
                          ].map((item, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded-lg border ${
                                item.highlight ? 'bg-amber-50/60 border-amber-200 text-amber-950 font-bold' : 'bg-stone-50 border-stone-200 text-stone-800'
                              }`}
                            >
                              <div className="text-[10px] text-stone-400">{item.label}</div>
                              <div className="text-xs font-mono font-bold mt-0.5">
                                {item.val ? `${item.val} ${item.unit}` : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Custom Measurement items */}
                  {m.customItems && m.customItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                      <span className="text-[11px] text-stone-400 self-center">特殊部位尺寸：</span>
                      {m.customItems.map((ci, idx2) => (
                        <span key={idx2} className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md text-xs border border-stone-200">
                          {ci.name}: <strong>{ci.value}{ci.unit || '尺'}</strong> {ci.remark && `(${ci.remark})`}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.remarks && (
                    <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <strong>打版修正建议：</strong> {m.remarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: 定制订单 (Orders) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">定制订单记录 ({orders.length}笔)</h3>
            <button
              onClick={() => onOpenCreateOrder(customer)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ 为该客户新建订单</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">暂无定制订单记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectOrder(o)}
                  className="bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-400 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-900 text-xs">{o.orderId}</span>
                      <span className={`text-[10px] px-2 py-0.2 rounded-full border font-semibold ${getOrderStatusBadge(o.status).bg}`}>
                        {getOrderStatusBadge(o.status).text}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        下单时间：{formatDate(o.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-stone-700">
                      {o.items.map(it => `${it.productName} (${it.category})`).join(' + ')}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      交付日期：{formatDate(o.estimatedDeliveryDate)} · 共 {o.payments.length} 笔收款记录
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-center text-right">
                    <div>
                      <p className="text-xs text-stone-500">应付: {formatMoney(o.payableAmount)}</p>
                      {o.unpaidAmount > 0 ? (
                        <p className="text-xs font-bold text-rose-600">待收尾款: {formatMoney(o.unpaidAmount)}</p>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-600">全部款项已结清</p>
                      )}
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenPrintOrder(o);
                      }}
                      className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="打印A4单据"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: 储值账户与流水 (Wallet & Ledger - Section 16, 17) */}
      {activeTab === 'wallet' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-900 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs text-amber-200">当前可用储值余额</span>
                <p className="text-2xl font-bold font-mono tracking-tight mt-1">
                  {formatMoney(customer.walletBalance)}
                </p>
              </div>
              <button
                onClick={() => onOpenRecharge(customer)}
                className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                + 储值充值
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
              <span className="text-xs text-stone-500">累计历史充值</span>
              <p className="text-xl font-bold text-stone-900 font-mono">
                {formatMoney(walletTransactions.filter(t => t.type === 'recharge').reduce((s, t) => s + t.amount, 0))}
              </p>
              <span className="text-[11px] text-stone-400">支持现金/微信/支付宝手工核销</span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
              <span className="text-xs text-stone-500">累计储值扣款消费</span>
              <p className="text-xl font-bold text-stone-900 font-mono">
                {formatMoney(Math.abs(walletTransactions.filter(t => t.type === 'consume').reduce((s, t) => s + t.amount, 0)))}
              </p>
              <span className="text-[11px] text-stone-400">原子扣减，关联每笔定制订单</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3 border-l-3 border-amber-600 pl-2">
              储值双向记账流水台账 (不可篡改审计链 - 共有 {walletTransactions.length} 笔)
            </h4>

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
              {walletTransactions.map(tx => (
                <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-stone-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                        tx.type === 'recharge' ? 'bg-emerald-100 text-emerald-800' :
                        tx.type === 'refund' ? 'bg-blue-100 text-blue-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {tx.type === 'recharge' ? '账户充值' : tx.type === 'consume' ? '定制消费' : '退款冲正'}
                      </span>
                      <span className="font-mono text-stone-400">#{tx.transactionId}</span>
                      <span className="text-stone-500">· {getPaymentMethodName(tx.paymentMethod)}</span>
                      {tx.relatedOrderId && (
                        <span className="text-amber-800 font-mono">关联订单: {tx.relatedOrderId}</span>
                      )}
                    </div>
                    <p className="text-stone-600">
                      {tx.remarks} · 操作人: {tx.operatorName || tx.operatorId} · {formatDateTime(tx.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-bold font-mono ${tx.amount > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {tx.amount > 0 ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                    </span>
                    <p className="text-[10px] text-stone-400 font-mono">
                      余额: {formatMoney(tx.balanceBefore)} → <strong>{formatMoney(tx.balanceAfter)}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: 历史纸质档案 (Paper Archives - Section 22, 23) */}
      {activeTab === 'archives' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                纸质档案扫描件归档 (PDF原件免OCR)
              </h3>
              <p className="text-xs text-stone-500">
                按 customerId + 年份自动组织逻辑目录，保留几千份字迹不一的原始订单原貌
              </p>
            </div>
            <button
              onClick={() => onOpenUploadArchive(customer)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>上传历史纸质订单扫描件</span>
            </button>
          </div>

          {/* Year Tree Tabs (Section 23) */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-stone-200">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                selectedYear === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              全部年份 ({files.length})
            </button>
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  selectedYear === yr
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {yr} 年度 ({files.filter(f => f.year === yr).length})
              </button>
            ))}
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">该年份暂无扫描归档文件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFiles.map(file => {
                const lowerName = file.fileName.toLowerCase();
                const isImg =
                  lowerName.endsWith('.jpg') ||
                  lowerName.endsWith('.jpeg') ||
                  lowerName.endsWith('.png') ||
                  lowerName.endsWith('.webp') ||
                  file.fileUrl.startsWith('data:image/');
                const formatArchiveSize = (bytes?: number) => {
                  if (!bytes) return '未知大小';
                  if (bytes < 1024) return `${bytes} B`;
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                };

                return (
                  <div
                    key={file.id}
                    className="bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-400 transition-colors shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${isImg ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                          {isImg ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate">{file.fileName}</h4>
                          <p className="text-[11px] text-stone-400">
                            {file.year}年度 · {file.fileType === 'historical_order' ? '历史纸质订单' : file.fileType === 'historical_measurement' ? '历史手写量体单' : '客户档案文件'} ({isImg ? '照片' : 'PDF文档'}) · {formatArchiveSize(file.fileSize)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {file.remarks && (
                      <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg">
                        {file.remarks}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <span className="text-stone-400 text-[11px]">{formatDate(file.createdAt)}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onOpenPdfPreview(file)}
                          className="px-2.5 py-1 text-xs bg-stone-900 hover:bg-stone-800 text-white rounded-md flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>在线查看</span>
                        </button>
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md flex items-center space-x-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>下载</span>
                        </a>
                        {onDeleteFile && (
                          <button
                            onClick={() => onDeleteFile(file.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded-md cursor-pointer transition-colors"
                            title="删除该份归档"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: 图片资料 (Customer Photos - Section 7) */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              试衣与形象照片资料 ({images.length}张)
            </h3>
            <button
              onClick={() => setShowAddImageModal(true)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>上传客户形象/成衣照片</span>
            </button>
          </div>

          {images.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">暂无客户照片资料</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map(img => (
                <div key={img.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs space-y-2">
                  <div className="h-60 bg-stone-100 overflow-hidden relative">
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] px-2 py-0.5 rounded-md font-medium backdrop-blur-xs">
                      {img.imageType === 'front' ? '正面' : img.imageType === 'side' ? '侧面' : img.imageType === 'back' ? '背面' : '成衣实拍'}
                    </span>
                  </div>
                  <div className="p-3 flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{img.title}</h4>
                      {img.remarks && <p className="text-[11px] text-stone-500 mt-0.5">{img.remarks}</p>}
                      <span className="text-[10px] text-stone-400 block mt-1">{formatDate(img.createdAt)}</span>
                    </div>
                    {onDeleteImage && (
                      <button
                        onClick={() => onDeleteImage(img.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        title="删除该照片"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Image Modal */}
          {showAddImageModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-stone-200">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-stone-900">上传客户照片 (支持本地相册/拍照)</h4>
                  <button onClick={() => setShowAddImageModal(false)} className="text-stone-400 hover:text-stone-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleImageSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">选择本地照片文件 *</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-4 bg-stone-50 hover:bg-amber-50/30 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async e => {
                          if (e.target.files && e.target.files[0]) {
                            try {
                              setImgLoading(true);
                              const file = e.target.files[0];
                              if (!newImgTitle) setNewImgTitle(file.name.replace(/\.[^/.]+$/, ''));
                              const res = await storageService.uploadFile(file, 'customers');
                              setNewImgUrl(res.url);
                            } catch (err: any) {
                              alert(err?.message || '照片上传失败');
                            } finally {
                              setImgLoading(false);
                            }
                          }
                        }}
                      />
                      {newImgUrl ? (
                        <div className="flex items-center space-x-3 w-full">
                          <img src={newImgUrl} alt="预览" className="w-12 h-12 object-cover rounded-lg border border-stone-300" />
                          <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>照片已选取并准备就绪</span>
                          </span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-6 h-6 text-stone-400 mx-auto" />
                          <p className="text-xs font-bold text-stone-700">点击从电脑本地或手机相册选择照片</p>
                          <p className="text-[10px] text-stone-400">支持 JPG, PNG, WEBP 高清实拍图</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">图片分类标签</label>
                    <select
                      value={newImgType}
                      onChange={e => setNewImgType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                    >
                      <option value="finished">成衣定妆照</option>
                      <option value="front">客户正面体态</option>
                      <option value="side">侧面挺拔度</option>
                      <option value="back">背面肩胛骨</option>
                      <option value="other">其他特写</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">照片标题名称</label>
                    <input
                      type="text"
                      placeholder="如：2026秋季羊绒大衣试衣上身"
                      value={newImgTitle}
                      onChange={e => setNewImgTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">工艺试衣观察备注</label>
                    <textarea
                      rows={2}
                      placeholder="如：袖长合适，腰部线条修长"
                      value={newImgRemarks}
                      onChange={e => setNewImgRemarks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setShowAddImageModal(false)}
                      className="px-3 py-1.5 text-xs bg-stone-100 rounded-lg text-stone-700 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={imgLoading || !newImgUrl}
                      className="px-4 py-1.5 text-xs bg-stone-900 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50"
                    >
                      {imgLoading ? '上传处理中...' : '确认保存'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
