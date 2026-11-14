import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import api from '../../api/client';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building2,
  FileText,
  GitBranch,
  CheckCircle,
  AlertCircle,
  MapPin,
  LoaderCircle
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh'
];

const normalizeStateName = (value = '') => {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'nct of delhi' || normalized === 'national capital territory of delhi') {
    return 'Delhi';
  }

  if (normalized === 'orissa') return 'Odisha';
  if (normalized === 'uttaranchal') return 'Uttarakhand';
  if (normalized === 'pondicherry') return 'Puducherry';

  return INDIAN_STATES.find(
    (state) => state.toLowerCase() === normalized
  ) || value;
};

export const BusinessSetupWizard = () => {
  const { tenant, updateTenant, user } = useAuth();
  const { categories = [] } = useBusinessConfig();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingPincode, setIsVerifyingPincode] = useState(false);
  const [verifiedPincode, setVerifiedPincode] = useState('');
  const [pincodeMessage, setPincodeMessage] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      business_name: tenant?.name || '',
      business_category: tenant?.business_category || 'grocery',
      owner_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: tenant?.address || '',
      city: tenant?.city || '',
      state: tenant?.state || '',
      pincode: tenant?.pincode || '',
      gstin: tenant?.gstin || '',
      financial_year: tenant?.financial_year || '2025-2026',
      currency: 'INR',
      invoice_prefix: tenant?.invoice_prefix || 'INV',
      default_tax_rate: tenant?.default_tax_rate ?? 18,
      is_tax_inclusive: tenant?.is_tax_inclusive ?? false,
      branch_name: 'Main Store / HQ',
      branch_code: 'HQ'
    }
  });

  const pincodeValue = watch('pincode');

  const verifyPincode = async (value = pincodeValue) => {
    const pincode = String(value || '').trim();

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setVerifiedPincode('');
      setPincodeMessage('');
      setError('pincode', {
        type: 'validate',
        message: 'Enter a valid 6-digit Indian PIN code.'
      });
      return false;
    }

    setIsVerifyingPincode(true);
    setPincodeMessage('');
    setVerifiedPincode('');
    clearErrors(['pincode', 'city', 'state']);

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`
      );

      if (!response.ok) {
        throw new Error('PIN-code lookup service is unavailable.');
      }

      const result = await response.json();
      const offices = result?.[0]?.PostOffice;

      if (result?.[0]?.Status !== 'Success' || !Array.isArray(offices) || offices.length === 0) {
        setError('pincode', {
          type: 'validate',
          message: 'This PIN code was not found. Check the number and try again.'
        });
        return false;
      }

      const office = offices[0];
      const city = office.District || office.Block || office.Name || '';
      const state = normalizeStateName(office.State || '');

      if (!city || !state) {
        setError('pincode', {
          type: 'validate',
          message: 'Could not determine the city and state for this PIN code.'
        });
        return false;
      }

      setValue('city', city, { shouldValidate: true, shouldDirty: true });
      setValue('state', state, { shouldValidate: true, shouldDirty: true });
      setVerifiedPincode(pincode);
      setPincodeMessage(
        `Verified: ${city}, ${state}${offices.length > 1 ? ` (${offices.length} postal areas)` : ''}`
      );

      return true;
    } catch (error) {
      console.error('PIN-code verification failed:', error);
      setError('pincode', {
        type: 'validate',
        message: 'Could not verify the PIN code. Check your internet connection and try again.'
      });
      return false;
    } finally {
      setIsVerifyingPincode(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      const fieldsAreValid = await trigger([
        'business_name',
        'business_category',
        'owner_name',
        'phone',
        'address',
        'pincode',
        'city',
        'state'
      ]);

      if (!fieldsAreValid) return;

      if (verifiedPincode !== String(pincodeValue || '').trim()) {
        const isVerified = await verifyPincode(pincodeValue);
        if (!isVerified) return;
      }
    }

    setCurrentStep((previous) => Math.min(3, previous + 1));
  };

  const prevStep = () => {
    setCurrentStep((previous) => Math.max(1, previous - 1));
  };

  const onSubmit = async (data) => {
    setServerError('');

    if (verifiedPincode !== String(data.pincode || '').trim()) {
      setCurrentStep(1);
      const isVerified = await verifyPincode(data.pincode);

      if (!isVerified) {
        return;
      }

      // PIN verification filled city/state. Read the updated form values
      // before constructing the request.
      data = {
        ...data,
        city: watch('city'),
        state: watch('state')
      };
    }

    setIsSubmitting(true);

    try {
      const payload = {
        business_name: data.business_name,
        business_category: data.business_category,
        owner_name: data.owner_name,
        email: data.email,
        phone: data.phone,
        gstin: data.gstin,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        currency: data.currency,
        financial_year: data.financial_year,
        invoice_prefix: data.invoice_prefix,
        default_tax_rate: parseFloat(data.default_tax_rate),
        is_tax_inclusive: Boolean(data.is_tax_inclusive),
        branches: [
          {
            name: data.branch_name,
            code: data.branch_code,
            address: data.address
          }
        ]
      };

      const response = await api.post('/tenants/setup-wizard', payload);
      updateTenant(response.data.tenant);
      navigate('/dashboard');
    } catch (error) {
      setServerError(
        error.response?.data?.detail ||
          'Setup failed. Please review your fields and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const fieldError = (name) =>
    errors[name] ? (
      <p className="mt-1 text-xs text-rose-600">{errors[name].message}</p>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Wizard Header */}
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            Quick Store Setup
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Configure Your Business Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Provide your business and GST details to generate invoices and tax filings.
          </p>
        </header>

        {/* Step Progress Tracker */}
        <div className="mb-8 flex items-center justify-between px-1 sm:px-4">
          {[1, 2, 3].map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= step
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold text-slate-800">
                    {step === 1
                      ? 'Store Profile'
                      : step === 2
                        ? 'GST & Taxation'
                        : 'Invoice & Branch'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {step === 1
                      ? 'Address & Contact'
                      : step === 2
                        ? 'GSTIN & Slabs'
                        : 'Numbering & Outlets'}
                  </p>
                </div>
              </div>

              {index < 2 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded-full sm:mx-4 ${
                    currentStep > step ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Wizard Form */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-100 sm:p-10">
          {serverError && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Step 1: Business Profile */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-indigo-700">
                  <Building2 className="h-4 w-4" />
                  <span>Business Location &amp; Contacts</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      {...register('business_name', {
                        required: 'Business name is required.'
                      })}
                      className={inputClass}
                    />
                    {fieldError('business_name')}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Business Category
                    </label>
                    <select
                      {...register('business_category', {
                        required: 'Select a business category.'
                      })}
                      className={`${inputClass} capitalize bg-white`}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {fieldError('business_category')}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Owner / Managing Director *
                    </label>
                    <input
                      type="text"
                      {...register('owner_name', {
                        required: 'Owner name is required.'
                      })}
                      className={inputClass}
                    />
                    {fieldError('owner_name')}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Official Phone *
                    </label>
                    <input
                      type="tel"
                      {...register('phone', {
                        required: 'Phone number is required.',
                        pattern: {
                          value: /^[0-9+\-\s()]{8,15}$/,
                          message: 'Enter a valid phone number.'
                        }
                      })}
                      className={inputClass}
                    />
                    {fieldError('phone')}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Store / Office Address *
                  </label>
                  <input
                    type="text"
                    placeholder="Shop No, Complex, Street Name"
                    {...register('address', {
                      required: 'Address is required.'
                    })}
                    className={inputClass}
                  />
                  {fieldError('address')}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      PIN Code *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="110001"
                        {...register('pincode', {
                          required: 'PIN code is required.',
                          pattern: {
                            value: /^[1-9][0-9]{5}$/,
                            message: 'Enter a valid 6-digit Indian PIN code.'
                          },
                          onChange: () => {
                            setVerifiedPincode('');
                            setPincodeMessage('');
                            setValue('city', '');
                            setValue('state', '');
                            clearErrors(['city', 'state']);
                          }
                        })}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => verifyPincode()}
                        disabled={isVerifyingPincode}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Verify PIN code"
                        title="Verify PIN code"
                      >
                        {isVerifyingPincode ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldError('pincode')}
                    {pincodeMessage && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        {pincodeMessage}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      Enter and verify the PIN code to fill city and state.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      City / District
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Verified from PIN code"
                      {...register('city', {
                        required: 'Verify the PIN code to determine the city.'
                      })}
                      className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-600`}
                    />
                    {fieldError('city')}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      State
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Verified from PIN code"
                      {...register('state', {
                        required: 'Verify the PIN code to determine the state.'
                      })}
                      className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-600`}
                    />
                    {fieldError('state')}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: GST and Tax */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-indigo-700">
                  <FileText className="h-4 w-4" />
                  <span>Indian GST &amp; Tax Configuration</span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="15-character GSTIN, if registered"
                    {...register('gstin', {
                      setValueAs: (value) => value.trim().toUpperCase(),
                      validate: (value) =>
                        !value ||
                        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value) ||
                        'Enter a valid 15-character GSTIN.'
                    })}
                    className={`${inputClass} uppercase`}
                  />
                  {fieldError('gstin')}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Leave blank if your business is not GST registered.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Current Financial Year
                    </label>
                    <select
                      {...register('financial_year')}
                      className={`${inputClass} bg-white`}
                    >
                      <option value="2025-2026">2025 - 2026</option>
                      <option value="2026-2027">2026 - 2027</option>
                      <option value="2024-2025">2024 - 2025</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Default GST Tax Rate
                    </label>
                    <select
                      {...register('default_tax_rate', {
                        valueAsNumber: true
                      })}
                      className={`${inputClass} bg-white`}
                    >
                      <option value={0}>0% (Nil / Exempt)</option>
                      <option value={5}>5% (Essentials / Restaurant)</option>
                      <option value={12}>12% (Processed Goods)</option>
                      <option value={18}>18% (Standard / Services / Tech)</option>
                      <option value={28}>28% (Luxury Goods)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <span>
                    <span className="block text-xs font-bold text-slate-800">
                      Tax Inclusive Pricing
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Product selling prices already include GST.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    {...register('is_tax_inclusive')}
                    className="h-5 w-5 cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            )}

            {/* Step 3: Invoice and Branch */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-indigo-700">
                  <GitBranch className="h-4 w-4" />
                  <span>Invoice Numbering &amp; Main Branch</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Invoice Prefix *
                    </label>
                    <input
                      type="text"
                      placeholder="INV, GRO, or RST"
                      {...register('invoice_prefix', {
                        required: 'Invoice prefix is required.',
                        setValueAs: (value) => value.trim().toUpperCase()
                      })}
                      className={`${inputClass} uppercase`}
                    />
                    {fieldError('invoice_prefix')}
                    <p className="mt-1 text-[11px] text-slate-400">
                      Example: {watch('invoice_prefix') || 'INV'}-2026-0001
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Billing Currency
                    </label>
                    <input
                      type="text"
                      value="INR (₹) Indian Rupee"
                      disabled
                      className={`${inputClass} bg-slate-50 text-slate-500`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Main Branch Name
                    </label>
                    <input
                      type="text"
                      {...register('branch_name', {
                        required: 'Branch name is required.'
                      })}
                      className={inputClass}
                    />
                    {fieldError('branch_name')}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Branch Code
                    </label>
                    <input
                      type="text"
                      {...register('branch_code', {
                        required: 'Branch code is required.',
                        setValueAs: (value) => value.trim().toUpperCase()
                      })}
                      className={`${inputClass} uppercase`}
                    />
                    {fieldError('branch_code')}
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous Step</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={isVerifyingPincode}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <span>
                    {currentStep === 1 ? 'Next: GST Settings' : 'Next: Invoice Settings'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isVerifyingPincode}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Finalizing Setup...</span>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Complete Setup &amp; Launch Dashboard</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessSetupWizard;