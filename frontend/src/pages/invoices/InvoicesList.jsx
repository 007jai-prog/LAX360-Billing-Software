import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Ban
} from 'lucide-react';

export const InvoicesList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState(null);
  const [cancelReason, setCancelReason] = useState(
    'Customer return / cancellation'
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);

    try {
      let url = '/invoices?limit=100';

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }

      const response = await api.get(url);
      setInvoices(response.data.items || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  const handleDownloadInvoice = async (invoice) => {
    setDownloadingInvoiceId(invoice.id);

    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob'
      });

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf'
      });
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const safeInvoiceNumber = String(invoice.invoice_number || invoice.id)
        .replace(/[^a-zA-Z0-9-_]/g, '_');

      link.href = downloadUrl;
      link.download = `invoice-${safeInvoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download invoice PDF:', error);
      alert(
        error.response?.data?.detail ||
          'Failed to download invoice PDF. Please try again.'
      );
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelModalInvoice) return;

    setIsCancelling(true);

    try {
      await api.post(`/invoices/${cancelModalInvoice.id}/cancel`, null, {
        params: { reason: cancelReason }
      });

      alert('Invoice cancelled and product stock returned successfully.');
      setCancelModalInvoice(null);
      fetchInvoices();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to cancel invoice.');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Invoice Records
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Browse, search, and download GST tax invoices and payment vouchers
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInvoices}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh List
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by invoice # or customer..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid in Full</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="UNPAID">Unpaid / Due</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Taxable</th>
                <th className="px-4 py-3.5">Total Tax</th>
                <th className="px-4 py-3.5">Grand Total</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <FileText className="mx-auto mb-2 h-10 w-10 stroke-[1.5] text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No invoices found
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Transactions processed in POS will show here
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3.5 font-bold text-indigo-700">
                      {invoice.invoice_number}
                      {invoice.status === 'CANCELLED' && (
                        <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                          CANCELLED
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500">
                      {invoice.created_at?.slice(0, 10)}
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {invoice.customer_name}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {formatMoney(invoice.total_taxable)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {formatMoney(invoice.total_tax)}
                    </td>

                    <td className="px-4 py-3.5 font-extrabold text-slate-900">
                      {formatMoney(invoice.final_payable)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          invoice.payment_status === 'PAID'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : invoice.payment_status === 'PARTIAL'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {invoice.payment_status}
                      </span>
                    </td>

                    <td className="space-x-2 px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="inline-block rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        title="View Details"
                        aria-label={`View invoice ${invoice.invoice_number}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={downloadingInvoiceId === invoice.id}
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-50"
                        title="Download PDF"
                        aria-label={`Download invoice ${invoice.invoice_number} as PDF`}
                      >
                        <Download className="h-4 w-4" />
                        {downloadingInvoiceId === invoice.id && (
                          <span className="text-[10px]">Saving...</span>
                        )}
                      </button>

                      {invoice.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => setCancelModalInvoice(invoice)}
                          className="inline-block rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Cancel Invoice"
                          aria-label={`Cancel invoice ${invoice.invoice_number}`}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail View Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoice_number}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Seller
                </p>
                <p className="font-bold text-slate-800">
                  {selectedInvoice.seller_name}
                </p>
                <p className="text-slate-500">
                  GSTIN: {selectedInvoice.seller_gstin || 'N/A'}
                </p>
                <p className="text-slate-500">
                  State: {selectedInvoice.seller_state || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Billed To
                </p>
                <p className="font-bold text-slate-800">
                  {selectedInvoice.customer_name}
                </p>
                <p className="text-slate-500">
                  Phone: {selectedInvoice.customer_phone || 'N/A'}
                </p>
                <p className="text-slate-500">
                  State: {selectedInvoice.customer_state || 'N/A'}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3">Taxable</th>
                    <th className="p-3">GST</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {(selectedInvoice.items || []).map((item, index) => (
                    <tr key={item.id || `${item.name}-${index}`}>
                      <td className="p-3 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="p-3">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-3">
                        {formatMoney(item.unit_price)}
                      </td>
                      <td className="p-3">
                        {formatMoney(item.taxable_amount)}
                      </td>
                      <td className="p-3">
                        {Number(item.tax_rate || 0)}%
                      </td>
                      <td className="p-3 text-right font-bold">
                        {formatMoney(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row">
              <div className="text-xs text-slate-600">
                <p>
                  <strong>Amount in Words:</strong>{' '}
                  {selectedInvoice.amount_in_words || 'N/A'}
                </p>
                <p className="mt-1">
                  <strong>Payment Status:</strong>{' '}
                  {selectedInvoice.payment_status}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Final Payable
                </p>
                <p className="text-2xl font-black text-indigo-700">
                  {formatMoney(selectedInvoice.final_payable)}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                disabled={downloadingInvoiceId === selectedInvoice.id}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>
                  {downloadingInvoiceId === selectedInvoice.id
                    ? 'Downloading...'
                    : 'Download PDF'}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Invoice Confirmation Modal */}
      {cancelModalInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setCancelModalInvoice(null)}
          title="Cancel Invoice & Restore Stock"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-600">
              Are you sure you want to cancel Invoice{' '}
              <strong>{cancelModalInvoice.invoice_number}</strong>? This will
              automatically reverse the sale and restore all deducted inventory
              quantities to the catalog.
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalInvoice(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Nevermind
              </button>

              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={isCancelling}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-200 hover:bg-rose-700 disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InvoicesList;