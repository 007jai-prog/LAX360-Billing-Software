import React from 'react';
import { RefreshCw } from 'lucide-react';

export const TextileExchanges = () => (
  <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
        Garment Exchanges &amp; Returns
      </h1>
      <p className="mt-1 text-xs text-slate-500">
        Manage size/color fit exchanges and credit adjustments
      </p>
    </header>

    <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
      <RefreshCw className="mx-auto mb-3 h-10 w-10 text-indigo-600" />
      <h2 className="text-base font-bold text-slate-900">
        Exchange Management Active
      </h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
        When customers request size adjustments (e.g. Size M to Size L), use
        the POS return toggle to exchange without modifying original tax
        compliance records.
      </p>
    </div>
  </div>
);
