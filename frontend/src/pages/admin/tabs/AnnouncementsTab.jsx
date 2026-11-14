import React from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Radio
} from 'lucide-react';

const TYPE_CONFIGS = {
  info: { label: 'Information', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Info },
  warning: { label: 'Notice / Warning', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  success: { label: 'Feature Launch', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  critical: { label: 'Critical Alert', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle }
};

export const AnnouncementsTab = ({
  announcements,
  onOpenCreateModal,
  onDeleteAnnouncement
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Platform-Wide Announcements &amp; Broadcasts
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast messages, maintenance notices, and feature alerts to all tenant dashboards.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Radio className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No active broadcasts</p>
            <p className="text-xs text-slate-500 mt-1">
              Create an announcement to communicate updates or maintenance with your business tenants.
            </p>
          </div>
        ) : (
          announcements.map((ann) => {
            const typeCfg = TYPE_CONFIGS[ann.type] || TYPE_CONFIGS.info;
            const Icon = typeCfg.icon;

            return (
              <div
                key={ann.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${typeCfg.bg}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {typeCfg.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Delete announcement broadcast"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">{ann.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{ann.message}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">Audience:</span>
                    <span className="capitalize bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                      {ann.target_category || 'All Categories'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Expires: {ann.expires_at || 'Perpetual'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AnnouncementsTab;
