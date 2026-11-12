import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, Mail, Phone, Building, AlertCircle, CheckCircle, 
  ArrowRight, Loader2, Sparkles, Shield, Send, Check
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { demoLogin, requestAccount } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    requestedRole: 'student',
    purpose: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, requestedRole: role }));
  };

  const handleDemoAccess = async (role) => {
    setLoading(true);
    try {
      if (demoLogin) {
        await demoLogin(role);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide your name and email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let res;
      if (requestAccount) {
        res = await requestAccount(formData);
      } else {
        res = { success: true };
      }

      if (res && res.success) {
        setSubmitted(true);
        setSubmittedData({ ...formData });
      } else {
        setError(res?.message || 'Failed to submit account request. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#080c18]">
      
      {/* Background Prismatic Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-floatSlow"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-floatSlow" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        
        {/* Main High-Gloss Acrylic Card */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 md:p-10 bg-gradient-to-br from-white/[0.12] via-white/[0.03] to-white/[0.06] backdrop-blur-2xl border border-white/20 border-t-white/45 border-l-white/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
          {/* Top-edge specular glint */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
          {/* Subtle curved gloss sheen */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none rounded-t-3xl"></div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider mb-3">
              <Shield size={14} /> Plan Event Authorization System
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              Raise an Account Request
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-2 max-w-lg mx-auto">
              New accounts are created and provisioned exclusively by the <strong className="text-purple-400 font-semibold">Plan Event Organizer</strong>. Submit your details below to receive your Login ID and password via email.
            </p>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mb-8 p-4 bg-gray-800/60 border border-gray-700/50 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-400" />
                Visiting as a Guest? Explore Demo Accounts Instantly:
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Zero Wait
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoAccess('student')}
                disabled={loading}
                className="py-2.5 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400 rounded-xl text-xs font-bold text-cyan-300 hover:text-white transition-all duration-200 text-center flex items-center justify-center gap-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:-translate-y-0.5"
              >
                <span>🎓</span>
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoAccess('organizer')}
                disabled={loading}
                className="py-2.5 px-3 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-300 hover:text-white transition-all duration-200 text-center flex items-center justify-center gap-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:-translate-y-0.5"
              >
                <span>📋</span>
                <span>Plan Event</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoAccess('professional')}
                disabled={loading}
                className="py-2.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-300 hover:text-white transition-all duration-200 text-center flex items-center justify-center gap-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5"
              >
                <span>⚡</span>
                <span>Pro Tools</span>
              </button>
            </div>
          </div>

          {submitted ? (
            /* Success Confirmation State */
            <div className="space-y-6 text-center py-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                <Check size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Account Request Raised Successfully!
                </h3>
                <p className="text-gray-300 text-sm max-w-md mx-auto">
                  Your request has been stored in MongoDB. The Plan Event Organizer will review and allocate your account.
                </p>
              </div>

              <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-5 max-w-md mx-auto text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Requester:</span>
                  <span className="text-white font-medium">{submittedData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Email:</span>
                  <span className="text-emerald-400 font-medium">{submittedData?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Requested Account:</span>
                  <span className="text-purple-300 font-bold uppercase">{submittedData?.requestedRole}</span>
                </div>
                <div className="pt-2 border-t border-gray-700/60 text-xs text-gray-400">
                  📩 Your Login ID and temporary password will be dispatched to <strong className="text-white">{submittedData?.email}</strong> upon approval.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => handleDemoAccess(submittedData?.requestedRole || 'student')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> Explore Demo Account While Waiting
                </button>
                <Link
                  to="/login"
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl border border-gray-700 transition-colors text-sm"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Request Submission Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name & Email Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                    Email Address * (Credentials will be sent here)
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="john.doe@college.edu"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Organization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                    College / Department / Organization
                  </label>
                  <div className="relative">
                    <Building size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="organization"
                      placeholder="Computer Science Department"
                      value={formData.organization}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Account Type Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Select Requested Account Role *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div 
                    onClick={() => handleRoleSelect('student')}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                      formData.requestedRole === 'student' 
                        ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                        : 'bg-gray-800/50 border-gray-700/60 hover:bg-gray-800/80 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="text-2xl mb-1">🎓</div>
                    <div className="font-bold text-white text-sm">Student</div>
                    <div className="text-xs text-cyan-300/80 mt-1">Calendar, Analytics & Event Passes</div>
                  </div>

                  <div 
                    onClick={() => handleRoleSelect('organizer')}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                      formData.requestedRole === 'organizer' 
                        ? 'bg-purple-500/15 border-purple-400 ring-2 ring-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]' 
                        : 'bg-gray-800/50 border-gray-700/60 hover:bg-gray-800/80 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="text-2xl mb-1">📋</div>
                    <div className="font-bold text-white text-sm">Plan Event</div>
                    <div className="text-xs text-purple-300/80 mt-1">Create Events, Book Venues & Allocate Roles</div>
                  </div>

                  <div 
                    onClick={() => handleRoleSelect('professional')}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                      formData.requestedRole === 'professional' 
                        ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
                        : 'bg-gray-800/50 border-gray-700/60 hover:bg-gray-800/80 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="font-bold text-white text-sm">Pro Tools</div>
                    <div className="text-xs text-emerald-300/80 mt-1">Full Pro Suite + Generative AI Tools</div>
                  </div>
                </div>
              </div>

              {/* Purpose / Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Purpose / Note for Plan Event Organizer
                </label>
                <textarea
                  name="purpose"
                  rows={2}
                  placeholder="e.g. Requesting account access to manage upcoming department symposium and student event registrations."
                  value={formData.purpose}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 text-white font-bold rounded-xl hover:scale-[1.01] transition-transform duration-200 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Submitting Request to MongoDB...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Submit Account Request to Plan Event Organizer</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer note & back to login */}
          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-400">
            Already have your allocated account?{' '}
            <Link to="/login" className="text-purple-400 font-bold hover:text-purple-300 underline underline-offset-4 ml-1">
              Sign In Here →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
