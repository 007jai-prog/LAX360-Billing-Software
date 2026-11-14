import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Search, CheckCircle } from 'lucide-react';

export const SuppliersList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      state: 'Delhi',
      city: 'Delhi'
    }
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      let url = '/suppliers?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      setSuppliers(res.data.items || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const onAddSupplier = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/suppliers', data);
      setIsAddOpen(false);
      reset();
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Suppliers & Vendor Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage wholesale distributors, manufacturers, and inward trade partners
          </p>
        </div>

        <button
          onClick={() => {
            reset();
            setIsAddOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, GSTIN..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">{suppliers.length} Registered Vendors</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Vendor Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">GSTIN</th>
                <th className="py-3.5 px-4">Total Purchases</th>
                <th className="py-3.5 px-6">Payables Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400">Loading suppliers...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No suppliers found</p>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{s.contact_person || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.phone}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.gstin || 'Unregistered'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">₹{s.total_purchases?.toFixed(2)}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-rose-600">₹{s.outstanding_payables?.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Supplier" size="md">
        <form onSubmit={handleSubmit(onAddSupplier)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company / Vendor Name *</label>
              <input type="text" {...register('name', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Person</label>
              <input type="text" {...register('contact_person')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number *</label>
              <input type="tel" {...register('phone', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier GSTIN</label>
              <input type="text" placeholder="15-character GSTIN" {...register('gstin')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Address / Depot Location</label>
            <input type="text" {...register('address')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Save Supplier</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuppliersList;
