import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  Plus,
  ExternalLink,
  Edit,
  ShieldAlert,
  CreditCard,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Store,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

const formatCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatNumber = (val) =>
  Number(val || 0).toLocaleString('en-IN');

const CATEGORY_TAG_COLORS = {
  grocery: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  restaurant: 'bg-amber-50 text-amber-700 border-amber-200',
  pharmacy: 'bg-blue-50 text-blue-700 border-blue-200',
  textile: 'bg-pink-50 text-pink-700 border-pink-200',
  wholesale: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  electronics: 'bg-purple-50 text-purple-700 border-purple-200'
};

export const BusinessesTab = ({
  tenants,
  loading,
  onOpenCreateModal,
  onInspectTenant,
  onEditTenant,
  onChangeStatus,
  onOverrideSubscription,
  onImpersonate,
  onDeleteTenant
}) => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPlan, setSelectedPlan] = useState('ALL');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Category filter
      if (selectedCategory !== 'ALL' && t.business_category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Status filter
      const tStatus = t.status || 'active';
      if (selectedStatus !== 'ALL' && tStatus.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      // Plan filter
      const tPlan = t.subscription?.plan || 'starter';
      if (selectedPlan !== 'ALL' && tPlan.toLowerCase() !== selectedPlan.toLowerCase()) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const name = (t.name || '').toLowerCase();
        const owner = (t.owner_name || '').toLowerCase();
        const email = (t.email || '').toLowerCase();
        const gstin = (t.gstin || '').toLowerCase();
        const city = (t.city || '').toLowerCase();
        return name.includes(q) || owner.includes(q) || email.includes(q) || gstin.includes(q) || city.includes(q);
      }
      return true;
    });
  }, [tenants, search, selectedCategory, selectedStatus, selectedPlan]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar & Filter Row */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business by name, owner, email, GSTIN, city..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Filters and New Business Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="grocery">Grocery &amp; Supermarket</option>
            <option value="restaurant">Restaurant &amp; Cafe</option>
            <option value="pharmacy">Pharmacy &amp; Medical</option>
            <option value="textile">Textile &amp; Garments</option>
            <option value="wholesale">Wholesale &amp; Distribution</option>
            <option value="electronics">Electronics &amp; Mobiles</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            aria-label="Filter by plan"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Plans</option>
            <option value="starter">Starter</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Business</span>
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredTenants.length}</strong> of {tenants.length} registered businesses
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Clear search filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Business Name &amp; GSTIN</th>
                <th className="px-5 py-3.5">Category Vertical</th>
                <th className="px-5 py-3.5">Owner &amp; Contacts</th>
                <th className="px-5 py-3.5">Invoices &amp; Revenue</th>
                <th className="px-5 py-3.5">Subscription Plan</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No businesses matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const catTagColor =
                    CATEGORY_TAG_COLORS[tenant.business_category?.toLowerCase()] ||
                    'bg-slate-100 text-slate-700 border-slate-200';
                  const isSuspended = tenant.status === 'suspended';

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & GSTIN */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {tenant.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {tenant.gstin ? (
                            <span className="font-mono text-slate-600 font-semibold">
                              GST: {tenant.gstin}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Unregistered GST</span>
                          )}
                          {tenant.city && ` • ${tenant.city}, ${tenant.state || 'IN'}`}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${catTagColor}`}
                        >
                          {tenant.business_category || 'Grocery'}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {tenant.owner_name || 'Business Owner'}
                        </div>
                        <div className="text-[11px] text-slate-500">{tenant.email}</div>
                        {tenant.phone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tenant.phone}
                          </div>
                        )}
                      </td>

                      {/* Invoices & Revenue */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {formatCurrency(tenant.total_revenue)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatNumber(tenant.invoices_count)} invoices &bull; {tenant.branches_count || 1} branch
                        </div>
                      </td>

                      {/* Subscription */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-indigo-700 capitalize text-xs">
                          {tenant.subscription?.plan || 'Starter'} Plan
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Expires: {tenant.subscription?.expires_at || 'Perpetual'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            isSuspended
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <XCircle className="w-3 h-3" /> Suspended
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" /> Active
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Dossier */}
                          <button
                            type="button"
                            onClick={() => onInspectTenant(tenant)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Inspect Complete Business Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => onEditTenant(tenant)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Business Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Override Subscription */}
                          <button
                            type="button"
                            onClick={() => onOverrideSubscription(tenant)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                            title="Manage / Upgrade Subscription"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>

                          {/* Change Status */}
                          <button
                            type="button"
                            onClick={() => onChangeStatus(tenant)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSuspended
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={isSuspended ? 'Reactivate Business' : 'Suspend Business'}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          {/* Impersonate Store View */}
                          <button
                            type="button"
                            onClick={() => onImpersonate(tenant)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                            title="Impersonate / Test Drive as Tenant"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>

                          {/* Delete Business */}
                          <button
                            type="button"
                            onClick={() => onDeleteTenant(tenant)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Business Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BusinessesTab;
