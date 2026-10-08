import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Eye,
  ChevronRight,
  Phone,
  Ruler,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import { Customer, CustomerLevel, Gender } from '../../types';
import { formatMoney, formatDate, getCustomerLevelBadge } from '../../utils/formatters';

interface CustomersViewProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenCreateCustomer: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onSelectCustomer,
  onOpenCreateCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | CustomerLevel>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | Gender>('all');

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.customerId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLevel = levelFilter === 'all' || c.level === levelFilter;
      const matchGender = genderFilter === 'all' || c.gender === genderFilter;

      return matchSearch && matchLevel && matchGender;
    });
  }, [customers, searchTerm, levelFilter, genderFilter]);

  return (
    <div className="space-y-5">
      {/* Top Banner and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-600" />
              <span>客户档案管理</span>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
                共 {customers.length} 位档案客户
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              记录客户身份资料、体型偏好、多期量体数据与储值账户资产
            </p>
          </div>

          <button
            onClick={onOpenCreateCustomer}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>+ 录入新客户档案</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="按客户姓名、手机号、客户编号 (如 C20261001) 搜索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50"
            />
          </div>

          <div>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50 font-medium text-stone-700"
            >
              <option value="all">全部会员等级</option>
              <option value="normal">普通客户</option>
              <option value="vip">VIP 会员</option>
              <option value="svip">SVIP 尊享客户</option>
            </select>
          </div>

          <div>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50 font-medium text-stone-700"
            >
              <option value="all">全部性别</option>
              <option value="male">男士</option>
              <option value="female">女士</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table (iPad Touch & PC Horizontal Scrolling) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200">
                <th className="py-3 px-4">客户编号</th>
                <th className="py-3 px-4">客户姓名 / 手机号</th>
                <th className="py-3 px-4">性别</th>
                <th className="py-3 px-4">会员等级</th>
                <th className="py-3 px-4">当前储值余额</th>
                <th className="py-3 px-4">订单数</th>
                <th className="py-3 px-4">最近量体</th>
                <th className="py-3 px-4">建档时间</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800 font-sans">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    未找到符合条件的客户记录
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  const badge = getCustomerLevelBadge(c.level);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCustomer(c)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-500">
                        {c.customerId}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name[0]}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 text-sm group-hover:text-amber-900">
                              {c.name}
                            </span>
                            <p className="text-[11px] text-stone-400 font-mono">{c.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-stone-500">
                        {c.gender === 'male' ? '男士' : c.gender === 'female' ? '女士' : '其他'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-amber-800">
                        {formatMoney(c.walletBalance)}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2 py-0.5 bg-stone-100 rounded-md font-bold text-stone-700">
                          {c.orderCount} 笔
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-stone-500">
                        {formatDate(c.lastMeasurementDate)}
                      </td>

                      <td className="py-3.5 px-4 text-stone-400">
                        {formatDate(c.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectCustomer(c);
                          }}
                          className="px-2.5 py-1 text-xs text-stone-700 bg-stone-100 group-hover:bg-amber-100 group-hover:text-amber-900 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                        >
                          <span>档案详情</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
