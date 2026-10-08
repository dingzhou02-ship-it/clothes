import React from 'react';
import {
  LayoutDashboard,
  Users,
  Ruler,
  ShoppingBag,
  Layers,
  Scissors,
  Wallet,
  FolderOpen,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';

export type NavItemKey =
  | 'workbench'
  | 'customers'
  | 'measurements'
  | 'orders'
  | 'materials'
  | 'styles'
  | 'wallets'
  | 'archives'
  | 'statistics'
  | 'settings';

interface SidebarProps {
  currentNav: NavItemKey;
  onSelectNav: (key: NavItemKey) => void;
  customerCount: number;
  orderCount: number;
  lowStockCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  customerCount,
  orderCount,
  lowStockCount,
}) => {
  const navItems: {
    key: NavItemKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | null;
    badgeColor?: string;
  }[] = [
    { key: 'workbench', label: '工作台', icon: LayoutDashboard },
    { key: 'customers', label: '客户管理', icon: Users, badge: customerCount },
    { key: 'measurements', label: '量体管理', icon: Ruler },
    { key: 'orders', label: '订单管理', icon: ShoppingBag, badge: orderCount },
    {
      key: 'materials',
      label: '面料管理',
      icon: Layers,
      badge: lowStockCount > 0 ? `${lowStockCount}预警` : null,
      badgeColor: 'bg-rose-600 text-white',
    },
    { key: 'styles', label: '款式管理', icon: Scissors },
    { key: 'wallets', label: '储值管理', icon: Wallet },
    { key: 'archives', label: '历史档案', icon: FolderOpen },
    { key: 'statistics', label: '数据统计', icon: BarChart3 },
    { key: 'settings', label: '系统设置', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-stone-950 text-stone-200 flex flex-col shrink-0 border-r border-stone-800 select-none z-30">
      {/* Brand Logo & Shop Title */}
      <div className="p-6 border-b border-stone-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-stone-950 font-serif font-black text-xl shadow-md border border-amber-400/40">
            七
          </div>
          <div>
            <h1 className="text-base font-serif font-bold text-white tracking-widest">
              七彩布衣
            </h1>
            <p className="text-[10px] text-amber-400/80 uppercase tracking-widest font-mono">
              Bespoke Tailoring Suite
            </p>
          </div>
        </div>
      </div>

      {/* Nav Menu Items (10 Items as requested in Section 4) */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
          业务主导航
        </div>
        {navItems.map(item => {
          const isActive = currentNav === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectNav(item.key)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-stone-950 stroke-[2.5]' : 'text-stone-400'
                  }`}
                />
                <span className="tracking-wide text-[13px]">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    item.badgeColor
                      ? item.badgeColor
                      : isActive
                      ? 'bg-stone-950/20 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Shop Tag */}
      <div className="p-4 border-t border-stone-800/80 bg-stone-900/40">
        <div className="flex items-center space-x-2 text-[11px] text-stone-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>工坊系统在线运行中 (iPad/PC双优)</span>
        </div>
        <p className="text-[10px] text-stone-500 mt-1 font-mono">
          Cloud Firestore · 事务资金双轨架构
        </p>
      </div>
    </aside>
  );
};
