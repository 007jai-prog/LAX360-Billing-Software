import React from 'react';
import {
  ShoppingCart,
  UtensilsCrossed,
  Pill,
  Shirt,
  Truck,
  Smartphone,
  Sliders,
  CheckCircle,
  XCircle,
  Layers,
  Sparkles,
  Edit,
  ArrowUpRight
} from 'lucide-react';

const ICONS = {
  ShoppingCart,
  UtensilsCrossed,
  Pill,
  Shirt,
  Truck,
  Smartphone
};

const formatCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatNumber = (val) =>
  Number(val || 0).toLocaleString('en-IN');

export const CategoriesTab = ({
  categories,
  onToggleStatus,
  onConfigureCategory
}) => {
  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Universal Business Categories &amp; Vertical Modules
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic modules, feature flags, and sign-up availability for each business vertical.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 self-start sm:self-auto">
          Common Engine + Dynamic Vertical Config
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const IconComponent = ICONS[cat.icon] || ShoppingCart;
          const isEnabled = cat.is_enabled !== false;
          const features = cat.features || {};
          const enabledFeatureCount = Object.values(features).filter(Boolean).length;

          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                isEnabled ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50/50'
              }`}
            >
              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs border border-indigo-100">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                        ID: {cat.id}
                      </span>
                    </div>
                  </div>

                  {/* Enable / Disable Status */}
                  <button
                    type="button"
                    onClick={() => onToggleStatus(cat.id, !isEnabled)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border transition cursor-pointer ${
                      isEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                    title={isEnabled ? 'Click to disable sign-ups' : 'Click to enable sign-ups'}
                  >
                    {isEnabled ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Available
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Disabled
                      </>
                    )}
                  </button>
                </div>

                {/* Tagline & Description */}
                <p className="text-xs font-semibold text-slate-700 mb-1.5 leading-snug">
                  {cat.tagline || 'Specialized business management'}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed mb-4">
                  {cat.description}
                </p>

                {/* Live Stats Row */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Businesses
                    </p>
                    <p className="text-sm font-extrabold text-slate-800">
                      {formatNumber(cat.tenants_count)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Volume (GMV)
                    </p>
                    <p className="text-sm font-extrabold text-slate-800">
                      {formatCurrency(cat.total_gmv)}
                    </p>
                  </div>
                </div>

                {/* Features pill summary */}
                <div className="text-[11px] text-slate-600 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100/60 flex items-center justify-between">
                  <span className="font-semibold text-indigo-900">
                    Active Features:
                  </span>
                  <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md shadow-xs">
                    {enabledFeatureCount} Enabled
                  </span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  POS Layout: <strong className="capitalize text-slate-700">{cat.pos_layout || 'Rapid Scan'}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => onConfigureCategory(cat)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Modules</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesTab;
