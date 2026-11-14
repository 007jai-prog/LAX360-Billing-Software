import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import {
  Smartphone,
  ShieldCheck,
  Wrench,
  Search,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const IMEILookup = () => {
  const [imei, setImei] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!imei.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/specialized/electronics/imei/${encodeURIComponent(imei.trim())}`);
      setResult(res.data);
    } catch (err) {
      alert('IMEI lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">IMEI & Warranty Lookup</h1>
        <p className="text-xs text-slate-500 mt-1">Verify warranty certificates, original invoice date, and serial number validity</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-4">
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="text"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            placeholder="Enter 15-digit IMEI or Serial number..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200"
          >
            Verify IMEI
          </button>
        </form>

        {result && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            {result.found ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900">{result.product_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Warranty {result.warranty_status}
                  </span>
                </div>
                <p><strong>Registered Customer:</strong> {result.customer_name} ({result.customer_phone})</p>
                <p><strong>Invoice Number:</strong> {result.invoice_number}</p>
                <p><strong>Purchase Date:</strong> {result.purchase_date}</p>
                <p><strong>Coverage:</strong> {result.warranty_months} Months Standard Manufacturer Warranty</p>
              </>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                <p className="font-semibold text-slate-800">{result.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const RepairTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      device_model: '',
      imei_serial: '',
      issue_description: '',
      estimated_cost: 1500
    }
  });

  const fetchTickets = async () => {
    try {
      const res = await api.get('/specialized/electronics/repairs');
      setTickets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onAddTicket = async (data) => {
    try {
      await api.post('/specialized/electronics/repairs', data);
      setIsAddOpen(false);
      reset();
      fetchTickets();
    } catch (err) {
      alert('Failed to create ticket');
    }
  };

  const updateStatus = async (ticketId, nextStatus) => {
    try {
      await api.put(`/specialized/electronics/repairs/${ticketId}/status`, { status: nextStatus });
      fetchTickets();
    } catch (err) {
      alert('Failed to update repair status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Service & Repair Job Ticketing</h1>
          <p className="text-xs text-slate-500 mt-1">Track device repair diagnostics, hardware servicing, and technician fees</p>
        </div>

        <button
          onClick={() => {
            reset();
            setIsAddOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Repair Job</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">Ticket #</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Device Model</th>
              <th className="py-3.5 px-4">Issue Reported</th>
              <th className="py-3.5 px-4">Estimated Fee</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-6 text-right">Advance Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <tr><td colSpan="7" className="py-12 text-center text-slate-400">No active repair jobs</td></tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-6 font-bold text-purple-700 font-mono">{t.ticket_number}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{t.customer_name} ({t.customer_phone})</td>
                  <td className="py-3.5 px-4 text-slate-700">{t.device_model}</td>
                  <td className="py-3.5 px-4 text-slate-500">{t.issue_description}</td>
                  <td className="py-3.5 px-4 font-bold font-mono">₹{t.estimated_cost}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'REPAIRED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    {t.status === 'RECEIVED' && (
                      <button onClick={() => updateStatus(t.id, 'DIAGNOSING')} className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-bold hover:bg-purple-100">
                        Diagnose
                      </button>
                    )}
                    {t.status === 'DIAGNOSING' && (
                      <button onClick={() => updateStatus(t.id, 'REPAIRED')} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded font-bold hover:bg-emerald-100">
                        Mark Repaired
                      </button>
                    )}
                    {t.status === 'REPAIRED' && (
                      <button onClick={() => updateStatus(t.id, 'DELIVERED')} className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200">
                        Deliver to Customer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Device Repair Ticket" size="md">
        <form onSubmit={handleSubmit(onAddTicket)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Name *</label>
              <input type="text" {...register('customer_name', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Phone *</label>
              <input type="tel" {...register('customer_phone', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Device Model *</label>
              <input type="text" placeholder="e.g. iPhone 13 Pro 128GB" {...register('device_model', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IMEI / Serial</label>
              <input type="text" placeholder="Optional IMEI" {...register('imei_serial')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fault / Issue Reported *</label>
            <input type="text" placeholder="e.g. Display glass cracked, touch working" {...register('issue_description', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estimated Repair Fee (₹)</label>
            <input type="number" {...register('estimated_cost')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200">Generate Ticket</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
