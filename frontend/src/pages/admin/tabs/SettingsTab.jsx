import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Mail,
  Phone,
  Globe,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Percent,
  Calendar,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Sparkles,
  LayoutTemplate
} from 'lucide-react';
import { useTheme, THEME_PRESETS, resolvePreset } from '../../../context/ThemeContext';

export const SettingsTab = ({ initialSettings, onSaveSettings }) => {
  const { updateGlobalTheme } = useTheme();

  const [formData, setFormData] = useState({
    platform_name: '',
    company_name: '',
    support_email: '',
    support_phone: '',
    website_url: '',
    default_trial_days: 14,
    maintenance_mode: false,
    default_currency: 'INR',
    payment_gateway_mode: 'sandbox',
    allow_self_registration: true,
    default_tax_rate: 18.0,
    default_theme_mode: 'light',
    default_accent_color: 'indigo',
    default_font_scaling: 'comfortable',
    default_radius: 'rounded-xl'
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialSettings) {
      setFormData({
        platform_name: initialSettings.platform_name || 'LAX360 Universal Billing SaaS',
        company_name: initialSettings.company_name || 'LAX360 Cloud Technologies Pvt Ltd',
        support_email: initialSettings.support_email || 'support@lax360.com',
        support_phone: initialSettings.support_phone || '+91 (011) 4560-3600',
        website_url: initialSettings.website_url || 'https://lax360.com',
        default_trial_days: initialSettings.default_trial_days ?? 14,
        maintenance_mode: Boolean(initialSettings.maintenance_mode),
        default_currency: initialSettings.default_currency || 'INR',
        payment_gateway_mode: initialSettings.payment_gateway_mode || 'sandbox',
        allow_self_registration: initialSettings.allow_self_registration ?? true,
        default_tax_rate: initialSettings.default_tax_rate ?? 18.0,
        default_theme_mode: initialSettings.default_theme_mode || 'light',
        default_accent_color: initialSettings.default_accent_color || 'indigo',
        default_font_scaling: initialSettings.default_font_scaling || 'comfortable',
        default_radius: initialSettings.default_radius || 'rounded-xl'
      });
    }
  }, [initialSettings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setSuccessMsg('');
  };

  const handleSelectPreset = (presetId) => {
    setFormData((prev) => ({
      ...prev,
      default_accent_color: presetId
    }));
    setSuccessMsg('');
  };

  const handleSelectMode = (mode) => {
    setFormData((prev) => ({
      ...prev,
      default_theme_mode: mode
    }));
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await onSaveSettings(formData);
      // Immediately broadcast to current client application session
      updateGlobalTheme({
        mode: formData.default_theme_mode,
        preset: formData.default_accent_color,
        density: formData.default_font_scaling,
        radius: formData.default_radius
      });
      setSuccessMsg('Global platform appearance and application settings updated successfully.');
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const currentPreviewPreset = resolvePreset(formData.default_accent_color);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Platform Branding & Company Information */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            Company Branding &amp; Legal Identity
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Global business identifiers displayed on invoice footers, legal notices, and client apps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Platform Brand Name</label>
            <input
              type="text"
              name="platform_name"
              value={formData.platform_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company Legal Entity</label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Support Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="support_email"
                value={formData.support_email}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Support Phone Hotline</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="support_phone"
                value={formData.support_phone}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Official Website URL</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational & Platform Guardrails */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Operational &amp; Subscription Parameters
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Default billing conditions, trial windows, and payment integration environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Default Trial Period (Days)
            </label>
            <input
              type="number"
              name="default_trial_days"
              value={formData.default_trial_days}
              onChange={handleChange}
              min="0"
              max="90"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Platform Currency</label>
            <select
              name="default_currency"
              value={formData.default_currency}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="INR">INR (₹ Indian Rupee)</option>
              <option value="USD">USD ($ United States Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="AED">AED (د.إ UAE Dirham)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Default GST Tax Rate (%)
            </label>
            <div className="relative">
              <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.1"
                name="default_tax_rate"
                value={formData.default_tax_rate}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Gateway Mode</label>
            <select
              name="payment_gateway_mode"
              value={formData.payment_gateway_mode}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="sandbox">Sandbox / Test Mode (Simulated Payments)</option>
              <option value="live">Live / Production Mode (Real Transactions)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="allow_self_registration"
              name="allow_self_registration"
              checked={formData.allow_self_registration}
              onChange={handleChange}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="allow_self_registration" className="font-semibold text-slate-800 cursor-pointer">
              Allow public business registrations from landing page
            </label>
          </div>
        </div>
      </div>

      {/* 3. Application Appearance & Global Themes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Application Appearance &amp; Global Themes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the platform's visual identity globally. These settings act as the default theme for all registered businesses, trial users, and subscriber sessions.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Global Scope
          </span>
        </div>

        {/* Global Default Mode Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Global Default Color Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'light', name: 'Light Mode', icon: Sun, desc: 'High-clarity crisp white workspace' },
              { id: 'dark', name: 'Dark Mode', icon: Moon, desc: 'Low-light slate-900 high contrast' },
              { id: 'system', name: 'System Auto', icon: Monitor, desc: 'Adapts to user operating system' }
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = formData.default_theme_mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMode(m.id)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>{m.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Accent Theme Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Global Brand Theme &amp; Color Scheme
            </label>
            <span className="text-[11px] font-semibold text-slate-400">
              Selected: <strong className="text-indigo-600 font-bold">{currentPreviewPreset.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {THEME_PRESETS.map((preset) => {
              const isSelected = formData.default_accent_color === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full shadow-xs border border-white"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-xs font-extrabold text-slate-900">{preset.name}</span>
                      </div>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 mb-1.5">
                      {preset.category}
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{preset.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">Palette:</span>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} title="Primary" />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} title="Accent" />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.light, border: `1px solid ${preset.border}` }} title="Subtle" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Density & Radius Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Display Density</label>
            <select
              name="default_font_scaling"
              value={formData.default_font_scaling}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="compact">Compact (High Information Density for POS & Ledger)</option>
              <option value="comfortable">Comfortable (Balanced Enterprise Default)</option>
              <option value="spacious">Spacious (Relaxed Touch-Friendly Interface)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Corner Radius Styling</label>
            <select
              name="default_radius"
              value={formData.default_radius}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="rounded-sm">Sharp Corporate (Minimal Corner Radius)</option>
              <option value="rounded-xl">Smooth Modern (Default Soft Rounded Corners)</option>
              <option value="rounded-2xl">Curved Friendly (Large Rounded Cards)</option>
            </select>
          </div>
        </div>

        {/* Live Global Application Preview Widget */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Live Global Theme Simulation
          </label>
          <div
            className={`p-5 rounded-2xl border transition-all ${
              formData.default_theme_mode === 'dark'
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-slate-50/80 border-slate-200/90 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b pb-3 border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentPreviewPreset.primary }} />
                <span className="text-xs font-extrabold">
                  Application Preview ({currentPreviewPreset.name} • {formData.default_theme_mode.toUpperCase()})
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: currentPreviewPreset.light,
                  color: currentPreviewPreset.text,
                  border: `1px solid ${currentPreviewPreset.border}`
                }}
              >
                Default Application Theme
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Sample Button */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 font-semibold mb-2">Sample Primary Button</p>
                <button
                  type="button"
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white shadow-xs transition"
                  style={{ backgroundColor: currentPreviewPreset.primary }}
                >
                  + Create Invoice
                </button>
              </div>

              {/* Sample Metric Card */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 font-semibold">Today's Revenue</p>
                <p className="text-lg font-black mt-0.5" style={{ color: currentPreviewPreset.primary }}>
                  ₹48,250
                </p>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: currentPreviewPreset.light, color: currentPreviewPreset.text }}
                >
                  +18.4% growth
                </span>
              </div>

              {/* Sample Active Nav Item */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 font-semibold mb-1.5">Sample Nav Indicator</p>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-between"
                  style={{ backgroundColor: currentPreviewPreset.primary }}
                >
                  <span>Dashboard</span>
                  <span className="text-[10px] opacity-80">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Maintenance Mode Safety Switch */}
      <div
        className={`p-6 rounded-2xl border transition shadow-xs ${
          formData.maintenance_mode
            ? 'bg-amber-50/80 border-amber-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-5 h-5 ${
                  formData.maintenance_mode ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
              <h3 className="text-base font-bold text-slate-900">
                System Maintenance Mode
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              When activated, non-superadmin users attempting to perform write operations will see a scheduled maintenance notice. Only superadmins retain full console access.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              name="maintenance_mode"
              checked={formData.maintenance_mode}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes…' : 'Save Platform Settings'}</span>
        </button>
      </div>
    </form>
  );
};

export default SettingsTab;
