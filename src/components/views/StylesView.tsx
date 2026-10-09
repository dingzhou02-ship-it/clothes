import React, { useState } from 'react';
import { Scissors, Search, Plus, Tag, Check, Sparkles, Trash2 } from 'lucide-react';
import { Style } from '../../types';
import { ResolvedImage } from '../common/ResolvedImage';

interface StylesViewProps {
  styles: Style[];
  onOpenCreateStyle: () => void;
  onDeleteStyle?: (style: Style) => void;
}

export const StylesView: React.FC<StylesViewProps> = ({ styles, onOpenCreateStyle, onDeleteStyle }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['西服', '衬衫', '大衣', '中式服装', '女装', '裤装', '其他'];

  const filteredStyles = styles.filter(s => {
    const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-amber-600" />
              <span>款式版型与工艺参数库</span>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
                {styles.length} 种经典款式结构
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              提供西服、衬衫、中式立领、大衣等核心款式参数库（驳头、门襟、开衩、扣型等工艺模块）
            </p>
          </div>

          <button
            onClick={onOpenCreateStyle}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ 录入新工艺款式</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-2 border-t border-stone-100">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部品类 ({styles.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat} ({styles.filter(s => s.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Styles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStyles.map(s => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:border-stone-400 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Style Image */}
              <div className="h-48 bg-stone-100 overflow-hidden relative">
                {s.imageUrl ? (
                  <ResolvedImage
                    src={s.imageUrl}
                    alt={s.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    fallbackText="暂无款式样衣照"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                    暂无款式样衣照
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] px-2 py-0.5 rounded-md font-medium backdrop-blur-xs">
                  {s.category}
                </span>
                <span className="absolute top-2 right-2 bg-emerald-700/80 text-white text-[10px] px-2 py-0.5 rounded-md font-medium backdrop-blur-xs">
                  工坊标准制版
                </span>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-mono text-stone-400">#{s.styleId}</span>
                  <h3 className="text-sm font-bold text-stone-900">{s.name}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{s.description}</p>
                </div>

                {/* Parameters list (Section 11) */}
                <div className="border-t border-stone-100 pt-2.5 space-y-1.5">
                  <h4 className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    工艺参数配置项 (Bespoke Parameters)
                  </h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(s.parameters).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-[11px] bg-stone-50 px-2 py-1 rounded-md">
                        <span className="text-stone-500">{k}：</span>
                        <strong className="text-stone-800">{v}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-50/60 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>创建归档时间：{s.createdAt.split('T')[0]}</span>
              <div className="flex items-center space-x-2">
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>可直接调用建单</span>
                </span>
                {onDeleteStyle && (
                  <button
                    type="button"
                    onClick={() => onDeleteStyle(s)}
                    className="px-2 py-1 text-xs text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                    title="删除该服装款式"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
