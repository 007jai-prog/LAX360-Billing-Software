import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';

export const TenantEditModal = ({ tenant, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    business_category: 'grocery',
    owner_name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    invoice_prefix: 'INV',
    default_tax_rate: 18.0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        business_category: tenant.business_category || 'grocery',
        owner_name: tenant.owner_name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        gstin: tenant.gstin || '',
        address: tenant.address || '',
        city: tenant.city || '',
        state: tenant.state || '',
        pincode: tenant.pincode || '',
        invoice_prefix: tenant.invoice_prefix || 'INV',
        default_tax_rate: tenant.default_tax_rate ?? 18.0
      });
    }
  }, [tenant]);

  if (!tenant) return null;

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
      await onUpdate(tenant.id, formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update business profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Edit Business Details</h2>
              <p className="text-xs text-slate-300">Update metadata and tax properties for {tenant.name}</p>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Business Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Category Vertical *</label>
              <select
                name="business_category"
                value={formData.business_category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="grocery">Grocery &amp; Supermarket</option>
                <option value="restaurant">Restaurant &amp; Cafe</option>
                <option value="pharmacy">Pharmacy &amp; Medical Store</option>
                <option value="textile">Textile &amp; Garments</option>
                <option value="wholesale">Wholesale &amp; Distribution</option>
                <option value="electronics">Electronics &amp; Mobile Shop</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Owner Name *</label>
              <input
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Contact Email *</label>
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
              <label className="block font-bold text-slate-800 mb-1">GSTIN Number</label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Invoice Prefix</label>
              <input
                type="text"
                name="invoice_prefix"
                value={formData.invoice_prefix}
                onChange={handleChange}
                maxLength="6"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Default Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                name="default_tax_rate"
                value={formData.default_tax_rate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantEditModal;
