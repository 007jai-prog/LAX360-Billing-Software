import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  MapPin
} from 'lucide-react';

const getEmployeeName = (value) => {
  if (!value) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    return value.full_name || value.name || value.email || value.id || '';
  }

  return String(value);
};

const getCustomerKeys = (customer = {}) => {
  const keys = [];

  if (customer.id != null) keys.push(`id:${customer.id}`);
  if (customer._id != null) keys.push(`id:${customer._id}`);

  const email = String(customer.email || '').trim().toLowerCase();
  if (email) keys.push(`email:${email}`);

  const phone = String(customer.phone || '').replace(/\D/g, '');
  if (phone) keys.push(`phone:${phone}`);

  return keys;
};

const readCustomerAudit = (storageKey) => {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Could not read locally saved customer audit data:', error);
    return {};
  }
};

const saveCustomerCreator = (storageKey, customer, employeeName, employeeId) => {
  const auditRecords = readCustomerAudit(storageKey);
  const audit = {
    created_by_name: employeeName,
    created_by: employeeId || null
  };

  getCustomerKeys(customer).forEach((key) => {
    auditRecords[key] = audit;
  });

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(auditRecords));
  } catch (error) {
    console.warn('Could not save customer audit data in this browser:', error);
  }
};

const mergeCustomerAudit = (customers, storageKey) => {
  const auditRecords = readCustomerAudit(storageKey);

  return customers.map((customer) => {
    const localAudit = getCustomerKeys(customer)
      .map((key) => auditRecords[key])
      .find(Boolean);

    return localAudit
      ? {
          ...customer,
          created_by: customer.created_by || localAudit.created_by,
          created_by_name:
            customer.created_by_name || localAudit.created_by_name
        }
      : customer;
  });
};

const getCustomerAudit = (customer) => {
  const changedBy =
    getEmployeeName(
      customer.updated_by_name ||
        customer.last_changed_by_name ||
        customer.updated_by ||
        customer.last_changed_by
    );

  if (changedBy) {
    return { action: 'Last changed by', employee: changedBy };
  }

  const addedBy =
    getEmployeeName(
      customer.created_by_name ||
        customer.added_by_name ||
        customer.created_by ||
        customer.added_by
    );

  if (addedBy) {
    return { action: 'Added by', employee: addedBy };
  }

  return { action: 'Not recorded', employee: '' };
};

const lookupIndianPincode = async (pincode) => {
  const normalizedPincode = String(pincode || '').trim();

  if (!/^\d{6}$/.test(normalizedPincode)) {
    throw new Error('Enter a valid six-digit Indian pincode.');
  }

  const response = await fetch(
    `https://api.postalpincode.in/pincode/${encodeURIComponent(normalizedPincode)}`
  );

  if (!response.ok) {
    throw new Error('Could not verify this pincode. Please try again.');
  }

  const result = await response.json();
  const postOffices = result?.[0]?.PostOffice;

  if (
    result?.[0]?.Status !== 'Success' ||
    !Array.isArray(postOffices) ||
    postOffices.length === 0
  ) {
    throw new Error('This pincode was not found. Check the number and try again.');
  }

  const postOffice = postOffices[0];
  const city = postOffice.District || postOffice.Block || postOffice.Name;
  const state = postOffice.State;

  if (!city || !state) {
    throw new Error('Could not determine the city and state for this pincode.');
  }

  return { city, state };
};

