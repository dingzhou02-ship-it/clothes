import React from 'react';
import { X, Printer } from 'lucide-react';
import { Customer, Measurement, StoreSetting } from '../../types';
import { formatDate } from '../../utils/formatters';

interface MeasurementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  measurement: Measurement;
  settings: StoreSetting;
}

export const MeasurementPrintModal: React.FC<MeasurementPrintModalProps> = ({
  isOpen,
  onClose,
  customer,
  measurement,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Controls (Not Printed) */}
        <div className="flex items-center justify-between px-6 py-3 bg-stone-900 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">量体单 A4 打印预览</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>立即打印 / 存为PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-8 overflow-y-auto bg-white text-stone-900 font-sans print:p-0">
          {/* Header */}
          <div className="text-center border-b-2 border-stone-800 pb-4 mb-6">
            <h1 className="text-2xl font-serif font-bold tracking-widest text-stone-900">
              {settings.shopName}
            </h1>
            <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">
              BESPOKE TAILORING MEASUREMENT SPECIFICATION
            </p>
            <div className="flex justify-between items-center text-xs text-stone-600 mt-4 px-2">
              <span>档案编号：<strong>{customer.customerId}</strong></span>
              <span>量体单号：<strong>{measurement.measurementId}</strong></span>
              <span>量体日期：<strong>{formatDate(measurement.measureDate)}</strong></span>
              <span>主裁师傅：<strong>{measurement.operatorName}</strong></span>
            </div>
          </div>

          {/* Customer Meta */}
          <div className="border border-stone-300 rounded-lg p-4 mb-6 bg-stone-50/50">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div><span className="text-stone-500">客户姓名：</span><strong className="text-sm font-bold">{customer.name}</strong></div>
              <div><span className="text-stone-500">联系电话：</span><strong>{customer.phone}</strong></div>
              <div><span className="text-stone-500">性别：</span>{customer.gender === 'male' ? '男士' : '女士'}</div>
              <div><span className="text-stone-500">会员级别：</span>{customer.level.toUpperCase()}</div>
              <div className="col-span-4"><span className="text-stone-500">体型偏好备注：</span>{customer.remarks || '无特殊偏好'}</div>
            </div>
          </div>

          {/* Core Measurement Table */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 border-l-3 border-amber-600 pl-2">
              基础净体尺寸 (Standard Measurements)
            </h2>
            <table className="w-full text-xs border-collapse border border-stone-300">
              <tbody>
                <tr className="bg-stone-100 text-stone-700 font-semibold text-center">
                  <td className="border border-stone-300 py-1.5">身高 (Height)</td>
                  <td className="border border-stone-300 py-1.5">体重 (Weight)</td>
                  <td className="border border-stone-300 py-1.5">肩宽 (Shoulder)</td>
                  <td className="border border-stone-300 py-1.5">净胸围 (Chest)</td>
                  <td className="border border-stone-300 py-1.5">净腰围 (Waist)</td>
                </tr>
                <tr className="text-center font-bold text-sm">
                  <td className="border border-stone-300 py-2">{measurement.height || '-'} cm</td>
                  <td className="border border-stone-300 py-2">{measurement.weight || '-'} kg</td>
                  <td className="border border-stone-300 py-2 text-amber-900 bg-amber-50/30">{measurement.shoulder || '-'} cm</td>
                  <td className="border border-stone-300 py-2 text-amber-900 bg-amber-50/30">{measurement.chest || '-'} cm</td>
                  <td className="border border-stone-300 py-2 text-amber-900 bg-amber-50/30">{measurement.waist || '-'} cm</td>
                </tr>
                <tr className="bg-stone-100 text-stone-700 font-semibold text-center">
                  <td className="border border-stone-300 py-1.5">臀围 (Hips)</td>
                  <td className="border border-stone-300 py-1.5">袖长 (Sleeve)</td>
                  <td className="border border-stone-300 py-1.5">衣长 (Cloth)</td>
                  <td className="border border-stone-300 py-1.5">上臂围 (Arm)</td>
                  <td className="border border-stone-300 py-1.5">手腕围 (Wrist)</td>
                </tr>
                <tr className="text-center font-bold text-sm">
                  <td className="border border-stone-300 py-2">{measurement.hips || '-'} cm</td>
                  <td className="border border-stone-300 py-2">{measurement.sleeveLength || '-'} cm</td>
                  <td className="border border-stone-300 py-2">{measurement.clothLength || '-'} cm</td>
                  <td className="border border-stone-300 py-2">{measurement.upperArm || '-'} cm</td>
                  <td className="border border-stone-300 py-2">{measurement.wrist || '-'} cm</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Custom measurements */}
          {measurement.customItems && measurement.customItems.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 border-l-3 border-amber-600 pl-2">
                制版特需定制尺寸 (Custom Detail Items)
              </h2>
              <table className="w-full text-xs border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 text-left font-semibold">
                    <th className="border border-stone-300 px-3 py-1.5 w-1/4">测量部位</th>
                    <th className="border border-stone-300 px-3 py-1.5 w-1/4">数值</th>
                    <th className="border border-stone-300 px-3 py-1.5">工艺说明 / 放量标准</th>
                  </tr>
                </thead>
                <tbody>
                  {measurement.customItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-stone-200">
                      <td className="border border-stone-300 px-3 py-1.5 font-medium">{item.name}</td>
                      <td className="border border-stone-300 px-3 py-1.5 font-bold text-stone-900">
                        {item.value} {item.unit || 'cm'}
                      </td>
                      <td className="border border-stone-300 px-3 py-1.5 text-stone-600">{item.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Master Tailor Notes */}
          <div className="border border-stone-300 rounded-lg p-4 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              主裁打版提示与体型修正要领 (Master Tailor Directives)
            </h2>
            <p className="text-xs text-stone-800 leading-relaxed min-h-12">
              {measurement.remarks || '标准体态，按客人体型常规比例放量制版。'}
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-stone-200 text-xs">
            <div className="text-center">
              <div className="border-b border-stone-400 pb-8 mb-1"></div>
              <p className="text-stone-600">量体师签字 (Measurer)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-stone-400 pb-8 mb-1"></div>
              <p className="text-stone-600">制版师确认 (Pattern Master)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-stone-400 pb-8 mb-1"></div>
              <p className="text-stone-600">客户复核确认 (Client)</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-stone-400 mt-8">
            {settings.printFooter}
          </div>
        </div>
      </div>
    </div>
  );
};
