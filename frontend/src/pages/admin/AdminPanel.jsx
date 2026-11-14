import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Tabs
import OverviewTab from './tabs/OverviewTab';
import BusinessesTab from './tabs/BusinessesTab';
import UsersTab from './tabs/UsersTab';
import CategoriesTab from './tabs/CategoriesTab';
import SubscriptionsTab from './tabs/SubscriptionsTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import AuditLogsTab from './tabs/AuditLogsTab';
import SettingsTab from './tabs/SettingsTab';
import AppearanceTab from './tabs/AppearanceTab';

// Modals
import TenantDossierModal from './modals/TenantDossierModal';
import TenantCreateModal from './modals/TenantCreateModal';
import TenantEditModal from './modals/TenantEditModal';
import TenantStatusModal from './modals/TenantStatusModal';
import SubscriptionOverrideModal from './modals/SubscriptionOverrideModal';
import UserCreateModal from './modals/UserCreateModal';
import UserEditModal from './modals/UserEditModal';
import PasswordResetModal from './modals/PasswordResetModal';
import CategoryConfigModal from './modals/CategoryConfigModal';
import AnnouncementCreateModal from './modals/AnnouncementCreateModal';

import {
  ShieldCheck,
  Building2,
  Users,
  Layers,
  CreditCard,
  Megaphone,
  Activity,
  Settings,
  Palette,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview & Analytics', icon: Activity },
  { id: 'tenants', label: 'Businesses', icon: Building2 },
  { id: 'users', label: 'Platform Users', icon: Users },
  { id: 'categories', label: 'Business Verticals', icon: Layers },
  { id: 'subscriptions', label: 'Subscriptions & Billing', icon: CreditCard },
  { id: 'announcements', label: 'Broadcasts', icon: Megaphone },
  { id: 'audit-logs', label: 'Audit Trail', icon: ShieldCheck },
  { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
  { id: 'settings', label: 'Platform Settings', icon: Settings },
];

export const AdminPanel = () => {
  const { user, impersonateTenant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from URL path
  const getTabFromPath = (path) => {
    if (path.includes('/businesses') || path.includes('/tenants')) return 'tenants';
    if (path.includes('/users')) return 'users';
    if (path.includes('/categories')) return 'categories';
    if (path.includes('/subscriptions')) return 'subscriptions';
    if (path.includes('/announcements')) return 'announcements';
    if (path.includes('/audit-logs')) return 'audit-logs';
    if (path.includes('/appearance')) return 'appearance';
    if (path.includes('/settings')) return 'settings';
    return 'overview';
  };

  const activeTab = getTabFromPath(location.pathname);

  const handleSelectTab = (tabId) => {
    const tabRoutes = {
      overview: '/admin/dashboard',
      tenants: '/admin/businesses',
      users: '/admin/users',
      categories: '/admin/categories',
      subscriptions: '/admin/subscriptions',
      announcements: '/admin/announcements',
      'audit-logs': '/admin/audit-logs',
      appearance: '/admin/appearance',
      settings: '/admin/settings',
    };
    navigate(tabRoutes[tabId] || '/admin/dashboard');
  };

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Data Stores
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [platformSettings, setPlatformSettings] = useState(null);

  // Modals Visibility
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isTenantCreateOpen, setIsTenantCreateOpen] = useState(false);
  const [isTenantEditOpen, setIsTenantEditOpen] = useState(false);
  const [isTenantStatusOpen, setIsTenantStatusOpen] = useState(false);
  const [isSubOverrideOpen, setIsSubOverrideOpen] = useState(false);
  const [isUserCreateOpen, setIsUserCreateOpen] = useState(false);
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isCategoryConfigOpen, setIsCategoryConfigOpen] = useState(false);
  const [isAnnouncementCreateOpen, setIsAnnouncementCreateOpen] = useState(false);

  // Active items for modals
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch all administrative datasets
  const fetchAllAdminData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const [
        overviewRes,
        tenantsRes,
        usersRes,
        catsRes,
        plansRes,
        txnsRes,
        annRes,
        logsRes,
        settingsRes
      ] = await Promise.allSettled([
        api.get('/admin/overview'),
        api.get('/admin/tenants'),
        api.get('/admin/users'),
        api.get('/admin/categories'),
        api.get('/admin/subscriptions/plans'),
        api.get('/admin/subscriptions/transactions'),
        api.get('/admin/announcements'),
        api.get('/admin/audit-logs?limit=50'),
        api.get('/admin/settings'),
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
      if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data);
      if (txnsRes.status === 'fulfilled') setTransactions(txnsRes.value.data);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.data);
      if (settingsRes.status === 'fulfilled') setPlatformSettings(settingsRes.value.data);
    } catch (err) {
      console.error('Failed to load admin datasets:', err);
      setFeedback({ type: 'error', message: 'Could not refresh some platform datasets.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAdminData();
  }, [fetchAllAdminData]);

  // Toast feedback auto-dismiss
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Handle action triggers from Navbar/URL query parameters
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create_tenant') {
      setIsTenantCreateOpen(true);
      setSearchParams({}, { replace: true });
    } else if (action === 'create_user') {
      setIsUserCreateOpen(true);
      setSearchParams({}, { replace: true });
    } else if (action === 'create_announcement') {
      setIsAnnouncementCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ----------------- BUSINESS (TENANT) ACTIONS -----------------
  const handleCreateTenant = async (payload) => {
    const res = await api.post('/admin/tenants', payload);
    setFeedback({ type: 'success', message: res.data.message || 'Business successfully onboarded.' });
    fetchAllAdminData(true);
  };

  const handleUpdateTenant = async (tenantId, payload) => {
    const res = await api.put(`/admin/tenants/${tenantId}`, payload);
    setFeedback({ type: 'success', message: res.data.message || 'Business updated.' });
    fetchAllAdminData(true);
  };

  const handleUpdateTenantStatus = async (tenantId, payload) => {
    const res = await api.put(`/admin/tenants/${tenantId}/status`, payload);
    setFeedback({ type: 'success', message: res.data.message || 'Status updated.' });
    fetchAllAdminData(true);
  };

  const handleOverrideSubscription = async (tenantId, payload) => {
    const res = await api.put(`/admin/tenants/${tenantId}/subscription`, payload);
    setFeedback({ type: 'success', message: res.data.message || 'Subscription overridden.' });
    fetchAllAdminData(true);
  };

  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete '${tenant.name}' and all its invoices and accounts?`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/tenants/${tenant.id}`);
      setFeedback({ type: 'success', message: res.data.message || 'Business deleted.' });
      fetchAllAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to delete business.' });
    }
  };

  const handleImpersonate = async (tenant) => {
    try {
      await impersonateTenant(tenant.id);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Impersonation failed.' });
    }
  };

  // ----------------- USER ACTIONS -----------------
  const handleCreateUser = async (payload) => {
    const res = await api.post('/admin/users', payload);
    setFeedback({ type: 'success', message: res.data.message || 'User account created.' });
    fetchAllAdminData(true);
  };

  const handleUpdateUser = async (userId, payload) => {
    const res = await api.put(`/admin/users/${userId}`, payload);
    setFeedback({ type: 'success', message: res.data.message || 'User details updated.' });
    fetchAllAdminData(true);
  };

  const handleToggleUserStatus = async (userObj) => {
    try {
      const res = await api.put(`/admin/users/${userObj.id}/status`, {
        is_active: !userObj.is_active
      });
      setFeedback({ type: 'success', message: res.data.message || 'User status updated.' });
      fetchAllAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Action rejected.' });
    }
  };

  const handleResetPassword = async (userId, newPassword) => {
    const res = await api.put(`/admin/users/${userId}/password`, { new_password: newPassword });
    setFeedback({ type: 'success', message: res.data.message || 'Password successfully reset.' });
    fetchAllAdminData(true);
  };

  const handleDeleteUser = async (userObj) => {
    if (!window.confirm(`Permanently delete account for ${userObj.email}?`)) return;
    try {
      const res = await api.delete(`/admin/users/${userObj.id}`);
      setFeedback({ type: 'success', message: res.data.message || 'User deleted.' });
      fetchAllAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Cannot delete user.' });
    }
  };

  // ----------------- CATEGORY ACTIONS -----------------
  const handleToggleCategoryStatus = async (catId, isEnabled) => {
    try {
      const res = await api.put(`/admin/categories/${catId}/status`, { is_enabled: isEnabled });
      setFeedback({ type: 'success', message: res.data.message });
      fetchAllAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to update category status.' });
    }
  };

  const handleSaveCategoryConfig = async (catId, payload) => {
    const res = await api.put(`/admin/categories/${catId}/config`, payload);
    setFeedback({ type: 'success', message: res.data.message });
    fetchAllAdminData(true);
  };

  // ----------------- ANNOUNCEMENT ACTIONS -----------------
  const handleCreateAnnouncement = async (payload) => {
    const res = await api.post('/admin/announcements', payload);
    setFeedback({ type: 'success', message: res.data.message || 'Announcement published.' });
    fetchAllAdminData(true);
  };

  const handleDeleteAnnouncement = async (annId) => {
    try {
      await api.delete(`/admin/announcements/${annId}`);
      setFeedback({ type: 'success', message: 'Announcement deleted.' });
      fetchAllAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete announcement.' });
    }
  };

  // ----------------- SETTINGS ACTIONS -----------------
  const handleSaveSettings = async (payload) => {
    const res = await api.put('/admin/settings', payload);
    setPlatformSettings(res.data.settings);
    setFeedback({ type: 'success', message: res.data.message || 'Settings saved.' });
  };

  return (
    <main className="min-h-full space-y-6 pb-12">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top duration-300 max-w-md ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span className="text-xs font-bold flex-1">{feedback.message}</span>
        </div>
      )}

      {/* Control Center Master Header */}
      <header className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                LAX360 SaaS Platform Owner Console
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Cloud Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Universal Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Complete command and management suite for all registered businesses, users, subscriptions, business category verticals, and platform operations.
            </p>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsTenantCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Business</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUserCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAnnouncementCreateOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-indigo-600" />
              <span>Broadcast</span>
            </button>

            <button
              type="button"
              onClick={() => fetchAllAdminData(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Refresh All Datasets"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto">
        <nav className="flex items-center gap-1.5 min-w-max" aria-label="Admin Navigation Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'tenants' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? 'bg-slate-800 text-indigo-200' : 'bg-slate-100 text-slate-600'}`}>
                    {tenants.length}
                  </span>
                )}
                {tab.id === 'users' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? 'bg-slate-800 text-indigo-200' : 'bg-slate-100 text-slate-600'}`}>
                    {users.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content Area */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading platform management data…</p>
          <p className="text-xs text-slate-400 mt-1">Connecting to multi-tenant SaaS cloud core</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              overview={overview}
              tenants={tenants}
              onInspectTenant={(t) => {
                setSelectedTenant(t);
                setIsDossierOpen(true);
              }}
              onSelectTab={(tabId) => handleSelectTab(tabId)}
            />
          )}

          {activeTab === 'tenants' && (
            <BusinessesTab
              tenants={tenants}
              loading={loading}
              onOpenCreateModal={() => setIsTenantCreateOpen(true)}
              onInspectTenant={(t) => {
                setSelectedTenant(t);
                setIsDossierOpen(true);
              }}
              onEditTenant={(t) => {
                setSelectedTenant(t);
                setIsTenantEditOpen(true);
              }}
              onChangeStatus={(t) => {
                setSelectedTenant(t);
                setIsTenantStatusOpen(true);
              }}
              onOverrideSubscription={(t) => {
                setSelectedTenant(t);
                setIsSubOverrideOpen(true);
              }}
              onImpersonate={handleImpersonate}
              onDeleteTenant={handleDeleteTenant}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              tenants={tenants}
              currentUserId={user?.id}
              onOpenCreateModal={() => setIsUserCreateOpen(true)}
              onEditUser={(u) => {
                setSelectedUser(u);
                setIsUserEditOpen(true);
              }}
              onResetPassword={(u) => {
                setSelectedUser(u);
                setIsPasswordResetOpen(true);
              }}
              onToggleStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab
              categories={categories}
              onToggleStatus={handleToggleCategoryStatus}
              onConfigureCategory={(c) => {
                setSelectedCategory(c);
                setIsCategoryConfigOpen(true);
              }}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsTab
              plans={plans}
              transactions={transactions}
              tenants={tenants}
              onGrantCustomSubscription={() => {
                if (tenants.length > 0) {
                  setSelectedTenant(tenants[0]);
                  setIsSubOverrideOpen(true);
                } else {
                  setFeedback({ type: 'error', message: 'No businesses registered to grant a subscription.' });
                }
              }}
            />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementsTab
              announcements={announcements}
              onOpenCreateModal={() => setIsAnnouncementCreateOpen(true)}
              onDeleteAnnouncement={handleDeleteAnnouncement}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsTab
              logs={auditLogs}
              onRefresh={() => fetchAllAdminData(true)}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceTab
              initialSettings={platformSettings}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              initialSettings={platformSettings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </>
      )}

      {/* ----------------- MODALS ----------------- */}
      {isDossierOpen && selectedTenant && (
        <TenantDossierModal
          tenant={selectedTenant}
          onClose={() => {
            setIsDossierOpen(false);
            setSelectedTenant(null);
          }}
          onImpersonate={handleImpersonate}
        />
      )}

      {isTenantCreateOpen && (
        <TenantCreateModal
          onClose={() => setIsTenantCreateOpen(false)}
          onCreate={handleCreateTenant}
        />
      )}

      {isTenantEditOpen && selectedTenant && (
        <TenantEditModal
          tenant={selectedTenant}
          onClose={() => {
            setIsTenantEditOpen(false);
            setSelectedTenant(null);
          }}
          onUpdate={handleUpdateTenant}
        />
      )}

      {isTenantStatusOpen && selectedTenant && (
        <TenantStatusModal
          tenant={selectedTenant}
          onClose={() => {
            setIsTenantStatusOpen(false);
            setSelectedTenant(null);
          }}
          onUpdateStatus={handleUpdateTenantStatus}
        />
      )}

      {isSubOverrideOpen && selectedTenant && (
        <SubscriptionOverrideModal
          tenant={selectedTenant}
          onClose={() => {
            setIsSubOverrideOpen(false);
            setSelectedTenant(null);
          }}
          onOverride={handleOverrideSubscription}
        />
      )}

      {isUserCreateOpen && (
        <UserCreateModal
          tenants={tenants}
          onClose={() => setIsUserCreateOpen(false)}
          onCreate={handleCreateUser}
        />
      )}

      {isUserEditOpen && selectedUser && (
        <UserEditModal
          user={selectedUser}
          tenants={tenants}
          onClose={() => {
            setIsUserEditOpen(false);
            setSelectedUser(null);
          }}
          onUpdate={handleUpdateUser}
        />
      )}

      {isPasswordResetOpen && selectedUser && (
        <PasswordResetModal
          user={selectedUser}
          onClose={() => {
            setIsPasswordResetOpen(false);
            setSelectedUser(null);
          }}
          onResetPassword={handleResetPassword}
        />
      )}

      {isCategoryConfigOpen && selectedCategory && (
        <CategoryConfigModal
          category={selectedCategory}
          onClose={() => {
            setIsCategoryConfigOpen(false);
            setSelectedCategory(null);
          }}
          onSaveConfig={handleSaveCategoryConfig}
        />
      )}

      {isAnnouncementCreateOpen && (
        <AnnouncementCreateModal
          onClose={() => setIsAnnouncementCreateOpen(false)}
          onCreate={handleCreateAnnouncement}
        />
      )}
    </main>
  );
};

export default AdminPanel;
