import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { StaffUser, RoleDefinition, RolePermissions } from '../types';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  SEED_ROLES,
} from '../services/seedData';
import { storeService } from '../services/storeService';

const OWNER_EMAIL = 'dingzhou02@gmail.com';

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

  const verifyAndLoadOperator = async (user: FirebaseUser): Promise<StaffUser | null> => {
    const email = (user.email || '').trim().toLowerCase();
    const now = new Date().toISOString();

    // 1. Owner account check
    if (email === OWNER_EMAIL) {
      let existingProfile: Partial<StaffUser> = {};
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          existingProfile = userSnap.data() as StaffUser;
        } else {
          const legacySnap = await getDoc(doc(db, 'users', 'staff-01'));
          if (legacySnap.exists()) {
            existingProfile = legacySnap.data() as StaffUser;
          }
        }
      } catch {
        // ignore
      }

      const ownerStaff: StaffUser = {
        uid: user.uid,
        email: OWNER_EMAIL,
        displayName: existingProfile.displayName || user.displayName || '刘振海 (主理人/总裁缝师)',
        phone: existingProfile.phone || '138-0010-8888',
        avatarUrl: existingProfile.avatarUrl || user.photoURL || '',
        position: existingProfile.position || '工坊主理人 / 首席主裁',
        role: 'admin',
        roleId: existingProfile.roleId || 'role-admin',
        roleName: existingProfile.roleName || '系统管理员 / 工坊主理人',
        status: 'active',
        createdAt: existingProfile.createdAt || '2024-01-01T08:00:00Z',
        lastLoginAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'users', user.uid), ownerStaff, { merge: true });
        await setDoc(doc(db, 'admins', user.uid), ownerStaff, { merge: true });
        await setDoc(doc(db, 'allowedEmails', OWNER_EMAIL), {
          email: OWNER_EMAIL,
          role: 'admin',
          status: 'active',
          operatorId: user.uid,
          updatedAt: now,
        });
      } catch (e) {
        console.warn('Owner profile sync notice:', e);
      }

      return ownerStaff;
    }

    // 2. Non-owner account: must be explicitly whitelisted in allowedEmails or users with status === 'active'
    try {
      const allowSnap = email ? await getDoc(doc(db, 'allowedEmails', email)) : null;
      const uidSnap = await getDoc(doc(db, 'users', user.uid));

      if (uidSnap.exists()) {
        const data = uidSnap.data() as StaffUser;
        if (data.status !== 'active') {
          throw new Error(`您的操作员账号 (${email}) 已被停用，请联系工坊主理人`);
        }
        const updatedStaff: StaffUser = {
          ...data,
          uid: user.uid,
          lastLoginAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'users', user.uid), { lastLoginAt: now, updatedAt: now }, { merge: true });
        return updatedStaff;
      }

      if (allowSnap && allowSnap.exists()) {
        const allowData = allowSnap.data() as {
          email: string;
          role: 'admin' | 'staff';
          status: 'active' | 'inactive';
          operatorId?: string;
        };
        if (allowData.status !== 'active') {
          throw new Error(`您的操作员账号 (${email}) 已被停用，请联系工坊主理人`);
        }

        // Look up pre-created operator record if operatorId exists
        let preCreated: Partial<StaffUser> = {};
        if (allowData.operatorId) {
          const preSnap = await getDoc(doc(db, 'users', allowData.operatorId));
          if (preSnap.exists()) {
            preCreated = preSnap.data() as StaffUser;
          }
        }

        const boundStaff: StaffUser = {
          uid: user.uid,
          email,
          displayName: preCreated.displayName || user.displayName || email.split('@')[0],
          phone: preCreated.phone || '',
          avatarUrl: preCreated.avatarUrl || user.photoURL || '',
          position: preCreated.position || (allowData.role === 'admin' ? '工坊管理员' : '定制工坊操作员'),
          role: allowData.role || 'staff',
          roleId: preCreated.roleId || (allowData.role === 'admin' ? 'role-admin' : 'role-staff'),
          roleName: preCreated.roleName || (allowData.role === 'admin' ? '系统管理员' : '普通操作员'),
          status: 'active',
          createdAt: preCreated.createdAt || now,
          lastLoginAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, 'users', user.uid), boundStaff, { merge: true });
        return boundStaff;
      }
    } catch (err: any) {
      if (err?.message?.includes('停用')) {
        throw err;
      }
    }

    throw new Error(
      `访问受限：账号 "${email || user.uid}" 未经工坊主理人授权，严禁访问客户档案与内部业务系统。`
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
    // Handle redirect result for iOS Safari / mobile browsers if used
    getRedirectResult(auth).catch(err => {
      if (err?.message) {
        setAuthError(err.message);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setLoading(true);
      if (user) {
        try {
          const verifiedStaff = await verifyAndLoadOperator(user);
          if (verifiedStaff) {
            setFirebaseUser(user);
            setCurrentUser(verifiedStaff);
            storeService.setCurrentOperator(verifiedStaff.uid, verifiedStaff.displayName);
            await loadRoleForUser(verifiedStaff);
            setAuthError('');
          }
        } catch (err: any) {
          console.warn('Unauthorized login attempt blocked:', err);
          await fbSignOut(auth);
          storeService.clearSensitiveMemory();
          setFirebaseUser(null);
          setCurrentUser(null);
          setCurrentRole(null);
          setAuthError(
            err?.message || '该账号未获授权访问本系统，请使用主理人或已授权的操作员账号登录。'
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

    return () => unsubscribe();
  }, []);

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
          throw new Error(
            `当前访问域名 (${currentHost}) 尚未加入 Firebase 授权域名列表。若您刚刚同步配置，请刷新页面后重试；若为 Netlify 自定义域名，请将其添加至 Firebase Authentication -> Settings -> Authorized domains。`
          );
        }
        throw new Error(error?.message || 'Google 跳转登录失败，请重试');
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
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('已取消 Google 登录授权窗口，请重新点击登录按钮完成验证');
      }
      if (code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(currentHost);
        throw new Error(
          `当前访问域名 (${currentHost}) 尚未在 Firebase Authentication 授权域名中生效。系统已自动为您同步当前环境域名，请刷新页面后再试；若在 Netlify 网址下遇到此提示，请将 ${currentHost} 添加至 Firebase 后台「Authorized domains」。`
        );
      }
      throw new Error(error?.message || 'Google 账号登录验证失败，请重试');
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
      // Allow initial password creation ONLY for the owner email if user record doesn't exist yet
      if (code === 'auth/user-not-found' && cleanEmail === OWNER_EMAIL && password.length >= 6) {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, password);
          return;
        } catch {
          // fall through to standard message
        }
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error(
          '当前 Firebase 项目尚未开启「邮箱/密码 (Email/Password)」登录方式。请使用「Google 官方安全认证」直接登录，或在 Firebase 控制台 Authentication -> Sign-in method 中启用电子邮件地址/密码。'
        );
      }
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        throw new Error('账号或密码不正确，或该账号尚未设置密码（建议使用 Google 官方安全认证，或点击「首次设置/重置密码」）');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('登录尝试次数过多，系统已触发安全锁定，请稍后再试');
      }
      throw new Error(error?.message || '邮箱密码登录失败，请检查账号信息');
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
        `操作者 ${currentUser?.displayName || auth.currentUser.email} 通过安全认证流程更新了登录密码`
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

  const updateMyProfile = async (updates: {
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
    position?: string;
  }) => {
    if (!currentUser) throw new Error('未登录');
    const now = new Date().toISOString();
    const updatedUser: StaffUser = {
      ...currentUser,
      displayName: updates.displayName !== undefined ? updates.displayName.trim() : currentUser.displayName,
      phone: updates.phone !== undefined ? updates.phone.trim() : currentUser.phone,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : currentUser.avatarUrl,
      position: updates.position !== undefined ? updates.position.trim() : currentUser.position,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', currentUser.uid), updatedUser, { merge: true });
    setCurrentUser(updatedUser);
    storeService.setCurrentOperator(updatedUser.uid, updatedUser.displayName);
    await storeService.addAuditLog(
      '修改个人资料',
      'users',
      currentUser.uid,
      `操作者 ${updatedUser.displayName} 修改了个人姓名/电话/岗位或头像信息`
    );
  };

  const refreshOperatorProfile = async () => {
    if (!firebaseUser) return;
    const verified = await verifyAndLoadOperator(firebaseUser);
    if (verified) {
      setCurrentUser(verified);
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
          `操作者 ${currentUser.displayName} (${currentUser.email}) 退出了系统`
        );
      }
      await fbSignOut(auth);
    } catch {
      // ignore
    }
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
    if (currentUser.email === OWNER_EMAIL || currentUser.role === 'admin') {
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

