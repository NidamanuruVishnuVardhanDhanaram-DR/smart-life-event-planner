import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import {
  Bell, Settings, X, Check, CheckCheck, Calendar, Building2,
  UserCheck, Sparkles, User, Lock, Eye, EyeOff, Loader2,
  AlertCircle, CheckCircle2, RefreshCw, Building, Trash2
} from 'lucide-react';

/**
 * Shared Notification Bell & Account Settings Gear bar.
 * Designed for reuse across every authenticated page & dashboard tab.
 */
const HeaderActions = ({ events: propEvents, venueBookings: propBookings, onNavigateTab }) => {
  const { user, updateProfile, isPlanner, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const userKey = (user?.email || 'guest').toLowerCase();
  const readStorageKey = `notif_read_${userKey}`;
  const clearedStorageKey = `notif_cleared_${userKey}`;

  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`notif_read_${(user?.email || 'guest').toLowerCase()}`) || '[]'));
    } catch {
      return new Set();
    }
  });

  const [clearedIds, setClearedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`notif_cleared_${(user?.email || 'guest').toLowerCase()}`) || '[]'));
    } catch {
      return new Set();
    }
  });

  // Settings modal state
  const [settingsForm, setSettingsForm] = useState({
    name: user?.name || '',
    organization: user?.organization || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  const dropdownRef = useRef(null);

  useEffect(() => {
    try {
      setReadIds(new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]')));
      setClearedIds(new Set(JSON.parse(localStorage.getItem(clearedStorageKey) || '[]')));
    } catch {}
  }, [readStorageKey, clearedStorageKey]);

  const openSettingsModal = () => {
    setShowNotifications(false);
    setSettingsForm({
      name: user?.name || '',
      organization: user?.organization || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setSettingsError('');
    setSettingsSuccess('');
    setShowPasswords(false);
    setShowSettings(true);
  };

  const buildNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    const items = [];

    try {
      let evList = Array.isArray(propEvents) ? propEvents : null;
      let vbList = Array.isArray(propBookings) ? propBookings : null;

      if (!evList) {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await axios.get(`${API_URL}/api/events?myEvents=true`, { headers, timeout: 6000 });
          if (Array.isArray(res.data?.events)) evList = res.data.events;
        } catch {
          try {
            evList = JSON.parse(localStorage.getItem('events') || '[]');
          } catch {
            evList = [];
          }
        }
      }

      if (!vbList) {
        try {
          const res = await axios.get(`${API_URL}/api/venue-bookings`, { timeout: 6000 });
          if (Array.isArray(res.data?.bookings)) vbList = res.data.bookings;
        } catch {
          try {
            vbList = JSON.parse(localStorage.getItem('venueBookings') || '[]');
          } catch {
            vbList = [];
          }
        }
      }

      // Upcoming & recent events
      const now = Date.now();
      (evList || []).slice(0, 8).forEach((ev) => {
        const start = ev.startDate ? new Date(ev.startDate).getTime() : 0;
        const diffDays = start ? Math.ceil((start - now) / (1000 * 60 * 60 * 24)) : null;
        const dateLabel = ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'Date TBD';
        items.push({
          id: `event_${ev._id || ev.title}`,
          title: ev.title || 'Scheduled Event',
          message:
            diffDays !== null && diffDays >= 0 && diffDays <= 7
              ? `Upcoming in ${diffDays === 0 ? 'today' : `${diffDays} day(s)`} • ${dateLabel}`
              : `${ev.category || 'Event'} • ${dateLabel}`,
          type: 'event',
          tab: 'calendar',
          timeLabel: dateLabel,
        });
      });

      // Venue bookings
      (vbList || []).slice(0, 6).forEach((vb) => {
        const dateLabel = vb.eventDate ? new Date(vb.eventDate).toLocaleDateString() : '';
        items.push({
          id: `booking_${vb._id || vb.eventName}`,
          title: `Venue: ${vb.venueName || 'Booked Hall'}`,
          message: `${vb.eventName || 'Event Reservation'}${dateLabel ? ` • ${dateLabel}` : ''} (${vb.status || 'Confirmed'})`,
          type: 'booking',
          tab: 'bookings',
          timeLabel: dateLabel || 'Confirmed',
        });
      });

      // Pending account requests for organizers/admins
      if (isPlanner || isAdmin) {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
          if (token && !token.startsWith('demo_token_') && !token.startsWith('session_token_')) {
            const reqRes = await axios.get(`${API_URL}/api/users/account-requests`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 6000,
            });
            const pending = Array.isArray(reqRes.data)
              ? reqRes.data.filter((r) => r.status === 'pending')
              : [];
            if (pending.length > 0) {
              items.unshift({
                id: `pending_requests_${pending.length}`,
                title: `${pending.length} Pending Account Request${pending.length > 1 ? 's' : ''}`,
                message: `${pending[0].name} (${pending[0].email}) is waiting for approval`,
                type: 'request',
                tab: 'allocation',
                timeLabel: 'Action needed',
              });
            }
          }
        } catch {}
      }

      if (items.length === 0) {
        items.push({
          id: 'welcome_sync',
          title: 'Account Synced Across Devices',
          message: `Signed in as ${user?.name || 'User'}. Use Settings anytime to update your username or password.`,
          type: 'system',
          tab: 'overview',
          timeLabel: 'Active',
        });
      }
    } finally {
      setNotifications(items);
      setLoadingNotifs(false);
    }
  }, [propEvents, propBookings, isPlanner, isAdmin, user?.name]);

  useEffect(() => {
    buildNotifications();
    const handleSync = () => buildNotifications();
    window.addEventListener('eventUpdated', handleSync);
    window.addEventListener('venueBookingUpdated', handleSync);
    window.addEventListener('userRoleUpdated', handleSync);
    return () => {
      window.removeEventListener('eventUpdated', handleSync);
      window.removeEventListener('venueBookingUpdated', handleSync);
      window.removeEventListener('userRoleUpdated', handleSync);
    };
  }, [buildNotifications]);

  // Close notification dropdown on outside click or Escape
  useEffect(() => {
    const handleOutside = (e) => {
      if (showNotifications && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showNotifications]);

  const visibleNotifications = notifications.filter((n) => !clearedIds.has(n.id));
  const unreadCount = visibleNotifications.filter((n) => !readIds.has(n.id)).length;

  const persistRead = (nextSet) => {
    setReadIds(nextSet);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(Array.from(nextSet)));
    } catch {}
  };

  const persistCleared = (nextSet) => {
    setClearedIds(nextSet);
    try {
      localStorage.setItem(clearedStorageKey, JSON.stringify(Array.from(nextSet)));
    } catch {}
  };

  const handleNotificationClick = (notif) => {
    const nextRead = new Set(readIds);
    nextRead.add(notif.id);
    persistRead(nextRead);
    setShowNotifications(false);

    if (onNavigateTab) {
      onNavigateTab(notif.tab);
    } else {
      navigate(`/dashboard?tab=${encodeURIComponent(notif.tab)}`);
    }
  };

  const handleMarkAllRead = () => {
    const nextRead = new Set(readIds);
    visibleNotifications.forEach((n) => nextRead.add(n.id));
    persistRead(nextRead);
  };

  const handleClearAll = () => {
    const nextCleared = new Set(clearedIds);
    visibleNotifications.forEach((n) => nextCleared.add(n.id));
    persistCleared(nextCleared);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    const trimmedName = settingsForm.name.trim();
    if (!trimmedName) {
      setSettingsError('Username / display name cannot be empty.');
      return;
    }

    if (settingsForm.newPassword) {
      if (settingsForm.newPassword.length < 6) {
        setSettingsError('New password must be at least 6 characters.');
        return;
      }
      if (settingsForm.newPassword !== settingsForm.confirmPassword) {
        setSettingsError('New password and confirmation do not match.');
        return;
      }
    }

    setSavingSettings(true);
    try {
      const payload = {
        name: trimmedName,
        organization: settingsForm.organization.trim(),
      };
      if (settingsForm.newPassword) {
        payload.password = settingsForm.newPassword;
        if (settingsForm.currentPassword) {
          payload.currentPassword = settingsForm.currentPassword;
        }
      }

      const res = await updateProfile(payload);
      if (res?.success) {
        setSettingsSuccess(res.message || 'Username & settings saved!');
        setSettingsForm((prev) => ({
          ...prev,
          name: trimmedName,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        setSettingsError(res?.message || 'Failed to update settings.');
      }
    } catch (err) {
      setSettingsError(err.message || 'Failed to save changes.');
    } finally {
      setSavingSettings(false);
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'booking') return <Building2 size={16} className="text-orange-400" />;
    if (type === 'request') return <UserCheck size={16} className="text-purple-400" />;
    if (type === 'system') return <Sparkles size={16} className="text-emerald-400" />;
    return <Calendar size={16} className="text-blue-400" />;
  };

  return (
    <>
      <div className="flex items-center space-x-1 sm:space-x-2" ref={dropdownRef}>
        {/* Notification Bell Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              if (!showNotifications) buildNotifications();
            }}
            className={`relative p-2 rounded-xl transition-all active:scale-95 ${
              showNotifications
                ? 'bg-purple-500/20 text-white border border-purple-500/40'
                : 'hover:bg-gray-800 text-gray-300 hover:text-white'
            }`}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-[#0d1426]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
              <div className="px-4 py-3 bg-gray-900/80 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-purple-400" />
                  <span className="text-sm font-bold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={buildNotifications}
                    className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                    title="Refresh notifications"
                  >
                    <RefreshCw size={13} className={loadingNotifs ? 'animate-spin' : ''} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      <CheckCheck size={13} /> Read all
                    </button>
                  )}
                  {visibleNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-white/10"
                      title="Clear notifications"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {visibleNotifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs space-y-1.5">
                    <Bell size={24} className="mx-auto text-gray-600" />
                    <p className="font-medium text-gray-300">All caught up!</p>
                    <p>New events, bookings, and account alerts will appear here.</p>
                  </div>
                ) : (
                  visibleNotifications.map((notif) => {
                    const isUnread = !readIds.has(notif.id);
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/10 ${
                          isUnread ? 'bg-purple-500/10' : 'bg-transparent'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getTypeIcon(notif.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                            {isUnread && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-2">{notif.message}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings Gear Button */}
        <button
          type="button"
          onClick={openSettingsModal}
          className={`p-2 rounded-xl transition-all active:scale-95 ${
            showSettings
              ? 'bg-blue-500/20 text-white border border-blue-500/40'
              : 'hover:bg-gray-800 text-gray-300 hover:text-white'
          }`}
          title="Account Settings (Change Username & Password)"
          aria-label="Account Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Account Settings Modal (Username & Password) */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[70] p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#0d1426] border border-white/20 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-fadeIn relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              aria-label="Close settings"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Settings size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white">Account Settings</h3>
                <p className="text-xs text-gray-400 truncate">{user?.email || 'Signed-in Account'}</p>
              </div>
            </div>

            {settingsError && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-200 text-xs">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-400" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-start gap-2 text-emerald-200 text-xs">
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Username / Display Name *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Your display name"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Organization / Department
                </label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Department or Organization"
                    value={settingsForm.organization}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, organization: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-3">
                <p className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <Lock size={14} /> Change Password (leave blank to keep current password)
                </p>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Current Password (optional)
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Current password"
                    value={settingsForm.currentPassword}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      minLength={6}
                      placeholder="Enter new password"
                      value={settingsForm.newPassword}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    minLength={6}
                    placeholder="Re-enter new password"
                    value={settingsForm.confirmPassword}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-800/80 border border-gray-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl font-semibold text-sm border border-gray-700"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderActions;
