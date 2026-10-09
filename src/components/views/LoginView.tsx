import React, { useState, useEffect, useRef } from 'react';
import {
  Scissors,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Mail,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Smartphone,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  COUNTRY_CODES,
  checkPhoneSendAllowed,
  validatePhoneNumber,
  maskPhone,
} from '../../utils/phoneUtils';

export const LoginView: React.FC = () => {
  const {
    sendPhoneVerificationCode,
    verifyPhoneCode,
    resetPhoneAuthFlow,
    phoneConfirmationPending,
    pendingPhoneE164,
    signInWithGoogle,
    signInWithEmail,
    sendResetEmail,
    authError,
    unauthorizedDomain,
    clearAuthError,
  } = useAuth();

  // Primary login mode: 'phone' (default, per specification) | 'admin_backup' (Google / Email for initial admin bootstrap)
  const [loginTab, setLoginTab] = useState<'phone' | 'admin_backup'>('phone');

  // Phone SMS login states
  const [countryCode, setCountryCode] = useState('+86');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);
  const [verifyingSms, setVerifyingSms] = useState(false);

  // Admin backup login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittingBackup, setSubmittingBackup] = useState(false);

  // Common feedback states
  const [localError, setLocalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  // Countdown timer for SMS resend rate limit
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Sync cooldown if phone number already has an active cooldown in localStorage
  useEffect(() => {
    const res = validatePhoneNumber(phoneNumber, countryCode);
    if (res.valid) {
      const rate = checkPhoneSendAllowed(res.e164Phone);
      if (rate.cooldownSeconds > 0) {
        setCooldown(rate.cooldownSeconds);
      }
    }
  }, [phoneNumber, countryCode]);

  const handleCopyDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSendSmsCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();

    const validation = validatePhoneNumber(phoneNumber, countryCode);
    if (!validation.valid) {
      setLocalError(validation.error || '请输入有效的手机号码');
      return;
    }

    const rateCheck = checkPhoneSendAllowed(validation.e164Phone);
    if (!rateCheck.allowed) {
      setCooldown(rateCheck.cooldownSeconds);
      setLocalError(rateCheck.reason || '发送过于频繁，请稍后再试');
      return;
    }

    setSendingSms(true);
    try {
      const result = await sendPhoneVerificationCode(
        phoneNumber,
        countryCode,
        'firebase-recaptcha-container'
      );
      setCooldown(result.cooldownSeconds || 60);
      setSuccessNotice(
        `短信验证码已发送至 ${maskPhone(result.e164Phone)}，请在 5 分钟内输入 6 位验证码完成核验。`
      );
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 150);
    } catch (err: any) {
      setLocalError(err?.message || '短信验证码发送失败，请检查网络或人机验证后重试');
    } finally {
      setSendingSms(false);
    }
  };

  const handleVerifySmsCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();

    const cleanCode = smsCode.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      setLocalError('请输入完整的 6 位数字短信验证码');
      return;
    }

    setVerifyingSms(true);
    try {
      await verifyPhoneCode(cleanCode);
    } catch (err: any) {
      setLocalError(err?.message || '验证码校验失败，请核对后重试');
    } finally {
      setVerifyingSms(false);
    }
  };

  const handleChangePhone = () => {
    setSmsCode('');
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();
    resetPhoneAuthFlow();
  };

  const handleGoogleLogin = async (useRedirect = false) => {
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();
    setSubmittingBackup(true);
    try {
      await signInWithGoogle(useRedirect);
    } catch (err: any) {
      setLocalError(err?.message || 'Google 认证失败');
    } finally {
      setSubmittingBackup(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();
    setSubmittingBackup(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setLocalError(err?.message || '登录验证失败');
    } finally {
      setSubmittingBackup(false);
    }
  };

  const handleResetPassword = async () => {
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();
    if (!email.trim()) {
      setLocalError('请先在上方输入框填写您的授权邮箱');
      return;
    }
    setSubmittingBackup(true);
    try {
      await sendResetEmail(email);
      setSuccessNotice(
        `密码设置/重置邮件已发送至 ${email.trim()}，请查收邮件设置新密码。`
      );
    } catch (err: any) {
      setLocalError(err?.message || '发送重置邮件失败，请稍后重试');
    } finally {
      setSubmittingBackup(false);
    }
  };

  const displayError = localError || authError;
  const activeCountry =
    COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className="min-h-screen bg-[#141413] flex items-center justify-center p-4 sm:p-6 selection:bg-[#C5A059] selection:text-[#141413]">
      <div className="w-full max-w-md bg-[#FAF9F6] rounded-2xl shadow-2xl border border-[#C5A059]/30 overflow-hidden">
        {/* Top Atelier Brand Header */}
        <div className="bg-[#1C1B1A] px-6 sm:px-8 py-6 sm:py-7 text-center border-b border-[#C5A059]/20 relative">
          <div className="w-12 h-12 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center mx-auto mb-3 text-[#C5A059]">
            <Scissors size={24} />
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#FAF9F6] tracking-wider">
            柒彩定制工坊
          </h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#C5A059] mt-1">
            Private Bespoke Atelier · 账号级加密授权系统
          </p>
        </div>

        {/* Login Mode Tabs */}
        <div className="grid grid-cols-2 bg-[#F2EFE9] p-1.5 mx-6 sm:mx-8 mt-6 rounded-xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => {
              setLoginTab('phone');
              setLocalError('');
              setSuccessNotice('');
              clearAuthError();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginTab === 'phone'
                ? 'bg-[#141413] text-[#C5A059] shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone size={15} />
            <span>手机号验证码登录</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginTab('admin_backup');
              setLocalError('');
              setSuccessNotice('');
              clearAuthError();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginTab === 'admin_backup'
                ? 'bg-[#141413] text-[#C5A059] shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <KeyRound size={15} />
            <span>主理人备用认证</span>
          </button>
        </div>

        <div className="p-6 sm:p-8 pt-5 space-y-5">
          {/* Security Policy Banner */}
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="text-amber-700 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-0.5">严格的手机号白名单与 UID 级数据隔离</p>
              <p className="text-amber-800/90">
                仅限系统管理员预先授权的手机号登录。陌生号码即使完成短信验证也将被安全拦截，严禁未授权访问任何客户档案与订单记录。
              </p>
            </div>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span className="leading-relaxed font-medium">{displayError}</span>
              </div>

              {unauthorizedDomain && (
                <div className="pt-2 border-t border-red-200/80 space-y-2 text-[11px] text-red-800">
                  <div className="flex items-center justify-between gap-2 bg-white/90 px-2.5 py-1.5 rounded-lg border border-red-200">
                    <div className="flex items-center gap-1.5 truncate font-mono font-semibold text-stone-800">
                      <Globe size={13} className="text-red-600 shrink-0" />
                      <span className="truncate">{unauthorizedDomain}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDomain(unauthorizedDomain)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 font-medium shrink-0 transition-colors cursor-pointer"
                    >
                      {copiedDomain ? <Check size={12} /> : <Copy size={12} />}
                      {copiedDomain ? '已复制' : '复制域名'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0519685978/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-red-700 underline hover:text-red-900 font-semibold"
                    >
                      <span>打开 Firebase 授权域名设置</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {successNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-medium">{successNotice}</span>
            </div>
          )}

          {loginTab === 'phone' ? (
            <div className="space-y-4">
              {/* Step 1: Phone Input & Send Code */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  授权手机号码
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    disabled={phoneConfirmationPending || sendingSms}
                    onChange={e => setCountryCode(e.target.value)}
                    className="w-[125px] shrink-0 px-2.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#C5A059] disabled:bg-stone-100"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Smartphone
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={phoneNumber}
                      disabled={phoneConfirmationPending || sendingSms}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder={activeCountry.placeholder}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A059] disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>
                </div>

                {/* Human Verification (reCAPTCHA) Container */}
                <div className="bg-stone-100/80 border border-stone-200/80 rounded-xl p-3 flex flex-col items-center justify-center min-h-[56px]">
                  <div className="text-[11px] text-stone-500 mb-1.5 flex items-center gap-1.5">
                    <Lock size={12} className="text-[#C5A059]" />
                    <span>安全人机验证（点击获取验证码时自动加载核验）</span>
                  </div>
                  <div
                    id="firebase-recaptcha-container"
                    className="flex items-center justify-center overflow-x-auto max-w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendSmsCode()}
                    disabled={sendingSms || cooldown > 0 || !phoneNumber.trim()}
                    className="flex-1 py-2.5 px-4 bg-[#141413] hover:bg-stone-800 text-[#C5A059] font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {sendingSms ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>正在人机核验并发送短信...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span>重新获取验证码 ({cooldown}s)</span>
                    ) : phoneConfirmationPending ? (
                      <span>重新发送短信验证码</span>
                    ) : (
                      <>
                        <span>获取短信验证码</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  {phoneConfirmationPending && (
                    <button
                      type="button"
                      onClick={handleChangePhone}
                      className="py-2.5 px-3 bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-medium rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                    >
                      更换号码
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: 6-digit SMS Verification Code Input */}
              <form
                onSubmit={handleVerifySmsCode}
                className={`space-y-3.5 pt-3 border-t border-stone-200 transition-opacity ${
                  phoneConfirmationPending ? 'opacity-100' : 'opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    6 位短信验证码
                  </label>
                  {pendingPhoneE164 && (
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      接收号码: {maskPhone(pendingPhoneE164)}
                    </span>
                  )}
                </div>

                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={smsCode}
                  onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入 6 位数字验证码"
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-center text-lg font-mono font-bold tracking-[0.35em] text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />

                <button
                  type="submit"
                  disabled={
                    verifyingSms ||
                    !phoneConfirmationPending ||
                    smsCode.replace(/\D/g, '').length !== 6
                  }
                  className="w-full py-3.5 px-4 bg-[#C5A059] hover:bg-[#b38e48] text-[#141413] font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <span>
                    {verifyingSms ? '正在核验短信验证码与账号权限...' : '验证并进入定制管理系统'}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          ) : (
            /* Backup Admin Login (Google / Email) for Initial Admin Bootstrap & Management */
            <div className="space-y-4">
              <div className="bg-stone-100 border border-stone-200/80 rounded-xl p-3 text-xs text-stone-600 leading-relaxed">
                此通道供工坊主理人或已授权管理员登录后台，用于<strong>首次配置授权手机号白名单</strong>或管理店员权限。
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin(false)}
                disabled={submittingBackup}
                className="w-full py-3 px-4 bg-[#141413] hover:bg-stone-800 text-[#FAF9F6] font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 17c1.9 3.9 5.8 7 10.4 7z"
                  />
                </svg>
                <span>
                  {submittingBackup ? '正在验证管理员身份...' : '使用 Google 官方安全认证登录'}
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-stone-400 uppercase tracking-wider">
                  或者使用授权邮箱密码
                </span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    管理员/操作员授权邮箱
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="请输入已授权的邮箱地址"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-stone-600">
                      安全登录密码
                    </label>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[11px] text-[#A6823C] hover:underline cursor-pointer"
                    >
                      首次设置 / 重置密码
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="请输入登录密码"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingBackup}
                  className="w-full py-2.5 px-4 bg-[#C5A059] hover:bg-[#b38e48] text-[#141413] font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <span>{submittingBackup ? '正在核验权限...' : '验证并进入管理系统'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          <div className="pt-2 border-t border-stone-200/70 text-center">
            <p className="text-[11px] text-stone-400">
              电脑 · iPad · iPhone Safari 多端实时加密同步 · 严禁未授权访问
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
