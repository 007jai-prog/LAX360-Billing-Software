import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { AlertTriangle, RotateCcw, Search, X } from 'lucide-react';

const money = (value) => `₹${(Number(value) || 0).toFixed(2)}`;

function getRequestError(error, action) {
  const status = error.response?.status;
  const detail = error.response?.data?.detail;

  if (status === 404) {
    return 'The backend returns route was not found. Register app.routers.returns.router in the FastAPI app and restart the server.';
  }

  if (status === 401 || status === 403) {
    return 'Your session may have expired or your account may not have permission. Sign in again or contact your administrator.';
  }

  if (!error.response) {
    return `Could not connect to the server while trying to ${action}. Check that the backend is running and try again.`;
  }

  return detail || `Could not ${action}. Please try again.`;
}

export default function ReturnExchangePanel({ onClose }) {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [type, setType] = useState('RETURN');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('STORE_CREDIT');
  const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState('loading');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchHistory = useCallback(async () => {
    setHistoryState('loading');

    try {
      const response = await api.get('/returns');
      setHistory(Array.isArray(response.data) ? response.data : []);
      setHistoryState('ready');
    } catch (requestError) {
      console.error('Failed to load return history:', requestError);
      setHistory([]);

      if (requestError.response?.status === 404) {
        setHistoryState('unavailable');
      } else {
        setHistoryState('error');
      }
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const searchInvoices = async (event) => {
    event.preventDefault();

    const query = search.trim();
    if (!query) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setInvoice(null);
    setInvoices([]);
    setQuantities({});

    try {
      const response = await api.get('/invoices', {
        params: { search: query, limit: 20, page: 1 },
      });

      const results = Array.isArray(response.data?.items)
        ? response.data.items
        : [];

      setInvoices(results);

      if (results.length === 0) {
        setError('No matching invoices were found. Check the invoice number, customer name, or phone number.');
      }
    } catch (requestError) {
      console.error('Invoice search failed:', requestError);
      setError(getRequestError(requestError, 'search invoices'));
    } finally {
      setLoading(false);
    }
  };

  const selectInvoice = async (summary) => {
    const invoiceId = summary?.id || summary?._id;

    if (!invoiceId) {
      setError('This invoice has no ID and cannot be opened.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.get(
        `/invoices/${encodeURIComponent(invoiceId)}`
      );
      setInvoice(response.data);
      setQuantities({});
    } catch (requestError) {
      console.error('Failed to load invoice:', requestError);
      setError(getRequestError(requestError, 'load the selected invoice'));
    } finally {
      setLoading(false);
    }
  };

  const selectedLines = useMemo(
    () =>
      Object.entries(quantities)
        .map(([lineIndex, quantity]) => ({
          line_index: Number(lineIndex),
          quantity: Number(quantity),
        }))
        .filter(
          (line) =>
            Number.isInteger(line.line_index) &&
            Number.isFinite(line.quantity) &&
            line.quantity > 0
        ),
    [quantities]
  );

  const submitReturn = async (event) => {
    event.preventDefault();

    if (historyState === 'unavailable') {
      setError(
        'Returns are unavailable because the backend /returns route is not registered. Register it in FastAPI, restart the backend, then reopen this panel.'
      );
      return;
    }

    if (!invoice?.id) {
      setError('Select an original invoice first.');
      return;
    }

    if (selectedLines.length === 0) {
      setError('Enter a return quantity for at least one invoice item.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/returns', {
        invoice_id: invoice.id,
        type,
        reason: reason.trim(),
        refund_method: refundMethod,
        items: selectedLines,
      });

      const returnNumber =
        response.data?.return_number || response.data?.id || 'recorded';

      setSuccess(
        `${type === 'EXCHANGE' ? 'Exchange' : 'Return'} ${returnNumber} recorded. Credit: ${money(response.data?.credit_amount)}`
      );

      const invoiceResponse = await api.get(
        `/invoices/${encodeURIComponent(invoice.id)}`
      );
      setInvoice(invoiceResponse.data);
      setQuantities({});
      await fetchHistory();
    } catch (requestError) {
      console.error('Return/exchange failed:', requestError);
      setError(getRequestError(requestError, 'record the return or exchange'));
    } finally {
      setSaving(false);
    }
  };

  const apiUnavailable = historyState === 'unavailable';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-panel-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div>
            <h2
              id="return-panel-title"
              className="text-base font-extrabold text-slate-900"
            >
              Returns &amp; Exchanges
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Find the original invoice and select items to return.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close returns panel"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-4">
          {apiUnavailable && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                The backend has not registered the
                <code className="mx-1 rounded bg-amber-100 px-1">/returns</code>
                route. Invoice search works, but returns cannot be saved until
                the route is registered and the backend is restarted.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"
            >
              {success}
            </div>
          )}

          <form onSubmit={searchInvoices} className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice number, customer, or phone"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !search.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Loading...' : 'Search'}
            </button>
          </form>

          {invoices.length > 0 && !invoice && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-500">
                Search results
              </h3>

              {invoices.map((item) => {
                const id = item.id || item._id;

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={loading}
                    onClick={() => selectInvoice(item)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-xs font-bold text-slate-900">
                        Invoice {item.invoice_number || '—'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.customer_name || 'Walk-in Customer'}
                        {item.customer_phone ? ` · ${item.customer_phone}` : ''}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {money(item.final_payable)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {invoice && (
            <form onSubmit={submitReturn} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Invoice {invoice.invoice_number || '—'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {invoice.customer_name || 'Walk-in Customer'}
                    {invoice.customer_phone ? ` · ${invoice.customer_phone}` : ''}
                    {' · '}
                    {invoice.status || invoice.payment_status || '—'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInvoice(null);
                    setQuantities({});
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Choose another invoice
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-slate-600">
                  Transaction type
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="RETURN">Return</option>
                    <option value="EXCHANGE">Exchange</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Credit / refund method
                  <select
                    value={refundMethod}
                    onChange={(event) => setRefundMethod(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="STORE_CREDIT">Store credit</option>
                    <option value="CASH">Cash refund to process</option>
                    <option value="UPI">UPI refund to process</option>
                    <option value="CARD">Card refund to process</option>
                    <option value="BANK_TRANSFER">Bank refund to process</option>
                    <option value="CHEQUE">Cheque refund to process</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Reason
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Optional reason"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Invoice item</th>
                      <th className="p-3">Sold</th>
                      <th className="p-3">Returned</th>
                      <th className="p-3">Remaining</th>
                      <th className="p-3">Return qty</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {(invoice.items || []).map((item, lineIndex) => {
                      const sold = Number(item.quantity) || 0;
                      const returned = Number(item.returned_quantity) || 0;
                      const remaining = Math.max(0, sold - returned);

                      return (
                        <tr key={`${item.product_id || item.sku}-${lineIndex}`}>
                          <td className="p-3">
                            <span className="block font-bold text-slate-800">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.sku || 'No SKU'} · {money(item.unit_price)}
                            </span>
                          </td>
                          <td className="p-3">{sold}</td>
                          <td className="p-3">{returned}</td>
                          <td className="p-3">{remaining}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              step="any"
                              value={quantities[lineIndex] ?? ''}
                              disabled={remaining <= 0}
                              onChange={(event) =>
                                setQuantities((current) => ({
                                  ...current,
                                  [lineIndex]: event.target.value,
                                }))
                              }
                              aria-label={`Return quantity for ${item.name}`}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {type === 'EXCHANGE' && (
                <p className="text-[11px] text-amber-700">
                  This records the returned items and credit. Add replacement
                  items as a new sale through the regular POS checkout.
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    selectedLines.length === 0 ||
                    apiUnavailable
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {saving
                    ? 'Processing...'
                    : type === 'EXCHANGE'
                      ? 'Record Exchange'
                      : 'Record Return'}
                </button>
              </div>
            </form>
          )}

          <section className="border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">
              Recent returns and exchanges
            </h3>

            {historyState === 'loading' ? (
              <p className="text-xs text-slate-400">
                Loading return history...
              </p>
            ) : historyState === 'unavailable' ? (
              <p className="text-xs text-amber-700">
                History is unavailable until the backend /returns route is
                registered.
              </p>
            ) : historyState === 'error' ? (
              <p className="text-xs text-slate-500">
                Return history could not be loaded. Check the backend connection
                and reopen this panel.
              </p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400">
                No returns or exchanges recorded yet.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {record.return_number || 'Return'} · {record.type}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Invoice {record.original_invoice_number || '—'} ·{' '}
                        {record.customer_name || 'Walk-in Customer'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {money(record.credit_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}