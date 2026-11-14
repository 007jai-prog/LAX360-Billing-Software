import React, { useState } from 'react';
import { X, KeyRound, Sparkles, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const PasswordResetModal = ({ user, onClose, onResetPassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleGenerateRandom = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onResetPassword(user.id, newPassword);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-amber-300" />
            <h2 className="text-base font-extrabold text-white">Reset User Password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="font-extrabold text-slate-900">{user.full_name || user.name}</p>
            <p className="text-slate-500 font-mono text-[11px]">{user.email}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">New Password *</label>
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Strong</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter or generate new password"
                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            The user can log in immediately with this new password. You can share this credential directly with the user.
          </p>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-amber-200 transition cursor-pointer"
            >
              {loading ? 'Resetting…' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetModal;
