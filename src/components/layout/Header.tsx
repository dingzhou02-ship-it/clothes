import React from 'react';
import {
  Search,
  UserPlus,
  ShoppingBag,
  Wallet,
  Ruler,
  Upload,
  LogOut,
  User,
  Shield,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from './Sidebar';

interface HeaderProps {
  currentNav: NavItemKey;
  onOpenGlobalSearch: () => void;
  onOpenCreateCustomer: () => void;
  onOpenCreateOrder: () => void;
  onOpenRecharge: () => void;
  onOpenAddMeasurement: () => void;
  onOpenUploadArchive: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentNav,
  onOpenGlobalSearch,
  onOpenCreateCustomer,
  onOpenCreateOrder,
  onOpenRecharge,
  onOpenAddMeasurement,
  onOpenUploadArchive,
  onToggleMobileSidebar,
}) => {
  const { currentUser, currentRole, hasPermission, signOut } = useAuth();

  const navTitles: Record<NavItemKey, { title: string; subtitle: string }> = {
    workbench: { title: '工坊工作台', subtitle: '经营关键指标、订单流转与今日待办' },
    customers: { title: '客户管理', subtitle: '500+ 私享客户档案、体型偏好与终身定制记录' },
    measurements: { title: '量体管理', subtitle: '多版本历史量体独立归档，A4打版单据打印' },
    orders: { title: '订单管理', subtitle: '全流程生命周期、瞬时量体快照与定金尾款核销' },
    materials: { title: '面料管理', subtitle: '高定面料实物库、出入库不可变流水与安全警戒' },
    styles: { title: '款式管理', subtitle: '西服、衬衫、中式立领工艺参数化制版库' },
    wallets: { title: '储值管理', subtitle: '双向会计记账流水、充值消费原子扣减与退款' },
    archives: { title: '历史档案', subtitle: '几千份纸质老订单原件免OCR高保真PDF扫描归档' },
    statistics: { title: '数据统计', subtitle: '客群分层画像、品类热度与销售回款进度' },
    settings: { title: '系统设置', subtitle: '操作者与角色权限、店铺信息、VIP折扣率与全量备份' },
  };

  const currentMeta = navTitles[currentNav] || navTitles.workbench;

  return (
    <header className="h-16 bg-white border-b border-stone-200 px-6 flex items-center justify-between shrink-0 z-20">
      {/* Left: Mobile sidebar toggle + Page Title */}
      <div className="flex items-center space-x-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 text-stone-600 hover:text-stone-900 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base font-bold text-stone-900 tracking-tight flex items-center space-x-2">
            <span>{currentMeta.title}</span>
            <span className="text-[11px] font-normal text-stone-400 hidden sm:inline">
              · {currentMeta.subtitle}
            </span>
          </h1>
        </div>
      </div>

      {/* Middle: Global Search Button */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200/80 text-stone-500 rounded-xl text-xs transition-colors cursor-pointer border border-stone-200"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <span>全局搜索客户姓名、手机号、订单号、面料...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-stone-300 rounded-md text-stone-400 font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick actions + User menu */}
      <div className="flex items-center space-x-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="p-2 text-stone-600 hover:text-stone-900 md:hidden"
          title="全局搜索"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* 5 Quick Action Shortcuts (Section 36) */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200">
          {hasPermission('customerCreate') && (
            <button
              onClick={onOpenCreateCustomer}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-600" />
              <span>新建客户</span>
            </button>
          )}

          {hasPermission('orderCreate') && (
            <button
              onClick={onOpenCreateOrder}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <span>新建订单</span>
            </button>
          )}

          {hasPermission('walletRecharge') && (
            <button
              onClick={onOpenRecharge}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-600" />
              <span>储值充值</span>
            </button>
          )}

          {hasPermission('measurementCreate') && (
            <button
              onClick={onOpenAddMeasurement}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-600" />
              <span>录入量体</span>
            </button>
          )}

          {hasPermission('archiveUpload') && (
            <button
              onClick={onOpenUploadArchive}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>上传档案</span>
            </button>
          )}
        </div>

        {/* Current User Profile & Logout */}
        <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-7 h-7 rounded-full object-cover border border-amber-500/40 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.displayName ? currentUser.displayName[0] : '店'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-stone-900 leading-tight">
              {currentUser?.displayName || '工坊主裁'}
            </p>
            <p className="text-[10px] text-stone-400">
              {currentRole?.name ||
                currentUser?.roleName ||
                (currentUser?.role === 'admin' ? '系统管理员/主理人' : '普通操作员')}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            title="退出登录并清理敏感缓存"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
