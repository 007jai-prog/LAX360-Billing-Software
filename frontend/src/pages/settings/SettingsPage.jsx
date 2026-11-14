import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import { useTheme, THEME_PRESETS, resolvePreset } from '../../context/ThemeContext';
import api from '../../api/client';
import {
  Building2,
  CheckCircle,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  CheckCircle2,
  User,
  Search,
  Crown,
  Cpu,
  Feather,
  Briefcase,
  CalendarClock,
  ShieldAlert
} from 'lucide-react';

const SUBSCRIPTION_KEY_PREFIX = 'lax360_saas_subscription:';

const normalizeEmail = (email) => email?.trim().toLowerCase() || '';

const getLocalSubscription = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const key = `${SUBSCRIPTION_KEY_PREFIX}${encodeURIComponent(normalizedEmail)}`;

  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Unable to read saved subscription:', error);
    return null;
  }
};

const getSubscriptionDetails = (response, tenantSubscription) => {
  const subscription =
    response?.subscription ||
    response?.current_subscription ||
    response?.data?.subscription ||
    response?.data ||
    response ||
    tenantSubscription ||
    {};

  const rawPlan =
    subscription.plan_name ||
    subscription.planName ||
    subscription.plan_id ||
    subscription.planId ||
    subscription.current_plan ||
    subscription.currentPlan ||
    subscription.plan ||
    subscription.name ||
    tenantSubscription?.plan_name ||
    tenantSubscription?.planName ||
    tenantSubscription?.plan_id ||
    tenantSubscription?.planId ||
    tenantSubscription?.plan ||
    null;

  const plan =
    typeof rawPlan === 'string'
      ? rawPlan
      : rawPlan?.name || rawPlan?.plan_name || rawPlan?.id || null;

  const status =
    subscription.status ||
    subscription.subscription_status ||
    subscription.subscriptionStatus ||
    subscription.paymentStatus ||
    tenantSubscription?.status ||
    tenantSubscription?.paymentStatus ||
    null;

  const rawExpiry =
    subscription.expires_at ||
    subscription.expiresAt ||
    subscription.expiry_date ||
    subscription.expiryDate ||
    subscription.current_period_end ||
    subscription.currentPeriodEnd ||
    subscription.end_date ||
    subscription.endDate ||
    tenantSubscription?.expires_at ||
    tenantSubscription?.expiresAt ||
    null;

  const expiryDate = rawExpiry ? new Date(rawExpiry) : null;

  return {
    plan,
    status,
    expiryDate:
      expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null
  };
};

