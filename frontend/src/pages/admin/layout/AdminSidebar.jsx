import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  Activity,
  Building2,
  Users,
  Layers,
  CreditCard,
  Megaphone,
  ShieldCheck,
  Settings,
  Palette,
  ShieldAlert,
  Server,
  Zap,
  LogOut,
  Radio,
  CheckCircle2
} from 'lucide-react';

const NAV_GROUPS = [
  {
    groupTitle: 'Core Platform',
    items: [
      {
        name: 'Overview & Analytics',
        path: '/admin/dashboard',
        altPaths: ['/admin'],
        icon: Activity,
        badge: 'Live'
      },
      {
        name: 'Registered Businesses',
        path: '/admin/businesses',
        icon: Building2
      },
      {
        name: 'Platform Users',
        path: '/admin/users',
        icon: Users
      },
      {
        name: 'Business Verticals',
        path: '/admin/categories',
        icon: Layers,
        badge: '6 Engines'
      }
    ]
  },
  {
    groupTitle: 'SaaS Operations',
    items: [
      {
        name: 'Subscriptions & Billing',
        path: '/admin/subscriptions',
        icon: CreditCard
      },
      {
        name: 'Broadcast Announcements',
        path: '/admin/announcements',
        icon: Megaphone
      },
      {
        name: 'Security Audit Trail',
        path: '/admin/audit-logs',
        icon: ShieldAlert
      },
      {
        name: 'Appearance & Themes',
        path: '/admin/appearance',
        altPaths: ['/admin/appearance'],
        icon: Palette,
        badge: '29 Themes'
      },
      {
        name: 'Platform Settings',
        path: '/admin/settings',
        icon: Settings
      }
    ]
  }
];

export const AdminSidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isItemActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.altPaths && item.altPaths.includes(location.pathname)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/90 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Company Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950">
          <NavLink to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/50">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">
                  LAX<span className="text-indigo-400">360</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  HQ
                </span>
              </div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Company Admin Console
              </span>
            </div>
          </NavLink>
        </div>

        {/* Company Private Notice */}
        <div className="mx-3 my-2.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Private Control Plane</p>
            <p className="text-[11px] text-slate-400 truncate">LAX360 Cloud Platform Owner</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.groupTitle}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    style={active ? { backgroundColor: 'var(--theme-primary)' } : {}}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'text-white shadow-md font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System Health Card */}
        <div className="p-3 mx-3 mb-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cloud Engine</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Healthy
            </span>
          </div>
          <div className="space-y-1 text-[10px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>API Gateway</span>
              <span className="text-slate-200 font-mono">v2.5.0-REST</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Data Isolation</span>
              <span className="text-emerald-300 font-mono">Multi-Tenant</span>
            </div>
          </div>
        </div>

        {/* SuperAdmin Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-black text-xs">
                SA
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.full_name || 'Super Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'admin@lax360.com'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
