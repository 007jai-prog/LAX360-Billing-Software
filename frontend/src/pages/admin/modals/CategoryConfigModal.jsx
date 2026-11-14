import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle, AlertCircle, Save, Layers } from 'lucide-react';

const FEATURE_DEFINITIONS = [
  { key: 'barcode_scanning', label: 'Rapid Barcode Scanning & POS', desc: 'High-speed EAN/UPC barcode checkout engine' },
  { key: 'weight_measurement', label: 'Weight Scale Integration', desc: 'Kg, gm, and fractional quantity scale support' },
  { key: 'expiry_tracking', label: 'Expiry Date Tracking', desc: 'Pre-expiry warnings and batch shelf-life audit' },
  { key: 'batch_management', label: 'Batch / Lot Numbering', desc: 'Batch manufacturing code tracking per item' },
  { key: 'table_management', label: 'Dine-In Table Layout Grid', desc: 'Visual floor plan with table occupancy status' },
  { key: 'kot_system', label: 'Kitchen Order Tickets (KOT) & KDS', desc: 'Order ticket routing and kitchen display system' },
  { key: 'imei_tracking', label: 'Serial / IMEI Number Tracking', desc: 'Device warranty and serial number ledger' },
  { key: 'size_color_variants', label: 'Size & Color Variant Matrix', desc: 'SKU variant grids (S, M, L, XL, Red, Blue)' },
  { key: 'tiered_pricing', label: 'Wholesale Tiered Pricing', desc: 'Distributor, Dealer, and Retailer price rules' },
  { key: 'repair_services', label: 'Repair & Job Sheet Tickets', desc: 'Service tracking and device technician notes' }
];

export const CategoryConfigModal = ({ category, onClose, onSaveConfig }) => {
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setTagline(category.tagline || '');
      setDescription(category.description || '');
      setFeatures(category.features || {});
    }
  }, [category]);

  if (!category) return null;

  const handleToggleFeature = (key) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSaveConfig(category.id, {
        tagline,
        description,
        features
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save vertical configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-extrabold text-white">
                Configure {category.name}
              </h2>
              <p className="text-xs text-indigo-200">
                Manage dynamic vertical feature flags and business descriptions
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">Vertical Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Full Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Dynamic Category Modules &amp; Feature Flags
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURE_DEFINITIONS.map((feat) => {
                const isChecked = Boolean(features[feat.key]);

                return (
                  <label
                    key={feat.key}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      isChecked
                        ? 'border-indigo-400 bg-indigo-50/60'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleFeature(feat.key)}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{feat.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{feat.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving…' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryConfigModal;
