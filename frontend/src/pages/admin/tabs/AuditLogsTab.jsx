import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Clock,
  User,
  Activity,
  FileCode,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

const ACTION_COLORS = {
  TENANT_CREATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TENANT_STATUS_CHANGED: 'bg-amber-50 text-amber-700 border-amber-200',
  TENANT_UPDATED: 'bg-blue-50 text-blue-700 border-blue-200',
  TENANT_DELETED: 'bg-rose-50 text-rose-700 border-rose-200',
  TENANT_IMPERSONATED: 'bg-orange-50 text-orange-700 border-orange-200',
  USER_CREATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  USER_STATUS_TOGGLED: 'bg-amber-50 text-amber-700 border-amber-200',
  USER_PASSWORD_RESET: 'bg-purple-50 text-purple-700 border-purple-200',
  USER_DELETED: 'bg-rose-50 text-rose-700 border-rose-200',
  SUBSCRIPTION_OVERRIDDEN: 'bg-purple-50 text-purple-700 border-purple-200',
  CATEGORY_STATUS_TOGGLED: 'bg-teal-50 text-teal-700 border-teal-200',
  CATEGORY_CONFIG_UPDATED: 'bg-blue-50 text-blue-700 border-blue-200',
  ANNOUNCEMENT_CREATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PLATFORM_SETTINGS_UPDATED: 'bg-indigo-50 text-indigo-700 border-indigo-200'
};

export const AuditLogsTab = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const action = (l.action || '').toLowerCase();
    const actor = (l.actor_email || l.actor_name || '').toLowerCase();
    const target = (l.target_type || '').toLowerCase();
    return action.includes(q) || actor.includes(q) || target.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by action, administrator, target..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Displaying <strong className="text-slate-800">{filteredLogs.length}</strong> recorded administrative actions
          </span>
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
            Immutable Audit Trail
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action Executed</th>
                <th className="px-5 py-3.5">Administrator / Actor</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5 text-right">Details Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badgeColor =
                    ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700 border-slate-200';
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/70 transition">
                        {/* Timestamp */}
                        <td className="px-5 py-4 text-slate-500 font-mono text-[11px]">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString()
                            : 'Just now'}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${badgeColor}`}
                          >
                            {log.action?.replaceAll('_', ' ')}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">
                            {log.actor_name || 'SuperAdmin'}
                          </div>
                          <div className="text-[11px] text-slate-400">{log.actor_email}</div>
                        </td>

                        {/* Target */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-700">
                            {log.target_type || 'System'}
                          </span>
                          {log.target_id && (
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                              {log.target_id}
                            </span>
                          )}
                        </td>

                        {/* Payload Toggle */}
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            {isExpanded ? 'Hide Payload' : 'View Payload'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="px-5 py-3 bg-slate-900 text-slate-200 font-mono text-[11px]">
                            <pre className="overflow-x-auto p-2">
                              {JSON.stringify(log.details || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsTab;
