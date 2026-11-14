import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, Phone, User, Building2, AlertCircle } from 'lucide-react';

export const UserCreateModal = ({ tenants, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'business_owner',
    tenant_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Name, email, and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate({
        ...formData,
        tenant_id: formData.tenant_id ? formData.tenant_id : null
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-extrabold text-white">Add Platform / Business User</h2>
              <p className="text-xs text-slate-300">Create staff, manager, or company superadmin account</p>
            </div>
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
              placeholder="e.g. Alok Verma"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="alok@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Temporary Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min 6 chars"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Assigned Role *</label>
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
              <label className="block font-bold text-slate-800 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9812345678"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Associate with Business (Tenant)
            </label>
            <select
              name="tenant_id"
              value={formData.tenant_id}
              onChange={handleChange}
              disabled={formData.role === 'saas_super_admin'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-50"
            >
              <option value="">None (Platform Company Level)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.business_category} - {t.city || 'India'})
                </option>
              ))}
            </select>
            {formData.role === 'saas_super_admin' && (
              <p className="text-[10px] text-purple-600 mt-1 font-semibold">
                SuperAdmins possess global access across all tenants.
              </p>
            )}
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
              {loading ? 'Creating…' : 'Create User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreateModal;
