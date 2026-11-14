import React from 'react';
import {
  Building2,
  Users,
  Activity,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

const formatCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatNumber = (val) =>
  Number(val || 0).toLocaleString('en-IN');

const CATEGORY_COLORS = {
  grocery: '#10B981',
  restaurant: '#F59E0B',
  pharmacy: '#3B82F6',
  textile: '#EC4899',
  wholesale: '#6366F1',
  electronics: '#8B5CF6'
};

export const OverviewTab = ({
  overview,
  tenants,
  onInspectTenant,
  onSelectTab
}) => {
  const catDist = overview?.category_distribution || {};
  const catGmv = overview?.category_gmv || {};
  const subDist = overview?.subscription_distribution || {};

  const categoryChartData = Object.keys(catDist).map((catKey) => ({
    name: catKey.charAt(0).toUpperCase() + catKey.slice(1),
    categoryKey: catKey,
    tenants: catDist[catKey] || 0,
    gmv: catGmv[catKey] || 0
  }));

  const recentTenants = overview?.recent_tenants || tenants.slice(0, 5);
  const recentActivities = overview?.recent_activities || [];
  const systemHealth = overview?.system_health || {};

  return (
    <div className="space-y-6">
      {/* Platform KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Businesses
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {formatNumber(overview?.total_tenants)}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {overview?.active_tenants || 0} active
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Suspended: {overview?.suspended_tenants || 0}</span>
            <button
              onClick={() => onSelectTab('tenants')}
              className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Platform End-Users
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {formatNumber(overview?.total_users)}
            </span>
            <span className="text-xs font-medium text-slate-500">across tenants</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Staff, Owners & Admins</span>
            <button
              onClick={() => onSelectTab('users')}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              Directory <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Platform GMV
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {formatCurrency(overview?.total_platform_gmv)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{formatNumber(overview?.total_invoices_generated)} Invoices generated</span>
            <span className="text-emerald-600 font-semibold">100% Tax Compliant</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              SaaS Recurring Revenue
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-900">
              {formatCurrency(overview?.mrr_estimate)}
            </span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              MRR
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>ARR: {formatCurrency(overview?.arr_estimate)}</span>
            <button
              onClick={() => onSelectTab('subscriptions')}
              className="text-purple-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              Plans <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Charts & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category distribution bar chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Active Businesses by Category
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of enrolled retail and service verticals on LAX360
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              6 Master Verticals
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val, name) => [
                    name === 'tenants' ? `${val} Businesses` : formatCurrency(val),
                    name === 'tenants' ? 'Active Stores' : 'Category Volume'
                  ]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="tenants" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.categoryKey] || '#6366F1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-4 border-t border-slate-100 mt-2">
            {categoryChartData.map((cat) => (
              <div key={cat.name} className="text-center p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                <div
                  className="w-2.5 h-2.5 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.categoryKey] || '#6366F1' }}
                />
                <p className="text-[11px] font-bold text-slate-800 truncate">{cat.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{cat.tenants} tenants</p>
              </div>
            ))}
          </div>
        </div>

        {/* System & Architecture Health Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                Cloud Infrastructure
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Healthy
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Core Platform Version</span>
                <span className="font-bold text-slate-800">{systemHealth.version || 'v2.4 Core'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Database Layer</span>
                <span className="font-bold text-indigo-700">
                  {systemHealth.is_mock ? 'In-Memory Mock' : 'MongoDB Atlas Cluster'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Platform Uptime</span>
                <span className="font-bold text-emerald-600">{systemHealth.uptime || '99.98%'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Deployment Target</span>
                <span className="font-bold text-slate-800">FastAPI Cloud + Vite SPA</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-tr from-indigo-900 to-purple-900 text-white">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-300" />
              Multi-Tenant Data Isolation
            </div>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              Every query is cryptographically scoped to validated user session claims. Zero cross-tenant data leakage.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Registrations & Live Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Businesses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Registrations</h3>
              <p className="text-xs text-slate-500">Newly onboarded businesses on LAX360</p>
            </div>
            <button
              onClick={() => onSelectTab('tenants')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTenants.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No tenants registered yet.</p>
            ) : (
              recentTenants.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                      {t.name?.charAt(0) || 'B'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {t.owner_name} &bull; <span className="capitalize">{t.business_category}</span> &bull; {t.city || 'India'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        t.status === 'suspended'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {t.status || 'Active'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspectTenant(t)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="Inspect Business"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live System Activity Log Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Platform Security &amp; Activity Log</h3>
              <p className="text-xs text-slate-500">Administrative and system events in real-time</p>
            </div>
            <button
              onClick={() => onSelectTab('audit-logs')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Full log
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {recentActivities.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No recent activity recorded.</p>
            ) : (
              recentActivities.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition">
                  <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {log.action?.replaceAll('_', ' ')}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      By <span className="font-semibold text-slate-700">{log.actor_name || log.actor_email || 'SuperAdmin'}</span> &bull; Target: {log.target_type || 'System'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
