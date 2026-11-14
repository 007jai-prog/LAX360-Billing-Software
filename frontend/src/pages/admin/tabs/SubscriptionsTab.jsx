import React, { useState } from 'react';
import {
  CreditCard,
  TrendingUp,
  Check,
  Plus,
  ShieldCheck,
  Zap,
  Clock,
  ArrowUpRight,
  Receipt,
  Search,
  Sparkles
} from 'lucide-react';

const formatCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatNumber = (val) =>
  Number(val || 0).toLocaleString('en-IN');

export const SubscriptionsTab = ({
  plans,
  transactions,
  tenants,
  onGrantCustomSubscription
}) => {
  const [activeSubTab, setActiveSubTab] = useState('plans'); // 'plans' or 'ledger'
  const [txnSearch, setTxnSearch] = useState('');

  const totalMonthlyMRR = plans.reduce((acc, p) => acc + (p.monthly_revenue || 0), 0);
  const totalSubscribers = plans.reduce((acc, p) => acc + (p.active_subscribers || 0), 0);

  const filteredTransactions = transactions.filter((tx) => {
    if (!txnSearch.trim()) return true;
    const q = txnSearch.toLowerCase().trim();
    const tName = (tx.tenant_name || '').toLowerCase();
    const ref = (tx.transaction_ref || '').toLowerCase();
    const plan = (tx.plan || '').toLowerCase();
    return tName.includes(q) || ref.includes(q) || plan.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Revenue & Subscription KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>SaaS Monthly MRR</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalMonthlyMRR)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Projected ARR: <strong className="text-purple-700">{formatCurrency(totalMonthlyMRR * 12)}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Paid Subscribers</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatNumber(totalSubscribers)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Active paying business accounts
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Subscription Tiers</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {plans.length} Tiers
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Starter to Custom Enterprise
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Manual Grants</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <button
            type="button"
            onClick={onGrantCustomSubscription}
            className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Grant Subscription</span>
          </button>
        </div>
      </div>

      {/* Switcher Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'plans'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          SaaS Plans Catalog ({plans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Platform Billing Ledger ({transactions.length})
        </button>
      </div>

      {/* Tab View 1: Plans Catalog */}
      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {plans.map((plan) => {
            const isRec = plan.recommended;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xs transition ${
                  isRec ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'
                }`}
              >
                {/* Plan Header */}
                <div className="p-5">
                  {isRec && (
                    <span className="mb-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-600 text-white shadow-xs">
                      Popular Choice
                    </span>
                  )}
                  <h3 className="text-base font-extrabold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      ₹{plan.monthly_price}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">/ month</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    or ₹{plan.yearly_price} / year (save 2 months)
                  </p>

                  {/* Plan Metrics */}
                  <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subscribers:</span>
                      <strong className="text-slate-900">{plan.active_subscribers || 0}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Monthly Gen:</span>
                      <strong className="text-purple-700">{formatCurrency(plan.monthly_revenue)}</strong>
                    </div>
                  </div>

                  {/* Limits summary */}
                  <div className="space-y-1 text-xs text-slate-600 mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Up to {formatNumber(plan.max_invoices_per_month)} invoices/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{plan.max_users} Staff Accounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{plan.max_branches} Physical Branch(es)</span>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Modules:
                    </p>
                    {plan.features?.map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-tight">
                        <Check className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Plan Code: <code className="font-mono text-slate-700">{plan.id}</code>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab View 2: Platform Billing Ledger */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                placeholder="Search transactions by tenant, reference, plan..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <span className="text-xs text-slate-500">
              Showing {filteredTransactions.length} of {transactions.length} recorded payments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Reference ID</th>
                  <th className="px-5 py-3.5">Business Tenant</th>
                  <th className="px-5 py-3.5">Plan Tier</th>
                  <th className="px-5 py-3.5">Amount Paid</th>
                  <th className="px-5 py-3.5">Payment Method</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No billing transactions match your search.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {tx.transaction_ref || tx.id?.slice(0, 8)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {tx.tenant_name || 'Business Tenant'}
                      </td>
                      <td className="px-5 py-4 capitalize font-semibold text-purple-700">
                        {tx.plan} Plan
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-600">
                        {tx.payment_method?.replaceAll('_', ' ') || 'Online Payment'}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsTab;
