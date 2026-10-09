import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Loader2,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    sendResetEmail,
    authError,
    unauthorizedDomain,
    clearAuthError,
  } = useAuth();
  const [loginMode, setLoginMode] = useState<'google' | 'password'>('google');
  const [email, setEmail] = useState('dingzhou02@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCopyDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleGoogleLogin = async (useRedirect = false) => {
    try {
      setLoading(true);
      setLocalError('');
      setResetSuccess('');
      clearAuthError();
      await signInWithGoogle(useRedirect);
    } catch (err: any) {
      setLocalError(err?.message || 'Google 身份验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setLocalError('');
      setResetSuccess('');
      clearAuthError();
      await signInWithEmail(email, password);
    } catch (err: any) {
      setLocalError(err?.message || '账号密码验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setLocalError('请先输入您的授权登录邮箱地址');
      return;
    }
    try {
      setLoading(true);
      setLocalError('');
      setResetSuccess('');
      await sendResetEmail(email);
      setResetSuccess(`密码重置链接已发送至 ${email.trim()}，请查收邮件设置新密码。`);
    } catch (err: any) {
      setLocalError(err?.message || '发送重置邮件失败，请确认邮箱已在认证中心绑定');
    } finally {
      setLoading(false);
    }
  };

  const combinedError = authError || localError;

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-800">
        {/* Top Brand Banner */}
        <div className="bg-stone-950 p-8 text-center text-white relative border-b border-stone-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-stone-950 font-serif font-black text-3xl shadow-lg border border-amber-400/50 mx-auto mb-4">
            七
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-widest text-white">
            七彩布衣
          </h1>
          <p className="text-xs text-amber-400/90 tracking-widest font-mono mt-1">
            BESPOKE TAILORING PRIVATE SYSTEM
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 bg-stone-900 border border-stone-800 rounded-full text-[11px] text-amber-300/90">
            <Lock className="w-3 h-3 text-amber-500" />
            <span>私人专属经营系统 · 已关闭公开注册 · 仅限主理人授权访问</span>
          </div>
        </div>

        {/* Login Body */}
        <div className="p-7 space-y-5">
          {combinedError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{combinedError}</span>
            </div>
          )}

          {unauthorizedDomain && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2.5">
              <div className="flex items-center space-x-1.5 font-bold">
                <Globe className="w-4 h-4 text-amber-700 shrink-0" />
                <span>域名白名单配置指引 (Authorized Domains)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                若您在 Netlify 正式网址或新环境下使用 Google 登录，请复制下方域名并添加至 Firebase 控制台{' '}
                <span className="font-mono font-bold">Authentication → Settings → Authorized domains</span>：
              </p>
              <div className="flex items-center justify-between bg-white border border-amber-300 rounded-lg px-2.5 py-1.5">
                <code className="text-[11px] font-mono text-stone-800 truncate mr-2">
                  {unauthorizedDomain}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyDomain(unauthorizedDomain)}
                  className="inline-flex items-center space-x-1 px-2 py-1 bg-stone-900 text-white rounded-md text-[10px] font-bold cursor-pointer shrink-0 hover:bg-stone-800"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>复制域名</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('password');
                    setLocalError('');
                    clearAuthError();
                  }}
                  className="text-[11px] font-bold text-amber-900 underline hover:text-stone-900 cursor-pointer"
                >
                  切换为「授权邮箱密码登录」→
                </button>
              </div>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{resetSuccess}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setLoginMode('google');
                setLocalError('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginMode === 'google'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Google 官方安全认证
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setLocalError('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginMode === 'password'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              授权邮箱密码登录
            </button>
          </div>

          {loginMode === 'google' ? (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1">
                <p className="font-bold text-stone-900">主理人专属白名单鉴权</p>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  请使用主理人授权账号（<span className="font-mono font-semibold text-stone-800">dingzhou02@gmail.com</span> 或后台已授权的操作员账号）登录。未授权账号即使完成认证也将被云端安全规则拦截。
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin(false)}
                disabled={loading}
                className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                )}
                <span>{loading ? '正在验证云端身份与白名单权限...' : '使用 Google 授权账号安全登录'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLogin(true)}
                disabled={loading}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-[11px] font-medium flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-stone-500" />
                <span>iPhone / iPad Safari 免弹窗跳转登录</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  授权登录账号 (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="dingzhou02@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    安全登录密码
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium cursor-pointer"
                  >
                    首次设置/重置密码？
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="请输入登录密码"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400" />
                )}
                <span>{loading ? '正在验证身份...' : '验证身份并进入系统'}</span>
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-stone-100 text-[10px] text-center text-stone-400 leading-relaxed space-y-1">
            <p>
              • 本系统已启用云端独立身份鉴权（Firestore Security Rules + 白名单校验）
            </p>
            <p>
              • 未登录或非授权访客无法读取任何客户资料、订单、量体、储值与档案文件
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

