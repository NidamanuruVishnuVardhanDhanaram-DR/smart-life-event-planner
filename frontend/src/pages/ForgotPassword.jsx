import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail, User, Lock, Eye, EyeOff, KeyRound,
  AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Loader2
} from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [formData, setFormData] = useState({
    email: (() => {
      try {
        return localStorage.getItem('rememberedEmail') || '';
      } catch {
        return '';
      }
    })(),
    name: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = formData.name.trim();

    if (!cleanEmail || !cleanName) {
      setError('Please enter both your email address and registered full name');
      return;
    }

    if (!formData.newPassword || formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await resetPassword(cleanEmail, cleanName, formData.newPassword);
      if (res?.success) {
        try {
          localStorage.setItem('rememberedEmail', cleanEmail);
        } catch {}
        setSuccessMessage(res.message);
      } else {
        setError(res?.message || 'Unable to reset password');
      }
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#080c18]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-floatSlow"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white/[0.12] via-white/[0.03] to-white/[0.06] backdrop-blur-2xl border border-white/20 border-t-white/45 border-l-white/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg mb-4">
              <KeyRound size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Set or Reset Password
            </h1>
            <p className="text-gray-300 text-sm mt-2">
              Verify your registered email and full name to set a new password across desktop and mobile.
            </p>
          </div>

          {successMessage ? (
            <div className="space-y-5 text-center py-4 animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-emerald-200 text-sm font-medium">{successMessage}</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform text-sm flex items-center justify-center gap-2"
              >
                <span>Go to Sign In</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-red-200 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Registered Full Name *
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Exact full name on your account"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  New Password * (min 6 characters)
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-11 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-white font-medium transition-colors"
            >
              <ArrowLeft size={15} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
