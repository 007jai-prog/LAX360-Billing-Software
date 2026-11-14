import React, { useState } from 'react';
import { X, Megaphone, AlertCircle, Send } from 'lucide-react';

export const AnnouncementCreateModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    target_category: 'all',
    expires_at: ''
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
    if (!formData.title || !formData.message) {
      setError('Title and message are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate({
        ...formData,
        expires_at: formData.expires_at ? formData.expires_at : null
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish announcement.');
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
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-extrabold text-white">New Platform Broadcast</h2>
              <p className="text-xs text-slate-300">Publish alerts to tenant dashboards</p>
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">Announcement Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. Scheduled Infrastructure Maintenance / New GST Update"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Message Content *</label>
            <textarea
              rows="3"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Provide clear details and instructions for business owners..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Severity / Style</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="info">Info (Blue Notice)</option>
                <option value="warning">Warning / Maintenance (Amber)</option>
                <option value="success">Feature Launch (Green)</option>
                <option value="critical">Critical Urgent (Rose)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Target Audience</label>
              <select
                name="target_category"
                value={formData.target_category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold capitalize"
              >
                <option value="all">All Businesses (Global)</option>
                <option value="grocery">Grocery &amp; Supermarket Only</option>
                <option value="restaurant">Restaurant &amp; Cafe Only</option>
                <option value="pharmacy">Pharmacy &amp; Medical Only</option>
                <option value="textile">Textile &amp; Garments Only</option>
                <option value="wholesale">Wholesale &amp; Distribution Only</option>
                <option value="electronics">Electronics &amp; Mobiles Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Expiry Date (Optional)</label>
            <input
              type="date"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Publishing…' : 'Publish Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementCreateModal;
