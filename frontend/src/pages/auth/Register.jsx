import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import {
  Zap,
  ArrowRight,
  Store,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  CalendarClock,
  CreditCard
} from 'lucide-react';

const SUBSCRIPTION_KEY_PREFIX = 'lax360_saas_subscription:';

const PREMIUM_PRICES = {
  monthly: 499,
  yearly: 4990
};

const normalizeEmail = (email) => email?.trim().toLowerCase() || '';

const getSubscriptionStorageKey = (email) => {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail
    ? `${SUBSCRIPTION_KEY_PREFIX}${encodeURIComponent(normalizedEmail)}`
    : null;
};

const getSavedSubscription = (email) => {
  const key = getSubscriptionStorageKey(email);
  if (!key) return null;

  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Unable to read saved subscription:', error);
    return null;
  }
};

const getSubscriptionExpiry = (subscription) => {
  if (!subscription) return null;

  if (subscription.expiresAt) {
    const explicitExpiry = new Date(subscription.expiresAt);
    return Number.isNaN(explicitExpiry.getTime()) ? null : explicitExpiry;
  }

  if (!subscription.startedAt) return null;

  const start = new Date(subscription.startedAt);
  if (Number.isNaN(start.getTime())) return null;

  const expiry = new Date(start);

  if (subscription.planId === 'trial' || subscription.isFreeTrial) {
    expiry.setDate(expiry.getDate() + 15);
    return expiry;
  }

  if (subscription.billingCycle === 'yearly') {
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  if (subscription.billingCycle === 'monthly') {
    expiry.setMonth(expiry.getMonth() + 1);
    return expiry;
  }

  return null;
};

const getRemainingDays = (expiryDate, now) => {
  if (!expiryDate) return null;

  return Math.max(
    0,
    Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24))
  );
};

