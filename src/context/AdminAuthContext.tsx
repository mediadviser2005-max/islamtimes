import React, { createContext, useContext, useState } from 'react';

interface AdminAuthContextValue {
  isAdmin: boolean;
  adminToken: string | null;
  loginError: string | null;
  adminLogin: (user: string, pass: string) => Promise<boolean>;
  adminLogout: () => void;
  getAdminToken: () => string | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem('islam_admin_token')
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(
    Boolean(localStorage.getItem('islam_admin_token'))
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  const adminLogin = async (user: string, pass: string): Promise<boolean> => {
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'نام کاربری یا رمز عبور اشتباه است.');
      }
      setAdminToken(data.token);
      setIsAdmin(true);
      localStorage.setItem('islam_admin_token', data.token);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ورود به پنل مدیریت';
      setLoginError(msg);
      return false;
    }
  };

  const adminLogout = () => {
    setAdminToken(null);
    setIsAdmin(false);
    localStorage.removeItem('islam_admin_token');
  };

  const getAdminToken = () => {
    return adminToken || localStorage.getItem('islam_admin_token');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdmin,
        adminToken,
        loginError,
        adminLogin,
        adminLogout,
        getAdminToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
