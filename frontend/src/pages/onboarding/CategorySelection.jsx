import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import DynamicIcon from '../../components/common/DynamicIcon';
import { ArrowRight, Check, Zap, Sparkles } from 'lucide-react';

export const CategorySelection = () => {
  const { categories } = useBusinessConfig();
  const [selectedCategory, setSelectedCategory] = useState('grocery');
  const navigate = useNavigate();

  const handleProceed = () => {
    navigate(`/register?category=${selectedCategory}`);
  };

  const categoryFeatures = {
    grocery: [
      'Fast barcode scanner POS',
      'Weight scale & fractional units',
      'Expiry date & shelf-life tracking',
      'Wholesale & retail price toggle'
    ],
    restaurant: [
      'Visual table grid management',
      'Kitchen Order Ticket (KOT) print',
      'Kitchen Display System (KDS)',
      'Split billing & takeaway orders'
    ],
    pharmacy: [
      'Medicine batch number tracking',
      'Manufacturing & expiry warnings',
      'Generic salt composition lookup',
      'Doctor prescription records'
    ],
    // textile: [
    //   'Size & color variant matrix',
    //   'Apparel exchanges & returns',
    //   'Seasonal collection categorization'
    // ],
    wholesale: [
      'Tiered B2B bulk pricing',
      'Distributor / Dealer credit limits',
      'Multi-warehouse stock transfers',
      'Minimum Order Quantity (MOQ)'
    ],
    electronics: [
      'Serial & Dual IMEI tracking',
      'Warranty certificate lookup',
      'Repair & service job ticketing',
      'Brand & model management'
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Step 1 of Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Business Category
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            LAX360 dynamically configures your dashboard, POS terminal, product specifications, and reports based on your business type.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const features = categoryFeatures[cat.id] || [];

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-200 border-2 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50'
                    : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      <DynamicIcon name={cat.icon} className="w-6 h-6" />
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{cat.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                    {cat.tagline}
                  </p>

                  {/* Feature checklist */}
                  <ul className="space-y-2 mb-6">
                    {features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(cat.id);
                    navigate(`/register?category=${cat.id}`);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>Select & Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Floating bottom action bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Selected Business Type</p>
              <p className="text-sm font-bold text-slate-900 capitalize">
                {categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/')}
              className="w-1/2 sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={handleProceed}
              className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySelection;