const formatDate = (date) => {
  if (!date) return 'Unavailable';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const addBillingPeriod = (date, billingCycle) => {
  const expiry = new Date(date);

  if (billingCycle === 'yearly') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }

  return expiry;
};

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'grocery';

  const { register: registerAuth, user } = useAuth();
  const { categories = [] } = useBusinessConfig();
  const navigate = useNavigate();

  const signedInEmail = normalizeEmail(user?.email);

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState(1);
  const [registeredAccount, setRegisteredAccount] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('trial');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isRenewal, setIsRenewal] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [subscription, setSubscription] = useState(() =>
    getSavedSubscription(signedInEmail)
  );
  const [subscriptionEmail, setSubscriptionEmail] = useState(signedInEmail);

  const [payment, setPayment] = useState({
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      business_category: initialCategory,
      full_name: '',
      business_name: '',
      email: '',
      phone: '',
      password: ''
    }
  });

  const currentEmail = normalizeEmail(
    registeredAccount?.businessEmail || signedInEmail
  );

  const currentSubscription =
    subscriptionEmail === currentEmail ? subscription : null;

  useEffect(() => {
    const nextSubscription = getSavedSubscription(currentEmail);
    setSubscription(nextSubscription);
    setSubscriptionEmail(currentEmail);
  }, [currentEmail]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60 * 1000);

    const syncSubscription = (event) => {
      const expectedKey = getSubscriptionStorageKey(currentEmail);

      if (!event || event.key === expectedKey) {
        setSubscription(getSavedSubscription(currentEmail));
        setSubscriptionEmail(currentEmail);
        setNow(Date.now());
      }
    };

    window.addEventListener('storage', syncSubscription);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', syncSubscription);
    };
  }, [currentEmail]);

  const expiryDate = useMemo(
    () => getSubscriptionExpiry(currentSubscription),
    [currentSubscription]
  );

  const remainingDays = useMemo(
    () => getRemainingDays(expiryDate, now),
    [expiryDate, now]
  );

  const isExpired = Boolean(
    currentSubscription && expiryDate && now >= expiryDate.getTime()
  );

  const isActive = Boolean(
    currentSubscription && expiryDate && now < expiryDate.getTime()
  );

  const isTrialSubscription = Boolean(
    currentSubscription?.planId === 'trial' ||
      currentSubscription?.isFreeTrial
  );

  const onRegisterAccount = async (data) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      await registerAuth(data);

      const account = {
        organizationName: data.business_name,
        businessEmail: normalizeEmail(data.email),
        ownerName: data.full_name,
        phone: data.phone,
        businessCategory: data.business_category
      };

      setRegisteredAccount(account);

      const accountSubscription = getSavedSubscription(account.businessEmail);
      setSubscription(accountSubscription);
      setSubscriptionEmail(account.businessEmail);
      setStage(2);
    } catch (error) {
      setServerError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          'Registration failed. Please check your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = () => {
    setIsRenewal(true);
    setRegisteredAccount({
      organizationName:
        currentSubscription?.organizationName || user?.tenant?.name || 'Your organization',
      businessEmail:
        currentSubscription?.businessEmail || signedInEmail,
      ownerName: currentSubscription?.ownerName || user?.full_name || ''
    });
    setSelectedPlan('premium');
    setStage(2);
    setServerError('');
  };

  const choosePlan = (plan) => {
    if (isRenewal && plan === 'trial') return;

    setSelectedPlan(plan);
    setServerError('');
    setStage(3);
  };

  const handlePaymentChange = (field, value) => {
    setPayment((current) => ({ ...current, [field]: value }));
  };

  const activateSelectedPlan = (event) => {
    event.preventDefault();
    setServerError('');

    if (selectedPlan === 'premium') {
      if (!payment.cardholder.trim()) {
        setServerError('Enter the cardholder name to continue.');
        return;
      }

      if (payment.cardNumber.replace(/\s/g, '').length < 12) {
        setServerError('Enter a valid demo card number to continue.');
        return;
      }

      if (!payment.expiry.trim() || !payment.cvc.trim()) {
        setServerError('Complete the demo card expiry and security code.');
        return;
      }
    }

    const accountEmail = normalizeEmail(
      registeredAccount?.businessEmail || signedInEmail
    );

    if (!accountEmail) {
      setServerError(
        'An account email is required. Please register or sign in again.'
      );
      return;
    }

    const startedAt = new Date();
    const isTrial = selectedPlan === 'trial';
    const expiresAt = isTrial
      ? new Date(startedAt.getTime() + 15 * 24 * 60 * 60 * 1000)
      : addBillingPeriod(startedAt, billingCycle);

    const nextSubscription = {
      organizationName:
        registeredAccount?.organizationName ||
        currentSubscription?.organizationName ||
        'Your organization',
      businessEmail: accountEmail,
      ownerName:
        registeredAccount?.ownerName ||
        currentSubscription?.ownerName ||
        '',
      businessCategory:
        registeredAccount?.businessCategory ||
        currentSubscription?.businessCategory ||
        '',
      planId: isTrial ? 'trial' : 'premium',
      planName: isTrial ? '15-day Free Trial' : 'Premium',
      billingCycle: isTrial ? 'trial' : billingCycle,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isFreeTrial: isTrial,
      isPaid: !isTrial,
      paymentStatus: isTrial ? 'trial' : 'demo-paid',
      amount: isTrial
        ? 0
        : billingCycle === 'yearly'
        ? PREMIUM_PRICES.yearly
        : PREMIUM_PRICES.monthly
    };

    const storageKey = getSubscriptionStorageKey(accountEmail);

    try {
      localStorage.setItem(storageKey, JSON.stringify(nextSubscription));
      setSubscription(nextSubscription);
      setSubscriptionEmail(accountEmail);
      setStage(4);
      setIsRenewal(false);
      setNow(Date.now());
    } catch (error) {
      console.error('Unable to save subscription state:', error);
      setServerError('Could not save your plan in this browser. Please try again.');
    }
  };

  const continueToSetup = () => {
    navigate('/setup-wizard');
  };

  if (isExpired && stage === 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <main className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
            Account access paused
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
            {isTrialSubscription
              ? 'Your 15-day free trial is over'
              : 'Your subscription has expired'}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {isTrialSubscription
              ? 'This account has already used its free trial. Renew with Premium to continue.'
              : 'This account’s subscription has ended. Renew your plan to restore access.'}
          </p>

          {expiryDate && (
            <p className="mt-3 text-sm text-slate-500">
              Expired on <strong>{formatDate(expiryDate)}</strong>
            </p>
          )}

          <button
            type="button"
            onClick={handleRenew}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700"
          >
            Renew with Premium
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-5 text-xs text-slate-400">
            Renewal uses a demo checkout in this frontend. No real payment is processed.
          </p>
        </main>
      </div>
    );
  }

  if (isActive && stage === 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <main className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-8 w-8" />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Active account
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
            {currentSubscription.organizationName || 'Your organization'}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {currentSubscription.planName ||
              (isTrialSubscription ? '15-day Free Trial' : 'Premium')}{' '}
            is active
            {remainingDays !== null ? ` with ${remainingDays} day(s) remaining` : ''}.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Access ends on {formatDate(expiryDate)}.
          </p>

          {isTrialSubscription &&
            remainingDays !== null &&
            remainingDays <= 5 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <CalendarClock className="mr-1 inline h-4 w-4" />
                Your trial ends in {remainingDays} day(s). Renew now to keep access.
              </div>
            )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={continueToSetup}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Continue to setup
            </button>
            <button
              type="button"
              onClick={handleRenew}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Change / renew plan
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <NavLink to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-200">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-900 to-indigo-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              LAX<span className="text-purple-600">360</span>
            </span>
          </NavLink>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {stage === 1
              ? 'Create your organization'
              : stage === 2
              ? 'Choose your plan'
              : stage === 3
              ? selectedPlan === 'trial'
                ? 'Activate your free trial'
                : 'Premium checkout'
              : 'Your plan is active'}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {stage < 4 ? `Step ${stage} of 3` : 'Your organization subscription is ready.'}
          </p>
        </header>

        {stage < 4 && (
          <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Registration progress">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full ${
                  stage >= step ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        )}

        {serverError && (
          <div
            role="alert"
            className="mt-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {stage === 1 && (
          <section className="mt-6 rounded-3xl border border-slate-100 bg-white px-6 py-8 shadow-xl shadow-slate-100 sm:px-10">
            <form onSubmit={handleSubmit(onRegisterAccount)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Business category
                </label>
                <select
                  {...register('business_category', {
                    required: 'Please select a category'
                  })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold capitalize text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  {categories.length === 0 && (
                    <option value={initialCategory}>{initialCategory}</option>
                  )}
                </select>
                {errors.business_category && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {errors.business_category.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Business / organization name
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. FreshMart Supermarket"
                    {...register('business_name', {
                      required: 'Business name is required'
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {errors.business_name && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {errors.business_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Owner / admin full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    {...register('full_name', {
                      required: 'Full name is required'
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="name@business.com"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^\S+@\S+\.\S+$/,
                          message: 'Enter a valid email address'
                        }
                      })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      {...register('phone')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Minimum 6 characters'
                      }
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  'Creating organization...'
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Already registered?{' '}
              <NavLink
                to="/login"
                className="font-bold text-indigo-600 hover:text-indigo-700"
              >
                Sign in
              </NavLink>
            </div>
          </section>
        )}

        {stage === 2 && (
          <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-100 sm:p-8">
            {registeredAccount && (
              <p className="mb-6 text-sm text-slate-600">
                Organization:{' '}
                <strong className="text-slate-900">
                  {registeredAccount.organizationName}
                </strong>
                <span className="ml-1 text-slate-500">
                  ({registeredAccount.businessEmail})
                </span>
              </p>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <article
                className={`rounded-2xl border p-6 ${
                  selectedPlan === 'trial'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  15 days free
                </div>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Free Trial
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Try the product for 15 days. No payment is collected for the trial.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    Trial access for 15 days
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    Reminder shown during the final 5 days
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    Account-specific trial status
                  </li>
                </ul>
                <button
                  type="button"
                  disabled={isRenewal}
                  onClick={() => choosePlan('trial')}
                  className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRenewal ? 'Trial unavailable for renewal' : 'Choose free trial'}
                </button>
              </article>

              <article
                className={`rounded-2xl border p-6 ${
                  selectedPlan === 'premium'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Monthly or yearly
                </div>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Premium
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Choose a billing cycle. Demo prices below are placeholders.
                </p>

                <div className="mt-5 space-y-3">
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <span>
                      <span className="block text-sm font-bold text-slate-900">
                        Monthly
                      </span>
                      <span className="text-xs text-slate-500">
                        ₹{PREMIUM_PRICES.monthly} per month
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="billingCycle"
                      checked={billingCycle === 'monthly'}
                      onChange={() => setBillingCycle('monthly')}
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <span>
                      <span className="block text-sm font-bold text-slate-900">
                        Yearly
                      </span>
                      <span className="text-xs text-slate-500">
                        ₹{PREMIUM_PRICES.yearly} per year
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="billingCycle"
                      checked={billingCycle === 'yearly'}
                      onChange={() => setBillingCycle('yearly')}
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => choosePlan('premium')}
                  className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Choose Premium
                </button>
              </article>
            </div>

            <button
              type="button"
              onClick={() => setStage(1)}
              className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              Back
            </button>
          </section>
        )}

        {stage === 3 && (
          <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-100 sm:p-8">
            <div className="mb-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Selected plan
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {selectedPlan === 'trial'
                  ? '15-day Free Trial'
                  : `Premium — ${billingCycle}`}
              </p>
              {selectedPlan === 'premium' && (
                <p className="mt-1 text-sm text-slate-600">
                  Demo amount: ₹
                  {billingCycle === 'yearly'
                    ? PREMIUM_PRICES.yearly
                    : PREMIUM_PRICES.monthly}
                  {billingCycle === 'yearly' ? ' per year' : ' per month'}
                </p>
              )}
            </div>

            {selectedPlan === 'trial' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="font-bold text-emerald-900">
                  Start your 15-day trial?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                  Your trial starts when you activate it. The countdown is saved
                  separately for this account.
                </p>
                <button
                  type="button"
                  onClick={activateSelectedPlan}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Activate free trial
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={activateSelectedPlan} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Demo checkout</h2>
                    <p className="text-xs text-slate-500">
                      This form simulates checkout. No card is charged.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Cardholder name
                  </label>
                  <input
                    type="text"
                    value={payment.cardholder}
                    onChange={(event) =>
                      handlePaymentChange('cardholder', event.target.value)
                    }
                    placeholder="Name on card"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Demo card number
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payment.cardNumber}
                    onChange={(event) =>
                      handlePaymentChange('cardNumber', event.target.value)
                    }
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Expiry
                    </label>
                    <input
                      type="text"
                      value={payment.expiry}
                      onChange={(event) =>
                        handlePaymentChange('expiry', event.target.value)
                      }
                      placeholder="MM/YY"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      CVC
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={payment.cvc}
                      onChange={(event) =>
                        handlePaymentChange('cvc', event.target.value)
                      }
                      placeholder="123"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Simulate payment and activate Premium
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setStage(2)}
              className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              Back to plan selection
            </button>
          </section>
        )}

        {stage === 4 && (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl shadow-slate-100">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-slate-900">
              {currentSubscription?.planId === 'trial'
                ? 'Your free trial is active'
                : 'Your Premium plan is active'}
            </h2>

            <p className="mt-3 text-sm text-slate-600">
              {currentSubscription?.organizationName || 'Your organization'} access
              ends on <strong>{formatDate(getSubscriptionExpiry(currentSubscription))}</strong>.
            </p>

            {currentSubscription?.planId === 'trial' && (
              <p className="mt-2 text-sm text-slate-600">
                A reminder will appear on this page during the final five days.
              </p>
            )}

            <button
              type="button"
              onClick={continueToSetup}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Continue to business setup
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        <footer className="mt-6 text-center text-xs text-slate-500">
          <NavLink
            to="/login"
            className="font-bold text-indigo-600 hover:text-indigo-700"
          >
            Already registered? Sign in
          </NavLink>
        </footer>
      </div>
    </div>
  );
};

export default Register;