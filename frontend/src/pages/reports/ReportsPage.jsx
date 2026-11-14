import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  Download,
  Calendar,
  Layers
} from 'lucide-react';

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('gst'); // gst | sales | pnl
  const [gstData, setGstData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [salesPeriod, setSalesPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [gstrRes, salesRes, pnlRes] = await Promise.all([
        api.get('/reports/gst-gstr1'),
        api.get(`/reports/sales?period=${salesPeriod}`),
        api.get('/reports/profit-loss')
      ]);
      setGstData(gstrRes.data);
      setSalesData(salesRes.data);
      setPnlData(pnlRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [salesPeriod]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Statutory GST & Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            GSTR-1, GSTR-3B tax summaries, HSN classification, and Profit & Loss statement
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('gst')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'gst' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GST Returns (GSTR-1)
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'sales' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Trends
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'pnl' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profit & Loss
          </button>
        </div>
      </div>

      {/* TAB 1: GST GSTR-1 Filing Preparation */}
      {activeTab === 'gst' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Taxable Value</span>
              <p className="text-2xl font-black text-slate-900 mt-2">
                ₹{gstData?.summary?.total_taxable_value?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Net value before tax</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total CGST + SGST</span>
              <p className="text-2xl font-black text-indigo-600 mt-2">
                ₹{((gstData?.summary?.total_cgst || 0) + (gstData?.summary?.total_sgst || 0)).toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Intra-State Collections</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total IGST</span>
              <p className="text-2xl font-black text-purple-600 mt-2">
                ₹{gstData?.summary?.total_igst?.toFixed(2) || '0.00'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Inter-State Collections</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tax Liability</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                ₹{gstData?.summary?.total_tax_collected?.toFixed(2) || '0.00'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{gstData?.summary?.b2b_count || 0} B2B • {gstData?.summary?.b2c_count || 0} B2C</p>
            </div>
          </div>

          {/* HSN/SAC Summary Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Table 12: HSN/SAC Summary of Outward Supplies</h3>
                <p className="text-xs text-slate-400">Classified as required by GSTR-1 statutory format</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">HSN/SAC Code</th>
                    <th className="py-3 px-4">Taxable Value</th>
                    <th className="py-3 px-4">CGST Amount</th>
                    <th className="py-3 px-4">SGST Amount</th>
                    <th className="py-3 px-4">IGST Amount</th>
                    <th className="py-3 px-6 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {(gstData?.hsn_summary_table || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-sans">
                        No HSN summaries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    gstData.hsn_summary_table.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-6 font-bold text-indigo-700">{row.hsn_sac}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">₹{row.taxable_amount?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-600">₹{row.cgst_amount?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-600">₹{row.sgst_amount?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-600">₹{row.igst_amount?.toFixed(2)}</td>
                        <td className="py-3 px-6 text-right font-bold text-emerald-600">₹{row.total_tax?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* B2B Invoices Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Table 4: B2B Invoices (Registered Buyers with GSTIN)</h3>
              <p className="text-xs text-slate-400">Transactions where input tax credit (ITC) can be claimed by the buyer</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Buyer Name</th>
                    <th className="py-3 px-4">Buyer GSTIN</th>
                    <th className="py-3 px-4">Taxable Value</th>
                    <th className="py-3 px-6 text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(gstData?.b2b_table || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-sans">
                        No registered B2B invoices in this period.
                      </td>
                    </tr>
                  ) : (
                    gstData.b2b_table.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 font-mono">
                        <td className="py-3 px-6 font-bold text-indigo-700">{inv.invoice_number}</td>
                        <td className="py-3 px-4 text-slate-500">{inv.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900 font-sans">{inv.customer_name}</td>
                        <td className="py-3 px-4 text-indigo-600 font-bold">{inv.customer_gstin}</td>
                        <td className="py-3 px-4">₹{inv.taxable_amount?.toFixed(2)}</td>
                        <td className="py-3 px-6 text-right font-extrabold text-slate-900">₹{inv.total_value?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Sales Analysis */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Select Aggregation Period:</span>
            <div className="flex gap-2">
              {['daily', 'monthly', 'yearly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSalesPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    salesPeriod === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Period</th>
                  <th className="py-3.5 px-4">Invoices Generated</th>
                  <th className="py-3.5 px-4">Taxes Collected</th>
                  <th className="py-3.5 px-6 text-right">Gross Sales (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(salesData?.records || []).length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400 font-sans">No sales in this period.</td>
                  </tr>
                ) : (
                  salesData.records.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6 font-bold text-indigo-700 font-sans">{r.period}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-700">{r.invoices_count} bills</td>
                      <td className="py-3.5 px-4 text-slate-500">₹{r.tax?.toFixed(2)}</td>
                      <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">₹{r.sales?.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Profit & Loss Statement */}
      {activeTab === 'pnl' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="text-center pb-6 border-b border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900">Profit & Loss Statement</h2>
            <p className="text-xs text-slate-400 mt-1">Based on real-time sales, inward purchases, and operational expenses</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800">1. Gross Revenue (Excluding Tax)</span>
              <span className="font-extrabold text-slate-900 font-mono">₹{pnlData?.gross_revenue?.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pl-4">
              <span>Less: Cost of Goods Sold (Purchases Inward)</span>
              <span className="font-mono text-rose-600">- ₹{pnlData?.cogs_purchases?.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-y border-slate-200/80 bg-slate-50/60 px-4 rounded-xl font-bold">
              <span>Gross Profit Margin</span>
              <span className="font-mono text-indigo-700">₹{pnlData?.gross_profit?.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pl-4">
              <span>Less: Operating Expenses (Rent, Salaries, Utilities)</span>
              <span className="font-mono text-rose-600">- ₹{pnlData?.operating_expenses?.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between py-4 border-t-2 border-slate-900 text-lg font-black">
              <span className="text-slate-900">Net Business Profit</span>
              <span className="text-emerald-600 font-mono">₹{pnlData?.net_profit?.toFixed(2)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <p className="text-xs text-emerald-800 font-semibold">Net Profit Margin</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{pnlData?.net_margin_percentage || 0}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
