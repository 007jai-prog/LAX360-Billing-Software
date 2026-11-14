import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';
import {
  TrendingUp,
  CreditCard,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ScanBarcode,
  Sparkles,
  DollarSign,
  Calendar,
  Download,
  CheckCircle
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const getISOWeekValue = (date) => {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );

  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((utcDate - yearStart) / 86400000 + 1) / 7
  );

  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const getISOWeekStart = (weekValue) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekValue);
  if (!match) return '';

  const year = Number(match[1]);
  const week = Number(match[2]);

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;

  jan4.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  return jan4.toISOString().slice(0, 10);
};

const getWeekRangeLabel = (weekStart) => {
  if (!weekStart) return '';

  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const formatDate = (date) =>
    date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });

  return `${formatDate(start)} – ${formatDate(end)}`;
};

const getSubscriptionReminder = (response) => {
  const sub =
    response?.subscription ||
    response?.current_subscription ||
    response?.data?.subscription ||
    response?.data ||
    response ||
    {};

  const rawPlan =
    sub.plan_name ||
    sub.planName ||
    sub.plan_id ||
    sub.planId ||
    sub.current_plan ||
    sub.currentPlan ||
    sub.plan ||
    sub.name ||
    '';

  const plan = String(
    typeof rawPlan === 'object'
      ? rawPlan?.name || rawPlan?.plan_name || rawPlan?.id || ''
      : rawPlan
  ).toLowerCase();

  const rawExpiry =
    sub.trial_ends_at ||
    sub.trialEndsAt ||
    sub.expires_at ||
    sub.expiresAt ||
    sub.expiry_date ||
    sub.expiryDate ||
    sub.current_period_end ||
    sub.currentPeriodEnd ||
    sub.end_date ||
    sub.endDate;

  if (!rawExpiry) return null;

  const expiryDate = new Date(rawExpiry);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const daysLeft = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const billingCycle = String(
    sub.billing_cycle ||
      sub.billingCycle ||
      sub.billing_period ||
      sub.billingPeriod ||
      sub.interval ||
      ''
  ).toLowerCase();

  const isFreePlan =
    !plan ||
    plan.includes('free') ||
    plan.includes('trial');

  let reminderWindow;
  let planLabel = 'plan';

  if (isFreePlan) {
    reminderWindow = 5;
    planLabel = 'free trial';
  } else if (
    ['yearly', 'annual', 'annually', 'year'].some((value) =>
      billingCycle.includes(value)
    ) ||
    ['yearly', 'annual', 'annually', 'year'].some((value) =>
      plan.includes(value)
    )
  ) {
    reminderWindow = 30;
    planLabel = 'yearly premium plan';
  } else if (
    ['monthly', 'month'].some((value) => billingCycle.includes(value)) ||
    ['monthly', 'month'].some((value) => plan.includes(value))
  ) {
    reminderWindow = 7;
    planLabel = 'monthly premium plan';
  } else {
    return null;
  }

  if (daysLeft > reminderWindow) return null;

  return {
    expired: daysLeft < 0,
    daysLeft: Math.max(daysLeft, 0),
    planLabel,
    expiryText: expiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  };
};

