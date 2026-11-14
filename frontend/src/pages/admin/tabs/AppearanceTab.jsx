import React, { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Layout,
  Layers,
  Zap,
  Store,
  FileText,
  ScanBarcode,
  Search,
  Filter,
  CheckCircle,
  Crown,
  Cpu,
  Feather,
  Briefcase
} from 'lucide-react';
import { useTheme, THEME_PRESETS, resolvePreset } from '../../../context/ThemeContext';

const CATEGORIES = [
  { id: 'all', label: 'All Themes', count: 29, icon: Palette },
  { id: 'Premium & Luxury', label: 'Premium & Luxury', count: 5, icon: Crown },
  { id: 'Modern Technology & AI', label: 'Modern Tech & AI', count: 8, icon: Cpu },
  { id: 'Minimal Aesthetic', label: 'Minimal Aesthetic', count: 7, icon: Feather },
  { id: 'Universal SaaS', label: 'Core SaaS', count: 8, icon: Layers },
  { id: 'Executive & Dual-Tone', label: 'Executive Dual-Tone', count: 1, icon: Briefcase }
];

export const AppearanceTab = ({ initialSettings, onSaveSettings }) => {
  const { globalTheme, updateGlobalTheme } = useTheme();

  // Local draft configuration
  const [selectedPresetId, setSelectedPresetId] = useState(globalTheme?.preset || 'modern-indigo');
  const [selectedMode, setSelectedMode] = useState(globalTheme?.mode || 'light');
  const [selectedDensity, setSelectedDensity] = useState(globalTheme?.density || 'comfortable');
  const [selectedRadius, setSelectedRadius] = useState(globalTheme?.radius || 'rounded-xl');
  const [headerSidebarStyle, setHeaderSidebarStyle] = useState(globalTheme?.headerSidebarStyle || 'connected-clean');
  const [customPrimary, setCustomPrimary] = useState(globalTheme?.customPrimary || '');
  const [customSecondary, setCustomSecondary] = useState(globalTheme?.customSecondary || '');

  // Search & Filter State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Sync when initialSettings or globalTheme changes
  useEffect(() => {
    if (globalTheme) {
      setSelectedPresetId(globalTheme.preset || 'modern-indigo');
      setSelectedMode(globalTheme.mode || 'light');
      setSelectedDensity(globalTheme.density || 'comfortable');
      setSelectedRadius(globalTheme.radius || 'rounded-xl');
      setHeaderSidebarStyle(globalTheme.headerSidebarStyle || 'connected-clean');
      setCustomPrimary(globalTheme.customPrimary || '');
      setCustomSecondary(globalTheme.customSecondary || '');
    }
  }, [globalTheme]);

  // Compute live preview preset
  const activeBasePreset = resolvePreset(selectedPresetId);
  const previewTheme = useMemo(() => {
    const t = { ...activeBasePreset };
    if (customPrimary && /^#[0-9A-Fa-f]{6}$/.test(customPrimary)) {
      t.primary = customPrimary;
      t.primaryHover = customPrimary;
      t.navActiveBg = customPrimary;
      t.inputFocus = customPrimary;
    }
    if (customSecondary && /^#[0-9A-Fa-f]{6}$/.test(customSecondary)) {
      t.secondary = customSecondary;
      t.secondaryHover = customSecondary;
    }

    if (headerSidebarStyle === 'connected-brand') {
      t.sidebarBg = t.accentLight;
      t.headerBg = t.accentLight;
      t.sidebarBorder = t.border;
      t.headerBorder = t.border;
      t.navText = t.accentText;
    } else if (headerSidebarStyle === 'connected-dark') {
      t.sidebarBg = '#0b1120';
      t.headerBg = '#0b1120';
      t.sidebarBorder = '#1e293b';
      t.headerBorder = '#1e293b';
      t.navText = '#cbd5e1';
      t.navIcon = t.accent;
      t.navHoverBg = '#1e293b';
    } else {
      t.headerBg = t.sidebarBg;
      t.headerBorder = t.sidebarBorder;
    }

    return t;
  }, [activeBasePreset, customPrimary, customSecondary, headerSidebarStyle]);

  // Filtered theme list based on category and search query
  const filteredThemes = useMemo(() => {
    return THEME_PRESETS.filter((preset) => {
      const matchesCategory =
        activeCategory === 'all' || preset.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        preset.name.toLowerCase().includes(q) ||
        preset.category.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.primary.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleApplyPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const p = resolvePreset(presetId);
    if (p.mode) setSelectedMode(p.mode);
    setCustomPrimary('');
    setCustomSecondary('');
    setSuccessMsg('');
  };

  const handleResetToDefault = () => {
    setSelectedPresetId('modern-indigo');
    setSelectedMode('light');
    setSelectedDensity('comfortable');
    setSelectedRadius('rounded-xl');
    setHeaderSidebarStyle('connected-clean');
    setCustomPrimary('');
    setCustomSecondary('');
    setSuccessMsg('');
  };

  const handleSaveGlobalTheme = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const payload = {
        default_theme_mode: selectedMode,
        default_accent_color: selectedPresetId,
        default_font_scaling: selectedDensity,
        default_radius: selectedRadius,
        theme: {
          headerSidebarStyle,
          primary: customPrimary || undefined,
          secondary: customSecondary || undefined
        }
      };

      if (onSaveSettings) {
        await onSaveSettings(payload);
      }

      await updateGlobalTheme({
        mode: selectedMode,
        preset: selectedPresetId,
        density: selectedDensity,
        radius: selectedRadius,
        headerSidebarStyle,
        customPrimary: customPrimary || undefined,
        customSecondary: customSecondary || undefined
      });

      setSuccessMsg('Global platform appearance successfully saved and broadcast across all SaaS modules.');
    } catch (err) {
      console.error('Failed to save global theme:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>29 Aesthetic Application Themes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-600" />
            Application Appearance &amp; Global SaaS Themes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Manage the application-wide theme applied consistently across the entire platform: top navigation bar,
            connected sidebar, action buttons, cards, data tables, input forms, modals, reports, POS terminal, and all six business vertical modules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSaveGlobalTheme}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Applying Globally…' : 'Save & Apply Theme'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Theme Presets Browser (29 Aesthetic Palettes) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              1. Available Application Themes ({THEME_PRESETS.length} Complete Palettes)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any of the 29 aesthetic themes. Each palette includes coordinated tokens for headers, connected sidebars, buttons, surfaces, and tables.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search themes by name or color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {cat.id === 'all'
                    ? THEME_PRESETS.length
                    : THEME_PRESETS.filter((p) => p.category === cat.id).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
          {filteredThemes.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-900 truncate pr-2">{preset.name}</span>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                        {preset.mode}
                      </span>
                    )}
                  </div>

                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 mb-2">
                    {preset.category}
                  </span>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {preset.description}
                  </p>
                </div>

                <div>
                  {/* Palette Swatches */}
                  <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">{preset.primary}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: preset.primary }}
                        title={`Primary: ${preset.primary}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: preset.secondary }}
                        title={`Secondary: ${preset.secondary}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: preset.accent }}
                        title={`Accent: ${preset.accent}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                        style={{ backgroundColor: preset.surface }}
                        title={`Surface: ${preset.surface}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                        style={{ backgroundColor: preset.bg }}
                        title={`Background: ${preset.bg}`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyPreset(preset.id);
                    }}
                    className={`mt-3 w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {isSelected ? 'Theme Selected' : 'Preview Theme'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredThemes.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Palette className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600 text-sm">No themes found matching "{searchQuery}"</p>
            <p className="text-xs text-slate-400 mt-1">Try another keyword or select "All Themes".</p>
          </div>
        )}
      </div>

      {/* 2. Color and Component Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Detailed Design Tokens & Controls */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              2. Design Controls &amp; Styling Options
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize primary &amp; secondary colors, connected header/sidebar aesthetics, display density, and corner radius.
            </p>
          </div>

          {/* Color Mode Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Color Mode
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'light', name: 'Light Mode', icon: Sun },
                { id: 'dark', name: 'Dark Mode', icon: Moon },
                { id: 'system', name: 'System Auto', icon: Monitor }
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMode(m.id)}
                    className={`py-2.5 px-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-2xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected Header & Sidebar Design Style */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Connected Header &amp; Sidebar Appearance Style
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'connected-clean',
                  title: 'Connected Clean Matching Surface',
                  desc: 'Header and Sidebar share the exact same clean surface background and seamless borders without color gaps.'
                },
                {
                  id: 'connected-brand',
                  title: 'Connected Brand Accent',
                  desc: 'Header and Sidebar both carry an elegant, subtle primary brand tint for unified brand presence.'
                },
                {
                  id: 'connected-dark',
                  title: 'Connected Command Dark',
                  desc: 'Both Header and Sidebar stay dark navy/charcoal while the main content workspace follows the selected mode.'
                }
              ].map((style) => {
                const isSelected = headerSidebarStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setHeaderSidebarStyle(style.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{style.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{style.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary & Secondary Color Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={previewTheme.primary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  placeholder={activeBasePreset.primary}
                  value={customPrimary || activeBasePreset.primary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Secondary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={previewTheme.secondary}
                  onChange={(e) => setCustomSecondary(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  placeholder={activeBasePreset.secondary}
                  value={customSecondary || activeBasePreset.secondary}
                  onChange={(e) => setCustomSecondary(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Display Density and Corner Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Display Density
              </label>
              <select
                value={selectedDensity}
                onChange={(e) => setSelectedDensity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="compact">Compact (Dense Data &amp; POS)</option>
                <option value="comfortable">Comfortable (Standard)</option>
                <option value="spacious">Spacious (Roomy Modern)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Button &amp; Card Corner Radius
              </label>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="rounded-md">Sharp (6px - rounded-md)</option>
                <option value="rounded-xl">Standard (12px - rounded-xl)</option>
                <option value="rounded-2xl">Rounded (16px - rounded-2xl)</option>
                <option value="rounded-full">Pill (Full - rounded-full)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Application Preview */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-600" />
                3. Live Interactive Application Preview
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Updates in real-time as you tweak themes, colors, and layout styles.
              </p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: previewTheme.accentLight,
                color: previewTheme.accentText,
                border: `1px solid ${previewTheme.border}`
              }}
            >
              {previewTheme.name}
            </span>
          </div>

          {/* Interactive Shell Mockup */}
          <div
            className="rounded-2xl border overflow-hidden shadow-sm transition-all"
            style={{
              backgroundColor: previewTheme.bg,
              borderColor: previewTheme.border
            }}
          >
            {/* Mockup Connected Header */}
            <div
              className="h-12 px-4 border-b flex items-center justify-between transition-colors"
              style={{
                backgroundColor: previewTheme.headerBg,
                borderColor: previewTheme.headerBorder
              }}
            >
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4" style={{ color: previewTheme.primary }} />
                <span className="text-xs font-bold" style={{ color: previewTheme.textPrimary }}>
                  FreshMart Supermarket
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    backgroundColor: previewTheme.accentLight,
                    color: previewTheme.accentText
                  }}
                >
                  POS Live
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-2xs flex items-center gap-1"
                  style={{ backgroundColor: previewTheme.primary }}
                >
                  <ScanBarcode className="w-3 h-3" />
                  <span>Terminal</span>
                </div>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: previewTheme.primary }}
                >
                  A
                </div>
              </div>
            </div>

            {/* Mockup Body with Connected Sidebar + Main Content */}
            <div className="flex min-h-[280px]">
              {/* Mockup Connected Sidebar */}
              <div
                className="w-36 border-r p-2.5 space-y-1 transition-colors"
                style={{
                  backgroundColor: previewTheme.sidebarBg,
                  borderColor: previewTheme.sidebarBorder
                }}
              >
                <div
                  className="p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-2xs"
                  style={{
                    backgroundColor: previewTheme.navActiveBg,
                    color: previewTheme.navActiveText
                  }}
                >
                  <Zap className="w-3 h-3" />
                  <span>Dashboard</span>
                </div>
                <div
                  className="p-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 hover:bg-black/5"
                  style={{ color: previewTheme.navText }}
                >
                  <ScanBarcode className="w-3 h-3" style={{ color: previewTheme.navIcon }} />
                  <span>Invoices</span>
                </div>
                <div
                  className="p-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 hover:bg-black/5"
                  style={{ color: previewTheme.navText }}
                >
                  <Layers className="w-3 h-3" style={{ color: previewTheme.navIcon }} />
                  <span>Inventory</span>
                </div>
              </div>

              {/* Mockup Workspace */}
              <div className="flex-1 p-3 space-y-3">
                {/* KPI Widget */}
                <div
                  className="p-3 rounded-xl border shadow-2xs transition-all"
                  style={{
                    backgroundColor: previewTheme.surface,
                    borderColor: previewTheme.cardBorder
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: previewTheme.textMuted }}>
                      Total Platform GMV
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: previewTheme.primary }}
                    />
                  </div>
                  <p className="text-base font-black mt-1" style={{ color: previewTheme.textPrimary }}>
                    ₹4,89,200.00
                  </p>
                </div>

                {/* Buttons Showcase */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: previewTheme.primary }}
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: previewTheme.secondary }}
                  >
                    Secondary
                  </button>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{
                      backgroundColor: previewTheme.accentLight,
                      color: previewTheme.accentText,
                      border: `1px solid ${previewTheme.border}`
                    }}
                  >
                    Active Status
                  </span>
                </div>

                {/* Form Input Showcase */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    value="Quick search item or invoice..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-[11px] font-medium"
                    style={{
                      backgroundColor: previewTheme.inputBg,
                      borderColor: previewTheme.inputBorder,
                      color: previewTheme.textPrimary
                    }}
                  />
                </div>

                {/* Data Grid Mockup */}
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: previewTheme.borderSubtle }}
                >
                  <table className="w-full text-left text-[10px]">
                    <thead style={{ backgroundColor: previewTheme.tableHeaderBg }}>
                      <tr style={{ color: previewTheme.textMuted }}>
                        <th className="px-2 py-1 font-bold">INV #</th>
                        <th className="px-2 py-1 font-bold">CUSTOMER</th>
                        <th className="px-2 py-1 font-bold text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: previewTheme.textPrimary }}>
                      <tr className="border-t" style={{ borderColor: previewTheme.borderSubtle }}>
                        <td className="px-2 py-1 font-bold" style={{ color: previewTheme.primary }}>INV-1092</td>
                        <td className="px-2 py-1">Ananya Sharma</td>
                        <td className="px-2 py-1 text-right font-bold">₹1,450</td>
                      </tr>
                      <tr className="border-t" style={{ borderColor: previewTheme.borderSubtle }}>
                        <td className="px-2 py-1 font-bold" style={{ color: previewTheme.primary }}>INV-1091</td>
                        <td className="px-2 py-1">Rohit Verma</td>
                        <td className="px-2 py-1 text-right font-bold">₹3,200</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceTab;
