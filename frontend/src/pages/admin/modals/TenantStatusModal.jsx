import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export const TenantStatusModal = ({ tenant, onClose, onUpdateStatus }) => {
  const [status, setStatus] = useState(tenant?.status || 'active');
  const [reason, setReason] = useState(tenant?.status_reason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!tenant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onUpdateStatus(tenant.id, { status, reason });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update business status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-white">Business Account Status</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <p className="text-sm font-extrabold text-slate-900 mb-0.5">{tenant.name}</p>
            <p className="text-xs text-slate-400">{tenant.email}</p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block font-bold text-slate-800">Select Operating State *</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  status === 'active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={(e) => setStatus(e.target.value)}
                  className="sr-only"
                />
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Active (Normal)</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  status === 'suspended'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="suspended"
                  checked={status === 'suspended'}
                  onChange={(e) => setStatus(e.target.value)}
                  className="sr-only"
                />
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Suspended</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Reason / Administrative Notes
            </label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Pending GST verification, billing renewal issue, or compliance review..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {status === 'suspended' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <strong>Notice:</strong> Suspending this business will temporarily block associated staff accounts from creating new invoices until reactivated.
            </div>
          )}

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
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer ${
                status === 'suspended'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {loading ? 'Applying…' : 'Apply Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantStatusModal;
