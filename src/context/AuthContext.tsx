import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { StaffUser } from '../types';

interface AuthContextType {
  currentUser: StaffUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsStaff: (role: 'admin' | 'staff', name: string) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const DEFAULT_STAFF: StaffUser = {
  uid: 'staff-01',
  email: 'master@qicaibuyi.com',
  displayName: '刘振海 (主理人/总裁缝师)',
  role: 'admin',
  status: 'active',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('qicai_tailor_user');
    return saved ? JSON.parse(saved) : DEFAULT_STAFF;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        const staff: StaffUser = {
          uid: user.uid,
          email: user.email || 'staff@qicaibuyi.com',
          displayName: user.displayName || user.email?.split('@')[0] || '工坊店员',
          role: user.email?.includes('admin') || user.email === 'dingzhou02@gmail.com' ? 'admin' : 'staff',
          status: 'active',
        };
        setCurrentUser(staff);
        localStorage.setItem('qicai_tailor_user', JSON.stringify(staff));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInAsStaff = (role: 'admin' | 'staff', name: string) => {
    const staff: StaffUser = {
      uid: role === 'admin' ? 'staff-01' : 'staff-02',
      email: role === 'admin' ? 'master@qicaibuyi.com' : 'tailor@qicaibuyi.com',
      displayName: name,
      role,
      status: 'active',
    };
    setCurrentUser(staff);
    localStorage.setItem('qicai_tailor_user', JSON.stringify(staff));
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem('qicai_tailor_user');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        signInWithGoogle,
        signInAsStaff,
        signOut,
        isAuthenticated: !!currentUser,
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
