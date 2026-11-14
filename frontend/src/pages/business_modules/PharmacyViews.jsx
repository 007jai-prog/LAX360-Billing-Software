import React, { useEffect, useState } from 'react';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import {
  Pill,
  AlertTriangle,
  FileCheck2,
  Eye,
  Calendar
} from 'lucide-react';

const getBatchesFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.batches)) return data.batches;
  return [];
};

const getDomainHeading = (category, categoryName) => {
  const headings = {
    pharmacy: 'Medicine Batch & Expiry Monitoring',
    restaurant: 'Food Batch & Expiry Monitoring',
    grocery: 'Grocery Batch & Expiry Monitoring',
    textile: 'Textile Product Batch & Expiry Monitoring',
    electronics: 'Electronics Product Batch & Expiry Monitoring',
    wholesale: 'Wholesale Product Batch & Expiry Monitoring'
  };

  const normalizedCategory = String(category || '').toLowerCase();

  return (
    headings[normalizedCategory] ||
    `${categoryName || 'Product'} Batch & Expiry Monitoring`
  );
};

const parseExpiryDate = (value) => {
  if (!value) return null;

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
};

const isBatchExpired = (batch) => {
  const expiryDate = parseExpiryDate(batch?.expiry_date);
  if (!expiryDate) return false;

  const today = new Date();
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return expiryDate < todayAtMidnight;
};

const formatLabel = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== 'object')) {
      return value.map((item) => String(item ?? '')).join(', ') || '—';
    }

    return JSON.stringify(value, null, 2);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

export const PharmacyExpiry = () => {
  const { config, currentCategory } = useBusinessConfig();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const heading = getDomainHeading(
    currentCategory,
    config?.category_name
  );

  useEffect(() => {
    let isMounted = true;

    const fetchBatches = async () => {
      try {
        const response = await api.get(
          '/specialized/pharmacy/expiry-batches'
        );

        if (isMounted) {
          setBatches(getBatchesFromResponse(response.data));
        }
      } catch (error) {
        console.error('Failed to load expiry batches:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBatches();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedBatchExpired = selectedBatch
    ? isBatchExpired(selectedBatch)
    : false;

  const selectedBatchDetails = selectedBatch
    ? Object.entries(selectedBatch).filter(([key]) => key !== '_id')
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {heading}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Review batch numbers, manufacturing dates, expiry dates, and stock
          details for this business category.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Product Name</th>
                <th className="px-4 py-3.5">Batch #</th>
                <th className="px-4 py-3.5">Expiry Date</th>
                <th className="px-4 py-3.5">Manufacturer</th>
                <th className="px-4 py-3.5">Current Stock</th>
                <th className="px-4 py-3.5">Classification</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Pill className="mx-auto mb-2 h-10 w-10 stroke-[1.5] text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No batches found
                    </p>
                  </td>
                </tr>
              ) : (
                batches.map((batch, index) => {
                  const expired = isBatchExpired(batch);
                  const rowKey =
                    batch.id ||
                    batch._id ||
                    `${batch.batch_number || 'batch'}-${batch.product_name || index}`;

                  return (
                    <tr
                      key={rowKey}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {batch.product_name || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">
                        {batch.batch_number || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>{batch.expiry_date || '—'}</span>
                          {expired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-sans text-[10px] font-bold text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        {batch.manufacturer || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-extrabold text-slate-800">
                        {batch.stock ?? 0} Units
                      </td>

                      <td className="px-4 py-3.5">
                        {batch.is_schedule_h ? (
                          <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Schedule H (Rx Req.)
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            OTC
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBatch(batch)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
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
        isOpen={Boolean(selectedBatch)}
        onClose={() => setSelectedBatch(null)}
        title={selectedBatch?.product_name || 'Batch Details'}
        size="lg"
      >
        {selectedBatch && (
          <div className="space-y-4">
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                selectedBatchExpired
                  ? 'border border-rose-200 bg-rose-50 text-rose-700'
                  : 'border border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {selectedBatchExpired ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <Calendar className="h-4 w-4 shrink-0" />
              )}
              {selectedBatchExpired
                ? `This batch expired on ${selectedBatch.expiry_date || 'an unknown date'}.`
                : `Expiry date: ${selectedBatch.expiry_date || 'Not provided'}.`}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {selectedBatchDetails.map(([key, value]) => (
                <div
                  key={key}
                  className="min-w-0 rounded-xl bg-slate-50 p-3"
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {formatLabel(key)}
                  </p>

                  {value !== null && typeof value === 'object' ? (
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-800">
                      {formatDetailValue(value)}
                    </pre>
                  ) : (
                    <p className="break-words text-sm font-medium text-slate-800">
                      {key === 'is_schedule_h'
                        ? value
                          ? 'Yes'
                          : 'No'
                        : formatDetailValue(value)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export const PrescriptionsLog = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPrescriptions = async () => {
      try {
        const response = await api.get(
          '/specialized/pharmacy/prescriptions'
        );

        if (isMounted) {
          const data = response.data;
          setPrescriptions(
            Array.isArray(data)
              ? data
              : Array.isArray(data?.items)
                ? data.items
                : []
          );
        }
      } catch (error) {
        console.error('Failed to load prescription records:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPrescriptions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Doctor Prescription Records Log
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Regulatory audit records for patient prescriptions dispensed
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Patient Name</th>
                <th className="px-4 py-3.5">Prescribing Doctor</th>
                <th className="px-4 py-3.5">Medicines Dispensed</th>
                <th className="px-6 py-3.5 text-right">Bill Value</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading prescription records...
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileCheck2 className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No prescription records logged yet
                    </p>
                  </td>
                </tr>
              ) : (
                prescriptions.map((prescription, index) => (
                  <tr
                    key={
                      prescription.id ||
                      prescription._id ||
                      prescription.invoice_number ||
                      index
                    }
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3.5 font-bold text-indigo-700">
                      {prescription.invoice_number || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {prescription.date || '—'}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {prescription.patient_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {prescription.doctor_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {Array.isArray(prescription.medicines_dispensed)
                        ? prescription.medicines_dispensed.join(', ')
                        : prescription.medicines_dispensed || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-extrabold text-slate-900">
                      ₹{Number(prescription.total_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};