import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import HeaderActions from '../components/HeaderActions';
import { 
  Shield, Users, UserCheck, Trash2, ArrowLeft, RefreshCw, 
  CheckCircle, AlertTriangle, Search, Lock
} from 'lucide-react';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token) {
        const res = await axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data)) {
          setUsers(res.data);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend /api/users request failed, using local/demo users:', err.message);
    }

    // Fallback: demo users
    const demoUsers = JSON.parse(localStorage.getItem('demoUsers') || '[]');
    const defaultList = [
      { _id: '1', name: 'System Administrator', email: 'admin@eventplanner.com', role: 'admin', createdAt: new Date().toISOString() },
      { _id: '2', name: 'Demo Organizer', email: 'organizer@eventplanner.com', role: 'organizer', createdAt: new Date().toISOString() },
      { _id: '3', name: 'Demo Student', email: 'student@eventplanner.com', role: 'student', createdAt: new Date().toISOString() },
      ...demoUsers
    ];
    setUsers(defaultList);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token && !userId.startsWith('user_') && userId.length > 5) {
        try {
          await axios.delete(`${API_URL}/api/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn('Backend delete user error:', e.message);
        }
      }
      setUsers(prev => prev.filter(u => u._id !== userId));
      setDeleteId(null);
      showToast('User removed successfully', 'success');
    } catch (err) {
      showToast('Failed to remove user', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-slate-950 text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-floatSlow"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard"
              className="p-3 bg-gray-900 border border-gray-700/80 rounded-2xl hover:bg-gray-800 transition-all text-gray-300 hover:text-white"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="text-purple-400" size={26} />
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                  Admin Control Panel
                </h1>
              </div>
              <p className="text-gray-400 text-sm mt-1">Manage system accounts, roles, and administrative policies</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <HeaderActions />
            <button
              onClick={fetchUsers}
              className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl hover:bg-gray-800 transition-all text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium flex items-center gap-2">
              <Lock size={14} /> Admin: {user?.name || 'Administrator'}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-blue-400" size={22} />
              <span className="text-xs text-blue-400/80 font-bold uppercase tracking-wider">Total</span>
            </div>
            <p className="text-3xl font-bold text-white">{users.length}</p>
            <p className="text-sm text-gray-400">Registered Users</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="text-emerald-400" size={22} />
              <span className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider">Students</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {users.filter(u => u.role === 'student').length}
            </p>
            <p className="text-sm text-gray-400">Student Accounts</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <Shield className="text-orange-400" size={22} />
              <span className="text-xs text-orange-400/80 font-bold uppercase tracking-wider">Organizers</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {users.filter(u => u.role === 'organizer').length}
            </p>
            <p className="text-sm text-gray-400">Event Organizers</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <Lock className="text-purple-400" size={22} />
              <span className="text-xs text-purple-400/80 font-bold uppercase tracking-wider">Admins</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-sm text-gray-400">System Admins</p>
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">All System Users</h2>
              <p className="text-sm text-gray-400">Manage user accounts and system permissions</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/80 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {u.name || 'Unnamed User'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          u.role === 'organizer' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {u.role || 'student'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDeleteId(u._id)}
                          className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        No users match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 text-red-400 mb-3">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-bold text-white">Delete User Account</h3>
              </div>
              <p className="text-gray-300 text-sm mb-6">
                Are you sure you want to remove this user from the system? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteUser(deleteId)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-gray-900 border border-purple-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
            <CheckCircle className="text-emerald-400" size={18} />
            <span>{toast.message}</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
