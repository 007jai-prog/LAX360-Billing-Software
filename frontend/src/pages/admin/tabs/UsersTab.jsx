import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  KeyRound,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react';

const ROLE_BADGES = {
  saas_super_admin: { label: 'Platform SuperAdmin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  business_owner: { label: 'Business Owner', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  business_admin: { label: 'Business Admin', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  cashier: { label: 'Cashier / POS', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  inventory_manager: { label: 'Inventory Manager', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  accountant: { label: 'Accountant', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  employee: { label: 'Staff Member', color: 'bg-slate-100 text-slate-700 border-slate-200' }
};

export const UsersTab = ({
  users,
  tenants,
  currentUserId,
  onOpenCreateModal,
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onDeleteUser
}) => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRole !== 'ALL' && u.role !== selectedRole) {
        return false;
      }
      // Status filter
      if (selectedStatus === 'active' && !u.is_active) return false;
      if (selectedStatus === 'inactive' && u.is_active) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const name = (u.full_name || u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const tName = (u.tenant_name || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || tName.includes(q);
      }
      return true;
    });
  }, [users, search, selectedRole, selectedStatus]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Row */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, phone, business..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Filter Dropdowns and Add User Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            aria-label="Filter by role"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="saas_super_admin">Platform SuperAdmins</option>
            <option value="business_owner">Business Owners</option>
            <option value="business_admin">Business Admins</option>
            <option value="cashier">Cashiers / POS</option>
            <option value="inventory_manager">Inventory Managers</option>
            <option value="employee">Staff / Employees</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by account status"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Deactivated Accounts</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of {users.length} registered accounts
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Clear search filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">User Profile &amp; Contact</th>
                <th className="px-5 py-3.5">Assigned Business</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    No user accounts match your search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = ROLE_BADGES[u.role] || {
                    label: u.role || 'User',
                    color: 'bg-slate-100 text-slate-700 border-slate-200'
                  };
                  const isSelf = u.id === currentUserId;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      {/* User Profile */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.full_name?.charAt(0) || u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{u.full_name || u.name || 'Unnamed User'}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                            {u.phone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {u.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Business */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {u.tenant_name || 'Platform Level'}
                        </div>
                        {u.tenant_category && u.tenant_category !== 'N/A' && (
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            {u.tenant_category}
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleConfig.color}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Deactivated
                            </>
                          )}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-slate-500">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit User */}
                          <button
                            type="button"
                            onClick={() => onEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit User Profile"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => onResetPassword(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Reset User Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => onToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.is_active
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.is_active ? 'Deactivate User Account' : 'Reactivate User Account'}
                          >
                            {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => onDeleteUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isSelf ? 'Cannot delete your own account' : 'Delete User Permanently'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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

export default UsersTab;
