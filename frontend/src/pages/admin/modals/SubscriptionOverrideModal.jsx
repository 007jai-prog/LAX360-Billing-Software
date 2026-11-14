import React, { useState } from 'react';
import { X, CreditCard, Sparkles, Check, AlertCircle } from 'lucide-react';

export const SubscriptionOverrideModal = ({ tenant, onClose, onOverride }) => {
  const [plan, setPlan] = useState(tenant?.subscription?.plan || 'professional');
  const [billingCycle, setBillingCycle] = useState(tenant?.subscription?.billing_cycle || 'monthly');
  const [extensionDays, setExtensionDays] = useState(30);
  const [notes, setNotes] = useState('Manual SaaS plan grant by Platform Administrator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!tenant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onOverride(tenant.id, {
        plan,
        billing_cycle: billingCycle,
        status: 'ACTIVE',
        extension_days: Number(extensionDays),
        notes
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-purple-300" />
            <div>
              <h2 className="text-base font-extrabold text-white">Override Subscription Plan</h2>
              <p className="text-xs text-purple-200">Manage plan tier and validity for {tenant.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">Target Subscription Tier *</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold capitalize text-slate-900"
            >
              <option value="starter">Starter Plan (₹499/mo) - Single branch, 300 invoices</option>
              <option value="basic">Basic Plan (₹999/mo) - 2 branches, 1,000 invoices</option>
              <option value="professional">Professional Plan (₹1,999/mo) - 5 branches, 5,000 invoices</option>
              <option value="business">Business Plan (₹3,499/mo) - 15 branches, 20,000 invoices</option>
              <option value="enterprise">Enterprise Plan (₹6,999/mo) - Unlimited branches &amp; custom SLA</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="monthly">Monthly Cycle</option>
                <option value="yearly">Annual / Yearly Cycle</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Validity Extension</label>
              <select
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="30">+30 Days (1 Month)</option>
                <option value="90">+90 Days (Quarterly)</option>
                <option value="180">+180 Days (Half Year)</option>
                <option value="365">+365 Days (1 Full Year)</option>
                <option value="730">+730 Days (2 Years)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Grant Reason / Invoice Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP Partner Complementary Upgrade, Offline Bank Transfer Ref #9921..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-purple-900 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              This operation automatically updates tenant subscription capabilities, registers an audit transaction, and reflects immediately in the store dashboard.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-purple-200 transition cursor-pointer"
            >
              {loading ? 'Granting…' : 'Apply Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionOverrideModal;
