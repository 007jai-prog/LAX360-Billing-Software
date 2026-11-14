import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { Receipt, Plus, Search, CheckCircle, TrendingDown } from 'lucide-react';

export const ExpensesList = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total_expenses: 0, by_category: [] });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      category: 'Rent',
      amount: '',
      payment_method: 'BANK_TRANSFER',
      description: '',
      reference: ''
    }
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = '/expenses?limit=100';
      if (categoryFilter) url += `&category=${categoryFilter}`;
      const [expRes, sumRes] = await Promise.all([
        api.get(url),
        api.get('/expenses/summary')
      ]);
      setExpenses(expRes.data.items || []);
      setSummary(sumRes.data || { total_expenses: 0, by_category: [] });
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const onAddExpense = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/expenses', {
        ...data,
        amount: parseFloat(data.amount) || 0
      });
      setIsAddOpen(false);
      reset();
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Business Expense Register</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track operational expenditures, utilities, salaries, and shop overheads
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
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recorded Outflow</span>
          <p className="text-2xl font-black text-rose-600 mt-2">
            ₹{summary.total_expenses?.toLocaleString('en-IN') || '0'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Deducted from gross profit</p>
        </div>

        {summary.by_category?.slice(0, 3).map((cat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cat.category}</span>
            <p className="text-xl font-extrabold text-slate-900 mt-2">
              ₹{cat.amount?.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">
              {((cat.amount / Math.max(1, summary.total_expenses)) * 100).toFixed(1)}% of total
            </p>
          </div>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Ref #</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No expenses recorded yet</p>
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 text-slate-500">{e.date}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{e.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{e.description || 'General commercial expense'}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{e.payment_method?.replace('_', ' ')}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{e.reference || '-'}</td>
                    <td className="py-3.5 px-6 text-right font-extrabold text-slate-900 font-mono">₹{e.amount?.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Record Commercial Expense" size="md">
        <form onSubmit={handleSubmit(onAddExpense)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Expense Category *</label>
              <select {...register('category')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white">
                <option value="Rent">Shop / Facility Rent</option>
                <option value="Utilities">Electricity & Water</option>
                <option value="Salaries">Staff Salaries</option>
                <option value="Logistics">Logistics & Courier</option>
                <option value="Maintenance">Store Maintenance</option>
                <option value="Marketing">Marketing & Advertising</option>
                <option value="Office Supplies">Office Supplies / Packaging</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount (₹) *</label>
              <input type="number" step="0.01" {...register('amount', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
              <select {...register('payment_method')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white">
                <option value="UPI">UPI (GooglePay/PhonePe)</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="CASH">Cash Drawer</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transaction Ref #</label>
              <input type="text" placeholder="TXN-001" {...register('reference')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Notes</label>
            <input type="text" placeholder="e.g. October warehouse power bill" {...register('description')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Save Expense</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpensesList;
