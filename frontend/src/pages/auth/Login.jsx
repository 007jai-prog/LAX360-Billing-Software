import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  Zap,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

const ADMIN_EMAIL = 'admin@lax360.com';
const ADMIN_PASSWORD = 'Admin@12345';
const ADMIN_ROLES = ['saas_super_admin', 'super_admin', 'platform_admin'];

export const Login = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    clearErrors,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const switchLoginMode = (adminMode) => {
    setIsAdminLogin(adminMode);
    setServerError('');
    clearErrors();

    if (adminMode) {
      setValue('email', ADMIN_EMAIL, { shouldValidate: true });
      setValue('password', ADMIN_PASSWORD, { shouldValidate: true });
    } else {
      setValue('email', '');
      setValue('password', '');
    }
  };

  const onSubmit = async (data) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      const response = await login(data.email.trim().toLowerCase(), data.password);
      const role = response?.user?.role;
      const isAdmin = ADMIN_ROLES.includes(role);

      if (isAdminLogin) {
        if (!isAdmin) {
          setServerError(
            'This account is not authorized to access the SaaS Admin Panel.'
          );
          logout();
          return;
        }

        navigate('/admin/dashboard');
        return;
      }

      if (isAdmin) {
        navigate('/admin/dashboard');
      } else if (response?.tenant && !response.tenant.is_setup_completed) {
        navigate('/setup-wizard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setServerError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          'Invalid email or password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openForgotPassword = () => {
    setForgotPasswordEmail(getValues('email') || '');
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setIsForgotPasswordOpen(true);
  };

  const closeForgotPassword = () => {
    if (isSendingReset) return;

    setIsForgotPasswordOpen(false);
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    const email = forgotPasswordEmail.trim().toLowerCase();

    if (!email) {
      setForgotPasswordError('Enter your account email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotPasswordError('Enter a valid email address.');
      return;
    }

    setIsSendingReset(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setForgotPasswordSuccess(
        'If an account exists for that email, password reset instructions will be sent.'
      );
    } catch (error) {
      setForgotPasswordError(
        error.response?.data?.detail ||
          'Could not request a password reset right now. Please try again.'
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="text-center sm:mx-auto sm:w-full sm:max-w-md">
        <NavLink to="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-200">
            <Zap className="h-5 w-5 fill-white" />
          </div>
          <span className="bg-gradient-to-r from-indigo-900 to-indigo-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
            LAX<span className="text-purple-600">360</span>
          </span>
        </NavLink>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {isAdminLogin ? 'SaaS Admin Sign In' : 'Welcome Back'}
        </h1>
        <p className="mt-2 text-xs text-slate-500 sm:text-sm">
          {isAdminLogin
            ? 'Sign in with your platform administrator account'
            : 'Sign in to access your business account'}
        </p>
      </div>

      <div className="mt-8 px-4 sm:mx-auto sm:w-full sm:max-w-md sm:px-0">
        <div className="rounded-3xl border border-slate-100 bg-white px-6 py-8 shadow-xl shadow-slate-100 sm:px-10">
          {isAdminLogin && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Platform administrator credentials are prefilled for this demo.
              </p>
            </div>
          )}

          {serverError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your email address"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Enter a valid email address'
                    }
                  })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required'
                  })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-11 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 focus:text-indigo-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>{isAdminLogin ? 'Sign In to Admin Panel' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
            {isAdminLogin ? (
              <button
                type="button"
                onClick={() => switchLoginMode(false)}
                className="font-bold text-indigo-600 hover:text-indigo-700"
              >
                Back to business sign in
              </button>
            ) : (
              <>
                Don&apos;t have an account yet?{' '}
                <NavLink
                  to="/select-category"
                  className="font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Choose a category and register
                </NavLink>
              </>
            )}
          </div>

          {!isAdminLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => switchLoginMode(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-indigo-700"
              >
                <ShieldCheck className="h-4 w-4" />
                SaaS Admin Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {isForgotPasswordOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForgotPassword();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="forgot-password-title"
                  className="text-lg font-extrabold text-slate-900"
                >
                  Reset your password
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your account email to request password reset instructions.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForgotPassword}
                disabled={isSendingReset}
                aria-label="Close password reset dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {forgotPasswordSuccess ? (
              <div>
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{forgotPasswordSuccess}</p>
                </div>

                <button
                  type="button"
                  onClick={closeForgotPassword}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                {forgotPasswordError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{forgotPasswordError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="forgot-password-email"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      id="forgot-password-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={forgotPasswordEmail}
                      onChange={(event) =>
                        setForgotPasswordEmail(event.target.value)
                      }
                      placeholder="Enter your account email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    disabled={isSendingReset}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSendingReset ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Login;