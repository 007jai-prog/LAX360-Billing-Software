import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import api from '../api/client';

const STORAGE_KEYS = {
  accessToken: 'lax360_access_token',
  refreshToken: 'lax360_refresh_token',
  user: 'lax360_user',
  tenant: 'lax360_tenant',
  adminBackup: 'lax360_admin_backup'
};

const readStorageJSON = (key, fallback = null) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`Failed to parse localStorage key: ${key}`, error);
    return fallback;
  }
};

const writeStorageJSON = (key, value) => {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStorageJSON(STORAGE_KEYS.user));
  const [tenant, setTenant] = useState(() => readStorageJSON(STORAGE_KEYS.tenant));
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((sessionData = {}) => {
    const {
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    } = sessionData;

    if (access_token) {
      localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
    }

    if (refresh_token) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
    }

    setUser(userData ?? null);
    setTenant(tenantData ?? null);

    writeStorageJSON(STORAGE_KEYS.user, userData ?? null);
    writeStorageJSON(STORAGE_KEYS.tenant, tenantData ?? null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.tenant);
    localStorage.removeItem(STORAGE_KEYS.adminBackup);

    setUser(null);
    setTenant(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const nextUser = res.data?.user ?? null;
      const nextTenant = res.data?.tenant ?? null;

      setUser(nextUser);
      setTenant(nextTenant);

      writeStorageJSON(STORAGE_KEYS.user, nextUser);
      writeStorageJSON(STORAGE_KEYS.tenant, nextTenant);
    } catch (err) {
      console.error('Failed to restore session:', err);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });

    const {
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    } = res.data;

    setSession({
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    });

    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);

    const {
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    } = res.data;

    setSession({
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    });

    return res.data;
  };

  const logout = () => {
    clearSession();
    window.location.href = '/login';
  };

  const impersonateTenant = async (tenantId) => {
    const res = await api.post(`/admin/tenants/${tenantId}/impersonate`);

    const backup = {
      access_token: localStorage.getItem(STORAGE_KEYS.accessToken),
      refresh_token: localStorage.getItem(STORAGE_KEYS.refreshToken),
      user: localStorage.getItem(STORAGE_KEYS.user),
      tenant: localStorage.getItem(STORAGE_KEYS.tenant)
    };

    localStorage.setItem(STORAGE_KEYS.adminBackup, JSON.stringify(backup));

    const {
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    } = res.data;

    setSession({
      access_token,
      refresh_token,
      user: userData,
      tenant: tenantData
    });

    window.location.href = '/dashboard';
    return res.data;
  };

  const exitImpersonation = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.adminBackup);

    if (!saved) {
      logout();
      return;
    }

    try {
      const backup = JSON.parse(saved);

      if (backup.access_token) {
        localStorage.setItem(STORAGE_KEYS.accessToken, backup.access_token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
      }

      if (backup.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, backup.refresh_token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
      }

      if (backup.user) {
        localStorage.setItem(STORAGE_KEYS.user, backup.user);
        setUser(JSON.parse(backup.user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.user);
        setUser(null);
      }

      if (backup.tenant) {
        localStorage.setItem(STORAGE_KEYS.tenant, backup.tenant);
        setTenant(JSON.parse(backup.tenant));
      } else {
        localStorage.removeItem(STORAGE_KEYS.tenant);
        setTenant(null);
      }

      localStorage.removeItem(STORAGE_KEYS.adminBackup);

      window.location.href = '/admin';
    } catch (error) {
      console.error('Failed to restore admin backup:', error);
      logout();
    }
  };

  const updateTenant = (updatedTenant) => {
    setTenant(updatedTenant);
    writeStorageJSON(STORAGE_KEYS.tenant, updatedTenant);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    writeStorageJSON(STORAGE_KEYS.user, updatedUser);
  };

  const isImpersonating = !!localStorage.getItem(STORAGE_KEYS.adminBackup);

  const value = useMemo(
    () => ({
      user,
      tenant,
      loading,
      isAuthenticated: !!user,
      isSetupCompleted: tenant?.is_setup_completed ?? false,
      isSuperAdmin:
        user?.role === 'saas_super_admin' ||
        user?.role === 'super_admin' ||
        user?.role === 'platform_admin',
      isTenantAdmin:
        user?.role === 'tenant_admin' ||
        user?.role === 'admin' ||
        user?.role === 'manager',
      isImpersonating,
      login,
      register,
      logout,
      impersonateTenant,
      exitImpersonation,
      updateTenant,
      updateUser,
      refreshProfile: fetchProfile
    }),
    [user, tenant, loading, isImpersonating, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};