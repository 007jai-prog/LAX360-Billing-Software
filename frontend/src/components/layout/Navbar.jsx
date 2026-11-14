import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  Menu,
  Bell,
  Sparkles,
  Store,
  ChevronDown,
  LogOut,
  Settings,
  ScanBarcode,
  AlertTriangle,
  Clock,
  X,
  CheckCircle,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

const POLL_INTERVAL_MS = 60 * 1000;
const SUBSCRIPTION_KEY_PREFIX = 'lax360_saas_subscription:';

const normalizeEmail = (email) => email?.trim().toLowerCase() || '';

const getSavedSubscription = (email) => {
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

const getProductsFromResponse = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const parseCustomFields = (product) => {
  const fields = product?.custom_fields;

  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    return fields;
  }

  if (typeof fields === 'string') {
    try {
      const parsed = JSON.parse(fields);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const parseExpiryDate = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const text = String(value).trim();

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const date = new Date(year, month, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  const localMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    const day = Number(localMatch[1]);
    const month = Number(localMatch[2]) - 1;
    const year = Number(localMatch[3]);
    const date = new Date(year, month, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
};

const getExpiryValues = (product) => {
  const fields = parseCustomFields(product);
  const values = [];

  const addExpiryFields = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;

    Object.entries(source).forEach(([key, value]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');

      if (
        [
          'expiry',
          'expirydate',
          'expiredate',
          'expiration',
          'expirationdate',
          'expdate'
        ].includes(normalizedKey) &&
        value
      ) {
        values.push({
          dateValue: value,
          batchNumber:
            source.batch_number ||
            source.batchNumber ||
            source.batch ||
            ''
        });
      }
    });
  };

  addExpiryFields(product);
  addExpiryFields(fields);

  const batches =
    product?.batches ||
    fields.batches ||
    product?.stock_batches ||
    fields.stock_batches;

  if (Array.isArray(batches)) {
    batches.forEach((batch) => addExpiryFields(batch));
  }

  const seen = new Set();

  return values.filter(({ dateValue, batchNumber }) => {
    const key = `${String(dateValue)}:${String(batchNumber)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getCalendarDayNumber = (date) =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
      (24 * 60 * 60 * 1000)
  );

const formatDate = (date) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);

const getExpiryNotifications = (products, today) => {
  const todayNumber = getCalendarDayNumber(today);
  const notifications = [];

  products.forEach((product) => {
    getExpiryValues(product).forEach(({ dateValue, batchNumber }, index) => {
      const expiryDate = parseExpiryDate(dateValue);
      if (!expiryDate) return;

      const daysLeft = getCalendarDayNumber(expiryDate) - todayNumber;

      if (daysLeft <= 5) {
        notifications.push({
          product,
          expiryDate,
          daysLeft,
          batchNumber,
          key: `${product.id || product.sku || product.name || 'product'}-${dateValue}-${batchNumber || index}`
        });
      }
    });
  });

  return notifications.sort((a, b) => a.daysLeft - b.daysLeft);
};

const getSubscriptionDetails = (input) => {
  const subscription = input || {};

  const rawPlan =
    subscription.plan_name ||
    subscription.planName ||
    subscription.plan_id ||
    subscription.planId ||
    subscription.current_plan ||
    subscription.currentPlan ||
    subscription.plan ||
    subscription.name ||
    null;

  const plan =
    typeof rawPlan === 'string'
      ? rawPlan
      : rawPlan?.name || rawPlan?.plan_name || rawPlan?.id || null;

  const billingCycle =
    subscription.billingCycle ||
    subscription.billing_cycle ||
    subscription.billing_cycle_name ||
    '';

  const isTrial =
    Boolean(
      subscription.isFreeTrial ||
        subscription.is_free_trial ||
        String(
          subscription.planId ||
            subscription.plan_id ||
            plan ||
            ''
        )
          .toLowerCase()
          .includes('trial')
    ) ||
    String(plan || '').toLowerCase().includes('trial');

  const rawExpiry =
    subscription.expiresAt ||
    subscription.expires_at ||
    subscription.expiryDate ||
    subscription.expiry_date ||
    subscription.currentPeriodEnd ||
    subscription.current_period_end ||
    subscription.endDate ||
    subscription.end_date ||
    null;

  const expiryDate = rawExpiry ? new Date(rawExpiry) : null;

  return {
    plan: plan || (isTrial ? 'Free Trial' : 'Plan'),
    billingCycle: String(billingCycle).toLowerCase(),
    isTrial,
    expiryDate:
      expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null
  };
};

const getLocalCalendarDay = (date) =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
      (24 * 60 * 60 * 1000)
  );

const getSubscriptionExpiryInfo = (subscription, today) => {
  const details = getSubscriptionDetails(subscription);

  if (!details.expiryDate) return null;

  const daysLeft =
    getLocalCalendarDay(details.expiryDate) - getLocalCalendarDay(today);

  const reminderDays = details.isTrial
    ? 5
    : details.billingCycle === 'yearly'
      ? 30
      : 7;

  return {
    ...details,
    daysLeft,
    reminderDays,
    reminderDue: daysLeft <= reminderDays
  };
};

const formatSubscriptionExpiry = (date) => {
  if (!date) return 'Expiry unavailable';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

const getExpiryCountdownLabel = (daysLeft) => {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} day(s) ago`;
  if (daysLeft === 0) return 'Expires today';
  return `${daysLeft} day(s) left`;
};

export const Navbar = ({ setMobileOpen }) => {
  const { user, tenant, logout } = useAuth();

  const accountEmail = normalizeEmail(user?.email);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [today, setToday] = useState(() => new Date());
  const [subscription, setSubscription] = useState(() =>
    getSavedSubscription(accountEmail)
  );

  useEffect(() => {
    let isMounted = true;
    let requestInProgress = false;

    const fetchProducts = async (showLoading = false) => {
      if (requestInProgress) return;
      requestInProgress = true;

      if (showLoading && isMounted) setIsRefreshing(true);

      try {
        const response = await api.get('/products?limit=100');

        if (isMounted) {
          setProducts(getProductsFromResponse(response));
          setNotificationError('');
        }
      } catch (error) {
        console.error('Failed to load product expiry notifications:', error);

        if (isMounted) {
          setNotificationError(
            'Could not load expiry information. Try refreshing.'
          );
        }
      } finally {
        requestInProgress = false;

        if (isMounted) {
          setProductsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        setToday(new Date());
        fetchProducts();
      }
    };

    fetchProducts();

    const refreshInterval = window.setInterval(
      () => fetchProducts(),
      POLL_INTERVAL_MS
    );

    const clockInterval = window.setInterval(
      () => setToday(new Date()),
      30 * 1000
    );

    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      const savedSubscription = getSavedSubscription(accountEmail);

      if (savedSubscription && !cancelled) {
        setSubscription(savedSubscription);
      }

      try {
        const response = await api.get('/subscriptions/current');

        if (!cancelled) {
          const nextSubscription =
            getSavedSubscription(accountEmail) ||
            response?.data ||
            tenant?.subscription ||
            null;

          setSubscription(nextSubscription);
        }
      } catch (error) {
        console.error('Failed to load subscription for navbar:', error);

        if (!cancelled) {
          setSubscription(
            getSavedSubscription(accountEmail) ||
              tenant?.subscription ||
              null
          );
        }
      }
    };

    loadSubscription();

    const syncSubscription = (event) => {
      const expectedKey = accountEmail
        ? `${SUBSCRIPTION_KEY_PREFIX}${encodeURIComponent(accountEmail)}`
        : null;

      if (!event || event.key === expectedKey) {
        const savedSubscription = getSavedSubscription(accountEmail);
        if (savedSubscription) setSubscription(savedSubscription);
      }
    };

    window.addEventListener('storage', syncSubscription);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncSubscription);
    };
  }, [accountEmail, tenant?.subscription]);

  const expiringProducts = useMemo(
    () => getExpiryNotifications(products, today),
    [products, today]
  );

  const subscriptionInfo = useMemo(
    () => getSubscriptionExpiryInfo(subscription || tenant?.subscription, today),
    [subscription, tenant?.subscription, today]
  );

  const subscriptionPlanName =
    subscriptionInfo?.plan ||
    tenant?.subscription?.plan_name ||
    tenant?.subscription?.planName ||
    tenant?.subscription?.plan_id ||
    tenant?.subscription?.planId ||
    'Professional';

  const subscriptionCountdown = subscriptionInfo
    ? getExpiryCountdownLabel(subscriptionInfo.daysLeft)
    : 'Expiry unavailable';

  const showSubscriptionReminder = Boolean(subscriptionInfo?.reminderDue);

  const notificationCount =
    expiringProducts.length + (showSubscriptionReminder ? 1 : 0);

  const closeMenus = () => {
    setDropdownOpen(false);
    setNotificationsOpen(false);
  };

  const handleRefreshNotifications = async () => {
    setIsRefreshing(true);

    try {
      const response = await api.get('/products?limit=100');
      setProducts(getProductsFromResponse(response));
      setNotificationError('');
      setToday(new Date());
    } catch (error) {
      console.error('Failed to refresh product expiry notifications:', error);
      setNotificationError('Could not refresh expiry information.');
    } finally {
      setProductsLoading(false);
      setIsRefreshing(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 sm:px-6 transition-colors duration-200 border-b app-header"
      style={{
        backgroundColor: 'var(--theme-header-bg)',
        borderColor: 'var(--theme-header-border)'
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen?.(true)}
          aria-label="Open navigation menu"
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <Store className="hidden h-5 w-5 sm:block" style={{ color: 'var(--theme-primary)' }} />
          <div>
            <h1 className="text-sm font-bold leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
              {tenant?.name || 'LAX360 Business Store'}
            </h1>
            <p className="hidden text-[11px] font-medium sm:block" style={{ color: 'var(--theme-text-muted)' }}>
              GSTIN: {tenant?.gstin || 'Unregistered'} •{' '}
              {tenant?.city || 'HQ Branch'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NavLink
          to="/pos"
          onClick={closeMenus}
          className="flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-95"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          <ScanBarcode className="h-4 w-4" />
          <span className="hidden md:inline">Open POS Terminal</span>
          <span className="md:hidden">POS</span>
        </NavLink>

        <NavLink
          to="/settings"
          onClick={closeMenus}
          className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors sm:flex ${
            showSubscriptionReminder
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : ''
          }`}
          style={
            showSubscriptionReminder
              ? undefined
              : {
                  backgroundColor: 'var(--theme-accent-light)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-accent-text)'
                }
          }
          title={
            subscriptionInfo?.expiryDate
              ? `Expires ${formatSubscriptionExpiry(subscriptionInfo.expiryDate)}`
              : 'Subscription expiry unavailable'
          }
        >
          {showSubscriptionReminder ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Sparkles
              className="h-3.5 w-3.5"
              style={{ color: 'var(--theme-primary)' }}
            />
          )}
          <span className="capitalize">
            {subscriptionPlanName} · {subscriptionCountdown}
          </span>
        </NavLink>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setDropdownOpen(false);
            }}
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} alerts` : ''}`}
            aria-expanded={notificationsOpen}
            className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <button
                type="button"
                aria-label="Close notifications"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setNotificationsOpen(false)}
              />

              <section
                aria-label="Product expiry notifications"
                className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Alerts & Expiry
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Expired or expiring products and subscription reminders
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRefreshNotifications}
                      disabled={isRefreshing}
                      aria-label="Refresh expiry notifications"
                      title="Refresh now"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-700 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
                  {showSubscriptionReminder && subscriptionInfo && (
                    <div
                      role="status"
                      className={`border-b px-4 py-3 ${
                        subscriptionInfo.daysLeft < 0
                          ? 'border-rose-100 bg-rose-50'
                          : 'border-amber-100 bg-amber-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            subscriptionInfo.daysLeft < 0
                              ? 'text-rose-600'
                              : 'text-amber-700'
                          }`}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {subscriptionInfo.daysLeft < 0
                              ? 'Subscription expired'
                              : 'Subscription expiry reminder'}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-700">
                            {subscriptionPlanName} — {subscriptionCountdown}.
                            {subscriptionInfo.expiryDate
                              ? ` Expiry date: ${formatSubscriptionExpiry(
                                  subscriptionInfo.expiryDate
                                )}.`
                              : ''}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {subscriptionInfo.isTrial
                              ? 'Free trial reminders begin 5 days before expiry.'
                              : subscriptionInfo.billingCycle === 'yearly'
                                ? 'Yearly Premium reminders begin 1 month before expiry.'
                                : 'Monthly Premium reminders begin 1 week before expiry.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {productsLoading ? (
                    <p className="px-4 py-8 text-center text-xs text-slate-500">
                      Checking product expiry dates...
                    </p>
                  ) : notificationError ? (
                    <div className="px-4 py-6 text-center">
                      <p role="alert" className="text-xs text-rose-600">
                        {notificationError}
                      </p>
                      <button
                        type="button"
                        onClick={handleRefreshNotifications}
                        className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Retry
                      </button>
                    </div>
                  ) : expiringProducts.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-semibold text-slate-700">
                        No expiry alerts
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        No products are expired or expiring in the next 5 days.
                      </p>
                      <p className="mt-2 text-[10px] text-slate-400">
                        Last checked: {today.toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {expiringProducts.map(
                        ({ product, expiryDate, daysLeft, batchNumber, key }) => {
                          const expired = daysLeft < 0;

                          return (
                            <li key={key} className="flex gap-3 px-4 py-3">
                              <span
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                  expired
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {expired ? (
                                  <AlertTriangle className="h-4 w-4" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-900">
                                  {product.name || 'Unnamed product'}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  SKU: {product.sku || '—'}
                                  {batchNumber ? ` • Batch: ${batchNumber}` : ''}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-600">
                                  Expires {formatDate(expiryDate)}
                                </p>
                              </div>

                              <span
                                className={`h-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                                  expired
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {expired
                                  ? 'Expired'
                                  : daysLeft === 0
                                    ? 'Expires today'
                                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                              </span>
                            </li>
                          );
                        }
                      )}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
                  <NavLink
                    to="/products"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View product catalog
                  </NavLink>
                  <span className="text-[10px] text-slate-400">
                    Auto-checks every minute
                  </span>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setDropdownOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            aria-label="Open user profile menu"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase text-white shadow-xs"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              {user?.full_name?.charAt(0) ||
                user?.name?.charAt(0) ||
                user?.email?.charAt(0) ||
                'U'}
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>

          {dropdownOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setDropdownOpen(false)}
              />

              <div className="absolute right-0 z-50 mt-2 w-56 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-xl">
                <div className="px-4 py-2.5">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {user?.full_name || user?.name || 'User'}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <span className="mt-1 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                      {user.role.replaceAll('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <NavLink
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Store &amp; Tax Settings
                  </NavLink>

                  <NavLink
                    to="/setup-wizard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="h-4 w-4 text-slate-400" />
                    Business Setup Wizard
                  </NavLink>

                  <NavLink
                    to="/select-category"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Store className="h-4 w-4 text-slate-400" />
                    Explore Business Categories
                  </NavLink>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;