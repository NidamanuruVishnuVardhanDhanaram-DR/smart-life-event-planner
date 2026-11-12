import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { initializeDefaultData } from '../services/dataService';
import EventDebugger from '../components/EventDebugger';
import AccountAllocation from '../components/AccountAllocation';
import { useAuth } from '../context/AuthContext';
import EventForm from '../components/EventForm';
import WeatherWidget from '../components/WeatherWidget';
import CalendarView from '../components/CalendarView';
import AIPlanner from '../components/AIPlanner';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import VenueBooking from '../components/VenueBooking';
import BookingHistory from '../components/BookingHistory';
import { 
  LayoutDashboard, CalendarPlus, Building2, Brain, BarChart3, 
  CalendarDays, LogOut, User, Bell, Settings, Search,
  Sparkles, TrendingUp, Clock, MapPin, ChevronRight, X, Filter, XCircle,
  ClipboardList, UserCheck, Shield, Award, Lock
} from 'lucide-react';

const Dashboard = () => {   
  const { logout, user, switchActiveRole, currentRole, isStudent, isPlanner, isPro } = useAuth();
  
  // Track active role (with fallback to localStorage)
  const [activeRoleState, setActiveRoleState] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      return stored?.role || user?.role || 'student';
    } catch {
      return 'student';
    }
  });

  const effectiveRole = user?.role || activeRoleState || 'student';
  const isStudentUser = effectiveRole === 'student';
  const isPlannerUser = effectiveRole === 'organizer';
  const isProUser = effectiveRole === 'professional' || effectiveRole === 'admin' || effectiveRole === 'pro';

  useEffect(() => {
    const handleRoleUpdate = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (stored?.role) setActiveRoleState(stored.role);
      } catch {}
    };
    window.addEventListener('userRoleUpdated', handleRoleUpdate);
    return () => window.removeEventListener('userRoleUpdated', handleRoleUpdate);
  }, []);
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [venueBookings, setVenueBookings] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [showDebugger, setShowDebugger] = useState(false);
  
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ============================================
  // 🔍 SEARCH FUNCTIONALITY STATE
  // ============================================
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState({ events: [], bookings: [] });

  useEffect(() => {
    loadAllData();
    
    const userData = JSON.parse(localStorage.getItem('user')) || user;
    setUserName(userData?.name || userData?.username || 'User');

    const handleDataUpdate = () => {
      loadAllData();
    };

    window.addEventListener('eventUpdated', handleDataUpdate);
    window.addEventListener('venueBookingUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('eventUpdated', handleDataUpdate);
      window.removeEventListener('venueBookingUpdated', handleDataUpdate);
    };
  }, []);

  // Load all data from MongoDB API with localStorage fallback (Syncs Desktop & Mobile)
  const loadAllData = async () => {
    try {
      initializeDefaultData();
      let storedEvents = JSON.parse(localStorage.getItem('events') || '[]');
      let storedBookings = JSON.parse(localStorage.getItem('venueBookings') || '[]');

      // 1. Fetch Venue Bookings from MongoDB
      try {
        const vbRes = await axios.get(`${API_URL}/api/venue-bookings`);
        if (vbRes.data?.bookings && Array.isArray(vbRes.data.bookings)) {
          const bookingMap = new Map();
          storedBookings.forEach(b => bookingMap.set(b._id, b));
          vbRes.data.bookings.forEach(b => bookingMap.set(b._id, b));
          storedBookings = Array.from(bookingMap.values());
          localStorage.setItem('venueBookings', JSON.stringify(storedBookings));
        }
      } catch (vbErr) {
        console.warn('Venue bookings sync warning:', vbErr.message);
      }

      // 2. Fetch Events from MongoDB
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_URL}/api/events?myEvents=true`, { headers });
        if (res.data?.events && Array.isArray(res.data.events)) {
          const eventMap = new Map();
          storedEvents.forEach(e => eventMap.set(e._id, e));
          res.data.events.forEach(e => eventMap.set(e._id, e));
          storedEvents = Array.from(eventMap.values());
          localStorage.setItem('events', JSON.stringify(storedEvents));
        }
      } catch (apiErr) {
        // Backend offline or error, gracefully keep local data
      }

      setEvents(storedEvents);
      setVenueBookings(storedBookings);
      setLoading(false);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setLoading(false);
    }
  };

  // ============================================
  // 🔍 SEARCH FUNCTION - FULLY WORKING!
  // ============================================
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setShowSearchResults(false);
      setSearchResults({ events: [], bookings: [] });
      return;
    }

    const searchTerm = query.toLowerCase().trim();

    // Search in Events
    const matchedEvents = events.filter(event => {
      return (
        (event.title && event.title.toLowerCase().includes(searchTerm)) ||
        (event.description && event.description.toLowerCase().includes(searchTerm)) ||
        (event.category && event.category.toLowerCase().includes(searchTerm)) ||
        (event.status && event.status.toLowerCase().includes(searchTerm)) ||
        (event.location?.city && event.location.city.toLowerCase().includes(searchTerm)) ||
        (event.location?.address && event.location.address.toLowerCase().includes(searchTerm))
      );
    });

    // Search in Venue Bookings
    const matchedBookings = venueBookings.filter(booking => {
      return (
        (booking.venueName && booking.venueName.toLowerCase().includes(searchTerm)) ||
        (booking.eventName && booking.eventName.toLowerCase().includes(searchTerm)) ||
        (booking.status && booking.status.toLowerCase().includes(searchTerm)) ||
        (booking.eventDate && booking.eventDate.includes(searchTerm))
      );
    });

    setSearchResults({
      events: matchedEvents,
      bookings: matchedBookings
    });
    
    setShowSearchResults(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults({ events: [], bookings: [] });
  };

  const handleResultClick = (type, item) => {
    clearSearch();
    if (type === 'event') {
      setActiveTab('calendar');
    } else if (type === 'booking') {
      setActiveTab('venues');
    }
  };

  const handleVenueSelected = (venue, bookingDetails) => {
    setSelectedVenue({ venue, bookingDetails });
    setActiveTab('create');
  };

  const handleVenueBooked = (booking) => {
    setVenueBookings(prev => [...prev, booking]);
  };

  // Dynamic Tab configuration respecting Account Types
  // STUDENT: Strictly display ONLY Calendar, Analytics, and My Bookings!
  // PLAN EVENT: Overview, Calendar, Create Event, Book Venues, Account Allocation, Analytics, My Bookings
  // PRO TOOLS: Overview, Calendar, Create Event, Book Venues, Pro AI Tools, Account Allocation, Analytics, My Bookings
  const allTabs = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard, color: 'text-blue-400', allowed: !isStudentUser },
    { id: 'calendar', name: 'Calendar', icon: CalendarDays, color: 'text-indigo-400', allowed: true },
    { id: 'create', name: 'Create Event', icon: CalendarPlus, color: 'text-purple-400', allowed: !isStudentUser },
    { id: 'venues', name: 'Book Venues', icon: Building2, color: 'text-orange-400', allowed: !isStudentUser },
    { id: 'ai', name: 'Pro AI Tools', icon: Brain, color: 'text-emerald-400', allowed: isProUser },
    { id: 'allocation', name: 'Account Allocation', icon: UserCheck, color: 'text-yellow-400', allowed: isPlannerUser || isProUser },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, color: 'text-pink-400', allowed: true },
    { id: 'bookings', name: 'My Bookings', icon: ClipboardList, color: 'text-cyan-400', allowed: true },
  ];

  const tabs = allTabs.filter(t => t.allowed);

  // Auto-route students away from restricted tabs
  useEffect(() => {
    if (isStudentUser && (activeTab === 'overview' || activeTab === 'create' || activeTab === 'venues' || activeTab === 'ai' || activeTab === 'allocation')) {
      setActiveTab('calendar');
    }
  }, [isStudentUser, activeTab]);

  // Overview content
  const renderOverviewContent = () => {
    const upcomingEvents = events.filter(e => new Date(e.startDate || e.eventDate) > new Date());
    const recentEvents = events.slice(0, 5);
    const recentBookings = venueBookings.slice(0, 5);

    return (
      <div className="space-y-8">
        
        {/* Glossy Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-white/[0.12] via-white/[0.03] to-white/[0.06] backdrop-blur-2xl border border-white/20 border-t-white/40 border-l-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.65)] group">
          {/* Top-edge specular glint */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
          {/* Subtle curved gloss sheen */}
          <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none rounded-t-3xl"></div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/25 rounded-full blur-3xl animate-floatSlow"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/25 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-300 drop-shadow-sm">{userName}!</span> 👋
              </h2>
              <p className="text-gray-300 text-lg">
                You have <span className="text-cyan-400 font-bold drop-shadow-sm">{upcomingEvents.length}</span> upcoming events and <span className="text-orange-400 font-bold drop-shadow-sm">{venueBookings.length}</span> venue bookings.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto flex-shrink-0">
              <button
                onClick={() => setActiveTab('create')}
                className="gloss-btn px-5 py-3 sm:px-6 sm:py-3.5 w-full sm:w-auto justify-center text-sm sm:text-base"
              >
                <Sparkles size={18} /> Create Event
              </button>
              <button
                onClick={() => setActiveTab('venues')}
                className="btn-outline px-5 py-3 sm:px-6 sm:py-3.5 w-full sm:w-auto justify-center text-sm sm:text-base"
              >
                <Building2 size={18} /> Book Venue
              </button>
            </div>
          </div>

          <div className="mt-6 relative z-10">
            <WeatherWidget />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowDebugger(prev => !prev)}
              className="text-xs px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-gray-700/60 transition-all flex items-center gap-1.5"
            >
              🛠️ {showDebugger ? 'Hide Developer Event Debugger' : 'Show Developer Event Debugger'}
            </button>
          </div>

          {showDebugger && (
            <div className="mt-4">
              <EventDebugger events={events} />
            </div>
          )}
        </div>

        {/* Glossy Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 border-l-white/25 shadow-xl hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.35)] hover:-translate-y-1.5 transition-all duration-300 group cursor-default">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 group-hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-transform">
                <CalendarDays size={20} />
              </div>
              <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">Total</span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 drop-shadow-sm">{events.length}</p>
            <p className="text-xs text-gray-300 font-medium">Total Events</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 border-l-white/25 shadow-xl hover:shadow-[0_20px_40px_-10px_rgba(249,115,22,0.35)] hover:-translate-y-1.5 transition-all duration-300 group cursor-default">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/80 to-transparent"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-400/30 text-orange-300 group-hover:scale-110 shadow-[0_0_15px_rgba(249,115,22,0.25)] transition-transform">
                <Building2 size={20} />
              </div>
              <span className="text-xs text-orange-300 font-bold uppercase tracking-wider">Venues</span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 drop-shadow-sm">{venueBookings.length}</p>
            <p className="text-xs text-gray-300 font-medium">Venue Bookings</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 border-l-white/25 shadow-xl hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.35)] hover:-translate-y-1.5 transition-all duration-300 group cursor-default">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-transform">
                <Brain size={20} />
              </div>
              <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">AI Plans</span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 drop-shadow-sm">{events.filter(e => e.source === 'ai').length}</p>
            <p className="text-xs text-gray-300 font-medium">AI Generated</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 border-l-white/25 shadow-xl hover:shadow-[0_20px_40px_-10px_rgba(236,72,153,0.35)] hover:-translate-y-1.5 transition-all duration-300 group cursor-default">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-pink-400/80 to-transparent"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-pink-500/20 border border-pink-400/30 text-pink-300 group-hover:scale-110 shadow-[0_0_15px_rgba(236,72,153,0.25)] transition-transform">
                <BarChart3 size={20} />
              </div>
              <span className="text-xs text-pink-300 font-bold uppercase tracking-wider">Insights</span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 drop-shadow-sm">₹{venueBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()}</p>
            <p className="text-xs text-gray-300 font-medium">Total Revenue</p>
          </div>
        </div>

        {/* Recent Events & Bookings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Events Card */}
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-b from-white/[0.09] via-white/[0.02] to-white/[0.04] backdrop-blur-2xl border border-white/15 border-t-white/35 shadow-2xl group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Recent Events</h3>
                  <p className="text-sm text-gray-400">Your latest created events</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('calendar')}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-gray-800/50 rounded-xl"></div>
                ))}
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div 
                    key={event._id}
                    className="group flex items-center justify-between p-4 bg-gray-800/40 rounded-xl hover:bg-gray-800/60 transition-all border border-gray-700/30 hover:border-indigo-500/30 cursor-pointer"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        event.category === 'wedding' ? 'bg-pink-500/20' :
                        event.category === 'professional' ? 'bg-blue-500/20' :
                        event.category === 'college' ? 'bg-emerald-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        {event.category === 'wedding' ? '💒' :
                         event.category === 'professional' ? '💼' :
                         event.category === 'college' ? '🎓' : '⭐'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' • '}
                          <span className={`capitalize px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            event.status === 'published' ? 'bg-green-500/20 text-green-400' :
                            event.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {event.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 ml-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarDays size={48} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-400 font-medium">No events yet</p>
                <button 
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm font-medium"
                >
                  Create Event
                </button>
              </div>
            )}
          </div>

          {/* Recent Venue Bookings Card */}
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-b from-white/[0.09] via-white/[0.02] to-white/[0.04] backdrop-blur-2xl border border-white/15 border-t-white/35 shadow-2xl group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/60 to-transparent"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/20 rounded-xl text-orange-300 border border-orange-400/30 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Recent Bookings</h3>
                  <p className="text-sm text-gray-400">Your latest venue reservations</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('venues')}
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors font-medium"
              >
                View All →
              </button>
            </div>

            {recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div 
                    key={booking._id}
                    className="group flex items-center justify-between p-4 bg-gray-800/40 rounded-xl hover:bg-gray-800/60 transition-all border border-gray-700/30 hover:border-orange-500/30 cursor-pointer"
                    onClick={() => setActiveTab('venues')}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        🏛️
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate group-hover:text-orange-400 transition-colors">
                          {booking.venueName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' • '}
                          <span className="text-emerald-400 font-medium">₹{booking.totalPrice?.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-orange-400 transition-colors flex-shrink-0 ml-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-400 font-medium">No bookings yet</p>
                <button 
                  onClick={() => setActiveTab('venues')}
                  className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  Browse Venues
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Grid - High-Gloss Prismatic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div 
            onClick={() => setActiveTab('ai')}
            className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-emerald-500/15 via-white/[0.03] to-cyan-500/10 backdrop-blur-2xl border border-emerald-400/30 border-t-emerald-300/60 shadow-xl hover:shadow-[0_20px_45px_-10px_rgba(16,185,129,0.35)] transition-all duration-300 cursor-pointer group hover:-translate-y-2"
          >
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl group-hover:scale-110 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform">
                <Brain size={28} className="text-emerald-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">AI Assistant</h3>
                <p className="text-xs text-emerald-300/80 font-medium">Smart Planning Suite</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Get AI-powered suggestions for event planning, budgeting, timelines, and vendor recommendations.
            </p>
            <div className="mt-5 flex items-center text-emerald-300 text-sm font-bold group-hover:translate-x-2 transition-transform">
              Open AI Planner <ChevronRight size={16} className="ml-1" />
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('analytics')}
            className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-pink-500/15 via-white/[0.03] to-purple-500/10 backdrop-blur-2xl border border-pink-400/30 border-t-pink-300/60 shadow-xl hover:shadow-[0_20px_45px_-10px_rgba(236,72,153,0.35)] transition-all duration-300 cursor-pointer group hover:-translate-y-2"
          >
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-pink-300/80 to-transparent"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-pink-500/20 border border-pink-400/40 rounded-2xl group-hover:scale-110 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-transform">
                <BarChart3 size={28} className="text-pink-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Analytics</h3>
                <p className="text-xs text-pink-300/80 font-medium">Intelligence & Metrics</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              View detailed statistics about your events, revenue trends, and venue utilization in real time.
            </p>
            <div className="mt-5 flex items-center text-pink-300 text-sm font-bold group-hover:translate-x-2 transition-transform">
              Open Analytics <ChevronRight size={16} className="ml-1" />
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('bookings')}
            className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-cyan-500/15 via-white/[0.03] to-blue-500/10 backdrop-blur-2xl border border-cyan-400/30 border-t-cyan-300/60 shadow-xl hover:shadow-[0_20px_45px_-10px_rgba(6,182,212,0.35)] transition-all duration-300 cursor-pointer group hover:-translate-y-2"
          >
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-cyan-500/20 border border-cyan-400/40 rounded-2xl group-hover:scale-110 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-transform">
                <ClipboardList size={28} className="text-cyan-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Booking History</h3>
                <p className="text-xs text-cyan-300/80 font-medium">Complete Records</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              View all your venue bookings and created events in one unified location with powerful filtering and search.
            </p>
            <div className="mt-5 flex items-center text-cyan-300 text-sm font-bold group-hover:translate-x-2 transition-transform">
              Open Bookings <ChevronRight size={16} className="ml-1" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Tab Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();

      case 'calendar':
        return <CalendarView events={events} isStudent={isStudentUser} userRole={effectiveRole} />;

      case 'create':
        return <EventForm onEventCreated={loadAllData} selectedVenue={selectedVenue} />;

      case 'venues':
        if (isStudentUser) return <CalendarView events={events} isStudent={true} />;
        return (
          <VenueBooking 
            onVenueSelected={handleVenueSelected}
            onBookingSuccess={handleVenueBooked}
          />
        );

      case 'ai':
        if (!isProUser) {
          return (
            <div className="p-12 text-center bg-gray-900/60 border border-gray-800 rounded-3xl">
              <span className="text-4xl mb-3 block">⭐</span>
              <h3 className="text-xl font-bold text-white mb-2">Pro Tools Required</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                The AI Planner and generative planning tools are available exclusively to Pro Tools accounts.
              </p>
            </div>
          );
        }
        return <AIPlanner />;

      case 'allocation':
        return <AccountAllocation events={events} onAllocationUpdated={loadAllData} />;

      case 'analytics':
        return <AnalyticsDashboard events={events} isStudent={isStudentUser} />;
        
      case 'bookings':
        return <BookingHistory isStudent={isStudentUser} />;

      default:
        return <CalendarView events={events} isStudent={isStudentUser} />;
    }
  };

  // Check URL params for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && tabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSearchResults && !e.target.closest('.search-container')) {
        if (!e.target.closest('.search-result-item')) {
          // Optional: uncomment to close on outside click
          // clearSearch();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0f1d]">
      
      {/* Background Animated Gradient Glow Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-600/15 to-purple-600/15 rounded-full blur-3xl animate-floatSlow"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-600/15 to-cyan-600/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-br from-purple-600/15 to-pink-600/15 rounded-full blur-3xl animate-floatSlow" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header - High-Gloss Specular Glass with Distinct Role Badge & Fast Search */}
      <header className="relative z-20 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent bg-[#090e1c]/80 backdrop-blur-2xl border-b border-white/10 border-t border-t-white/20 sticky top-0 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => !isStudentUser && setActiveTab('overview')}>
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 border border-white/30 border-t-white/60 ring-2 ring-white/10 group-hover:scale-105 transition-transform duration-300">
                <span className="text-xl">🎯</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-extrabold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-colors tracking-tight">
                  Smart Event Planner
                </h1>
                <p className="text-xs text-gray-400">Intelligent Event Suite</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-extrabold text-white tracking-tight">Smart Planner</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Compact Mobile Role Badge */}
            <div className="sm:hidden flex items-center">
              {isStudentUser ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  🎓 Student
                </span>
              ) : isPlannerUser ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
                  📋 Planner
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  ⚡ Pro
                </span>
              )}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setMobileSearchOpen(prev => !prev)}
              className="md:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Search events and venues"
            >
              <Search size={18} />
            </button>

            {/* 🌟 Active Role Badge Pill (High-Gloss Candy - Desktop) */}
            <div className="hidden sm:flex items-center">
              {isStudentUser ? (
                <span className="gloss-badge-student">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  🎓 Student Account
                </span>
              ) : isPlannerUser ? (
                <span className="gloss-badge-planner">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  📋 Plan Event
                </span>
              ) : (
                <span className="gloss-badge-pro">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ⚡ Pro Tools
                </span>
              )}
            </div>
            
            {/* 🔍 SEARCH BAR - GLOSSY ACRYLIC */}
            <div className="relative search-container hidden md:flex items-center">
              <div className={`relative flex items-center bg-white/[0.06] backdrop-blur-xl border border-white/15 border-t-white/30 rounded-xl transition-all duration-300 shadow-inner ${
                showSearchResults ? 'border-purple-400/80 shadow-[0_0_25px_rgba(168,85,247,0.35)] w-96' : 'w-64 focus-within:w-80 focus-within:border-purple-400/80 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.25)]'
              }`}>
                <Search size={16} className="absolute left-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search events, venues..." 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="bg-transparent text-white text-sm outline-none pl-10 pr-10 py-2.5 placeholder-gray-400 w-full font-medium"
                  autoFocus={showSearchResults}
                />
                {searchQuery && (
                  <button 
                    onClick={clearSearch}
                    className="absolute right-3 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full right-0 mt-2 w-96 gloss-panel-elevated rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                  
                  {/* Results Header */}
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-300 font-medium">
                      Found <strong className="text-white">{searchResults.events.length + searchResults.bookings.length}</strong> results
                    </span>
                    <button 
                      onClick={clearSearch}
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      ESC to close
                    </button>
                  </div>

                  {/* Results List */}
                  <div className="max-h-80 overflow-y-auto">
                    
                    {(searchResults.events.length === 0 && searchResults.bookings.length === 0) ? (
                      <div className="px-4 py-8 text-center">
                        <Search size={32} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400 font-medium">No results found</p>
                        <p className="text-gray-500 text-sm mt-1">Try different keywords</p>
                      </div>
                    ) : (
                      <>
                        {/* Events Section */}
                        {searchResults.events.length > 0 && (
                          <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider bg-indigo-500/5">
                              Events ({searchResults.events.length})
                            </div>
                            {searchResults.events.slice(0, 5).map((event) => (
                              <div
                                key={event._id}
                                onClick={() => handleResultClick('event', event)}
                                className="search-result-item px-4 py-3 flex items-center gap-3 hover:bg-gray-800/60 cursor-pointer transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-sm">
                                  {event.category === 'wedding' ? '💒' : event.category === 'professional' ? '💼' : '📅'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate">
                                    {event.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(event.startDate).toLocaleDateString()} • {event.category}
                                  </p>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bookings Section */}
                        {searchResults.bookings.length > 0 && (
                          <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-orange-400 uppercase tracking-wider bg-orange-500/5">
                              Venue Bookings ({searchResults.bookings.length})
                            </div>
                            {searchResults.bookings.slice(0, 5).map((booking) => (
                              <div
                                key={booking._id}
                                onClick={() => handleResultClick('booking', booking)}
                                className="search-result-item px-4 py-3 flex items-center gap-3 hover:bg-gray-800/60 cursor-pointer transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-sm">
                                  🏛️
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate">
                                    {booking.venueName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(booking.eventDate).toLocaleDateString()} • ₹{booking.totalPrice?.toLocaleString()}
                                  </p>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* View All Link */}
                  {(searchResults.events.length > 5 || searchResults.bookings.length > 5) && (
                    <div className="px-4 py-3 bg-gray-800/30 border-t border-gray-700 text-center">
                      <button 
                        onClick={() => {
                          clearSearch();
                          setActiveTab('calendar');
                        }}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        View all results in Calendar →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-all">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Info */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-700/80">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-500/20 ring-2 ring-purple-500/30">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-white leading-tight">{userName}</p>
                <p className="text-xs font-medium text-indigo-300/90">
                  {effectiveRole === 'organizer' ? 'Plan Event' : (effectiveRole === 'professional' || effectiveRole === 'pro') ? 'Pro Tools' : effectiveRole === 'student' ? 'Student' : 'Administrator'}
                </p>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 hover:bg-red-500/20 rounded-xl text-gray-400 hover:text-red-400 transition-all active:scale-95"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Expandable Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 py-3 bg-[#090e1c]/95 backdrop-blur-2xl border-t border-white/10 animate-slideDown search-container relative z-30">
            <div className="relative flex items-center bg-white/[0.08] border border-white/20 rounded-xl overflow-hidden shadow-inner">
              <Search size={16} className="absolute left-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search events, venues..." 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-transparent text-white text-sm outline-none pl-9 pr-8 py-2.5 placeholder-gray-400 w-full font-medium"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-2.5 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>

            {/* Mobile Search Results */}
            {showSearchResults && (
              <div className="mt-2 w-full gloss-panel-elevated rounded-2xl shadow-2xl overflow-hidden animate-slideDown max-h-72 overflow-y-auto">
                <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700 flex justify-between items-center text-xs text-gray-300">
                  <span>Found {searchResults.events.length + searchResults.bookings.length} results</span>
                  <button onClick={clearSearch} className="text-gray-400 hover:text-white">Close</button>
                </div>
                {searchResults.events.length === 0 && searchResults.bookings.length === 0 ? (
                  <p className="p-4 text-center text-xs text-gray-400">No results found</p>
                ) : (
                  <>
                    {searchResults.events.map(event => (
                      <div 
                        key={event._id}
                        onClick={() => { handleResultClick('event', event); setMobileSearchOpen(false); }}
                        className="p-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{event.title}</p>
                          <p className="text-[10px] text-gray-400">{event.category} • {new Date(event.startDate).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-500" />
                      </div>
                    ))}
                    {searchResults.bookings.map(booking => (
                      <div 
                        key={booking._id}
                        onClick={() => { handleResultClick('booking', booking); setMobileSearchOpen(false); }}
                        className="p-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{booking.venueName}</p>
                          <p className="text-[10px] text-gray-400">₹{booking.totalPrice?.toLocaleString()} • {new Date(booking.eventDate).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-500" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="relative z-10 flex max-w-7xl mx-auto">
        
        {/* Sidebar Navigation - High-Gloss Acrylic */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30 
          w-72 lg:w-64 bg-gradient-to-b from-white/[0.06] via-transparent to-white/[0.02] bg-[#0b1020]/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          pt-20 lg:pt-0
        `}>
          <div className="h-full overflow-y-auto p-6 pb-20 lg:pb-6">
            
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-gray-400"
            >
              <X size={20} />
            </button>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-3 flex items-center gap-1.5">
              <span>Navigation</span>
            </p>

            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm
                      transition-all duration-300 group
                      ${isActive 
                        ? 'gloss-panel border-t-white/40 text-white shadow-[0_8px_25px_rgba(99,102,241,0.3)] translate-x-1 font-bold' 
                        : 'text-gray-300 hover:text-white hover:bg-white/[0.08] hover:border hover:border-white/10 hover:translate-x-1'
                      }
                    `}
                  >
                    <Icon size={20} className={`${isActive ? tab.color : 'group-hover:' + tab.color} transition-all duration-300 group-hover:scale-110`} />
                    <span className="flex-1 text-left">{tab.name}</span>
                    
                    {isActive && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.9)]"></div>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="my-6 border-t border-white/10"></div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3">
                Quick Stats
              </p>
              
              <div className="bg-white/[0.04] backdrop-blur-md rounded-xl p-4 border border-white/10 border-t-white/20 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Events</span>
                  <span className="font-extrabold text-white">{events.length}</span>
                </div>
              </div>
              
              <div className="bg-white/[0.04] backdrop-blur-md rounded-xl p-4 border border-white/10 border-t-white/20 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Bookings</span>
                  <span className="font-extrabold text-white">{venueBookings.length}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen px-3 py-5 sm:px-6 lg:p-8 pb-28 lg:pb-8 max-w-full overflow-hidden">
          {activeTab !== 'overview' && (
            <div className="mb-8">
              <div className="flex items-center gap-3">
                {(() => {
                  const currentTab = tabs.find(t => t.id === activeTab);
                  const Icon = currentTab?.icon;
                  return Icon ? <Icon size={28} className={currentTab?.color} /> : null;
                })()}
                <div>
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                    {tabs.find(t => t.id === activeTab)?.name || 'Page'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {activeTab === 'create' && 'Create and manage your events'}
                    {activeTab === 'venues' && 'Browse and book perfect venues'}
                    {activeTab === 'ai' && 'Get AI-powered planning assistance'}
                    {activeTab === 'analytics' && 'View detailed insights and statistics'}
                    {activeTab === 'calendar' && 'Visual calendar view of all activities'}
                    {activeTab === 'bookings' && 'View your complete booking history'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div key={activeTab} className="animate-slideUp animate-fadeIn">
            {renderTabContent()}
          </div>
        </main>
      </div>

      {/* Floating Action Button (Mobile) - Positioned safely above Mobile Nav & Contextual */}
      {!isStudentUser && (
        <button
          onClick={() => setActiveTab('create')}
          className="fixed bottom-20 right-4 z-30 lg:hidden w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center text-white border border-white/30"
          title="Create New Event"
        >
          <Sparkles size={20} />
        </button>
      )}

      {/* Sleek Mobile Bottom Navigation Bar (High-Gloss Acrylic Dock) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#090e1c]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-[0_-10px_35px_rgba(0,0,0,0.7)]">
        {tabs.slice(0, 4).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-white bg-white/10 font-bold scale-105 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={19} className={isActive ? tab.color : ''} />
              <span className="text-[10px] mt-0.5 font-medium truncate max-w-[65px]">{tab.name}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5 shadow-[0_0_6px_rgba(6,182,212,0.9)]"></span>
              )}
            </button>
          );
        })}
        {/* Menu / More Tabs Toggle */}
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
            sidebarOpen ? 'text-white bg-white/10 font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <LayoutDashboard size={19} />
          <span className="text-[10px] mt-0.5 font-medium">More</span>
        </button>
      </nav>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
        
        aside::-webkit-scrollbar {
          width: 4px;
        }
        aside::-webkit-scrollbar-track {
          background: transparent;
        }
        aside::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.3);
          border-radius: 2px;
        }
        aside::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.5);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;