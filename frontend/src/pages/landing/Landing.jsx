import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import { useAuth } from '../../context/AuthContext';
import DynamicIcon from '../../components/common/DynamicIcon';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  FileText,
  BarChart3,
  Cpu,
  Boxes,
  Users,
  Sparkles,
  Store,
  Loader2,
  AlertCircle
} from 'lucide-react';

const demoAccounts = [
  {
    category: 'Grocery & Supermarket',
    email: 'demo.grocery@lax360.com',
    password: 'Demo@12345',
    icon: 'ShoppingCart',
    color: 'emerald',
    description: 'Barcode POS & Weight Units'
  },
  {
    category: 'Restaurant & Cafe',
    email: 'demo.restaurant@lax360.com',
    password: 'Demo@12345',
    icon: 'UtensilsCrossed',
    color: 'amber',
    description: 'Tables, KOT & Kitchen Display'
  },
  {
    category: 'Pharmacy & Medical',
    email: 'demo.pharmacy@lax360.com',
    password: 'Demo@12345',
    icon: 'Pill',
    color: 'blue',
    description: 'Batch No, Expiry & Rx Log'
  },
  {
    category: 'Textile & Garments',
    email: 'demo.textile@lax360.com',
    password: 'Demo@12345',
    icon: 'Shirt',
    color: 'rose',
    description: 'Size Matrix & Barcode Tags'
  },
  {
    category: 'Wholesale & Distribution',
    email: 'demo.wholesale@lax360.com',
    password: 'Demo@12345',
    icon: 'Truck',
    color: 'indigo',
    description: 'Tiered Bulk Pricing & Credit'
  },
  {
    category: 'Electronics & Mobile',
    email: 'demo.electronics@lax360.com',
    password: 'Demo@12345',
    icon: 'Smartphone',
    color: 'purple',
    description: 'IMEI Tracking & Repair Jobs'
  }
];

const coreFeatures = [
  {
    icon: Cpu,
    title: 'One configurable engine',
    description:
      'A shared billing platform with workflows and product details tailored to each business category.'
  },
  {
    icon: Boxes,
    title: 'Category-specific modules',
    description:
      'Use relevant tools for your trade, from pharmacy batch tracking to electronics IMEI records.'
  },
  {
    icon: Users,
    title: 'Tenant-aware access',
    description:
      'Keep business accounts and user access organized with a multi-tenant application structure.'
  },
  {
    icon: FileText,
    title: 'Billing and invoices',
    description:
      'Create and manage sales documents with support for Indian GST billing workflows.'
  },
  {
    icon: BarChart3,
    title: 'Business reporting',
    description:
      'Review business activity through reports designed for your configured business vertical.'
  },
  {
    icon: Store,
    title: 'POS-ready workflows',
    description:
      'Support day-to-day sales operations with workflows suited to retail and service businesses.'
  }
];

const colorClasses = {
  emerald: {
    border: 'border-emerald-200 hover:border-emerald-500',
    icon: 'bg-emerald-50 text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700'
  },
  amber: {
    border: 'border-amber-200 hover:border-amber-500',
    icon: 'bg-amber-50 text-amber-600',
    badge: 'bg-amber-50 text-amber-700'
  },
  blue: {
    border: 'border-blue-200 hover:border-blue-500',
    icon: 'bg-blue-50 text-blue-600',
    badge: 'bg-blue-50 text-blue-700'
  },
  rose: {
    border: 'border-rose-200 hover:border-rose-500',
    icon: 'bg-rose-50 text-rose-600',
    badge: 'bg-rose-50 text-rose-700'
  },
  indigo: {
    border: 'border-indigo-200 hover:border-indigo-500',
    icon: 'bg-indigo-50 text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700'
  },
  purple: {
    border: 'border-purple-200 hover:border-purple-500',
    icon: 'bg-purple-50 text-purple-600',
    badge: 'bg-purple-50 text-purple-700'
  }
};

