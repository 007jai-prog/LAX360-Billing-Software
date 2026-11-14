import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';

export const UserEditModal = ({ user, tenants, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    tenant_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'employee',
        tenant_id: user.tenant_id || ''
      });
    }
  }, [user]);

  if (!user) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onUpdate(user.id, {
        ...formData,
        tenant_id: formData.tenant_id ? formData.tenant_id : null
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user.');
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
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-extrabold text-white">Edit User Profile</h2>
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="business_owner">Business Owner</option>
              <option value="business_admin">Business Administrator</option>
              <option value="cashier">Cashier / POS Billing Operator</option>
              <option value="inventory_manager">Inventory Manager</option>
              <option value="employee">Staff Member</option>
              <option value="saas_super_admin">Platform Super Administrator</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Assigned Business</label>
            <select
              name="tenant_id"
              value={formData.tenant_id}
              onChange={handleChange}
              disabled={formData.role === 'saas_super_admin'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-50"
            >
              <option value="">None (Platform Level)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.business_category})
                </option>
              ))}
            </select>
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              {loading ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
