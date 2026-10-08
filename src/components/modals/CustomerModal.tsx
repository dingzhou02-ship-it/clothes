import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Briefcase, Calendar, Tag } from 'lucide-react';
import { Customer, CustomerLevel, Gender } from '../../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [level, setLevel] = useState<CustomerLevel>('normal');
  const [birthday, setBirthday] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('自然到店');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setGender(initialData.gender || 'male');
      setLevel(initialData.level || 'normal');
      setBirthday(initialData.birthday || '');
      setOccupation(initialData.occupation || '');
      setAddress(initialData.address || '');
      setSource(initialData.source || '自然到店');
      setRemarks(initialData.remarks || '');
    } else {
      setName('');
      setPhone('');
      setGender('male');
      setLevel('normal');
      setBirthday('');
      setOccupation('');
      setAddress('');
      setSource('自然到店');
      setRemarks('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请填写客户姓名');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setError('请填写有效的手机号码');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        gender,
        level,
        birthday: birthday || undefined,
        occupation: occupation || undefined,
        address: address || undefined,
        source: source || undefined,
        remarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '保存失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-stone-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold tracking-wide">
              {initialData ? `编辑客户档案: ${initialData.name}` : '新建客户档案'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                客户姓名 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="如：张华峰"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                手机号码 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="如：13811223344"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">性别</label>
              <div className="flex space-x-4 pt-1">
                {(['male', 'female', 'other'] as Gender[]).map(g => (
                  <label key={g} className="inline-flex items-center text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="text-stone-900 focus:ring-stone-800"
                    />
                    <span className="ml-2 text-stone-700">
                      {g === 'male' ? '男士' : g === 'female' ? '女士' : '其他'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">会员等级</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value as CustomerLevel)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800 bg-white"
              >
                <option value="normal">普通客户 (标准定价)</option>
                <option value="vip">VIP 会员 (尊享95折/可配折扣)</option>
                <option value="svip">SVIP 尊贵会员 (尊享90折/专属主裁)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">出生日期</label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">职业/行业</label>
              <input
                type="text"
                placeholder="如：律所合伙人 / 建筑设计师"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">获客渠道</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800 bg-white"
              >
                <option value="自然到店">自然到店</option>
                <option value="老客转介绍">老客转介绍</option>
                <option value="商会引荐">商会/圈层引荐</option>
                <option value="线上小红书/点评">线上小红书/大众点评</option>
                <option value="异业合作">异业合作</option>
                <option value="其他">其他渠道</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">联系地址</label>
              <input
                type="text"
                placeholder="送货或常住地址"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              客户专属备注与着装偏好 (重要档案)
            </label>
            <textarea
              rows={3}
              placeholder="例：右肩略低1cm需垫片平衡；不喜欢垫肩太厚；袖长习惯露出衬衫1.5cm；偏好深色面料；穿正装需开后双衩等。"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs cursor-pointer flex items-center space-x-1"
            >
              {loading ? <span>保存中...</span> : <span>保存客户档案</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
