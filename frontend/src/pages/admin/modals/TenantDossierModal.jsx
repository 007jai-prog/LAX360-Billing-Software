import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import {
  X,
  Building2,
  Users,
  FileText,
  Boxes,
  MapPin,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle,
  XCircle,
  ExternalLink,
  DollarSign
} from 'lucide-react';

const formatCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatNumber = (val) =>
  Number(val || 0).toLocaleString('en-IN');

export const TenantDossierModal = ({ tenant, onClose, onImpersonate }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    const fetchDossier = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/tenants/${tenant.id}`);
        setDetails(res.data);
      } catch (err) {
        console.error('Failed to load tenant details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDossier();
  }, [tenant?.id]);

  if (!tenant) return null;

  const t = details?.tenant || tenant;
  const metrics = details?.metrics || {};
  const users = details?.users || [];
  const branches = details?.branches || [];
  const recentInvoices = details?.recent_invoices || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-black text-sm uppercase">
              {t.name?.charAt(0) || 'B'}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{t.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {t.business_category}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5">Tenant ID: {t.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onImpersonate(t)}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Drive Store</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
              <p>Loading complete business dossier…</p>
            </div>
          ) : (
            <>
              {/* Top Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Revenue
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {formatCurrency(metrics.total_revenue)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Invoices Billed
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {formatNumber(metrics.total_invoices)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Catalog Items
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {formatNumber(metrics.total_products)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Active Plan
                  </p>
                  <p className="text-lg font-extrabold text-purple-700 capitalize mt-0.5">
                    {t.subscription?.plan || 'Starter'}
                  </p>
                </div>
              </div>

              {/* Profile & Location Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Business &amp; Tax Profile
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Legal Name:</span>
                      <strong className="text-slate-800">{t.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <strong className="font-mono text-slate-800">{t.gstin || 'Unregistered'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Invoice Prefix:</span>
                      <strong className="font-mono text-indigo-700">{t.invoice_prefix || 'INV'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Default Tax Rate:</span>
                      <strong className="text-slate-800">{t.default_tax_rate || 18}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Business Status:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                          t.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {t.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Owner &amp; Location Address
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Owner Name:</span>
                      <strong className="text-slate-800">{t.owner_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-700 font-medium">{t.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-slate-700 font-mono">{t.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">City / State:</span>
                      <span className="text-slate-700">
                        {t.city || '—'}, {t.state || 'India'} - {t.pincode || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Physical Address:</span>
                      <span className="text-slate-700 truncate max-w-[200px]">{t.address || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Branches */}
              <div className="p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs mb-2">
                  Registered Branches ({branches.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {branches.length === 0 ? (
                    <p className="text-slate-400 italic">Main HQ only.</p>
                  ) : (
                    branches.map((b) => (
                      <div key={b.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="font-bold text-slate-800">{b.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Code: {b.code}</p>
                        <p className="text-[10px] text-slate-400 truncate">{b.address}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Staff Accounts */}
              <div className="p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs mb-2">
                  Associated Users &amp; Staff ({users.length})
                </h4>
                <div className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <div key={u.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{u.full_name || u.email}</span>
                        <span className="text-slate-400 ml-2">({u.email})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role?.replaceAll('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Invoices */}
              <div className="p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs mb-2">
                  Recent Invoices Billed ({recentInvoices.length})
                </h4>
                {recentInvoices.length === 0 ? (
                  <p className="text-slate-400 italic">No invoices issued yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {recentInvoices.map((inv) => (
                      <div key={inv.id} className="py-2 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold font-mono text-slate-900">
                            {inv.invoice_number}
                          </span>
                          <span className="text-slate-400 ml-2">
                            {inv.customer_name || 'Walk-in'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(inv.final_payable)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              inv.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {inv.payment_status || 'Paid'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 text-xs transition cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantDossierModal;
