import React, { useState } from 'react';
import { ShieldCheck, LogIn, Sparkles, Scissors, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, signInAsStaff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-800">
        {/* Top Brand Banner */}
        <div className="bg-stone-950 p-8 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-stone-950 font-serif font-black text-3xl shadow-lg border border-amber-400/50 mx-auto mb-4">
            七
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-widest text-white">
            七彩布衣
          </h1>
          <p className="text-xs text-amber-400/90 tracking-widest font-mono mt-1">
            BESPOKE TAILORING INTERNAL SYSTEM
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 bg-stone-900 border border-stone-800 rounded-full text-[11px] text-stone-400">
            <Lock className="w-3 h-3 text-amber-500" />
            <span>内部专用管理系统 · 需身份鉴权访问</span>
          </div>
        </div>

        {/* Login Body */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider text-center">
              请选择登录身份进入管理后台
            </h2>

            {/* Quick staff entrance */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => signInAsStaff('admin', '刘振海 (主理人/总裁缝师)')}
                className="w-full p-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all shadow-md group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                    主
                  </div>
                  <div className="text-left">
                    <p className="text-stone-100 font-bold">刘振海 (工坊主理人/主裁)</p>
                    <p className="text-[10px] text-stone-400">超级管理员权限 · 全功能可用</p>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => signInAsStaff('staff', '王师傅 (制版量体师)')}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs">
                    裁
                  </div>
                  <div className="text-left">
                    <p className="text-stone-900 font-bold">王师傅 (制版量体师)</p>
                    <p className="text-[10px] text-stone-400">工坊店员权限</p>
                  </div>
                </div>
                <LogIn className="w-4 h-4 text-stone-400" />
              </button>
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400 text-[10px]">
                或通过 Google 账号直连
              </span>
            </div>
          </div>

          {/* Google SSO Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer transition-colors shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>{loading ? '连接验证中...' : '使用 Google 官方账号登录'}</span>
          </button>

          <p className="text-[10px] text-center text-stone-400 leading-relaxed">
            系统所有客户数据受 Firebase Security Rules 保护，严禁未登录访客读取。
          </p>
        </div>
      </div>
    </div>
  );
};
