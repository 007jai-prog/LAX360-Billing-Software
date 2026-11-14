import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { Truck, Plus, Search, FileText, CheckCircle, Trash2 } from 'lucide-react';

export const PurchasesList = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Purchase Form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierInvNo, setSupplierInvNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      let url = '/purchases?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get(url),
        api.get('/suppliers?limit=100'),
        api.get('/products?limit=100')
      ]);
      setPurchases(purRes.data.items || []);
      setSuppliers(supRes.data.items || []);
      setProducts(prodRes.data.items || []);
      if (supRes.data.items?.length > 0 && !selectedSupplier) {
        setSelectedSupplier(supRes.data.items[0].id);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [search]);

  const addPurchaseLine = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setPurchaseItems((prev) => [
      ...prev,
      {
        product_id: firstProd.id,
        name: firstProd.name,
        quantity: 10,
        unit_cost: firstProd.purchase_price || 100,
        tax_rate: firstProd.tax_rate || 18,
        batch_number: '',
        expiry_date: ''
      }
    ]);
  };

  const updateLine = (idx, field, val) => {
    setPurchaseItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (field === 'product_id') {
          const p = products.find((prod) => prod.id === val);
          return {
            ...it,
            product_id: val,
            name: p?.name || it.name,
            unit_cost: p?.purchase_price || it.unit_cost,
            tax_rate: p?.tax_rate || it.tax_rate
          };
        }
        return { ...it, [field]: val };
      })
    );
  };

  const removeLine = (idx) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const calculatePurchaseTotal = () => {
    return purchaseItems.reduce((acc, it) => {
      const lineCost = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0);
      const tax = lineCost * ((parseFloat(it.tax_rate) || 0) / 100);
      return acc + lineCost + tax;
    }, 0);
  };

  const onRecordPurchase = async (e) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert('Please add at least one line item to inward.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/purchases', {
        supplier_id: selectedSupplier,
        supplier_invoice_no: supplierInvNo || `BILL-${Date.now()}`,
        items: purchaseItems.map((it) => ({
          product_id: it.product_id,
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unit_cost: parseFloat(it.unit_cost) || 0,
          tax_rate: parseFloat(it.tax_rate) || 0,
          batch_number: it.batch_number,
          expiry_date: it.expiry_date
        })),
        paid_amount: parseFloat(paidAmount) || 0,
        payment_method: paymentMethod
      });
      alert('Purchase bill entered and inventory stock replenished.');
      setIsAddOpen(false);
      setPurchaseItems([]);
      fetchPurchases();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Purchase Bills & Stock Inward</h1>
          <p className="text-xs text-slate-500 mt-1">
            Record supplier inward bills, replenish catalog quantities, and track vendor payables
          </p>
        </div>

        <button
          onClick={() => {
            setPurchaseItems([]);
            addPurchaseLine();
            setIsAddOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Entry</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Purchase #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Supplier Bill #</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Paid</th>
                <th className="py-3.5 px-4">Balance Due</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-400">Loading purchases...</td></tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No purchase entries recorded yet</p>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-indigo-700">{p.purchase_number}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.purchase_date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{p.supplier_name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{p.supplier_invoice_no}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">₹{p.total_amount?.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-semibold">₹{p.paid_amount?.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-bold">₹{p.balance_due?.toFixed(2)}</td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Record Inward Purchase Bill" size="lg">
        <form onSubmit={onRecordPurchase} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Supplier *</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.gstin || 'No GSTIN'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier Bill / Invoice #</label>
              <input
                type="text"
                placeholder="e.g. SUP-INV-9981"
                value={supplierInvNo}
                onChange={(e) => setSupplierInvNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Inward Articles</span>
              <button
                type="button"
                onClick={addPurchaseLine}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line Item</span>
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Cost (₹)</th>
                  <th className="p-2.5">GST %</th>
                  <th className="p-2.5">Batch / Exp</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseItems.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5">
                      <select
                        value={line.product_id}
                        onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1 rounded border border-slate-200 text-xs text-center font-bold"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="0.1"
                        value={line.unit_cost}
                        onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                        className="w-20 px-2 py-1 rounded border border-slate-200 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={line.tax_rate}
                        onChange={(e) => updateLine(idx, 'tax_rate', e.target.value)}
                        className="w-14 px-2 py-1 rounded border border-slate-200 text-xs text-center"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        placeholder="Batch No"
                        value={line.batch_number}
                        onChange={(e) => updateLine(idx, 'batch_number', e.target.value)}
                        className="w-24 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-slate-300 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Calculated Bill Total (Tax Inclusive):</span>
            <span className="text-xl font-extrabold text-indigo-700 font-mono">₹{calculatePurchaseTotal().toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount Paid to Vendor (₹)</label>
              <input
                type="number"
                step="0.1"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Record Purchase & Update Stock</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchasesList;
