import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isImpersonating, exitImpersonation, tenant } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text-primary)'
      }}
    >
      {/* Impersonation Banner if superadmin is testing a tenant store */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs font-medium px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md sticky top-0 z-50 border-b border-orange-500">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="bg-amber-900/60 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded font-extrabold text-amber-200">
              Impersonation Mode
            </span>
            <span>
              Browsing as <strong>{tenant?.name || 'Business Tenant'}</strong>. Actions affect this store.
            </span>
          </div>
          <button
            type="button"
            onClick={exitImpersonation}
            className="inline-flex items-center gap-1.5 bg-white text-orange-800 hover:bg-orange-50 px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <span>Return to SaaS Control Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notice if SuperAdmin is inspecting tenant portal without impersonation */}
      {!isImpersonating && user?.role === 'saas_super_admin' && (
        <div className="bg-slate-900 text-white text-xs font-medium px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md sticky top-0 z-50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded font-extrabold text-white">
              Superadmin Mode
            </span>
            <span className="text-slate-300">
              You are currently viewing the tenant business environment.
            </span>
          </div>
          <a
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <span>Return to LAX360 Admin Panel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Dynamic Sidebar */}
        <Sidebar isMobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Main Content Area */}
        <div
          className="flex-1 flex flex-col lg:pl-64 min-w-0"
          style={{ backgroundColor: 'var(--theme-bg)' }}
        >
          <Navbar setMobileOpen={setMobileOpen} />
          <main
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto"
            style={{ backgroundColor: 'var(--theme-bg)' }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