export const Dashboard = () => {
  const { tenant } = useAuth();
  const { config, currentCategory } = useBusinessConfig();
  const { currentPreset } = useTheme();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(() =>
    getISOWeekValue(new Date())
  );
  const [subscriptionReminder, setSubscriptionReminder] = useState(null);

  const primaryColor = currentPreset?.primary || '#4f46e5';

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);

      try {
        const weekStart = getISOWeekStart(selectedWeek);
        const response = await api.get('/dashboard/metrics', {
          params: { week_start: weekStart },
        });

        if (!cancelled) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedWeek]);

  useEffect(() => {
    let cancelled = false;

    const fetchSubscriptionReminder = async () => {
      try {
        const response = await api.get('/subscriptions/current');

        if (!cancelled) {
          setSubscriptionReminder(getSubscriptionReminder(response.data));
        }
      } catch (error) {
        console.warn('Could not load subscription reminder details:', error);
      }
    };

    fetchSubscriptionReminder();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadInvoice = async (invoice) => {
    if (!invoice) return;

    setDownloadingInvoiceId(invoice.id);

    let downloadUrl = null;

    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      downloadUrl = window.URL.createObjectURL(pdfBlob);

      const safeInvoiceNumber = String(invoice.invoice_number || invoice.id).replace(
        /[^a-zA-Z0-9-_]/g,
        '_'
      );

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `invoice-${safeInvoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download invoice PDF:', error);
      alert(
        error.response?.data?.detail ||
          'Failed to download invoice PDF. Please try again.'
      );
    } finally {
      if (downloadUrl) {
        window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      }
      setDownloadingInvoiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const metrics = data?.category_metrics || {};
  const weekStart = getISOWeekStart(selectedWeek);
  const weekRangeLabel = getWeekRangeLabel(weekStart);

  const sub = tenant?.subscription;
  const plan = sub?.plan || 'free_trial';
  const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isTrialing = plan === 'free_trial' && daysLeft !== null && daysLeft > 0;
  const isExpired = plan === 'free_trial' && (daysLeft === null || daysLeft <= 0);
  const isPaid = ['starter', 'professional', 'enterprise'].includes(plan);

  return (
    <div className="space-y-6">
      {subscriptionReminder && (
        <div
          role="status"
          className={`flex flex-col items-start justify-between gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center ${
            subscriptionReminder.expired
              ? 'border-rose-300 bg-gradient-to-r from-rose-50 to-pink-50'
              : 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50'
          }`}
        >
          <div className="flex items-start gap-3 sm:items-center">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                subscriptionReminder.expired ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>

            <div>
              <p
                className={`text-sm font-extrabold ${
                  subscriptionReminder.expired ? 'text-rose-800' : 'text-amber-800'
                }`}
              >
                {subscriptionReminder.expired
                  ? 'Subscription Expired'
                  : 'Subscription Ending Soon'}
              </p>

              <p
                className={`text-xs ${
                  subscriptionReminder.expired ? 'text-rose-700' : 'text-amber-700'
                }`}
              >
                {subscriptionReminder.expired
                  ? `Your ${subscriptionReminder.planLabel} expired on ${subscriptionReminder.expiryText}.`
                  : `Your ${subscriptionReminder.planLabel} ${
                      subscriptionReminder.daysLeft === 0
                        ? 'expires today'
                        : `expires in ${subscriptionReminder.daysLeft} ${
                            subscriptionReminder.daysLeft === 1 ? 'day' : 'days'
                          }`
                    } (${subscriptionReminder.expiryText}).`}
              </p>
            </div>
          </div>

          <NavLink
            to="/settings"
            className={`shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold text-white ${
              subscriptionReminder.expired
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            Manage Subscription
          </NavLink>
        </div>
      )}

      {!subscriptionReminder && (
        (() => {
          if (isPaid) {
            return (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — Active
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      Your subscription is active. All features unlocked.
                    </p>
                  </div>
                </div>
                <NavLink
                  to="/settings"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Manage Plan
                </NavLink>
              </div>
            );
          }

          if (isExpired) {
            return (
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-300 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-200">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-rose-800">
                      Free Trial Expired
                    </p>
                    <p className="text-xs text-rose-600">
                      Your 15-day trial has ended. Upgrade now to continue using LAX360.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <NavLink
                    to="/settings"
                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-700"
                  >
                    Upgrade Now →
                  </NavLink>
                </div>
              </div>
            );
          }

          if (isTrialing) {
            const isUrgent = daysLeft <= 5;
            return (
              <div
                className={`flex flex-col items-start justify-between gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center transition-all ${
                  isUrgent
                    ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50'
                    : 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50'
                }`}
              >
                <div className="flex items-start gap-3 sm:items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
                      isUrgent
                        ? 'bg-amber-500 shadow-amber-200'
                        : 'bg-indigo-500 shadow-indigo-200'
                    }`}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-extrabold ${
                          isUrgent ? 'text-amber-800' : 'text-indigo-800'
                        }`}
                      >
                        {isUrgent ? '⚠️ Trial Ending Soon' : '🎉 Free Trial Active'}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${
                          isUrgent ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                      >
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                      </span>
                    </div>
                    <p
                      className={`text-xs ${
                        isUrgent ? 'text-amber-700' : 'text-indigo-600'
                      }`}
                    >
                      {isUrgent
                        ? `Your trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to avoid interruption.`
                        : `You're on a 15-day free trial. All features unlocked until ${trialEndsAt?.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}.`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className={`hidden rounded-xl border px-3 py-2 sm:block ${
                      isUrgent ? 'border-amber-200 bg-white' : 'border-indigo-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {[...Array(15)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${
                            i < 15 - daysLeft
                              ? isUrgent
                                ? 'bg-amber-400'
                                : 'bg-indigo-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`mt-1 text-center text-[10px] font-semibold ${
                        isUrgent ? 'text-amber-600' : 'text-indigo-600'
                      }`}
                    >
                      {15 - daysLeft}/15 days used
                    </p>
                  </div>
                  <NavLink
                    to="/settings"
                    className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition ${
                      isUrgent
                        ? 'bg-amber-500 shadow-amber-200 hover:bg-amber-600'
                        : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'
                    }`}
                  >
                    {isUrgent ? 'Upgrade Now →' : 'View Plans'}
                  </NavLink>
                </div>
              </div>
            );
          }

          return null;
        })()
      )}

      <div
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all duration-300 sm:p-8"
        style={{
          background: `linear-gradient(135deg, ${
            currentPreset?.sidebarBg || primaryColor
          }, ${primaryColor})`,
        }}
      >
        <div className="absolute -right-10 -top-10 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span>{config?.category_name || 'Retail Business'} Terminal</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {tenant?.name || 'My Store'}
            </h1>
            <p className="mt-1 max-w-xl text-xs text-indigo-200 sm:text-sm">
              Welcome back. Real-time sales, automated GST tracking, and stock
              movement for today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <NavLink
              to="/pos"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-indigo-900 shadow-md transition-all hover:bg-slate-100 active:scale-95"
            >
              <ScanBarcode className="h-4 w-4 text-indigo-600" />
              <span>Open POS Terminal</span>
            </NavLink>

            <NavLink
              to="/products"
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </NavLink>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            ₹{summary.total_sales?.toLocaleString('en-IN') || '0'}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Today: ₹{summary.today_sales?.toLocaleString('en-IN') || '0'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Invoices Issued
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary.total_invoices || '0'}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            This Month: ₹{summary.month_sales?.toLocaleString('en-IN') || '0'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Outstanding Balance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            ₹{summary.pending_payments?.toLocaleString('en-IN') || '0'}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-amber-600">
            Awaiting Customer Clearance
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estimated Profit
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            ₹{summary.net_profit?.toLocaleString('en-IN') || '0'}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            Expenses: ₹{summary.total_expenses?.toLocaleString('en-IN') || '0'}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {config?.category_name} Special Operations
            </h2>
          </div>
          <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
            Active Engine Mode
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {currentCategory === 'restaurant' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Occupied Tables
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.occupied_tables || 0} / {metrics.total_tables || 8}{' '}
                  Tables
                </p>
                <NavLink
                  to="/specialized/tables"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  View Floor Layout →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Active Kitchen KOTs
                </p>
                <p className="mt-1 text-xl font-extrabold text-amber-600">
                  {metrics.active_kots || 0} Cooking
                </p>
                <NavLink
                  to="/specialized/kitchen?view=active"
                  state={{ view: 'active' }}
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Open Kitchen Display (KDS) →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Avg Table Check
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  ₹{metrics.avg_table_ticket || '0'}
                </p>
                <span className="text-[11px] text-slate-400">
                  Dine-in Ticket Average
                </span>
              </div>
            </>
          )}

          {currentCategory === 'pharmacy' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Prescriptions Dispensed
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.prescriptions_dispensed || 0} Rx Logs
                </p>
                <NavLink
                  to="/specialized/prescriptions"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Doctor Prescriptions Log →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Expired Medicines
                </p>
                <p className="mt-1 text-xl font-extrabold text-rose-600">
                  {metrics.expired_medicines_count || 0} Batches
                </p>
                <NavLink
                  to="/specialized/pharmacy-expiry"
                  className="mt-1 inline-block text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Audit Expiry Batches →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Generics In Catalog
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.generic_drugs_count || 0} Salt Compositions
                </p>
                <span className="text-[11px] text-slate-400">
                  Regulatory Compliant
                </span>
              </div>
            </>
          )}

          {currentCategory === 'textile' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Apparel Styles
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.total_styles || 0} Designs
                </p>
                <NavLink
                  to="/products"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  View Styles →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  SKU Variant Matrix
                </p>
                <p className="mt-1 text-xl font-extrabold text-indigo-600">
                  {metrics.variants_tracked || 0} Size/Color Combinations
                </p>
                <NavLink
                  to="/specialized/barcode-generator"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Print Garment Tags →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Garment Exchanges
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.exchanges_this_month || 0} Processed
                </p>
                <NavLink
                  to="/specialized/exchanges"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Exchange Register →
                </NavLink>
              </div>
            </>
          )}

          {currentCategory === 'wholesale' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Active Dealers & Distr.
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.active_dealers || 0} Accounts
                </p>
                <NavLink
                  to="/customers"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Dealer Credit Ledger →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Total B2B Receivables
                </p>
                <p className="mt-1 text-xl font-extrabold text-amber-600">
                  ₹{metrics.total_receivables?.toLocaleString('en-IN') || '0'}
                </p>
                <span className="text-[11px] text-slate-400">
                  Credit Limits Enforced
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Warehouse Transfers
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  Main Depot HQ
                </p>
                <NavLink
                  to="/specialized/warehouses"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Transfer Stock →
                </NavLink>
              </div>
            </>
          )}

          {currentCategory === 'electronics' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Active Repair Tickets
                </p>
                <p className="mt-1 text-xl font-extrabold text-purple-600">
                  {metrics.active_service_repairs || 0} Devices in Service
                </p>
                <NavLink
                  to="/specialized/repairs"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Service Ticket Queue →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Active Warranties
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600">
                  {metrics.active_warranties || 0} Devices Registered
                </p>
                <NavLink
                  to="/specialized/imei-lookup"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  IMEI / Serial Lookup →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Serialized Catalog
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.serialized_devices_in_stock || 0} Models
                </p>
                <span className="text-[11px] text-slate-400">
                  Dual IMEI Tracking
                </span>
              </div>
            </>
          )}

          {currentCategory === 'grocery' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Catalog Articles
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {metrics.items_in_catalog || 0} Products
                </p>
                <NavLink
                  to="/products"
                  className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Barcode Catalog →
                </NavLink>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Fast Moving Goods
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600">
                  {metrics.fast_moving_items || 0} Items
                </p>
                <span className="text-[11px] text-slate-400">
                  High Volume FMCG
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Expiring Batches
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  0 Critical
                </p>
                <span className="text-[11px] text-slate-400">
                  Shelf-life Healthy
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Revenue Analytics
            </h3>
            <p className="text-xs text-slate-400">
              Daily sales for the selected week
              {weekRangeLabel ? ` · ${weekRangeLabel}` : ''}
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <input
              type="week"
              value={selectedWeek}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedWeek(event.target.value);
                }
              }}
              className="bg-transparent outline-none"
              aria-label="Select week for revenue chart"
            />
          </label>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.sales_trend || []}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--theme-border-subtle, #f1f5f9)"
              />

              <XAxis
                dataKey="date"
                stroke="var(--theme-text-muted, #94a3b8)"
                fontSize={12}
                tickLine={false}
              />

              <YAxis
                stroke="var(--theme-text-muted, #94a3b8)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `₹${value}`}
              />

              <Tooltip
                formatter={(value) => [`₹${value}`, 'Sales']}
                contentStyle={{
                  backgroundColor: 'var(--theme-surface, #ffffff)',
                  borderRadius: '12px',
                  borderColor: 'var(--theme-border, #e2e8f0)',
                  color: 'var(--theme-text-primary, #0f172a)',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke={primaryColor}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recent Invoices
              </h3>
              <p className="text-xs text-slate-400">
                Latest transactions generated at POS
              </p>
            </div>

            <NavLink
              to="/invoices"
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              View All →
            </NavLink>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Total (₹)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">PDF</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50 text-xs">
                {(data?.recent_invoices || []).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No invoices recorded yet. Open POS to create the first bill.
                    </td>
                  </tr>
                ) : (
                  data.recent_invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="py-3 font-bold text-indigo-700">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 text-slate-700">
                        {inv.customer_name}
                      </td>
                      <td className="py-3 font-extrabold text-slate-900">
                        ₹{Number(inv.final_payable || 0).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inv.payment_status === 'PAID'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(inv)}
                          disabled={downloadingInvoiceId === inv.id}
                          className="inline-flex items-center gap-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-50"
                          title={`Download invoice ${inv.invoice_number} as PDF`}
                          aria-label={`Download invoice ${inv.invoice_number} as PDF`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingInvoiceId === inv.id && (
                            <span className="text-[10px]">Saving...</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Stock Alerts</h3>
              </div>

              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">
                {summary.low_stock_count || 0} Low
              </span>
            </div>

            <p className="mb-4 text-xs text-slate-500">
              Items at or below minimum threshold. Replenish via Purchase bills.
            </p>

            <div className="space-y-3">
              {(data?.low_stock_alerts || []).length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
                  <p className="text-xs font-bold text-emerald-800">
                    All inventory levels healthy
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-600">
                    No immediate stockout risks
                  </p>
                </div>
              ) : (
                data.low_stock_alerts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <p className="truncate text-xs font-bold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">SKU: {item.sku}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-rose-600">
                        {item.stock} {item.unit}
                      </span>
                      <p className="text-[10px] text-slate-400">Left</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <NavLink
            to="/inventory"
            className="mt-6 block w-full rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Manage Inventory & Stock →
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;