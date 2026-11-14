// import React, { useState, useEffect } from 'react';
// import api from '../../api/client';
// import Modal from '../../components/common/Modal';
// import { useForm } from 'react-hook-form';
// import { UserCog, Plus, ShieldCheck, Mail, Phone, CheckCircle, Ban } from 'lucide-react';

// export const EmployeesList = () => {
//   const [employees, setEmployees] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isAddOpen, setIsAddOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const { register, handleSubmit, reset } = useForm({
//     defaultValues: {
//       full_name: '',
//       email: '',
//       phone: '',
//       password: '',
//       role: 'billing_operator',
//       branch_id: 'HQ'
//     }
//   });

//   const fetchEmployees = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get('/employees');
//       setEmployees(res.data || []);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchEmployees();
//   }, []);

//   const onAddEmployee = async (data) => {
//     setIsSubmitting(true);
//     try {
//       await api.post('/employees', data);
//       setIsAddOpen(false);
//       reset();
//       fetchEmployees();
//     } catch (err) {
//       alert(err.response?.data?.detail || 'Failed to create employee');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const toggleStatus = async (id) => {
//     try {
//       await api.put(`/employees/${id}/toggle-status`);
//       fetchEmployees();
//     } catch (err) {
//       alert('Failed to update status');
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff & Role-Based Access Control</h1>
//           <p className="text-xs text-slate-500 mt-1">Manage operators, branch managers, accountants, and granular permission access</p>
//         </div>

//         <button
//           onClick={() => {
//             reset();
//             setIsAddOpen(true);
//           }}
//           className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-2"
//         >
//           <Plus className="w-4 h-4" />
//           <span>Add Employee</span>
//         </button>
//       </div>

//       <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
//         <table className="w-full text-left border-collapse text-xs">
//           <thead>
//             <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
//               <th className="py-3.5 px-6">Employee Name</th>
//               <th className="py-3.5 px-4">Email</th>
//               <th className="py-3.5 px-4">Role Assigned</th>
//               <th className="py-3.5 px-4">Branch</th>
//               <th className="py-3.5 px-4">Account Status</th>
//               <th className="py-3.5 px-6 text-right">Action</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {employees.map((emp) => (
//               <tr key={emp.id} className="hover:bg-slate-50/60">
//                 <td className="py-3.5 px-6 font-bold text-slate-900">{emp.full_name}</td>
//                 <td className="py-3.5 px-4 text-slate-600">{emp.email}</td>
//                 <td className="py-3.5 px-4">
//                   <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
//                     {emp.role?.replace('_', ' ')}
//                   </span>
//                 </td>
//                 <td className="py-3.5 px-4 font-mono text-slate-500">{emp.branch_ids?.[0] || 'HQ'}</td>
//                 <td className="py-3.5 px-4">
//                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
//                     emp.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
//                   }`}>
//                     {emp.is_active ? 'Active' : 'Deactivated'}
//                   </span>
//                 </td>
//                 <td className="py-3.5 px-6 text-right">
//                   {emp.role !== 'business_owner' && emp.role !== 'saas_super_admin' && (
//                     <button
//                       onClick={() => toggleStatus(emp.id)}
//                       className="text-xs font-semibold text-slate-400 hover:text-slate-800"
//                     >
//                       {emp.is_active ? 'Deactivate' : 'Activate'}
//                     </button>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Employee Account" size="md">
//         <form onSubmit={handleSubmit(onAddEmployee)} className="space-y-4">
//           <div>
//             <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
//             <input type="text" {...register('full_name', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email *</label>
//               <input type="email" {...register('email', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
//             </div>
//             <div>
//               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
//               <input type="tel" {...register('phone')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role Permission *</label>
//               <select {...register('role')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white capitalize">
//                 <option value="billing_operator">Billing Operator (POS Only)</option>
//                 <option value="inventory_manager">Inventory Manager (Stock & PO)</option>
//                 <option value="accountant">Accountant (Invoices & GST)</option>
//                 <option value="branch_manager">Branch Manager</option>
//                 <option value="business_admin">Business Admin (Full Access)</option>
//               </select>
//             </div>
//             <div>
//               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Branch Assigned</label>
//               <select {...register('branch_id')} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white">
//                 <option value="HQ">Main HQ Branch</option>
//               </select>
//             </div>
//           </div>

//           <div>
//             <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Temporary Password *</label>
//             <input type="password" {...register('password', { required: true })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
//           </div>

//           <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
//             <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
//             <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5">
//               <CheckCircle className="w-3.5 h-3.5" />
//               <span>Create Employee Account</span>
//             </button>
//           </div>
//         </form>
//       </Modal>
//     </div>
//   );
// };

// export default EmployeesList;


import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { Plus, CheckCircle } from 'lucide-react';

export const EmployeesList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'billing_operator',
      branch_id: 'HQ'
    }
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const onAddEmployee = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/employees', data);
      setIsAddOpen(false);
      reset();
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.put(`/employees/${id}/toggle-status`);
      fetchEmployees();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const canToggleStatus = (employee) =>
    employee.role !== 'business_owner' &&
    employee.role !== 'saas_super_admin';

  const renderStatus = (isActive) => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
        isActive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {isActive ? 'Active' : 'Deactivated'}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Staff &amp; Role-Based Access Control
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage operators, branch managers, accountants, and permissions
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            reset();
            setIsAddOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Mobile employee cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No employees found.
          </div>
        ) : (
          employees.map((emp) => (
            <article
              key={emp.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-sm font-bold text-slate-900">
                    {emp.full_name}
                  </h2>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {emp.email}
                  </p>
                </div>
                {renderStatus(emp.is_active)}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Role
                  </p>
                  <p className="mt-1 break-words text-xs font-semibold capitalize text-slate-700">
                    {emp.role?.replaceAll('_', ' ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Branch
                  </p>
                  <p className="mt-1 text-xs font-mono text-slate-700">
                    {emp.branch_ids?.[0] || 'HQ'}
                  </p>
                </div>
              </div>

              {canToggleStatus(emp) && (
                <div className="mt-4 border-t border-slate-100 pt-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleStatus(emp.id)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    {emp.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {/* Desktop employee table */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Employee Name</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Role Assigned</th>
                <th className="px-4 py-3.5">Branch</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {emp.full_name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{emp.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-700">
                        {emp.role?.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {emp.branch_ids?.[0] || 'HQ'}
                    </td>
                    <td className="px-4 py-3.5">{renderStatus(emp.is_active)}</td>
                    <td className="px-6 py-3.5 text-right">
                      {canToggleStatus(emp) && (
                        <button
                          type="button"
                          onClick={() => toggleStatus(emp.id)}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-800"
                        >
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Employee Account"
        size="md"
      >
        <form onSubmit={handleSubmit(onAddEmployee)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              {...register('full_name', { required: true })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Email *
              </label>
              <input
                type="email"
                {...register('email', { required: true })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Phone
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Role Permission *
              </label>
              <select
                {...register('role')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs capitalize"
              >
                <option value="billing_operator">Billing Operator (POS Only)</option>
                <option value="inventory_manager">Inventory Manager (Stock &amp; PO)</option>
                <option value="accountant">Accountant (Invoices &amp; GST)</option>
                <option value="branch_manager">Branch Manager</option>
                <option value="business_admin">Business Admin (Full Access)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Branch Assigned
              </label>
              <select
                {...register('branch_id')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="HQ">Main HQ Branch</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
              Temporary Password *
            </label>
            <input
              type="password"
              {...register('password', { required: true })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                {isSubmitting ? 'Creating...' : 'Create Employee Account'}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesList;