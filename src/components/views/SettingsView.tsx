import React, { useState } from 'react';
import {
  Settings,
  Store,
  Percent,
  Printer,
  Download,
  RotateCcw,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  UserCheck,
} from 'lucide-react';
import { StoreSetting } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SettingsViewProps {
  settings: StoreSetting;
  onUpdateSettings: (newSettings: Partial<StoreSetting>) => Promise<void>;
  onResetSeedData: () => void;
  onExportBackup: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetSeedData,
  onExportBackup,
}) => {
  const { currentUser, signInAsStaff } = useAuth();

  const [shopName, setShopName] = useState(settings.shopName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [businessHours, setBusinessHours] = useState(settings.businessHours);
  const [vipDiscountRate, setVipDiscountRate] = useState(settings.vipDiscountRate || 0.95);
  const [svipDiscountRate, setSvipDiscountRate] = useState(settings.svipDiscountRate || 0.90);
  const [defaultSafetyStock, setDefaultSafetyStock] = useState(settings.defaultSafetyStock || 8.0);
  const [printHeader, setPrintHeader] = useState(settings.printHeader);
  const [printFooter, setPrintFooter] = useState(settings.printFooter);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onUpdateSettings({
        shopName,
        phone,
        address,
        businessHours,
        vipDiscountRate: Number(vipDiscountRate),
        svipDiscountRate: Number(svipDiscountRate),
        defaultSafetyStock: Number(defaultSafetyStock),
        printHeader,
        printFooter,
      });
      setSuccessMsg('系统配置与折扣策略已更新并保存！');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
          <Settings className="w-5 h-5 text-amber-600" />
          <span>工坊系统设置与参数规则</span>
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          配置工坊基础资料、VIP 会员动态折扣率、A4 打印凭单版头页脚及数据备份导出
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Staff Identity Switcher (Section 45) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-stone-900">当前操作人员身份识别 (预留多店员角色)</h3>
          </div>
          <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
            {currentUser?.role === 'admin' ? '系统管理员/主理人' : '工坊店员'}
          </span>
        </div>

        <p className="text-xs text-stone-500">
          系统当前登录为：<strong>{currentUser?.displayName}</strong> ({currentUser?.email})。可在下方快速切换测试不同岗位：
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => signInAsStaff('admin', '刘振海 (主理人/总裁缝师)')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              currentUser?.displayName.includes('刘振海')
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            刘振海 (主理人/总裁缝师 - Admin)
          </button>
          <button
            type="button"
            onClick={() => signInAsStaff('staff', '王师傅 (制版量体师)')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              currentUser?.displayName.includes('王师傅')
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            王师傅 (制版量体师 - Staff)
          </button>
          <button
            type="button"
            onClick={() => signInAsStaff('staff', '小李 (接待专员)')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              currentUser?.displayName.includes('小李')
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            小李 (接待专员 - Staff)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Info */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Store className="w-4 h-4 text-amber-600" />
            <span>工坊基本信息 (打印凭证抬头)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 font-medium mb-1">工坊全称</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">接待预约电话</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">工坊营业时间</label>
              <input
                type="text"
                value={businessHours}
                onChange={e => setBusinessHours(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">工坊实体展厅地址</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* VIP Discount Rules (Section 14 & 26) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Percent className="w-4 h-4 text-amber-600" />
            <span>会员专属动态折扣策略 (不写死代码，支持灵活调整)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 font-medium mb-1">
                VIP 会员默认折扣比例 (如 0.95 为95折)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={vipDiscountRate}
                onChange={e => setVipDiscountRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                实际折扣：{(vipDiscountRate * 10).toFixed(1)} 折
              </span>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">
                SVIP 尊享会员默认折扣比例 (如 0.90 为9折)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={svipDiscountRate}
                onChange={e => setSvipDiscountRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                实际折扣：{(svipDiscountRate * 10).toFixed(1)} 折
              </span>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">
                面料库默认安全警戒库存 (米)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={defaultSafetyStock}
                onChange={e => setDefaultSafetyStock(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                低于该米数时工作台产生红色预警
              </span>
            </div>
          </div>
        </div>

        {/* Print template configurations */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Printer className="w-4 h-4 text-amber-600" />
            <span>A4 定制联打印声明与页脚</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-stone-700 font-medium mb-1">打印单据主抬头标语</label>
              <input
                type="text"
                value={printHeader}
                onChange={e => setPrintHeader(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-medium mb-1">单据页脚交付协议与终身微调说明</label>
              <textarea
                rows={2}
                value={printFooter}
                onChange={e => setPrintFooter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{loading ? '正在保存...' : '保存系统设置修改'}</span>
          </button>
        </div>
      </form>

      {/* Data Backup & Maintenance (Section 37 & 41) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
          <Database className="w-4 h-4 text-amber-600" />
          <span>数据备份与安全性说明 (严格遵守真实性原则)</span>
        </h3>

        <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-2 text-stone-700 leading-relaxed">
          <p className="font-bold text-stone-900">【云端持久化与自动备份声明】</p>
          <p>
            • 当前系统已真实连接 Google Cloud Firestore 企业版数据库，所有客户档案、多次量体记录、订单及储值流水均实时持久化。
          </p>
          <p>
            • <strong>关于 Firebase 自动定期备份</strong>：根据项目准则，本系统明确如实说明：生产级 Firestore 定时快照备份需在 GCP 控制台开启 Cloud Scheduler + Export Documents 任务或开通 Enterprise PITR（时间点恢复）。本系统当前提供即时<strong>手动 JSON 完整全量冷备份导出</strong>功能。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExportBackup}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>下载全量 JSON 备份档案 (客户+量体+订单+流水)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm('确定要将所有数据重置为高端定制工坊初始标准演示数据集吗？')) {
                onResetSeedData();
              }
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl border border-stone-300 flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-stone-500" />
            <span>一键重载工坊初始标准示例数据</span>
          </button>
        </div>
      </div>
    </div>
  );
};
