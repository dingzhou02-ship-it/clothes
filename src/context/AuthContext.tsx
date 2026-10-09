import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  StaffUser,
  RoleDefinition,
  RolePermissions,
  AuthorizedPhone,
  DEFAULT_STORE_ID,
  DataAccessScope,
} from '../types';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  SEED_ROLES,
} from '../services/seedData';
import { storeService } from '../services/storeService';
import {
  validatePhoneNumber,
  checkPhoneSendAllowed,
  recordPhoneSmsSent,
  formatFirebasePhoneAuthError,
  maskPhone,
  normalizePhoneToE164,
} from '../utils/phoneUtils';

// Initial bootstrap owner email (verified by Firebase Auth token & Firestore rules)
const BOOTSTRAP_OWNER_EMAIL = 'dingzhou02@gmail.com';

interface AuthContextType {
  currentUser: StaffUser | null;
  firebaseUser: FirebaseUser | null;
  currentRole: RoleDefinition | null;
  permissions: RolePermissions;
  hasPermission: (key: keyof RolePermissions) => boolean;
  loading: boolean;
  authError: string;
  unauthorizedDomain: string;
  clearAuthError: () => void;
  sendPhoneVerificationCode: (
    rawPhone: string,
    countryCode: string,
    recaptchaContainerId: string
  ) => Promise<{ e164Phone: string; cooldownSeconds: number }>;
  verifyPhoneCode: (code: string) => Promise<void>;
  resetPhoneAuthFlow: () => void;
  phoneConfirmationPending: boolean;
  pendingPhoneE164: string;
  signInWithGoogle: (useRedirect?: boolean) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  updateMyProfile: (updates: {
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
    position?: string;
  }) => Promise<void>;
  refreshOperatorProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentRole, setCurrentRole] = useState<RoleDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState('');

  // Phone Auth states
  const [phoneConfirmationPending, setPhoneConfirmationPending] = useState(false);
  const [pendingPhoneE164, setPendingPhoneE164] = useState('');
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    auth.languageCode = 'zh-CN';
  }, []);

  const cleanupRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore cleanup error
      }
      recaptchaVerifierRef.current = null;
    }
  };

  const resetPhoneAuthFlow = () => {
    confirmationResultRef.current = null;
    setPhoneConfirmationPending(false);
    setPendingPhoneE164('');
    cleanupRecaptcha();
  };

  /**
   * 核心权限校验与 UID 绑定逻辑：
   * 1. 验证用户是否具有真实的 Firebase Auth UID。
   * 2. 手机号登录用户：必须存在于 /authorizedPhones/{e164Phone} 且 status === 'active'，或者已绑定在 /users/{uid} 且 status === 'active'。
   * 3. 陌生手机号即使完成短信验证，也绝不会自动获得访问权限，立即阻断并强制登出。
   * 4. 首次登录时将真实的 user.uid 写入 /users/{user.uid} 与 /authorizedPhones/{e164Phone}.boundUid，实现不可篡改的 UID 级强绑定。
   */
  const verifyAndLoadOperator = async (user: FirebaseUser): Promise<StaffUser | null> => {
    const email = (user.email || '').trim().toLowerCase();
    const rawPhone = (user.phoneNumber || '').trim();
    const e164Phone = rawPhone ? normalizePhoneToE164(rawPhone) : '';
    const now = new Date().toISOString();

    // 1. Check if this UID is already an active admin or bootstrap owner
    if (email && email === BOOTSTRAP_OWNER_EMAIL) {
      let existingProfile: Partial<StaffUser> = {};
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          existingProfile = userSnap.data() as StaffUser;
          if (existingProfile.status && existingProfile.status !== 'active') {
            throw new Error('该管理员账号已被停用，无法访问业务系统。');
          }
        } else {
          const legacySnap = await getDoc(doc(db, 'users', 'staff-01'));
          if (legacySnap.exists()) {
            existingProfile = legacySnap.data() as StaffUser;
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('停用')) throw err;
      }

      const normalizedOwnerPhone = existingProfile.phone
        ? normalizePhoneToE164(existingProfile.phone)
        : e164Phone || '';

      const ownerStaff: StaffUser = {
        uid: user.uid,
        boundUid: user.uid,
        email: BOOTSTRAP_OWNER_EMAIL,
        displayName: existingProfile.displayName || user.displayName || '刘振海 (主理人/总裁缝师)',
        phone: normalizedOwnerPhone,
        avatarUrl: existingProfile.avatarUrl || user.photoURL || '',
        position: existingProfile.position || '工坊主理人 / 首席主裁',
        role: 'admin',
        roleId: existingProfile.roleId || 'role-admin',
        roleName: existingProfile.roleName || '系统管理员 / 工坊主理人',
        storeId: existingProfile.storeId || DEFAULT_STORE_ID,
        accessScope: existingProfile.accessScope || 'store',
        status: 'active',
        createdAt: existingProfile.createdAt || '2024-01-01T08:00:00Z',
        lastLoginAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'users', user.uid), ownerStaff, { merge: true });
        await setDoc(doc(db, 'admins', user.uid), ownerStaff, { merge: true });
        await setDoc(
          doc(db, 'allowedEmails', BOOTSTRAP_OWNER_EMAIL),
          {
            email: BOOTSTRAP_OWNER_EMAIL,
            role: 'admin',
            storeId: ownerStaff.storeId,
            accessScope: ownerStaff.accessScope,
            status: 'active',
            operatorId: user.uid,
            updatedAt: now,
          },
          { merge: true }
        );
        if (normalizedOwnerPhone && normalizedOwnerPhone.startsWith('+')) {
          await setDoc(
            doc(db, 'authorizedPhones', normalizedOwnerPhone),
            {
              phone: normalizedOwnerPhone,
              displayName: ownerStaff.displayName,
              position: ownerStaff.position,
              role: 'admin',
              roleId: ownerStaff.roleId,
              roleName: ownerStaff.roleName,
              storeId: ownerStaff.storeId,
              accessScope: ownerStaff.accessScope,
              status: 'active',
              boundUid: user.uid,
              operatorId: user.uid,
              updatedAt: now,
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('Owner profile sync notice:', e);
      }

      return ownerStaff;
    }

    // 2. Check phone authorization & UID binding first if user authenticated via Phone SMS
    if (e164Phone) {
      const phoneAuthSnap = await getDoc(doc(db, 'authorizedPhones', e164Phone));
      const uidSnap = await getDoc(doc(db, 'users', user.uid));

      // Check if phone whitelist record exists
      if (phoneAuthSnap.exists()) {
        const allowPhone = phoneAuthSnap.data() as AuthorizedPhone;
        if (allowPhone.status !== 'active') {
          throw new Error(
            `访问被拒绝：手机号 ${maskPhone(e164Phone)} 已被管理员${
              allowPhone.status === 'revoked' ? '撤销授权' : '停用'
            }，禁止访问客户资料与业务数据。`
          );
        }

        // Prevent UID spoofing if already bound to a different UID
        if (allowPhone.boundUid && allowPhone.boundUid !== user.uid) {
          throw new Error(
            `安全拦截：手机号 ${maskPhone(e164Phone)} 已绑定其他认证 UID，禁止跨账号混用。如需更换绑定请联系系统管理员。`
          );
        }

        // Look up pre-created operator profile if operatorId was generated before first login
        let preCreated: Partial<StaffUser> = {};
        if (uidSnap.exists()) {
          preCreated = uidSnap.data() as StaffUser;
          if (preCreated.status && preCreated.status !== 'active') {
            throw new Error(`您的账号 (${maskPhone(e164Phone)}) 已被停用，请联系管理员。`);
          }
        } else if (allowPhone.operatorId && allowPhone.operatorId !== user.uid) {
          try {
            const preSnap = await getDoc(doc(db, 'users', allowPhone.operatorId));
            if (preSnap.exists()) {
              preCreated = preSnap.data() as StaffUser;
            }
          } catch {
            // ignore
          }
        }

        const effectiveRole = allowPhone.role || preCreated.role || 'staff';
        const effectiveStoreId = allowPhone.storeId || preCreated.storeId || DEFAULT_STORE_ID;
        const effectiveScope: DataAccessScope =
          allowPhone.accessScope || preCreated.accessScope || (effectiveRole === 'admin' ? 'store' : 'store');

        const boundStaff: StaffUser = {
          uid: user.uid,
          boundUid: user.uid,
          email: preCreated.email || user.email || '',
          displayName:
            allowPhone.displayName ||
            preCreated.displayName ||
            user.displayName ||
            `操作员 (${maskPhone(e164Phone)})`,
          phone: e164Phone,
          avatarUrl: preCreated.avatarUrl || user.photoURL || '',
          position:
            allowPhone.position ||
            preCreated.position ||
            (effectiveRole === 'admin' ? '工坊主理人 / 系统管理员' : '定制工坊操作员'),
          role: effectiveRole,
          roleId:
            allowPhone.roleId ||
            preCreated.roleId ||
            (effectiveRole === 'admin' ? 'role-admin' : 'role-staff'),
          roleName:
            allowPhone.roleName ||
            preCreated.roleName ||
            (effectiveRole === 'admin' ? '系统管理员 / 工坊主理人' : '普通操作员 / 量体师'),
          storeId: effectiveStoreId,
          accessScope: effectiveScope,
          status: 'active',
          createdAt: preCreated.createdAt || allowPhone.createdAt || now,
          lastLoginAt: now,
          updatedAt: now,
        };

        // Persist UID-bound user record & update boundUid in authorizedPhones
        await setDoc(doc(db, 'users', user.uid), boundStaff, { merge: true });
        await setDoc(
          doc(db, 'authorizedPhones', e164Phone),
          {
            boundUid: user.uid,
            operatorId: user.uid,
            lastLoginAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        if (effectiveRole === 'admin') {
          await setDoc(doc(db, 'admins', user.uid), boundStaff, { merge: true });
        }

        return boundStaff;
      }

      // If not in authorizedPhones, check if UID already exists in /users/{user.uid}
      if (uidSnap.exists()) {
        const existingUser = uidSnap.data() as StaffUser;
        if (existingUser.status !== 'active') {
          throw new Error(`您的账号 (${maskPhone(e164Phone)}) 已被管理员停用，禁止访问系统。`);
        }
        const updatedStaff: StaffUser = {
          ...existingUser,
          uid: user.uid,
          boundUid: user.uid,
          phone: e164Phone,
          storeId: existingUser.storeId || DEFAULT_STORE_ID,
          accessScope: existingUser.accessScope || 'store',
          lastLoginAt: now,
          updatedAt: now,
        };
        await setDoc(
          doc(db, 'users', user.uid),
          { boundUid: user.uid, phone: e164Phone, lastLoginAt: now, updatedAt: now },
          { merge: true }
        );
        return updatedStaff;
      }

      // Stranger phone number verified via SMS -> MUST REJECT immediately!
      throw new Error(
        `访问受限：手机号 ${maskPhone(
          e164Phone
        )} 未经系统管理员授权。陌生手机号完成短信验证后不会自动获得访问权限，请先由管理员在「系统设置 -> 手机号授权与账号管理」中添加该号码。`
      );
    }

    // 3. Non-owner Email / Google account: must be explicitly whitelisted in /users/{uid} or /allowedEmails/{email}
    try {
      const uidSnap = await getDoc(doc(db, 'users', user.uid));
      if (uidSnap.exists()) {
        const data = uidSnap.data() as StaffUser;
        if (data.status !== 'active') {
          throw new Error(`您的操作员账号 (${email || user.uid}) 已被停用，请联系系统管理员。`);
        }
        const updatedStaff: StaffUser = {
          ...data,
          uid: user.uid,
          boundUid: user.uid,
          storeId: data.storeId || DEFAULT_STORE_ID,
          accessScope: data.accessScope || 'store',
          lastLoginAt: now,
          updatedAt: now,
        };
        await setDoc(
          doc(db, 'users', user.uid),
          { boundUid: user.uid, lastLoginAt: now, updatedAt: now },
          { merge: true }
        );
        return updatedStaff;
      }

      const allowSnap = email ? await getDoc(doc(db, 'allowedEmails', email)) : null;
      if (allowSnap && allowSnap.exists()) {
        const allowData = allowSnap.data() as {
          email: string;
          role: 'admin' | 'staff';
          storeId?: string;
          accessScope?: DataAccessScope;
          status: 'active' | 'inactive';
          operatorId?: string;
        };
        if (allowData.status !== 'active') {
          throw new Error(`您的操作员账号 (${email}) 已被停用，请联系系统管理员。`);
        }

        let preCreated: Partial<StaffUser> = {};
        if (allowData.operatorId) {
          const preSnap = await getDoc(doc(db, 'users', allowData.operatorId));
          if (preSnap.exists()) {
            preCreated = preSnap.data() as StaffUser;
          }
        }

        const effectiveRole = allowData.role || preCreated.role || 'staff';
        const boundStaff: StaffUser = {
          uid: user.uid,
          boundUid: user.uid,
          email,
          displayName: preCreated.displayName || user.displayName || email.split('@')[0],
          phone: preCreated.phone || '',
          avatarUrl: preCreated.avatarUrl || user.photoURL || '',
          position:
            preCreated.position || (effectiveRole === 'admin' ? '工坊管理员' : '定制工坊操作员'),
          role: effectiveRole,
          roleId:
            preCreated.roleId || (effectiveRole === 'admin' ? 'role-admin' : 'role-staff'),
          roleName:
            preCreated.roleName || (effectiveRole === 'admin' ? '系统管理员' : '普通操作员'),
          storeId: allowData.storeId || preCreated.storeId || DEFAULT_STORE_ID,
          accessScope: allowData.accessScope || preCreated.accessScope || 'store',
          status: 'active',
          createdAt: preCreated.createdAt || now,
          lastLoginAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, 'users', user.uid), boundStaff, { merge: true });
        if (effectiveRole === 'admin') {
          await setDoc(doc(db, 'admins', user.uid), boundStaff, { merge: true });
        }
        return boundStaff;
      }
    } catch (err: any) {
      if (err?.message?.includes('停用') || err?.message?.includes('拒绝') || err?.message?.includes('受限')) {
        throw err;
      }
    }

    throw new Error(
      `访问受限：账号 "${email || maskPhone(e164Phone) || user.uid}" 未经系统管理员授权，严禁访问客户档案与内部业务系统。`
    );
  };

  const loadRoleForUser = async (staff: StaffUser) => {
    try {
      const roleId = staff.roleId || (staff.role === 'admin' ? 'role-admin' : 'role-staff');
      const roleSnap = await getDoc(doc(db, 'roles', roleId));
      if (roleSnap.exists()) {
        setCurrentRole(roleSnap.data() as RoleDefinition);
        return;
      }
    } catch {
      // fallback to default seed role
    }
    const fallbackRole =
      SEED_ROLES.find(r => r.roleKey === staff.role) || SEED_ROLES[0];
    setCurrentRole(fallbackRole);
  };

  useEffect(() => {
    getRedirectResult(auth).catch(err => {
      if (err?.message) {
        setAuthError(formatFirebasePhoneAuthError(err));
      }
    });

    let userProfileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (userProfileUnsub) {
        userProfileUnsub();
        userProfileUnsub = null;
      }

      setLoading(true);
      if (user) {
        try {
          const verifiedStaff = await verifyAndLoadOperator(user);
          if (verifiedStaff) {
            setFirebaseUser(user);
            setCurrentUser(verifiedStaff);
            storeService.setCurrentOperator(
              verifiedStaff.uid,
              verifiedStaff.displayName,
              verifiedStaff.storeId || DEFAULT_STORE_ID,
              verifiedStaff.accessScope || 'store',
              verifiedStaff.role
            );
            await loadRoleForUser(verifiedStaff);
            setAuthError('');
            resetPhoneAuthFlow();

            // Real-time security enforcement: if admin deactivates or changes scope/role while user is online
            userProfileUnsub = onSnapshot(
              doc(db, 'users', user.uid),
              snap => {
                if (!snap.exists()) return;
                const latest = snap.data() as StaffUser;
                if (latest.status !== 'active') {
                  fbSignOut(auth).catch(() => {});
                  storeService.clearSensitiveMemory();
                  setFirebaseUser(null);
                  setCurrentUser(null);
                  setCurrentRole(null);
                  setAuthError('您的账号已被管理员停用或撤销授权，已自动断开安全会话。');
                  return;
                }
                setCurrentUser(prev => {
                  const merged: StaffUser = {
                    ...(prev || latest),
                    ...latest,
                    uid: user.uid,
                  };
                  storeService.setCurrentOperator(
                    merged.uid,
                    merged.displayName,
                    merged.storeId || DEFAULT_STORE_ID,
                    merged.accessScope || 'store',
                    merged.role
                  );
                  return merged;
                });
              },
              () => {
                // ignore listener error
              }
            );
          }
        } catch (err: any) {
          console.warn('Unauthorized login attempt blocked:', err);
          await fbSignOut(auth);
          storeService.clearSensitiveMemory();
          setFirebaseUser(null);
          setCurrentUser(null);
          setCurrentRole(null);
          setAuthError(
            err?.message || '该账号未获授权访问本系统，请使用已授权的手机号或管理员账号登录。'
          );
        }
      } else {
        storeService.clearSensitiveMemory();
        setFirebaseUser(null);
        setCurrentUser(null);
        setCurrentRole(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userProfileUnsub) userProfileUnsub();
      cleanupRecaptcha();
    };
  }, []);

  /**
   * 手机号验证码登录 Step 1: 校验格式、检查频控、完成 reCAPTCHA 人机验证并发送真实短信验证码
   */
  const sendPhoneVerificationCode = async (
    rawPhone: string,
    countryCode: string,
    recaptchaContainerId: string
  ): Promise<{ e164Phone: string; cooldownSeconds: number }> => {
    setAuthError('');
    setUnauthorizedDomain('');

    // 1. Validate phone format
    const validation = validatePhoneNumber(rawPhone, countryCode);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const { e164Phone } = validation;

    // 2. Check anti-abuse rate limit
    const rateCheck = checkPhoneSendAllowed(e164Phone);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.reason);
    }

    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    try {
      // 3. Initialize clean RecaptchaVerifier on dynamic child element to support Desktop/iPad/iPhone Safari
      cleanupRecaptcha();
      const parentEl = document.getElementById(recaptchaContainerId);
      if (!parentEl) {
        throw new Error('人机验证组件尚未就绪，请刷新页面后重试');
      }
      parentEl.innerHTML = '';
      const widgetEl = document.createElement('div');
      parentEl.appendChild(widgetEl);

      const verifier = new RecaptchaVerifier(auth, widgetEl, {
        size: 'normal',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setAuthError('人机验证已过期，请重新点击完成人机验证后再发送验证码');
        },
      });

      recaptchaVerifierRef.current = verifier;
      await verifier.render();

      // 4. Trigger real Firebase Phone Authentication SMS
      const confirmationResult = await signInWithPhoneNumber(auth, e164Phone, verifier);
      confirmationResultRef.current = confirmationResult;
      setPendingPhoneE164(e164Phone);
      setPhoneConfirmationPending(true);

      // 5. Record rate limit state
      const afterRate = recordPhoneSmsSent(e164Phone);
      return {
        e164Phone,
        cooldownSeconds: afterRate.cooldownSeconds || 60,
      };
    } catch (error: any) {
      cleanupRecaptcha();
      if (error?.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(currentHost);
      }
      const friendlyMsg = formatFirebasePhoneAuthError(error, currentHost);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  /**
   * 手机号验证码登录 Step 2: 校验用户输入的 6 位短信验证码，建立真实会话并校验账号级授权
   */
  const verifyPhoneCode = async (code: string): Promise<void> => {
    setAuthError('');
    const cleanCode = (code || '').replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      throw new Error('请输入收到的 6 位数字短信验证码');
    }
    if (!confirmationResultRef.current) {
      throw new Error('验证码会话已失效或尚未发送验证码，请重新点击「获取验证码」');
    }

    try {
      const credential = await confirmationResultRef.current.confirm(cleanCode);
      if (!credential.user) {
        throw new Error('验证未返回有效用户会话，请重试');
      }
      // Note: onAuthStateChanged will automatically trigger verifyAndLoadOperator(credential.user)
      // We also explicitly log the audit event once verified
      await storeService.addAuditLog(
        '手机号短信验证码登录',
        'users',
        credential.user.uid,
        `手机号 ${maskPhone(credential.user.phoneNumber || pendingPhoneE164)} 完成短信验证码核验并请求进入系统`
      );
    } catch (error: any) {
      const friendlyMsg = formatFirebasePhoneAuthError(error);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signInWithGoogle = async (useRedirect = false) => {
    setAuthError('');
    setUnauthorizedDomain('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (useRedirect) {
      try {
        await signInWithRedirect(auth, provider);
      } catch (error: any) {
        if (error?.code === 'auth/unauthorized-domain') {
          setUnauthorizedDomain(currentHost);
        }
        throw new Error(formatFirebasePhoneAuthError(error, currentHost));
      }
      return;
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const code = error?.code || '';
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(currentHost);
      }
      throw new Error(formatFirebasePhoneAuthError(error, currentHost));
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('请输入登录账号（邮箱）和密码');
    }
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (error: any) {
      const code = error?.code || '';
      if (
        code === 'auth/user-not-found' &&
        cleanEmail === BOOTSTRAP_OWNER_EMAIL &&
        password.length >= 6
      ) {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, password);
          return;
        } catch {
          // fall through
        }
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error(
          '当前 Firebase 项目尚未启用「邮箱/密码」登录。请使用手机号验证码或 Google 官方认证登录。'
        );
      }
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        throw new Error('账号或密码不正确，请核对后重试');
      }
      throw new Error(formatFirebasePhoneAuthError(error));
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error('当前未登录或会话已过期，请重新登录后修改密码');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('新密码长度不能少于 6 位字符');
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      await storeService.addAuditLog(
        '修改登录密码',
        'users',
        auth.currentUser.uid,
        `操作者 ${currentUser?.displayName || auth.currentUser.uid} 更新了登录密码`
      );
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        throw new Error('为保障安全，修改密码前需要您先退出并重新登录一次以验证身份');
      }
      throw new Error(error?.message || '密码更新失败，请稍后重试');
    }
  };

  const sendResetEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('请输入需要重置密码的授权登录邮箱');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  /**
   * 仅允许修改安全的个人展示字段，严禁通过前端修改 role、roleId、status、storeId、accessScope 或 boundUid
   */
  const updateMyProfile = async (updates: {
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
    position?: string;
  }) => {
    if (!currentUser || !auth.currentUser) throw new Error('未登录');
    const now = new Date().toISOString();
    const safeDisplayName =
      updates.displayName !== undefined ? updates.displayName.trim() : currentUser.displayName;
    const safeAvatarUrl =
      updates.avatarUrl !== undefined ? updates.avatarUrl : currentUser.avatarUrl;
    const safePosition =
      updates.position !== undefined ? updates.position.trim() : currentUser.position;

    // Only write non-privilege fields so Firestore rules enforce zero privilege escalation
    await setDoc(
      doc(db, 'users', currentUser.uid),
      {
        displayName: safeDisplayName,
        avatarUrl: safeAvatarUrl,
        position: safePosition,
        updatedAt: now,
      },
      { merge: true }
    );

    const updatedUser: StaffUser = {
      ...currentUser,
      displayName: safeDisplayName,
      avatarUrl: safeAvatarUrl,
      position: safePosition,
      updatedAt: now,
    };

    setCurrentUser(updatedUser);
    storeService.setCurrentOperator(
      updatedUser.uid,
      updatedUser.displayName,
      updatedUser.storeId || DEFAULT_STORE_ID,
      updatedUser.accessScope || 'store',
      updatedUser.role
    );
    await storeService.addAuditLog(
      '修改个人资料',
      'users',
      currentUser.uid,
      `操作者 ${updatedUser.displayName} 更新了个人基础资料`
    );
  };

  const refreshOperatorProfile = async () => {
    if (!firebaseUser) return;
    const verified = await verifyAndLoadOperator(firebaseUser);
    if (verified) {
      setCurrentUser(verified);
      storeService.setCurrentOperator(
        verified.uid,
        verified.displayName,
        verified.storeId || DEFAULT_STORE_ID,
        verified.accessScope || 'store',
        verified.role
      );
      await loadRoleForUser(verified);
    }
  };

  const signOut = async () => {
    try {
      if (currentUser) {
        await storeService.addAuditLog(
          '安全退出登录',
          'users',
          currentUser.uid,
          `操作者 ${currentUser.displayName} (${
            currentUser.phone ? maskPhone(currentUser.phone) : currentUser.email
          }) 退出了系统`
        );
      }
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    resetPhoneAuthFlow();
    storeService.clearSensitiveMemory();
    localStorage.removeItem('qicai_tailor_user');
    localStorage.removeItem('qicai_tailor_state');
    setFirebaseUser(null);
    setCurrentUser(null);
    setCurrentRole(null);
  };

  const permissions: RolePermissions =
    currentRole?.permissions ||
    (currentUser?.role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);

  const hasPermission = (key: keyof RolePermissions): boolean => {
    if (!currentUser || currentUser.status !== 'active') return false;
    if (currentUser.role === 'admin') {
      return permissions[key] ?? true;
    }
    return !!permissions[key];
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        currentRole,
        permissions,
        hasPermission,
        loading,
        authError,
        unauthorizedDomain,
        clearAuthError: () => {
          setAuthError('');
          setUnauthorizedDomain('');
        },
        sendPhoneVerificationCode,
        verifyPhoneCode,
        resetPhoneAuthFlow,
        phoneConfirmationPending,
        pendingPhoneE164,
        signInWithGoogle,
        signInWithEmail,
        changePassword,
        sendResetEmail,
        updateMyProfile,
        refreshOperatorProfile,
        signOut,
        isAuthenticated: !!currentUser && !!firebaseUser && currentUser.status === 'active',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
