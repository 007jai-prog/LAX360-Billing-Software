import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import { useAuth } from '../../context/AuthContext';
import DynamicIcon from '../common/DynamicIcon';
import { Zap, AlertTriangle, Sparkles, Crown, ChevronRight } from 'lucide-react';

export const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { sidebarNavigation, currentCategory, config } = useBusinessConfig();
  const { user, tenant } = useAuth();
  const location = useLocation();

  // Compute trial status
  const sub = tenant?.subscription;
  const plan = sub?.plan || 'free_trial';
  const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isTrialing = plan === 'free_trial' && daysLeft !== null && daysLeft > 0;
  const isExpired = plan === 'free_trial' && (daysLeft === null || daysLeft <= 0);
  const isPaid = ['starter', 'professional', 'enterprise'].includes(plan);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 app-sidebar flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--theme-sidebar-bg)',
          borderColor: 'var(--theme-sidebar-border)',
          borderRightWidth: '1px'
        }}
      >
        {/* Brand Header - Height 16 matching top Navbar */}
        <div
          className="h-16 flex items-center justify-between px-6 border-b transition-colors"
          style={{
            backgroundColor: 'var(--theme-sidebar-bg)',
            borderColor: 'var(--theme-sidebar-border)'
          }}
        >
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span
                className="font-extrabold text-lg tracking-tight"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                LAX<span style={{ color: 'var(--theme-primary)' }}>360</span>
              </span>
              <span
                className="block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                Universal Billing
              </span>
            </div>
          </NavLink>
        </div>

        {/* Business Category Pill */}
        <div
          className="px-4 py-3 mx-3 my-2.5 rounded-xl border flex items-center justify-between transition-colors shadow-2xs"
          style={{
            backgroundColor: 'var(--theme-accent-light)',
            borderColor: 'var(--theme-border)'
          }}
        >
          <div className="truncate">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--theme-accent-text)' }}
            >
              Active Vertical
            </p>
            <p
              className="text-xs font-bold truncate"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              {config?.category_name || tenant?.name || 'Retail Business'}
            </p>
          </div>
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase shadow-xs shrink-0"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            {currentCategory}
          </span>
        </div>

        {/* Navigation Items (Resolved dynamically based on category) */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {sidebarNavigation.map((item) => {
            const searchParams = new URLSearchParams(location.search);
            const currentView = searchParams.get('view') || location.state?.view;
            const itemView = item.state?.view || (item.search && new URLSearchParams(item.search).get('view'));

            const isActive =
              location.pathname === item.path &&
              (!itemView || currentView === itemView || (!currentView && itemView === 'active'));

            const target = item.search
              ? { pathname: item.path, search: item.search }
              : item.path;

            return (
              <NavLink
                key={item.key || `${item.path}-${item.name}`}
                to={target}
                state={item.state}
                onClick={() => setMobileOpen(false)}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--theme-nav-active-bg)',
                        color: 'var(--theme-nav-active-text)'
                      }
                    : {
                        color: 'var(--theme-nav-text)'
                      }
                }
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'shadow-xs font-semibold'
                    : 'hover:bg-[var(--theme-nav-hover-bg)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DynamicIcon
                    name={item.icon}
                    className="w-4 h-4 shrink-0 transition-colors"
                    style={{
                      color: isActive ? 'var(--theme-nav-active-text)' : 'var(--theme-nav-icon)'
                    }}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase transition-colors"
                    style={
                      isActive
                        ? {
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            color: '#ffffff'
                          }
                        : {
                            backgroundColor: 'var(--theme-accent-light)',
                            color: 'var(--theme-accent-text)'
                          }
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ─── Subscription / Trial Status Widget ─── */}
        {(isTrialing || isExpired || isPaid) && (
          <div className="mx-3 mb-2">
            {isPaid && (
              <div
                className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <Crown className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </p>
                  <p className="text-[10px] text-emerald-600">Subscription Active</p>
                </div>
              </div>
            )}

            {isTrialing && (() => {
              const pct = Math.round(((15 - daysLeft) / 15) * 100);
              const isUrgent = daysLeft <= 5;
              return (
                <NavLink
                  to="/settings"
                  className="block rounded-xl px-3 py-2.5 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: isUrgent ? 'rgba(245,158,11,0.1)' : 'var(--theme-accent-light)',
                    border: `1px solid ${isUrgent ? 'rgba(245,158,11,0.3)' : 'var(--theme-border)'}`
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {isUrgent
                        ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        : <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                      }
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: isUrgent ? '#d97706' : 'var(--theme-accent-text)' }}
                      >
                        Free Trial
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: isUrgent ? '#f59e0b' : 'var(--theme-primary)' }}
                    >
                      {daysLeft}d
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1 mb-1.5">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isUrgent ? '#f59e0b' : 'var(--theme-primary)'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                      {15 - daysLeft}/15 days used
                    </p>
                    <div className="flex items-center gap-0.5" style={{ color: 'var(--theme-primary)' }}>
                      <span className="text-[10px] font-semibold">Upgrade</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </NavLink>
              );
            })()}

            {isExpired && (
              <NavLink
                to="/settings"
                className="block rounded-xl px-3 py-2.5 transition-all hover:opacity-90"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] font-bold text-rose-600">Trial Expired</span>
                </div>
                <p className="text-[10px] text-rose-500 mb-1.5">Upgrade to continue using all features.</p>
                <div
                  className="w-full text-center py-1.5 rounded-lg text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  Upgrade Now →
                </div>
              </NavLink>
            )}
          </div>
        )}

        {/* Connected Sidebar Footer */}
        <div
          className="p-4 border-t transition-colors"
          style={{
            backgroundColor: 'var(--theme-sidebar-bg)',
            borderColor: 'var(--theme-sidebar-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white shadow-xs shrink-0"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-semibold truncate"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {user?.full_name}
              </p>
              <p
                className="text-[11px] capitalize truncate"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

