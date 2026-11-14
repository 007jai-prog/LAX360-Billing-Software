import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Warehouse, Truck, Users2, ShieldAlert } from 'lucide-react';

export const WholesaleWarehouses = () => {
  const [dealers, setDealers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWholesaleData = async () => {
      try {
        const [dRes, bRes] = await Promise.all([
          api.get('/specialized/wholesale/dealer-ledger'),
          api.get('/specialized/wholesale/warehouses')
        ]);
        setDealers(dRes.data || []);
        setBranches(bRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWholesaleData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wholesale Warehouses & Dealer Ledgers</h1>
        <p className="text-xs text-slate-500 mt-1">Multi-location depot inventory and distributor credit limit monitors</p>
      </div>

      {/* Warehouse Locations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">{b.code}</span>
              {b.is_main && (
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  Central Depot
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{b.address}</p>
          </div>
        ))}
      </div>

      {/* Dealer Credit Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Distributor & Dealer Credit Utilization</h3>
            <p className="text-xs text-slate-400">Automatic credit limit enforcement prevents overdue dispatches</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-6">Dealer / Account</th>
              <th className="py-3 px-4">Tier</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Credit Limit (₹)</th>
              <th className="py-3 px-4">Outstanding Due (₹)</th>
              <th className="py-3 px-4">Utilization</th>
              <th className="py-3 px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dealers.length === 0 ? (
              <tr><td colSpan="7" className="py-12 text-center text-slate-400">No B2B wholesale dealers registered</td></tr>
            ) : (
              dealers.map((d) => (
                <tr key={d.customer_id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-6 font-bold text-slate-900">{d.dealer_name}</td>
                  <td className="py-3 px-4 font-semibold text-purple-700">{d.tier}</td>
                  <td className="py-3 px-4 text-slate-600">{d.contact}</td>
                  <td className="py-3 px-4 font-mono font-semibold">₹{d.credit_limit}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">₹{d.outstanding_balance}</td>
                  <td className="py-3 px-4">
                    <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${d.credit_utilization_pct > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, d.credit_utilization_pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{d.credit_utilization_pct}%</span>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.credit_status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {d.credit_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
