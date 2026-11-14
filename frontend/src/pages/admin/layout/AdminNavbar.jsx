import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  Menu,
  ShieldCheck,
  Search,
  Plus,
  Megaphone,
  Building2,
  LogOut,
  ChevronDown,
  User,
  Radio,
  ExternalLink,
  Layers
} from 'lucide-react';

const PATH_TITLES = {
  '/admin': 'Executive Dashboard & Overview',
  '/admin/dashboard': 'Executive Dashboard & Overview',
  '/admin/businesses': 'Registered Businesses & Tenants',
  '/admin/users': 'Global Platform Users',
  '/admin/categories': 'Business Vertical Engines',
  '/admin/subscriptions': 'Subscriptions & Financial Ledger',
  '/admin/announcements': 'System Broadcasts & Announcements',
  '/admin/audit-logs': 'Security & Compliance Audit Trail',
  '/admin/appearance': 'Application Appearance & Global Themes',
  '/admin/settings': 'Platform Settings & Governance'
};

export const AdminNavbar = ({ setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentTitle = PATH_TITLES[location.pathname] || 'Platform Administration';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Navigate to businesses tab with search query param
    navigate(`/admin/businesses?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="app-header h-16 backdrop-blur border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          aria-label="Open Admin Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span>LAX360 HQ</span>
            <span>/</span>
            <span className="text-indigo-400 font-bold">Admin Console</span>
          </div>
          <h2 className="text-sm font-extrabold text-white tracking-tight">
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Center: Global Admin Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search businesses, owners, emails..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition"
          />
        </div>
      </form>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Status Indicator */}
        <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cloud Active</span>
        </div>

        {/* Quick Action: Onboard Business */}
        <button
          type="button"
          onClick={() => navigate('/admin/businesses?action=create_tenant')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-950 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Onboard Business</span>
        </button>

        {/* Quick Action: Broadcast */}
        <button
          type="button"
          onClick={() => navigate('/admin/announcements?action=create_announcement')}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
        >
          <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Broadcast</span>
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-black text-xs">
              SA
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white leading-tight">Super Admin</p>
              <p className="text-[10px] text-indigo-300 font-semibold">LAX360 HQ</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl py-2 z-50 text-xs"
              onClick={() => setUserMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="font-bold text-white">{user?.full_name || 'Super Administrator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@lax360.com'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Role: SaaS Super Admin
                </span>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => navigate('/admin/settings')}
                  className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Platform Governance</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/audit-logs')}
                  className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Audit Logs</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of HQ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