const formatDate = (date) => {
  if (!date) return 'Not provided';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const SettingsPage = () => {
  const { user, tenant, updateTenant } = useAuth();
  const { config } = useBusinessConfig();

  const {
    activeTheme,
    globalTheme,
    saveUserTheme,
    resetUserToGlobal,
    isCustomUserTheme
  } = useTheme();

  const accountEmail = normalizeEmail(
    user?.email || tenant?.email || tenant?.owner_email
  );

  const [currentSub, setCurrentSub] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  const [storeName, setStoreName] = useState(tenant?.name || '');
  const [gstin, setGstin] = useState(tenant?.gstin || '');
  const [prefix, setPrefix] = useState(tenant?.invoice_prefix || 'INV');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedMode, setSelectedMode] = useState(activeTheme.mode || 'light');
  const [selectedPreset, setSelectedPreset] = useState(
    activeTheme.preset || 'indigo'
  );
  const [selectedDensity, setSelectedDensity] = useState(
    activeTheme.density || 'comfortable'
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = useState('');

  const userFilteredPresets = useMemo(() => {
    return THEME_PRESETS.filter((preset) => {
      const matchesCategory =
        categoryFilter === 'all' || preset.category === categoryFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        preset.name.toLowerCase().includes(query) ||
        preset.category.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.primary.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    setSelectedMode(activeTheme.mode || 'light');
    setSelectedPreset(activeTheme.preset || 'indigo');
    setSelectedDensity(activeTheme.density || 'comfortable');
  }, [activeTheme]);

  useEffect(() => {
    let cancelled = false;

    const fetchCurrentSubscription = async () => {
      setIsLoadingSubscription(true);
      setSubscriptionError('');

      // The Register page saves its demo subscription under the account email.
      // Prefer it over the API response, which may still contain the free tier.
      const savedSubscription = getLocalSubscription(accountEmail);

      if (savedSubscription && !cancelled) {
        setCurrentSub(savedSubscription);
      }

      try {
        const response = await api.get('/subscriptions/current');

        if (!cancelled) {
          // Re-read in case the local subscription changed while the request
          // was in flight. Otherwise, fall back to the server subscription.
          setCurrentSub(
            getLocalSubscription(accountEmail) || response.data || null
          );
        }
      } catch (error) {
        console.error('Failed to load current subscription:', error);

        if (!cancelled) {
          if (savedSubscription) {
            // Keep showing the locally saved demo subscription when the API
            // is unavailable.
            setCurrentSub(getLocalSubscription(accountEmail) || savedSubscription);
          } else {
            setSubscriptionError(
              error.response?.data?.detail ||
                'Could not load the current subscription.'
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSubscription(false);
        }
      }
    };

    fetchCurrentSubscription();

    return () => {
      cancelled = true;
    };
  }, [accountEmail]);

  useEffect(() => {
    const syncLocalSubscription = (event) => {
      const expectedKey = accountEmail
        ? `${SUBSCRIPTION_KEY_PREFIX}${encodeURIComponent(accountEmail)}`
        : null;

      if (!event || event.key === expectedKey) {
        const savedSubscription = getLocalSubscription(accountEmail);

        if (savedSubscription) {
          setCurrentSub(savedSubscription);
          setSubscriptionError('');
        }
      }
    };

    window.addEventListener('storage', syncLocalSubscription);

    return () => {
      window.removeEventListener('storage', syncLocalSubscription);
    };
  }, [accountEmail]);

  useEffect(() => {
    setStoreName(tenant?.name || '');
    setGstin(tenant?.gstin || '');
    setPrefix(tenant?.invoice_prefix || 'INV');
  }, [tenant]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await api.put('/tenants/profile', {
        name: storeName,
        gstin: gstin.toUpperCase(),
        invoice_prefix: prefix.toUpperCase()
      });

      updateTenant(response.data.tenant);
      alert('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert(error.response?.data?.detail || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePersonalTheme = async () => {
    setIsSavingTheme(true);
    setThemeSuccessMsg('');

    try {
      await saveUserTheme({
        mode: selectedMode,
        preset: selectedPreset,
        density: selectedDensity
      });

      setThemeSuccessMsg(
        'Your personal appearance preference has been saved successfully. Your preference is private to your login.'
      );
      window.setTimeout(() => setThemeSuccessMsg(''), 6000);
    } catch (error) {
      console.error('Failed to save appearance:', error);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleResetToGlobal = async () => {
    setIsSavingTheme(true);
    setThemeSuccessMsg('');

    try {
      await resetUserToGlobal();
      setSelectedMode(globalTheme.mode || 'light');
      setSelectedPreset(globalTheme.preset || 'indigo');
      setSelectedDensity(globalTheme.density || 'comfortable');
      setThemeSuccessMsg('Appearance reset to platform default theme.');
      window.setTimeout(() => setThemeSuccessMsg(''), 6000);
    } catch (error) {
      console.error('Failed to reset appearance:', error);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const currentPresetDetails = resolvePreset(selectedPreset);
  const subscriptionDetails = getSubscriptionDetails(
    currentSub,
    tenant?.subscription
  );

  const statusLabel = subscriptionDetails.status
    ? String(subscriptionDetails.status)
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .toUpperCase()
    : 'Status unavailable';

  const isExpired = Boolean(
    subscriptionDetails.expiryDate &&
      subscriptionDetails.expiryDate.getTime() <= Date.now()
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Business Configuration &amp; Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage store profile, personal themes, GSTIN parameters, and your current subscription
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-indigo-600" />
          Store Details &amp; Tax Parameters
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Business Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Business Category
              </label>
              <input
                type="text"
                disabled
                value={config?.category_name || tenant?.business_category || ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs capitalize text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                GSTIN Number
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(event) => setGstin(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(event) => setPrefix(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Palette className="h-5 w-5 text-indigo-600" />
              Appearance &amp; Personal Theme Preferences
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              Choose your personal theme, dark/light mode, and accent palette.
              Preferences are saved independently to your individual account.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-bold text-purple-700">
              <User className="h-3.5 w-3.5" />
              Personal Scope
            </span>
          </div>
        </div>

        {themeSuccessMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{themeSuccessMsg}</span>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Select Interface Mode
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                id: 'light',
                name: 'Light Mode',
                icon: Sun,
                description: 'Clean, radiant white workspace'
              },
              {
                id: 'dark',
                name: 'Dark Mode',
                icon: Moon,
                description: 'Eye-friendly deep dark interface'
              },
              {
                id: 'system',
                name: 'System Sync',
                icon: Monitor,
                description: 'Automatically matches your OS'
              }
            ].map((mode) => {
              const Icon = mode.icon;
              const selected = selectedMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`rounded-xl p-2 ${
                      selected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{mode.name}</span>
                      {selected && <Check className="h-4 w-4 text-indigo-600" />}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="mb-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Select Your Preferred Palette
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                Active:{' '}
                <strong className="font-bold text-indigo-600">
                  {currentPresetDetails.name}
                </strong>{' '}
                ({currentPresetDetails.category})
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Themes', icon: Palette },
              { id: 'Premium & Luxury', label: 'Premium & Luxury', icon: Crown },
              { id: 'Modern Technology & AI', label: 'Modern Tech & AI', icon: Cpu },
              { id: 'Minimal Aesthetic', label: 'Minimal Aesthetic', icon: Feather },
              { id: 'Universal SaaS', label: 'Core SaaS', icon: CheckCircle },
              { id: 'Executive & Dual-Tone', label: 'Executive Dual-Tone', icon: Briefcase }
            ].map((category) => {
              const Icon = category.icon;
              const selected = categoryFilter === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryFilter(category.id)}
                  className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {userFilteredPresets.map((preset) => {
              const selected = selectedPreset === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="truncate text-xs font-extrabold text-slate-900">
                          {preset.name}
                        </span>
                      </div>
                      {selected && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </div>

                    <span className="mb-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {preset.category}
                    </span>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] font-semibold uppercase text-slate-400">
                      {preset.primary}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <span
                        className="h-3 w-3 rounded-full border border-white"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-white"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-white"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {userFilteredPresets.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs font-semibold text-slate-600">
                No themes found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>

        <div className="max-w-xs text-xs">
          <label className="mb-1.5 block font-bold uppercase tracking-wider text-slate-700">
            3. Interface Display Density
          </label>
          <select
            value={selectedDensity}
            onChange={(event) => setSelectedDensity(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="compact">
              Compact (High density for quick billing &amp; large inventory)
            </option>
            <option value="comfortable">
              Comfortable (Standard balanced interface)
            </option>
            <option value="spacious">
              Spacious (Large touch-friendly buttons &amp; cards)
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Live Preview of Your Selected Theme
          </label>
          <div
            className={`rounded-2xl border p-5 transition-all ${
              selectedMode === 'dark'
                ? 'border-slate-800 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50/90 text-slate-900'
            }`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-full shadow-xs"
                  style={{ backgroundColor: currentPresetDetails.primary }}
                />
                <span className="text-xs font-bold">
                  Workspace Mockup ({currentPresetDetails.name} •{' '}
                  {selectedMode.toUpperCase()})
                </span>
              </div>

              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: currentPresetDetails.light,
                  color: currentPresetDetails.text,
                  border: `1px solid ${currentPresetDetails.border}`
                }}
              >
                {isCustomUserTheme
                  ? 'Custom Personal Preset'
                  : 'Inheriting Global Default'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/70 bg-white p-3.5">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">
                  Primary Action Button
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: currentPresetDetails.primary }}
                >
                  Pay &amp; Generate Bill
                </button>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white p-3.5">
                <p className="text-[10px] font-semibold text-slate-400">
                  Store Item Sample
                </p>
                <p
                  className="mt-0.5 text-base font-black"
                  style={{ color: currentPresetDetails.primary }}
                >
                  ₹1,450.00
                </p>
                <span
                  className="mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: currentPresetDetails.light,
                    color: currentPresetDetails.text,
                    border: `1px solid ${currentPresetDetails.border}`
                  }}
                >
                  In Stock (42 units)
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white p-3.5">
                <p className="mb-1.5 text-[10px] font-semibold text-slate-400">
                  Active Sidebar Highlight
                </p>
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                  style={{ backgroundColor: currentPresetDetails.primary }}
                >
                  <span>Point of Sale</span>
                  <span className="text-[10px] opacity-80">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={handleResetToGlobal}
            disabled={isSavingTheme}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Global Platform Theme</span>
          </button>

          <button
            type="button"
            onClick={handleSavePersonalTheme}
            disabled={isSavingTheme}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            <span>
              {isSavingTheme ? 'Saving Preference…' : 'Save Personal Appearance'}
            </span>
          </button>
        </div>
      </div>

      <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Crown className="h-5 w-5 text-indigo-600" />
              Current Subscription
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Your active plan and subscription expiry date
            </p>
          </div>

          {!isLoadingSubscription && !subscriptionError && currentSub && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                isExpired
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {isExpired ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              {isExpired
                ? 'EXPIRED'
                : currentSub.paymentStatus === 'demo-paid'
                ? 'ACTIVE (DEMO)'
                : currentSub.paymentStatus === 'trial'
                ? 'ACTIVE TRIAL'
                : statusLabel}
            </span>
          )}
        </div>

        {isLoadingSubscription ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Loading current subscription...
          </p>
        ) : subscriptionError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {subscriptionError}
          </div>
        ) : currentSub ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Current plan
              </p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">
                {subscriptionDetails.plan || 'Plan name not provided'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <CalendarClock className="h-4 w-4" />
                Expiry date
              </p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">
                {formatDate(subscriptionDetails.expiryDate)}
              </p>
            </div>

            {isExpired && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 sm:col-span-2">
                Your subscription has expired. Contact your administrator or use
                the renewal option available in your account to restore access.
              </div>
            )}

            {!isExpired &&
              subscriptionDetails.expiryDate &&
              subscriptionDetails.expiryDate.getTime() - Date.now() <=
                5 * 24 * 60 * 60 * 1000 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 sm:col-span-2">
                  Your subscription is nearing its expiry date (
                  {formatDate(subscriptionDetails.expiryDate)}).
                </div>
              )}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            No current subscription information was returned.
          </p>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;