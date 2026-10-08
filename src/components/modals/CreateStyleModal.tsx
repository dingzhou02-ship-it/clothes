import React, { useState } from 'react';
import { X, Scissors, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Style } from '../../types';

interface CreateStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const CreateStyleModal: React.FC<CreateStyleModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('西服');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<{ key: string; value: string }[]>([
    { key: '版型风格', value: '英式全毛衬收腰' },
    { key: '驳头式样', value: '平驳头 8.5cm' },
    { key: '门襟形式', value: '单排两粒扣' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddParam = () => {
    setParams([...params, { key: '', value: '' }]);
  };

  const handleRemoveParam = (idx: number) => {
    setParams(params.filter((_, i) => i !== idx));
  };

  const handleParamChange = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...params];
    updated[idx][field] = val;
    setParams(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请填写款式名称');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const paramObj: Record<string, string> = {};
      params.forEach(p => {
        if (p.key.trim() && p.value.trim()) {
          paramObj[p.key.trim()] = p.value.trim();
        }
      });

      await onSave({
        name: name.trim(),
        category,
        imageUrl: imageUrl.trim() || undefined,
        description: description.trim(),
        parameters: paramObj,
        status: 'active',
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '录入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold tracking-wide">录入新服装款式与工艺参数</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-stone-700 font-medium mb-1">
              款式名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="如：意式轻结构单排两粒平驳头西服"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 font-medium mb-1">产品类别</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
              >
                {['西服', '衬衫', '大衣', '中式服装', '女装', '裤装', '其他'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">效果参考图 URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-medium mb-1">款式设计说明</label>
            <textarea
              rows={2}
              placeholder="如：那不勒斯衬衫袖无垫肩结构，如第二层皮肤般贴合轻盈..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-stone-700 font-bold">
                自定义工艺参数 (可灵活扩充)
              </label>
              <button
                type="button"
                onClick={handleAddParam}
                className="px-2 py-0.5 text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-md border border-stone-300 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>新增参数</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {params.map((p, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="参数名 (如: 领型)"
                    value={p.key}
                    onChange={e => handleParamChange(idx, 'key', e.target.value)}
                    className="w-1/3 px-2.5 py-1.5 border border-stone-300 rounded-md bg-stone-50"
                  />
                  <input
                    type="text"
                    placeholder="参数值 (如: 开角温莎领)"
                    value={p.value}
                    onChange={e => handleParamChange(idx, 'value', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-stone-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveParam(idx)}
                    className="text-stone-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 font-bold text-white bg-stone-900 rounded-lg hover:bg-stone-800 shadow-xs cursor-pointer"
            >
              {loading ? '保存中...' : '确认录入款式'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
