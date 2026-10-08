import React, { useState } from 'react';
import { Ruler, Search, Printer, Plus, CheckCircle2, User } from 'lucide-react';
import { Measurement, Customer } from '../../types';
import { formatDate } from '../../utils/formatters';

interface MeasurementsViewProps {
  measurements: Measurement[];
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddMeasurement: (customer: Customer) => void;
  onOpenPrintMeasurement: (measurement: Measurement, customer: Customer) => void;
}

export const MeasurementsView: React.FC<MeasurementsViewProps> = ({
  measurements,
  customers,
  onSelectCustomer,
  onOpenAddMeasurement,
  onOpenPrintMeasurement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMeasurements = measurements.filter(m => {
    const cust = customers.find(c => c.id === m.customerId);
    const search = searchTerm.toLowerCase();
    return (
      (m.customerName && m.customerName.toLowerCase().includes(search)) ||
      (cust && cust.phone.includes(search)) ||
      m.measurementId.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-amber-600" />
            <span>量体数据管理中心</span>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
              全工坊共 {measurements.length} 份量体档案
            </span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            严格保留所有客户每次历史量体原始数据，不覆盖旧记录，支持 A4 工坊制版单打印
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="搜索客户姓名、手机号、量体编号..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 bg-stone-50/50"
          />
        </div>
      </div>

      {/* Measurements Cards List */}
      <div className="space-y-3.5">
        {filteredMeasurements.map(m => {
          const cust = customers.find(c => c.id === m.customerId);
          return (
            <div
              key={m.id}
              className={`bg-white rounded-xl border p-4 shadow-xs hover:border-stone-400 transition-colors ${
                m.isCurrent ? 'border-amber-300 ring-1 ring-amber-300/30' : 'border-stone-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-stone-400">
                    #{m.measurementId}
                  </span>
                  {cust && (
                    <button
                      onClick={() => onSelectCustomer(cust)}
                      className="font-bold text-sm text-stone-900 hover:text-amber-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>{cust.name}</span>
                      <span className="text-xs text-stone-400 font-mono">({cust.phone})</span>
                    </button>
                  )}
                  <span className="text-xs text-stone-500 font-mono">
                    量体日期：{formatDate(m.measureDate)}
                  </span>
                  {m.isCurrent && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.2 rounded-full border border-amber-300">
                      当前生效
                    </span>
                  )}
                  <span className="text-xs text-stone-400">主裁：{m.operatorName}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {cust && (
                    <button
                      onClick={() => onOpenPrintMeasurement(m, cust)}
                      className="px-3 py-1.5 text-xs text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>A4 打印量体单</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sizing Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2 text-center text-xs pt-3">
                {[
                  { label: '身高', val: m.height, unit: 'cm' },
                  { label: '体重', val: m.weight, unit: 'kg' },
                  { label: '肩宽', val: m.shoulder, unit: 'cm', hl: true },
                  { label: '胸围', val: m.chest, unit: 'cm', hl: true },
                  { label: '腰围', val: m.waist, unit: 'cm', hl: true },
                  { label: '臀围', val: m.hips, unit: 'cm' },
                  { label: '袖长', val: m.sleeveLength, unit: 'cm' },
                  { label: '衣长', val: m.clothLength, unit: 'cm' },
                  { label: '上臂围', val: m.upperArm, unit: 'cm' },
                  { label: '手腕围', val: m.wrist, unit: 'cm' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border ${
                      s.hl ? 'bg-amber-50/60 border-amber-200 text-amber-950 font-bold' : 'bg-stone-50 border-stone-200 text-stone-800'
                    }`}
                  >
                    <span className="text-[10px] text-stone-400 block">{s.label}</span>
                    <strong className="text-xs font-mono">{s.val ? `${s.val}${s.unit}` : '-'}</strong>
                  </div>
                ))}
              </div>

              {m.remarks && (
                <p className="text-xs text-stone-500 mt-2 bg-stone-50 p-2 rounded-md">
                  <strong>打版要领：</strong> {m.remarks}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
