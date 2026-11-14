import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { Search, CheckCircle } from 'lucide-react';


export const InventoryList = () => {
  const [stockData, setStockData] = useState({
    items: [],
    total_valuation: 0,
    total_items: 0
  });
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [adjustModalItem, setAdjustModalItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [thresholdDrafts, setThresholdDrafts] = useState({});
  const [savingThresholdId, setSavingThresholdId] = useState(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      adjustment_type: 'ADD',
      quantity: 10,
      reason: 'Physical inventory count reconciliation'
    }
  });


  const fetchStock = async () => {
    setLoading(true);

    try {
      let url = `/inventory/stock?low_stock_only=${lowStockFilter}`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await api.get(url);

      setStockData({
        items: response.data.items || [],
        total_valuation: response.data.total_valuation || 0,
        total_items: response.data.total_items || 0
      });
    } catch (error) {
      console.error('Failed to load stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await api.get('/inventory/movements?limit=50');
      setMovements(response.data || []);
    } catch (error) {
      console.error('Failed to load movements:', error);
    }
  };

useEffect(() => {
  fetchStock();
  fetchMovements();

  const handleWindowFocus = () => {
    fetchStock();
    fetchMovements();
  };

  window.addEventListener('focus', handleWindowFocus);

  return () => {
    window.removeEventListener('focus', handleWindowFocus);
  };
}, [search, lowStockFilter]);

  const handleThresholdChange = (productId, value) => {
    setThresholdDrafts((current) => ({
      ...current,
      [String(productId)]: value
    }));
  };

  const handleSaveThreshold = async (item) => {
    const productId = String(item.product_id);
    const draftValue = thresholdDrafts[productId];
    const threshold = Number(draftValue);

    if (
      draftValue === undefined ||
      draftValue === '' ||
      !Number.isFinite(threshold) ||
      threshold < 0
    ) {
      alert('Enter a valid reorder minimum (zero or greater).');
      return;
    }

    setSavingThresholdId(productId);

    try {
      // The backend exposes PUT /products/{product_id}; MongoDB is the source of truth.
      await api.put(`/products/${productId}`, {
        low_stock_threshold: threshold
      });

      setThresholdDrafts((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });

      await fetchStock();
      alert('Reorder minimum updated successfully.');
    } catch (error) {
      console.error('Could not update reorder minimum:', error);
      alert(
        error.response?.data?.detail ||
        'Could not update reorder minimum. Please try again.'
      );
    } finally {
      setSavingThresholdId(null);
    }
  };

  const onAdjustStock = async (data) => {
    if (!adjustModalItem) return;

    setIsSubmitting(true);

    try {
      await api.post('/inventory/adjust', {
        product_id: adjustModalItem.product_id,
        adjustment_type: data.adjustment_type,
        quantity: Number(data.quantity),
        reason: data.reason
      });

      alert('Stock adjusted and audit movement logged.');
      setAdjustModalItem(null);
      reset();
      await fetchStock();
      await fetchMovements();
    } catch (error) {
      alert(error.response?.data?.detail || 'Adjustment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowStockCount =
    stockData.items.filter((item) => item.is_low_stock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Inventory &amp; Stock Tracking
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time stock valuation, audit corrections, and inward/outward ledger
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`rounded-lg px-4 py-1.5 transition-all ${
              activeTab === 'stock'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Stock Levels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`rounded-lg px-4 py-1.5 transition-all ${
              activeTab === 'movements'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Trail
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Stock Valuation
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            ₹{Number(stockData.total_valuation).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Calculated at purchase cost
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Items Tracked
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {stockData.total_items} Products
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Across all branches and categories
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Low Stock Warnings
          </span>
          <p className="mt-2 text-2xl font-black text-rose-600">
            {lowStockCount} Items
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            At or below reorder threshold
          </p>
        </div>
      </div>

      {/* Live Stock Levels */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search stock by name, SKU..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs focus:bg-white"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(event) => setLowStockFilter(event.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Filter Low-Stock Only</span>
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Product / SKU</th>
                    <th className="px-4 py-3.5">Barcode</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Current Stock</th>
                    <th className="px-4 py-3.5">Reorder Min</th>
                    <th className="px-4 py-3.5">Unit Cost</th>
                    <th className="px-4 py-3.5">Total Value</th>
                    <th className="px-6 py-3.5 text-right">Adjust</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        Loading stock...
                      </td>
                    </tr>
                  ) : stockData.items.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        No stock records found
                      </td>
                    </tr>
                  ) : (
                    stockData.items.map((item) => {
                      const productId = String(item.product_id);
                      const thresholdValue =
                        thresholdDrafts[productId] ??
                        item.low_stock_threshold ??
                        0;
                      const barcode = item.barcode ?? item.barcode_number ?? '';

                      return (
                        <tr
                          key={item.product_id}
                          className="transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-3.5 font-bold text-slate-900">
                            {item.name}
                            <p className="font-mono text-[10px] text-slate-400">
                              SKU: {item.sku || '—'}
                            </p>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-700">
                            {barcode || '—'}
                          </td>

                          <td className="px-4 py-3.5 text-slate-600">
                            {item.category}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                item.is_low_stock
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {item.current_stock} {item.unit}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step={
                                  ['kg', 'ltr'].includes(
                                    (item.unit || '').toLowerCase()
                                  )
                                    ? '0.1'
                                    : '1'
                                }
                                value={thresholdValue}
                                onChange={(event) =>
                                  handleThresholdChange(
                                    item.product_id,
                                    event.target.value
                                  )
                                }
                                aria-label={`Reorder minimum for ${item.name}`}
                                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />

                              <button
                                type="button"
                                onClick={() => handleSaveThreshold(item)}
                                disabled={
                                  savingThresholdId === productId ||
                                  thresholdDrafts[productId] === undefined
                                }
                                className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingThresholdId === productId
                                  ? 'Saving…'
                                  : 'Save'}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-600">
                            ₹{Number(item.purchase_price || 0).toFixed(2)}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                            ₹{Number(item.stock_valuation || 0).toFixed(2)}
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustModalItem(item);
                                reset();
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                            >
                              Adjust
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
        </div>
      )}

      {/* Movement Audit Trail */}
      {activeTab === 'movements' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Movement Type</th>
                  <th className="px-4 py-3.5">Qty Change</th>
                  <th className="px-4 py-3.5">Reference</th>
                  <th className="px-6 py-3.5">Reason / Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3.5 text-slate-500">
                        {movement.created_at
                          ?.slice(0, 16)
                          .replace('T', ' ')}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {movement.product_name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {movement.movement_type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3.5 font-extrabold ${
                          movement.quantity > 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {movement.quantity > 0
                          ? `+${movement.quantity}`
                          : movement.quantity}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {movement.reference_id}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {movement.reason || 'Standard automated transaction'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalItem && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustModalItem(null)}
          title={`Adjust Stock for ${adjustModalItem.name}`}
          size="md"
        >
          <form onSubmit={handleSubmit(onAdjustStock)} className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <span className="text-slate-500">
                Current Registered Stock:
              </span>
              <span className="font-bold text-slate-900">
                {adjustModalItem.current_stock} {adjustModalItem.unit}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Adjustment Action
              </label>
              <select
                {...register('adjustment_type')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
              >
                <option value="ADD">
                  Add Inward Quantity (Physical Stock Found)
                </option>
                <option value="REDUCE">
                  Reduce Quantity (Audit Correction)
                </option>
                <option value="DAMAGE">Record Damage / Breakage</option>
                <option value="EXPIRY">Write Off Expired Stock</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Quantity to Adjust
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                {...register('quantity', {
                  required: 'Quantity is required',
                  min: {
                    value: 0.1,
                    message: 'Quantity must be greater than zero'
                  },
                  valueAsNumber: true
                })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Reason / Internal Audit Reference
              </label>
              <input
                type="text"
                {...register('reason')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Adjustment'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default InventoryList;