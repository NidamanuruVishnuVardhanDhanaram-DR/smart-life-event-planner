import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserCheck, Shield, Sparkles, Check, AlertCircle, 
  Search, RefreshCw, CalendarDays, ArrowRight, UserPlus, Award, Filter,
  Mail, Key, Copy, CheckCircle2, Database, Clock, X
} from 'lucide-react';

const AccountAllocation = ({ events = [], onAllocationUpdated }) => {
  const { user } = useAuth();
  
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests', 'create', 'users', 'events'
  
  // Data States
  const [users, setUsers] = useState([]);
  const [accountRequests, setAccountRequests] = useState([]);
  const [mongoStatus, setMongoStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [toast, setToast] = useState(null);

  // Direct Account Creation Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'student',
    password: '',
    organization: '',
    updateIfExists: false,
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Event Allocation State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [allocationRole, setAllocationRole] = useState('student');
  const [isAllocatingEvent, setIsAllocatingEvent] = useState(false);

  // Role Allocation Modal
  const [modalUser, setModalUser] = useState(null);
  const [newRole, setNewRole] = useState('student');

  // Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Credentials Dispatched Modal
  const [dispatchedCredentials, setDispatchedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Users, Account Requests & MongoDB Status
  const loadAllAllocationData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Load MongoDB Status
    try {
      const statusRes = await axios.get(`${API_URL}/api/users/mongo-status`);
      if (statusRes.data) setMongoStatus(statusRes.data);
    } catch {}

    // 2. Load Account Requests from MongoDB
    try {
      if (token) {
        const reqRes = await axios.get(`${API_URL}/api/users/account-requests`, { headers });
        if (Array.isArray(reqRes.data)) {
          setAccountRequests(reqRes.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch account requests:', err.message);
    }

    // 3. Load Users from MongoDB
    let loadedUsers = [];
    try {
      if (token) {
        const usersRes = await axios.get(`${API_URL}/api/users`, { headers });
        if (Array.isArray(usersRes.data) && usersRes.data.length > 0) {
          loadedUsers = usersRes.data;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch users from backend:', err.message);
    }

    if (loadedUsers.length === 0) {
      const demoUsers = JSON.parse(localStorage.getItem('demoUsers') || '[]');
      const defaultUsers = [
        { _id: 'std_101', name: 'Rahul Sharma', email: 'rahul.student@college.edu', role: 'student', allocatedRole: 'student', createdAt: new Date().toISOString() },
        { _id: 'std_102', name: 'Ananya Verma', email: 'ananya.v@college.edu', role: 'student', allocatedRole: 'student', createdAt: new Date().toISOString() },
        { _id: 'std_103', name: 'Karthik Raju', email: 'karthik.r@college.edu', role: 'student', allocatedRole: 'student', createdAt: new Date().toISOString() },
        { _id: 'pln_201', name: 'Event Coordinator Alex', email: 'coordinator.alex@eventplanner.com', role: 'organizer', allocatedRole: 'organizer', createdAt: new Date().toISOString() },
        { _id: 'pro_301', name: 'Sarah Jenkins (Pro)', email: 'sarah.j@enterprise.com', role: 'professional', allocatedRole: 'professional', createdAt: new Date().toISOString() },
        ...demoUsers
      ];
      loadedUsers = defaultUsers;
    }

    setUsers(loadedUsers);
    setLoading(false);
  };

  useEffect(() => {
    loadAllAllocationData();
  }, []);

  // Handle Approve Request & Email Credentials
  const handleApproveRequest = async (request, assignedRole = null) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const targetRole = assignedRole || request.requestedRole || 'student';
      
      const res = await axios.post(
        `${API_URL}/api/users/account-requests/${request._id}/approve`,
        { role: targetRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(`🎉 Approved & emailed credentials to ${request.email}!`, 'success');
      
      // Show credentials notification modal
      if (res.data?.credentials) {
        setDispatchedCredentials({
          name: request.name,
          email: request.email,
          role: targetRole,
          password: res.data.credentials.password,
          emailResult: res.data.emailResult,
        });
      }

      loadAllAllocationData();
      if (onAllocationUpdated) onAllocationUpdated();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve account request', 'error');
    }
  };

  // Handle Reject Request
  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to decline this account request?')) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      await axios.post(
        `${API_URL}/api/users/account-requests/${requestId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Account request rejected', 'info');
      loadAllAllocationData();
    } catch (err) {
      showToast('Failed to reject request', 'error');
    }
  };

  // Handle Direct Account Creation by Plan Event Person
  const handleDirectCreateAccount = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email) {
      showToast('Name and email are required', 'warning');
      return;
    }

    setIsCreatingAccount(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await axios.post(
        `${API_URL}/api/users/create-account`,
        createForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(
        res.data?.updated
          ? `✅ Updated credentials for ${createForm.email}!`
          : `✅ Created account & emailed credentials to ${createForm.email}!`,
        'success'
      );

      if (res.data?.credentials) {
        setDispatchedCredentials({
          name: createForm.name,
          email: createForm.email,
          role: createForm.role,
          password: res.data.credentials.password,
          emailResult: res.data.emailResult,
        });
      }

      setCreateForm({
        name: '',
        email: '',
        role: 'student',
        password: '',
        organization: '',
        updateIfExists: false,
      });

      loadAllAllocationData();
      if (onAllocationUpdated) onAllocationUpdated();
    } catch (err) {
      if (err.response?.data?.code === 'USER_EXISTS') {
        setCreateForm(prev => ({ ...prev, updateIfExists: true }));
      }
      showToast(err.response?.data?.message || 'Failed to create account', 'error');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Handle Organizer/Admin Password Reset for an existing user
  const handleResetUserPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (resetPasswordInput.trim() && resetPasswordInput.trim().length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setIsResettingPassword(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await axios.put(
        `${API_URL}/api/users/${resetModalUser._id}/password`,
        { password: resetPasswordInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(`✅ Password updated for ${resetModalUser.email}`, 'success');
      if (res.data?.credentials) {
        setDispatchedCredentials({
          name: resetModalUser.name,
          email: res.data.credentials.email,
          role: resetModalUser.role,
          password: res.data.credentials.password,
          emailResult: res.data.emailResult,
        });
      }
      setResetModalUser(null);
      setResetPasswordInput('');
      loadAllAllocationData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset user password', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle Account Role Allocation (Promote/Demote existing user)
  const handleAccountRoleAllocation = async (targetUser, targetRole) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token && !targetUser._id.startsWith('std_') && !targetUser._id.startsWith('pln_')) {
        try {
          await axios.put(`${API_URL}/api/users/${targetUser._id}/role`, { role: targetRole }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn('Backend role update error:', e.message);
        }
      }

      const updated = users.map(u => 
        u._id === targetUser._id 
          ? { ...u, role: targetRole, allocatedRole: targetRole, allocatedBy: user?.name || 'Plan Event Manager' } 
          : u
      );
      setUsers(updated);
      localStorage.setItem('demoUsers', JSON.stringify(updated));

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser._id === targetUser._id) {
        currentUser.role = targetRole;
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        window.dispatchEvent(new Event('userRoleUpdated'));
      }

      showToast(`✅ ${targetUser.name} allocated as ${targetRole.toUpperCase()}`, 'success');
      setModalUser(null);
      if (onAllocationUpdated) onAllocationUpdated();
    } catch (err) {
      showToast('Failed to allocate account role', 'error');
    }
  };

  // Handle Event Attendance Allocation (Allocate Student to Event)
  const handleAllocateStudentToEvent = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !selectedUserId) {
      showToast('Please select both an event and a student', 'warning');
      return;
    }

    setIsAllocatingEvent(true);
    try {
      const targetUser = users.find(u => u._id === selectedUserId);
      const targetEvent = events.find(ev => ev._id === selectedEventId);

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token && !selectedEventId.startsWith('event_')) {
        try {
          await axios.post(`${API_URL}/api/events/${selectedEventId}/allocate`, {
            userId: selectedUserId,
            role: allocationRole
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn('Backend event allocate error:', e.message);
        }
      }

      const storedEvents = JSON.parse(localStorage.getItem('events') || '[]');
      const updatedEvents = storedEvents.map(ev => {
        if (ev._id === selectedEventId) {
          const participants = ev.participants || [];
          const exists = participants.some(p => (p.user?._id || p.user || p._id) === selectedUserId);
          if (!exists) {
            participants.push({
              user: targetUser,
              role: allocationRole,
              status: 'allocated'
            });
          }
          return { ...ev, participants };
        }
        return ev;
      });

      localStorage.setItem('events', JSON.stringify(updatedEvents));
      window.dispatchEvent(new Event('eventUpdated'));

      showToast(`🎉 Allocated ${targetUser?.name || 'Student'} to ${targetEvent?.title || 'Event'}!`, 'success');
      setSelectedUserId('');
      setSelectedEventId('');
    } catch (err) {
      showToast('Failed to allocate student to event', 'error');
    } finally {
      setIsAllocatingEvent(false);
    }
  };

  const copyCredentialsToClipboard = () => {
    if (!dispatchedCredentials) return;
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login';
    const text = `Smart Life Event Planner Credentials:\nLogin ID / Email: ${dispatchedCredentials.email}\nPassword: ${dispatchedCredentials.password}\nRole: ${dispatchedCredentials.role}\nURL: ${loginUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const pendingRequests = accountRequests.filter(r => r.status === 'pending');

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterRole === 'all') return matchesSearch;
    if (filterRole === 'student') return matchesSearch && u.role === 'student';
    if (filterRole === 'organizer') return matchesSearch && u.role === 'organizer';
    if (filterRole === 'professional') return matchesSearch && (u.role === 'professional' || u.role === 'pro' || u.role === 'admin');
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      
      {/* Top Banner with MongoDB Status - High-Gloss */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-purple-500/15 via-white/[0.03] to-indigo-500/10 backdrop-blur-2xl border border-purple-400/30 border-t-purple-300/60 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-300/80 to-transparent"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
                <Shield size={14} /> Plan Event Manager Authority
              </span>
              {mongoStatus && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  <Database size={13} /> MongoDB Connected • {mongoStatus.collections?.users || users.length} Users • {mongoStatus.collections?.accountRequests || accountRequests.length} Requests
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Account Provisioning & Allocation Hub
            </h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              As the Plan Event Manager, you review raised account requests, provision new accounts in MongoDB, email credentials to users, and allocate students to campus events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllAllocationData}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync MongoDB
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto gap-2 border-b border-gray-800 pb-3 max-w-full">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`whitespace-nowrap flex-shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'requests'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
          }`}
        >
          <Mail size={16} />
          <span>Pending Account Requests</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white font-bold ml-1 animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('create')}
          className={`whitespace-nowrap flex-shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'create'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
          }`}
        >
          <UserPlus size={16} />
          <span>Provision New Account</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`whitespace-nowrap flex-shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'users'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
          }`}
        >
          <Users size={16} />
          <span>All Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`whitespace-nowrap flex-shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'events'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
          }`}
        >
          <CalendarDays size={16} />
          <span>Allocate Students to Events</span>
        </button>
      </div>

      <div key={activeSubTab} className="animate-slideUp animate-fadeIn">
      {/* ========================================================================= */}
      {/* VIEW 1: PENDING ACCOUNT REQUESTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="text-purple-400" size={20} />
                User Account Access Requests
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                New visitors and users must raise a request to obtain an account. Approve to create their account in MongoDB and automatically email their ID & password.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {pendingRequests.length} Pending Approval
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : accountRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-500 space-y-3">
              <Mail size={40} className="mx-auto text-gray-600" />
              <p className="text-base font-medium">No account requests submitted yet.</p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                When new users click "Raise an Account Request" on the registration page, their requests will appear here for your review and allocation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs">
                    <th className="py-3 px-3">Requester</th>
                    <th className="py-3 px-3">Email & Contact</th>
                    <th className="py-3 px-3">Requested Tier</th>
                    <th className="py-3 px-3">Organization & Purpose</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {accountRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{req.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} /> {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-gray-300 text-xs font-mono">{req.email}</div>
                        {req.phone && <div className="text-gray-500 text-xs">{req.phone}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          req.requestedRole === 'student' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          req.requestedRole === 'organizer' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {req.requestedRole === 'student' && '🎓 Student'}
                          {req.requestedRole === 'organizer' && '📋 Plan Event'}
                          {(req.requestedRole === 'professional' || req.requestedRole === 'pro') && '⭐ Pro Tools'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 max-w-xs">
                        {req.organization && (
                          <div className="text-xs font-semibold text-gray-300">{req.organization}</div>
                        )}
                        <div className="text-xs text-gray-400 truncate" title={req.purpose}>
                          {req.purpose || 'No description provided'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          req.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1"
                              title="Create user in MongoDB and email ID + password"
                            >
                              <Mail size={13} /> Approve & Mail Credentials
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req._id)}
                              className="px-2.5 py-1.5 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg border border-gray-700 text-xs transition-all"
                              title="Decline request"
                            >
                              Reject
                            </button>
                          </div>
                        ) : req.status === 'approved' ? (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 size={14} /> Provisioned & Mailed
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 font-semibold">Declined</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: PROVISION NEW ACCOUNT DIRECTLY */}
      {/* ========================================================================= */}
      {activeSubTab === 'create' && (
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-xl max-w-2xl mx-auto space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider mb-2">
              <UserPlus size={14} /> Direct Account Creation
            </div>
            <h3 className="text-2xl font-bold text-white">
              Provision & Email Account Credentials
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Create a new user directly in MongoDB. The system will automatically generate or assign a password and send the credentials email to the user.
            </p>
          </div>

          <form onSubmit={handleDirectCreateAccount} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Krishnan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Email Address * (Credentials will be sent here)
                </label>
                <input
                  type="email"
                  required
                  placeholder="maya.k@college.edu"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Allocate Account Role Tier *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { role: 'student', title: '🎓 Student', desc: 'Calendar, Analytics & Bookings Only' },
                  { role: 'organizer', title: '📋 Plan Event', desc: 'Full Event & Account Allocation' },
                  { role: 'professional', title: '⭐ Pro Tools', desc: 'Full Pro Suite & Generative AI' },
                ].map(r => (
                  <div
                    key={r.role}
                    onClick={() => setCreateForm(prev => ({ ...prev, role: r.role }))}
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all ${
                      createForm.role === r.role 
                        ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/30' 
                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-bold text-white text-sm">{r.title}</div>
                    <div className="text-[11px] text-gray-400 mt-1">{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Temporary Password (Optional - Leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Organization / Department (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Department of Robotics"
                  value={createForm.organization}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, organization: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!createForm.updateIfExists}
                onChange={(e) => setCreateForm(prev => ({ ...prev, updateIfExists: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
              />
              <span>Update existing user&apos;s password &amp; role if email is already registered</span>
            </label>

            <button
              type="submit"
              disabled={isCreatingAccount}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mail size={16} />
              <span>{isCreatingAccount ? 'Creating & Dispatching Email...' : 'Provision Account in MongoDB & Email Credentials'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ALL USER ACCOUNTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-indigo-400" size={20} />
                Registered User Accounts
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                View all accounts stored in MongoDB and adjust their permission tiers.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex bg-gray-800/70 p-1 rounded-xl border border-gray-700/60 flex-wrap">
              {[
                { label: 'All Accounts', value: 'all' },
                { label: 'Students', value: 'student' },
                { label: 'Plan Event', value: 'organizer' },
                { label: 'Pro Tools', value: 'professional' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterRole(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterRole === f.value ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search accounts by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs">
                  <th className="py-3 px-3">Account Name</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">Current Tier</th>
                  <th className="py-3 px-3 text-right">Allocation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-white">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-3 text-gray-300 text-xs font-mono">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        u.role === 'student' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        u.role === 'organizer' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {u.role === 'student' && '🎓 Student'}
                        {u.role === 'organizer' && '📋 Plan Event'}
                        {(u.role === 'professional' || u.role === 'pro' || u.role === 'admin') && '⭐ Pro Tools'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setResetPasswordInput('');
                          }}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 hover:text-white rounded-lg border border-amber-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                        >
                          <Key size={14} /> Reset Password
                        </button>
                        <button
                          onClick={() => {
                            setModalUser(u);
                            setNewRole(u.role || 'student');
                          }}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-purple-300 hover:text-white rounded-lg border border-purple-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                        >
                          <Award size={14} /> Reallocate Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: ALLOCATE STUDENTS TO EVENTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'events' && (
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-xl max-w-3xl mx-auto space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider mb-2">
              <CalendarDays size={14} /> Student Event Assignment
            </div>
            <h3 className="text-2xl font-bold text-white">
              Allocate Students to Campus Events
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Select an upcoming event and allocate a registered student with their assigned session role. This will reflect directly in the Student Calendar & Bookings.
            </p>
          </div>

          <form onSubmit={handleAllocateStudentToEvent} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                1. Select Target Event *
              </label>
              <select
                required
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
              >
                <option value="">-- Choose an Event --</option>
                {events.map(ev => (
                  <option key={ev._id} value={ev._id}>
                    {ev.title} ({ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'Date TBD'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                2. Select User / Student to Allocate *
              </label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
              >
                <option value="">-- Choose User / Student --</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email}) - Current: {u.role?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                3. Assigned Participant Role *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'student', label: '🎓 Attendee / Student' },
                  { id: 'coordinator', label: '📋 Coordinator' },
                  { id: 'volunteer', label: '🤝 Volunteer' },
                  { id: 'speaker', label: '🎤 Speaker' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAllocationRole(r.id)}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all ${
                      allocationRole === r.id
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/30'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isAllocatingEvent}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserCheck size={16} />
              <span>{isAllocatingEvent ? 'Allocating Event Pass in MongoDB...' : 'Confirm Student Event Allocation'}</span>
            </button>
          </form>
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREDENTIALS DISPATCHED NOTIFICATION */}
      {/* ========================================================================= */}
      {dispatchedCredentials && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-purple-500/60 rounded-3xl p-7 max-w-lg w-full shadow-2xl animate-fadeIn relative">
            <button
              onClick={() => setDispatchedCredentials(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 mb-3 shadow-lg">
                <Check size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white">Credentials Dispatched!</h3>
              <p className="text-gray-300 text-xs mt-1">
                The account has been created in MongoDB and credentials were sent to the user.
              </p>
            </div>

            <div className="bg-gray-800/80 rounded-2xl p-5 border border-gray-700 space-y-3 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Account Name:</span>
                <span className="text-white font-semibold">{dispatchedCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Login ID / Email:</span>
                <span className="text-emerald-400 font-mono font-bold">{dispatchedCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Generated Password:</span>
                <span className="text-yellow-400 font-mono font-bold text-sm tracking-wider">{dispatchedCredentials.password}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Allocated Role:</span>
                <span className="text-purple-300 font-bold uppercase">{dispatchedCredentials.role}</span>
              </div>

              {dispatchedCredentials.emailResult?.delivered ? (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} /> Real SMTP email successfully delivered to inbox!
                </div>
              ) : (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs flex items-center gap-2">
                  <Mail size={14} /> Email logged to server console (Ready for user login).
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyCredentialsToClipboard}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
              <button
                onClick={() => setDispatchedCredentials(null)}
                className="py-3 px-5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-semibold border border-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Key className="text-amber-400" size={20} />
              Set or Reset Password
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Update login password for <span className="text-purple-400 font-semibold">{resetModalUser.name}</span> ({resetModalUser.email}):
            </p>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  New Password (min 6 chars, leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="Enter new password or leave blank"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 focus:border-amber-500 rounded-xl text-white text-sm outline-none font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-gray-950 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50"
                >
                  {isResettingPassword ? 'Updating...' : 'Save New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUser(null);
                    setResetPasswordInput('');
                  }}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl font-semibold text-sm transition-all border border-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Allocation Modal */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
            <h3 className="text-xl font-bold text-white mb-2">
              Allocate Account Privilege
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Allocate account level for <span className="text-purple-400 font-semibold">{modalUser.name}</span> ({modalUser.email}):
            </p>

            <div className="space-y-3 mb-6">
              {[
                { 
                  role: 'student', 
                  title: '🎓 Student Account', 
                  desc: 'Restricted view: Displays only Calendar, Analytics, and My Bookings. Cannot create events.',
                  color: 'border-blue-500/40 bg-blue-500/10'
                },
                { 
                  role: 'organizer', 
                  title: '📋 Plan Event Account', 
                  desc: 'Full planning privileges: Create events, book venues, and perform Account Allocation.',
                  color: 'border-purple-500/40 bg-purple-500/10'
                },
                { 
                  role: 'professional', 
                  title: '⭐ Pro Tools Account', 
                  desc: 'Enterprise access: Complete Pro AI Tools, financial models, vendor intelligence & risks.',
                  color: 'border-emerald-500/40 bg-emerald-500/10'
                },
              ].map(opt => (
                <div
                  key={opt.role}
                  onClick={() => setNewRole(opt.role)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    newRole === opt.role 
                      ? `${opt.color} ring-2 ring-purple-500 shadow-md` 
                      : 'border-gray-800 bg-gray-800/40 hover:bg-gray-800/70'
                  }`}
                >
                  <p className="font-bold text-white text-sm">{opt.title}</p>
                  <p className="text-xs text-gray-300 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAccountRoleAllocation(modalUser, newRole)}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
              >
                Confirm Allocation
              </button>
              <button
                onClick={() => setModalUser(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl font-semibold text-sm transition-all border border-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 border border-purple-500 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
          <Check className="text-emerald-400" size={18} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AccountAllocation;