export const Landing = () => {
  const { categories = [] } = useBusinessConfig();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [loadingDemoEmail, setLoadingDemoEmail] = useState(null);
  const [demoError, setDemoError] = useState(null);
  const [isWakingServer, setIsWakingServer] = useState(false);

  const handleDemoLogin = async (email, password) => {
    setLoadingDemoEmail(email);
    setDemoError(null);
    setIsWakingServer(false);

    // If request takes longer than 3.5s, it indicates Render free-tier cold start
    const wakeTimer = setTimeout(() => {
      setIsWakingServer(true);
    }, 3500);

    try {
      const response = await login(email, password);
      clearTimeout(wakeTimer);

      const role = response?.user?.role;
      const isAdmin = ['saas_super_admin', 'super_admin', 'platform_admin'].includes(role);

      if (isAdmin) {
        navigate('/admin/dashboard');
      } else if (response?.tenant && !response.tenant.is_setup_completed) {
        navigate('/setup-wizard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      clearTimeout(wakeTimer);
      console.error('Demo login failed:', error);

      let message = 'Unable to complete demo login.';
      if (!error.response) {
        message = 'Cannot connect to backend server. The cloud backend on Render may be waking up from sleep (takes ~20-30 seconds). Please wait a moment and try again.';
      } else if (error.response.status === 401) {
        message = 'Invalid demo credentials. The demo account may be undergoing re-seeding.';
      } else if (error.response.status === 500) {
        message = 'Backend server error occurred. Please verify database connectivity.';
      } else if (error.response.data?.detail) {
        message = typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : JSON.stringify(error.response.data.detail);
      }

      setDemoError(message);
    } finally {
      setLoadingDemoEmail(null);
      setIsWakingServer(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-200">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-indigo-900 to-indigo-700 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                LAX<span className="text-purple-600">360</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Universal Billing SaaS
              </span>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#categories" className="transition-colors hover:text-indigo-600">
              Business Verticals
            </a>
            <a href="#features" className="transition-colors hover:text-indigo-600">
              Core Engine
            </a>
            <a href="#demo" className="transition-colors hover:text-indigo-600">
              One-Click Demos
            </a>
            <a href="#pricing" className="transition-colors hover:text-indigo-600">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <NavLink
                to="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-indigo-600"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/select-category"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-4 w-4" />
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pb-24 pt-16">
          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mb-6 inline-flex animate-pulse items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Next-Gen Indian GST &amp; POS Platform
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-6xl">
              One Universal Billing Engine.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Six Tailored Business Categories.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-slate-600 sm:text-xl">
              Stop juggling multiple disconnected software. LAX360 powers Grocery,
              Restaurant, Pharmacy, Textile, Wholesale, and Electronics businesses
              with isolated multi-tenancy and dynamic modules.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <NavLink
                to="/select-category"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-indigo-300 active:scale-95 sm:w-auto"
              >
                <span>Choose Your Business Vertical</span>
                <ArrowRight className="h-5 w-5" />
              </NavLink>
              <a
                href="#demo"
                className="w-full rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 sm:w-auto"
              >
                Explore Instant Demos
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Full Indian GST (CGST/SGST/IGST)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Decimal128 Precision Engine
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Strict Tenant Data Isolation
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Barcode &amp; PDF Receipts
              </span>
            </div>
          </div>
        </section>

        <section id="categories" className="scroll-mt-24 border-y border-slate-200/80 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Dynamic Business Configuration
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                Select Your Business Category
              </h2>
              <p className="mt-3 text-slate-600">
                The application dynamically configures your dashboard, POS workflows,
                product schemas, and reports for your specific trade.
              </p>
            </div>

            {categories.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                Business categories are currently unavailable.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50 p-7 shadow-xs transition-all hover:border-indigo-300 hover:bg-white hover:shadow-xl"
                  >
                    <div>
                      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100/80 text-indigo-700 shadow-xs transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        <DynamicIcon name={category.icon} className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                        {category.name}
                      </h3>
                      <p className="mb-3 mt-1 text-xs font-medium text-indigo-600/90">
                        {category.tagline}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {category.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-200/60 pt-5">
                      <NavLink
                        to={`/register?category=${encodeURIComponent(category.id)}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:text-indigo-700"
                      >
                        <span>Launch {category.name}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </NavLink>
                      <span className="text-[11px] font-semibold capitalize text-slate-400">
                        {category.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="features" className="scroll-mt-24 bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Core Engine
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                One platform for everyday operations
              </h2>
              <p className="mt-3 text-slate-600">
                A shared billing foundation with configurable workflows and tools for
                different kinds of businesses.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {coreFeatures.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="scroll-mt-24 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Zero Setup Required
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                Instant One-Click Demo Accounts
              </h2>
              <p className="mt-3 text-slate-600">
                Click a business below to try a pre-configured demo account with
                sample data and workflows.
              </p>
            </div>

            {/* Waking cloud server notification */}
            {isWakingServer && (
              <div className="mx-auto mb-6 max-w-xl flex items-center justify-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 shadow-xs animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
                <span>Waking up cloud backend on Render (free tier cold start, takes ~20 seconds)...</span>
              </div>
            )}

            {/* Error banner */}
            {demoError && (
              <div className="mx-auto mb-6 max-w-xl flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{demoError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoError(null)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {demoAccounts.map((demo) => {
                const colors = colorClasses[demo.color];
                const isLoadingThis = loadingDemoEmail === demo.email;
                const isAnyLoading = Boolean(loadingDemoEmail);

                return (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={isAnyLoading}
                    onClick={() => handleDemoLogin(demo.email, demo.password)}
                    className={`flex items-start gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md disabled:cursor-wait disabled:opacity-60 ${colors.border} ${isLoadingThis ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <DynamicIcon name={demo.icon} className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{demo.category}</span>
                        {isLoadingThis && <span className="text-[10px] font-medium text-indigo-600">(Signing in...)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{demo.email}</p>
                      <span
                        className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}
                      >
                        {demo.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                disabled={Boolean(loadingDemoEmail)}
                onClick={() => handleDemoLogin('admin@lax360.com', 'Admin@12345')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingDemoEmail === 'admin@lax360.com' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                )}
                <span>Launch SaaS Super Admin Console (admin@lax360.com)</span>
              </button>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-y border-slate-200/80 bg-slate-50 py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Pricing
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
              Find the right setup for your business
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Choose your business category to get started. This landing page does
              not contain plan or price data, so it avoids displaying unverified
              prices.
            </p>

            <NavLink
              to="/select-category"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700"
            >
              <span>Choose Your Business Category</span>
              <ArrowRight className="h-4 w-4" />
            </NavLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-12 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 md:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
              L
            </div>
            <span className="font-extrabold tracking-tight text-white">
              LAX360 Universal Billing
            </span>
          </div>
          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} LAX360 Billing SaaS Platform. Built with
            Python FastAPI, MongoDB Atlas, and React.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;