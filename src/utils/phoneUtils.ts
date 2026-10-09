export interface CountryCodeOption {
  code: string;
  label: string;
  placeholder: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+86', label: '+86 中国大陆', placeholder: '请输入11位手机号码' },
  { code: '+852', label: '+852 中国香港', placeholder: '请输入8位香港手机号' },
  { code: '+853', label: '+853 中国澳门', placeholder: '请输入8位澳门手机号' },
  { code: '+886', label: '+886 中国台湾', placeholder: '请输入台湾手机号' },
  { code: '+1', label: '+1 美国/加拿大', placeholder: '请输入10位手机号' },
  { code: '+65', label: '+65 新加坡', placeholder: '请输入8位新加坡手机号' },
  { code: '+44', label: '+44 英国', placeholder: '请输入英国手机号' },
];

/**
 * 将任意格式手机号标准化为 E.164 格式 (如 +8613800108888)
 */
export function normalizePhoneToE164(rawPhone: string, defaultCountryCode = '+86'): string {
  if (!rawPhone) return '';
  const cleaned = rawPhone.replace(/[\s\-()（）.]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    // Special fix for Taiwan leading 0 after +886 (e.g. +8860912... -> +886912...)
    if (digits.startsWith('8860') && digits.length === 13) {
      return `+886${digits.slice(4)}`;
    }
    return digits ? `+${digits}` : '';
  }

  if (cleaned.startsWith('00')) {
    const digits = cleaned.slice(2).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return '';

  // If user typed 86138xxxxxxxx (13 digits starting with 861)
  if (digitsOnly.length === 13 && digitsOnly.startsWith('861')) {
    return `+${digitsOnly}`;
  }

  // Standard 11-digit China mainland mobile number
  if (/^1[3-9]\d{9}$/.test(digitsOnly) && defaultCountryCode === '+86') {
    return `+86${digitsOnly}`;
  }

  // Taiwan leading 0 removal
  if (defaultCountryCode === '+886' && digitsOnly.startsWith('0')) {
    return `+886${digitsOnly.slice(1)}`;
  }

  const cleanPrefix = defaultCountryCode.startsWith('+')
    ? defaultCountryCode
    : `+${defaultCountryCode.replace(/\D/g, '')}`;

  return `${cleanPrefix}${digitsOnly}`;
}

/**
 * 校验手机号合法性并返回标准 E.164 格式
 */
export function validatePhoneNumber(
  rawPhone: string,
  countryCode = '+86'
): { valid: boolean; e164: string; e164Phone: string; message?: string; error?: string } {
  const trimmed = (rawPhone || '').trim();
  if (!trimmed) {
    const msg = '请输入手机号码';
    return { valid: false, e164: '', e164Phone: '', message: msg, error: msg };
  }

  const e164 = normalizePhoneToE164(trimmed, countryCode);
  if (!e164 || !/^\+[1-9]\d{6,14}$/.test(e164)) {
    const msg = '手机号码格式不正确，请检查区号与号码位数';
    return { valid: false, e164, e164Phone: e164, message: msg, error: msg };
  }

  if (e164.startsWith('+86')) {
    const national = e164.slice(3);
    if (!/^1[3-9]\d{9}$/.test(national)) {
      const msg = '请输入有效的 11 位中国大陆手机号码（以 13~19 开头）';
      return {
        valid: false,
        e164,
        e164Phone: e164,
        message: msg,
        error: msg,
      };
    }
  } else if (e164.startsWith('+852') || e164.startsWith('+853')) {
    const national = e164.slice(4);
    if (!/^\d{8}$/.test(national)) {
      const msg = '港澳地区手机号码应为 8 位数字';
      return {
        valid: false,
        e164,
        e164Phone: e164,
        message: msg,
        error: msg,
      };
    }
  } else if (e164.startsWith('+886')) {
    const national = e164.slice(4);
    if (!/^9\d{8}$/.test(national)) {
      const msg = '台湾地区手机号码应为 9 开头的 9 位数字（或 09 开头的 10 位数字）';
      return {
        valid: false,
        e164,
        e164Phone: e164,
        message: msg,
        error: msg,
      };
    }
  } else if (e164.startsWith('+1')) {
    const national = e164.slice(2);
    if (!/^\d{10}$/.test(national)) {
      const msg = '北美地区手机号码应为 10 位数字';
      return {
        valid: false,
        e164,
        e164Phone: e164,
        message: msg,
        error: msg,
      };
    }
  }

  return { valid: true, e164, e164Phone: e164 };
}

/**
 * 格式化展示手机号 (如 +86 138-0010-8888)
 */
export function formatPhoneDisplay(phone?: string): string {
  if (!phone) return '-';
  const e164 = normalizePhoneToE164(phone);
  if (e164.startsWith('+86') && e164.length === 14) {
    const n = e164.slice(3);
    return `+86 ${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  }
  return e164 || phone;
}

/**
 * 脱敏展示手机号 (如 +86 138****8888)
 */
export function maskPhoneDisplay(phone?: string): string {
  if (!phone) return '';
  const e164 = normalizePhoneToE164(phone);
  if (e164.startsWith('+86') && e164.length === 14) {
    const n = e164.slice(3);
    return `+86 ${n.slice(0, 3)}****${n.slice(7)}`;
  }
  if (e164.length > 7) {
    return `${e164.slice(0, 4)}****${e164.slice(-3)}`;
  }
  return e164;
}

// --- 短信验证码发送频率限制与防暴力破解保护 ---
const SMS_RATE_STORAGE_KEY = 'qicai_sms_rate_guard_v1';
const COOLDOWN_SECONDS = 60; // 每次发送间隔 60 秒
const MAX_SENDS_PER_10_MIN = 5; // 10分钟内最多发送 5 次
const MAX_VERIFY_FAILS = 5; // 连续输错 5 次验证码触发临时锁定
const VERIFY_LOCKOUT_SECONDS = 180; // 连续输错后锁定 180 秒

interface SmsRateGuardState {
  cooldownUntil: number;
  sendHistory: number[];
  phoneCooldowns: Record<string, number>;
  verifyFailCount: number;
  verifyLockUntil: number;
}

function loadRateGuardState(): SmsRateGuardState {
  try {
    const raw = localStorage.getItem(SMS_RATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        cooldownUntil: Number(parsed.cooldownUntil) || 0,
        sendHistory: Array.isArray(parsed.sendHistory) ? parsed.sendHistory : [],
        phoneCooldowns: parsed.phoneCooldowns || {},
        verifyFailCount: Number(parsed.verifyFailCount) || 0,
        verifyLockUntil: Number(parsed.verifyLockUntil) || 0,
      };
    }
  } catch {
    // ignore
  }
  return {
    cooldownUntil: 0,
    sendHistory: [],
    phoneCooldowns: {},
    verifyFailCount: 0,
    verifyLockUntil: 0,
  };
}

function saveRateGuardState(state: SmsRateGuardState): void {
  try {
    localStorage.setItem(SMS_RATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const smsRateLimiter = {
  getRemainingCooldown(e164Phone?: string): number {
    const state = loadRateGuardState();
    const now = Date.now();
    const phoneUntil = e164Phone ? state.phoneCooldowns[e164Phone] || 0 : 0;
    const targetUntil = Math.max(state.cooldownUntil, phoneUntil);
    if (targetUntil > now) {
      return Math.ceil((targetUntil - now) / 1000);
    }
    return 0;
  },

  canSendSms(e164Phone: string): { allowed: boolean; waitSeconds: number; reason?: string } {
    const state = loadRateGuardState();
    const now = Date.now();

    // 1. Check 60s cooldown
    const remaining = this.getRemainingCooldown(e164Phone);
    if (remaining > 0) {
      return {
        allowed: false,
        waitSeconds: remaining,
        reason: `发送过于频繁，请在 ${remaining} 秒后重试`,
      };
    }

    // 2. Check 10-minute sliding window
    const tenMinAgo = now - 10 * 60 * 1000;
    const recentSends = state.sendHistory.filter(ts => ts > tenMinAgo);
    if (recentSends.length >= MAX_SENDS_PER_10_MIN) {
      const oldestRecent = Math.min(...recentSends);
      const waitSec = Math.max(10, Math.ceil((oldestRecent + 10 * 60 * 1000 - now) / 1000));
      return {
        allowed: false,
        waitSeconds: waitSec,
        reason: `10 分钟内获取验证码次数已达上限 (${MAX_SENDS_PER_10_MIN} 次)，请于 ${Math.ceil(
          waitSec / 60
        )} 分钟后再试`,
      };
    }

    return { allowed: true, waitSeconds: 0 };
  },

  recordSmsSent(e164Phone: string): number {
    const state = loadRateGuardState();
    const now = Date.now();
    const tenMinAgo = now - 10 * 60 * 1000;
    const nextCooldownUntil = now + COOLDOWN_SECONDS * 1000;

    state.cooldownUntil = nextCooldownUntil;
    state.phoneCooldowns[e164Phone] = nextCooldownUntil;
    state.sendHistory = [...state.sendHistory.filter(ts => ts > tenMinAgo), now];
    // Reset verify failure count when a fresh code is issued
    state.verifyFailCount = 0;
    state.verifyLockUntil = 0;
    saveRateGuardState(state);

    return COOLDOWN_SECONDS;
  },

  canAttemptVerify(): { allowed: boolean; waitSeconds: number; reason?: string } {
    const state = loadRateGuardState();
    const now = Date.now();
    if (state.verifyLockUntil > now) {
      const waitSec = Math.ceil((state.verifyLockUntil - now) / 1000);
      return {
        allowed: false,
        waitSeconds: waitSec,
        reason: `连续多次输入错误验证码，已触发防暴力破解保护，请等待 ${waitSec} 秒或重新获取验证码`,
      };
    }
    return { allowed: true, waitSeconds: 0 };
  },

  recordVerifyFailure(): { locked: boolean; remainingAttempts: number; lockSeconds: number } {
    const state = loadRateGuardState();
    const now = Date.now();
    state.verifyFailCount = (state.verifyFailCount || 0) + 1;

    if (state.verifyFailCount >= MAX_VERIFY_FAILS) {
      state.verifyLockUntil = now + VERIFY_LOCKOUT_SECONDS * 1000;
      saveRateGuardState(state);
      return {
        locked: true,
        remainingAttempts: 0,
        lockSeconds: VERIFY_LOCKOUT_SECONDS,
      };
    }

    saveRateGuardState(state);
    return {
      locked: false,
      remainingAttempts: Math.max(0, MAX_VERIFY_FAILS - state.verifyFailCount),
      lockSeconds: 0,
    };
  },

  resetVerifyFailures(): void {
    const state = loadRateGuardState();
    state.verifyFailCount = 0;
    state.verifyLockUntil = 0;
    saveRateGuardState(state);
  },
};

export function maskPhone(phone?: string): string {
  return maskPhoneDisplay(phone);
}

export function checkPhoneSendAllowed(e164Phone: string): {
  allowed: boolean;
  waitSeconds: number;
  cooldownSeconds: number;
  reason?: string;
} {
  const res = smsRateLimiter.canSendSms(e164Phone);
  return {
    ...res,
    cooldownSeconds: res.waitSeconds,
  };
}

export function recordPhoneSmsSent(e164Phone: string): { cooldownSeconds: number } {
  const sec = smsRateLimiter.recordSmsSent(e164Phone);
  return { cooldownSeconds: sec };
}

export function formatFirebasePhoneAuthError(err: any, currentHost?: string): string {
  const code = err?.code || '';
  const msg = String(err?.message || err || '');

  if (code === 'auth/invalid-phone-number' || msg.includes('auth/invalid-phone-number')) {
    return '手机号码格式无效，请确认已选择正确的国家/地区区号（如中国大陆 +86）并输入完整手机号。';
  }
  if (code === 'auth/missing-phone-number' || msg.includes('auth/missing-phone-number')) {
    return '请输入手机号码后再获取短信验证码。';
  }
  if (code === 'auth/invalid-verification-code' || msg.includes('auth/invalid-verification-code')) {
    const failStatus = smsRateLimiter.recordVerifyFailure();
    if (failStatus.locked) {
      return `短信验证码错误次数过多，已触发安全锁定（请等待 ${failStatus.lockSeconds} 秒或重新发送验证码）。`;
    }
    return `短信验证码不正确，请核对手机收到的 6 位数字验证码（剩余尝试次数：${failStatus.remainingAttempts} 次）。`;
  }
  if (code === 'auth/code-expired' || msg.includes('auth/code-expired')) {
    return '短信验证码已过期，请点击“重新获取验证码”发送新的短信。';
  }
  if (code === 'auth/missing-verification-code' || msg.includes('auth/missing-verification-code')) {
    return '请输入 6 位数字短信验证码。';
  }
  if (code === 'auth/too-many-requests' || msg.includes('auth/too-many-requests')) {
    return '当前手机号或设备的短信验证码请求过于频繁，已被 Firebase 安全网关临时限流，请稍后再试。';
  }
  if (code === 'auth/quota-exceeded' || msg.includes('auth/quota-exceeded')) {
    return '今日 Firebase 短信发送配额已达上限，请联系系统管理员在 Firebase Console 检查短信配额或升级 Blaze 计费计划。';
  }
  if (code === 'auth/captcha-check-failed' || msg.includes('auth/captcha-check-failed')) {
    return '人机安全验证（reCAPTCHA）未通过或已失效，请刷新验证码挑战后重试。';
  }
  if (code === 'auth/network-request-failed' || msg.includes('auth/network-request-failed')) {
    return '网络连接异常，无法连接至 Firebase 认证服务器，请检查您的网络或代理设置后重试。';
  }
  if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
    return 'Firebase 控制台尚未启用“手机号码 (Phone)”登录提供方，请参照下方配置指南在 Firebase Console -> Authentication -> Sign-in method 中开启 Phone 登录。';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    return `当前访问域名 (${window.location.hostname}) 尚未加入 Firebase 授权域名白名单，请管理员在 Firebase Console -> Authentication -> Settings -> Authorized domains 中添加该域名。`;
  }
  if (code === 'auth/invalid-app-credential' || msg.includes('auth/invalid-app-credential')) {
    return '应用安全凭证或 reCAPTCHA 校验无效，请确认当前域名已加入 Firebase 授权域名且已启用 Phone 登录方式。';
  }
  if (code === 'auth/user-disabled' || msg.includes('auth/user-disabled')) {
    return '该认证账号已被管理员在 Firebase Authentication 中禁用。';
  }

  return msg || '短信验证服务暂时不可用，请稍后重试。';
}