export const CustomersList = () => {
  const { user, tenant } = useAuth();

  const employeeName =
    user?.full_name || user?.name || user?.email || 'Current user';
  const employeeId = user?.id || user?._id || null;
  const tenantKey = tenant?.id || tenant?.slug || tenant?.name || 'default';
  const auditStorageKey = `customer-audit:${tenantKey}`;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pincodeLookupStatus, setPincodeLookupStatus] = useState('idle');
  const [pincodeLookupMessage, setPincodeLookupMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      gstin: '',
      customer_tier: 'RETAIL',
      credit_limit: 25000,
      billing_address: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  const fetchCustomers = async () => {
    setLoading(true);

    try {
      let url = '/customers?limit=100';
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await api.get(url);
      const customerList = Array.isArray(response.data?.items)
        ? response.data.items
        : Array.isArray(response.data)
          ? response.data
          : [];

      setCustomers(mergeCustomerAudit(customerList, auditStorageKey));
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, auditStorageKey]);

  const applyPincodeLookup = async (value) => {
    const pincode = String(value || '').trim();

    if (!pincode) {
      setPincodeLookupStatus('idle');
      setPincodeLookupMessage('');
      setValue('city', '');
      setValue('state', '');
      return false;
    }

    if (!/^\d{6}$/.test(pincode)) {
      setPincodeLookupStatus('error');
      setPincodeLookupMessage('Enter a valid six-digit Indian pincode.');
      setValue('city', '');
      setValue('state', '');
      return false;
    }

    setPincodeLookupStatus('loading');
    setPincodeLookupMessage('Checking pincode...');
    setValue('city', '');
    setValue('state', '');

    try {
      const location = await lookupIndianPincode(pincode);

      // Ignore a response for an old pincode if the user has edited it.
      if (String(getValues('pincode') || '').trim() !== pincode) {
        return false;
      }

      setValue('city', location.city, {
        shouldValidate: true,
        shouldDirty: true
      });
      setValue('state', location.state, {
        shouldValidate: true,
        shouldDirty: true
      });
      setPincodeLookupStatus('success');
      setPincodeLookupMessage(
        `Verified: ${location.city}, ${location.state}`
      );

      return location;
    } catch (error) {
      setPincodeLookupStatus('error');
      setPincodeLookupMessage(
        error.message || 'Could not verify this pincode.'
      );
      setValue('city', '');
      setValue('state', '');
      return false;
    }
  };

  const handlePincodeChange = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6);

    setValue('pincode', value, {
      shouldDirty: true,
      shouldValidate: true
    });
    setValue('city', '');
    setValue('state', '');
    setPincodeLookupStatus('idle');
    setPincodeLookupMessage('');

    if (value.length === 6) {
      void applyPincodeLookup(value);
    }
  };

  const onAddCustomer = async (data) => {
    setIsSubmitting(true);

    try {
      const location = await lookupIndianPincode(data.pincode);

      const payload = {
        ...data,
        city: location.city,
        state: location.state,
        pincode: String(data.pincode).trim(),
        credit_limit: Number(data.credit_limit) || 0
      };

      const response = await api.post('/customers', payload);
      const createdCustomer = response.data?.customer || response.data || {};

      // Keep local attribution for this browser. The backend should also save
      // creator fields from its authenticated user for shared, durable history.
      const auditCustomer = {
        ...createdCustomer,
        email: createdCustomer.email || payload.email,
        phone: createdCustomer.phone || payload.phone
      };

      saveCustomerCreator(
        auditStorageKey,
        auditCustomer,
        employeeName,
        employeeId
      );

      setIsAddOpen(false);
      reset();
      setPincodeLookupStatus('idle');
      setPincodeLookupMessage('');

      await fetchCustomers();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          error.message ||
          'Failed to add customer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddCustomer = () => {
    reset({
      name: '',
      phone: '',
      email: '',
      gstin: '',
      customer_tier: 'RETAIL',
      credit_limit: 25000,
      billing_address: '',
      city: '',
      state: '',
      pincode: ''
    });
    setPincodeLookupStatus('idle');
    setPincodeLookupMessage('');
    setIsAddOpen(true);
  };

  const closeAddCustomer = () => {
    if (isSubmitting) return;

    setIsAddOpen(false);
    setPincodeLookupStatus('idle');
    setPincodeLookupMessage('');
  };

  const pincodeRegistration = register('pincode', {
    required: 'Pincode is required',
    pattern: {
      value: /^\d{6}$/,
      message: 'Enter a valid six-digit Indian pincode'
    }
  });

  const selectedAudit = selectedCustomer
    ? getCustomerAudit(selectedCustomer)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Customer Directory &amp; Ledgers
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Track customer details, balances, and employee audit history
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddCustomer}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, or GSTIN..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <span className="text-xs font-semibold text-slate-400">
          {customers.length} Customer Accounts
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Tier</th>
                <th className="px-4 py-3.5">GSTIN</th>
                <th className="px-4 py-3.5">Credit Limit</th>
                <th className="px-4 py-3.5">Outstanding Due</th>
                <th className="px-4 py-3.5">State</th>
                <th className="px-4 py-3.5">Added / Changed By</th>
                <th className="px-6 py-3.5">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="mx-auto mb-2 h-10 w-10 stroke-[1.5] text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No customer records
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const audit = getCustomerAudit(customer);

                  return (
                    <tr
                      key={customer.id || customer._id || customer.phone}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {customer.name}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        <p>{customer.phone || '—'}</p>
                        {customer.email && (
                          <p className="text-[10px] text-slate-400">
                            {customer.email}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            customer.customer_tier === 'DISTRIBUTOR'
                              ? 'bg-purple-50 text-purple-700'
                              : customer.customer_tier === 'DEALER'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {customer.customer_tier || 'RETAIL'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {customer.gstin || 'Unregistered'}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-700">
                        ₹{Number(customer.credit_limit || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`font-mono font-extrabold ${
                            Number(customer.outstanding_balance || 0) > 0
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          ₹{Number(
                            customer.outstanding_balance ?? 0
                          ).toFixed(2)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        {customer.state || '—'}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="text-[10px] font-semibold text-slate-500">
                          {audit.action}
                        </p>
                        <p className="mt-0.5 max-w-40 truncate font-medium text-slate-800">
                          {audit.employee || '—'}
                        </p>
                      </td>

                      <td className="px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={closeAddCustomer}
        title="Register Customer Account"
        size="md"
      >
        <form onSubmit={handleSubmit(onAddCustomer)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Customer / Business Name *
              </label>
              <input
                type="text"
                {...register('name', {
                  required: 'Customer name is required'
                })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Phone Number *
              </label>
              <input
                type="tel"
                {...register('phone', {
                  required: 'Phone number is required'
                })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              {errors.phone && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Customer Tier
              </label>
              <select
                {...register('customer_tier')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="RETAIL">Retail Customer</option>
                <option value="DEALER">Dealer / Merchant</option>
                <option value="DISTRIBUTOR">Distributor / Stockist</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('credit_limit')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Customer GSTIN
              </label>
              <input
                type="text"
                placeholder="15-character GSTIN"
                {...register('gstin')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs uppercase"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
              Billing Address
            </label>
            <input
              type="text"
              {...register('billing_address')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="customer-pincode"
                className="mb-1 block text-xs font-bold uppercase text-slate-700"
              >
                Pincode *
              </label>
              <input
                id="customer-pincode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                placeholder="6-digit PIN"
                {...register('pincode', {
                  required: 'Pincode is required',
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Enter a valid six-digit Indian pincode'
                  }
                })}
                onChange={handlePincodeChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.pincode && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {errors.pincode.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="customer-city"
                className="mb-1 block text-xs font-bold uppercase text-slate-700"
              >
                City / District
              </label>
              <input
                id="customer-city"
                type="text"
                readOnly
                placeholder="Set by pincode"
                {...register('city')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              />
            </div>

            <div>
              <label
                htmlFor="customer-state"
                className="mb-1 block text-xs font-bold uppercase text-slate-700"
              >
                State
              </label>
              <input
                id="customer-state"
                type="text"
                readOnly
                placeholder="Set by pincode"
                {...register('state')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              />
            </div>
          </div>

          {pincodeLookupMessage && (
            <p
              role={pincodeLookupStatus === 'error' ? 'alert' : 'status'}
              className={`flex items-center gap-2 text-xs ${
                pincodeLookupStatus === 'error'
                  ? 'text-rose-600'
                  : pincodeLookupStatus === 'success'
                    ? 'text-emerald-700'
                    : 'text-slate-500'
              }`}
            >
              {pincodeLookupStatus === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 shrink-0" />
              )}
              {pincodeLookupMessage}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeAddCustomer}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pincodeLookupStatus === 'loading'}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                {isSubmitting ? 'Verifying & Saving...' : 'Save Customer'}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {selectedCustomer && selectedAudit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-details-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="customer-details-title"
                className="text-lg font-bold text-slate-900"
              >
                Customer Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Name', selectedCustomer.name],
                ['Phone', selectedCustomer.phone],
                ['Email', selectedCustomer.email],
                ['Tier', selectedCustomer.customer_tier],
                ['GSTIN', selectedCustomer.gstin || 'Unregistered'],
                ['Credit Limit', `₹${selectedCustomer.credit_limit ?? 0}`],
                [
                  'Outstanding Due',
                  `₹${Number(
                    selectedCustomer.outstanding_balance ?? 0
                  ).toFixed(2)}`
                ],
                ['Pincode', selectedCustomer.pincode],
                ['City', selectedCustomer.city],
                ['State', selectedCustomer.state || '—'],
                ['Billing Address', selectedCustomer.billing_address],
                [
                  selectedAudit.action,
                  selectedAudit.employee || 'Not recorded'
                ]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                    {label}
                  </p>
                  <p className="break-words text-sm font-medium text-slate-800">
                    {value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;