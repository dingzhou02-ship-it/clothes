import React, { useState } from 'react';
import {
  Scissors,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Mail,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const {
    signInWithEmail,
    sendResetEmail,
    authError,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError('请输入登录邮箱');
      return;
    }
    if (!password) {
      setLocalError('请输入登录密码');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(cleanEmail, password);
    } catch (err: any) {
      setLocalError(err?.message || '登录失败，请检查账号和密码');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError('请先在上方输入框填写您的管理员邮箱');
      return;
    }

    setSubmitting(true);
    try {
      await sendResetEmail(cleanEmail);
      setSuccessNotice(
        `重置密码邮件已发送至 ${cleanEmail}，请检查收件箱（包括垃圾邮件箱）并按提示重置密码。`
      );
    } catch (err: any) {
      setLocalError(err?.message || '发送重置密码邮件失败，请确认邮箱是否有效或稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#141413] flex items-center justify-center p-4 sm:p-6 selection:bg-[#C5A059] selection:text-[#141413]">
      <div className="w-full max-w-md bg-[#FAF9F6] rounded-2xl shadow-2xl border border-[#C5A059]/30 overflow-hidden">
        {/* Atelier Brand Header */}
        <div className="bg-[#1C1B1A] px-6 sm:px-8 py-7 sm:py-8 text-center border-b border-[#C5A059]/20 relative">
          <div className="w-12 h-12 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center mx-auto mb-3 text-[#C5A059]">
            <Scissors size={24} />
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#FAF9F6] tracking-wider">
            柒彩定制工坊
          </h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#C5A059] mt-1">
            Private Bespoke Atelier · 内部管理系统
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Security Notice */}
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="text-amber-700 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-0.5">管理员专属访问通道</p>
              <p className="text-amber-800/90">
                本系统仅限已授权管理员通过官方安全凭证登录。系统已启用账号级数据保护，未授权访客严禁访问任何客户档案与业务数据。
              </p>
            </div>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed font-medium">{displayError}</span>
            </div>
          )}

          {successNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-medium">{successNotice}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                管理员邮箱
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="请输入您的管理员邮箱"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  登录密码
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-[#A6823C] hover:text-[#846328] hover:underline cursor-pointer transition-colors"
                >
                  忘记密码 / 重置密码
                </button>
              </div>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入登录密码"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-[#C5A059] hover:bg-[#b38e48] text-[#141413] font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>正在验证身份并登录...</span>
                </>
              ) : (
                <>
                  <span>安全登录管理系统</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-stone-200/70 text-center">
            <p className="text-[11px] text-stone-400">
              电脑 · iPad · iPhone Safari 跨端数据云端实时同步 · 严禁未授权访问
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
