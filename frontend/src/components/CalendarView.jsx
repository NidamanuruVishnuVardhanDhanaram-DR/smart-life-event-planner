import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import { initializeDefaultData } from '../services/dataService';
import { 
  Calendar, Clock, MapPin, Users, Search, ChevronLeft, ChevronRight, X,
  CalendarDays, Filter, BarChart3, Building2, Sparkles, Trash2, AlertCircle, CheckCircle
} from 'lucide-react';

// Helper to format calendar day to strict YYYY-MM-DD string
const getFormattedDay = (dateObj) => {
  if (!dateObj) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CalendarView = ({ events = [], isStudent = false, userRole = '' }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Item Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [googleSyncSuccess, setGoogleSyncSuccess] = useState(false);

  // 100% Free Google Calendar Integration - Individual Event Direct Web Sync
  const handleAddToGoogleCalendar = (item) => {
    if (!item) return;
    try {
      const title = encodeURIComponent(item.title || 'Event');
      const details = encodeURIComponent(
        (item.title || 'Event') + '\n' +
        'Type: ' + (item.source === 'venue' ? 'Venue Booking' : 'Scheduled Event') + '\n' +
        'Location: ' + (item.location || 'TBD') + '\n' +
        'Duration: ' + (item.duration || 2) + ' hours\n' +
        'Status: ' + (item.status || 'Confirmed') + '\n\n' +
        'Synced from Smart Life Event Planner'
      );
      const location = encodeURIComponent(item.location || '');

      const dateClean = (item.eventDate || '').replace(/-/g, '');
      let startStr = dateClean + 'T090000Z';
      let endStr = dateClean + 'T110000Z';

      if (item.eventTime && item.eventTime.includes(':')) {
        const parts = item.eventTime.split(':');
        const hh = parts[0].trim().padStart(2, '0');
        const mm = (parts[1] || '00').substring(0, 2).padStart(2, '0');
        startStr = dateClean + 'T' + hh + mm + '00Z';
        const durHours = parseInt(item.duration, 10) || 2;
        const endHH = String((parseInt(hh, 10) + durHours) % 24).padStart(2, '0');
        endStr = dateClean + 'T' + endHH + mm + '00Z';
      }

      const googleCalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + title + '&dates=' + startStr + '/' + endStr + '&details=' + details + '&location=' + location;
      window.open(googleCalUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Error generating Google Calendar link:', e);
    }
  };

  // 100% Free Google Calendar Integration - Export All Events to iCalendar (.ics)
  const handleExportGoogleCalendarICS = () => {
    try {
      const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Smart Life Event Planner//Google Calendar Sync//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Smart Life Event Planner',
        'X-WR-TIMEZONE:UTC',
      ];

      normalizedData.forEach((item, idx) => {
        const dateClean = (item.eventDate || '').replace(/-/g, '');
        if (!dateClean || dateClean.length !== 8) return;

        let startStr = dateClean + 'T090000Z';
        let endStr = dateClean + 'T110000Z';
        if (item.eventTime && item.eventTime.includes(':')) {
          const parts = item.eventTime.split(':');
          const hh = parts[0].trim().padStart(2, '0');
          const mm = (parts[1] || '00').substring(0, 2).padStart(2, '0');
          startStr = dateClean + 'T' + hh + mm + '00Z';
          const durHours = parseInt(item.duration, 10) || 2;
          const endHH = String((parseInt(hh, 10) + durHours) % 24).padStart(2, '0');
          endStr = dateClean + 'T' + endHH + mm + '00Z';
        }

        icsContent.push('BEGIN:VEVENT');
        icsContent.push('UID:event_' + (item._id || idx) + '_' + dateClean + '@smartlifeplanner.local');
        icsContent.push('DTSTAMP:' + nowStamp);
        icsContent.push('DTSTART:' + startStr);
        icsContent.push('DTEND:' + endStr);
        icsContent.push('SUMMARY:' + (item.title || 'Event').replace(/,/g, '\\,'));
        icsContent.push('LOCATION:' + (item.location || 'TBD').replace(/,/g, '\\,'));
        icsContent.push('DESCRIPTION:Type: ' + (item.source === 'venue' ? 'Venue Booking' : 'Event') + '\\nStatus: ' + item.status + '\\nSynced via Smart Life Event Planner');
        icsContent.push('STATUS:CONFIRMED');
        icsContent.push('END:VEVENT');
      });

      icsContent.push('END:VCALENDAR');

      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'smart-life-events-google-calendar-' + (new Date().toISOString().split('T')[0]) + '.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setGoogleSyncSuccess(true);
    } catch (err) {
      console.error('ICS Export error:', err);
    }
  };

  // Calendar State
  const currentDateState = useState(new Date());
  const [currentDate, setCurrentDate] = currentDateState;
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // ✅ FIX #1: Load both Venue Bookings and Events from UNIFIED storage keys
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      initializeDefaultData();
      
      let storedVenueBookings = JSON.parse(localStorage.getItem('venueBookings') || '[]');
      let storedEvents = JSON.parse(localStorage.getItem('events') || '[]');

      // Fetch latest venue bookings from MongoDB API
      try {
        const vbRes = await axios.get(`${API_URL}/api/venue-bookings`);
        if (vbRes.data?.bookings && Array.isArray(vbRes.data.bookings)) {
          const bookingMap = new Map();
          storedVenueBookings.forEach(b => bookingMap.set(b._id, b));
          vbRes.data.bookings.forEach(b => bookingMap.set(b._id, b));
          storedVenueBookings = Array.from(bookingMap.values());
          localStorage.setItem('venueBookings', JSON.stringify(storedVenueBookings));
        }
      } catch (e) {
        console.warn('Calendar venue bookings fetch fallback:', e.message);
      }
      
      // Merge prop events and stored events
      const eventMap = new Map();
      if (events && Array.isArray(events)) {
        events.forEach(e => eventMap.set(e._id, e));
      }
      storedEvents.forEach(e => eventMap.set(e._id, e));
      let allEvents = Array.from(eventMap.values());
      let visibleBookings = storedVenueBookings;

      // Restrict events for student accounts
      if (isStudent) {
        const studentId = user?._id?.toString() || user?.id?.toString();
        const studentEmail = user?.email?.toLowerCase();

        allEvents = allEvents.filter(e => {
          // Check if student was explicitly allocated by the Plan Event organizer
          const isAllocated = 
            (e.allocatedUsers && e.allocatedUsers.some(u => (u._id || u).toString() === studentId)) ||
            (e.participants && e.participants.some(p => {
              const pId = (p.user?._id || p.user)?.toString();
              const pEmail = p.email?.toLowerCase();
              return (pId && pId === studentId) || (pEmail && pEmail === studentEmail);
            })) ||
            (user?.allocatedEvents && user.allocatedEvents.some(ae => (ae._id || ae).toString() === e._id?.toString()));

          // Allowed if explicitly allocated or if general published/public event (not internal draft/private)
          const isPublicGeneral = (e.isPublic !== false) && (e.status === 'published' || !e.status || e.status === 'confirmed');
          return isAllocated || isPublicGeneral;
        });
      }
      
      const combined = [
        ...visibleBookings.map(b => ({ ...b, source: 'venue' })),
        ...allEvents.map(e => ({ ...e, source: 'event' }))
      ];
      
      setBookings(combined);
      setLoading(false);
    };

    loadAllData();

    // Listen for updates from other components
    window.addEventListener('storage', loadAllData);
    window.addEventListener('venueBookingUpdated', loadAllData);
    window.addEventListener('eventUpdated', loadAllData);

    return () => {
      window.removeEventListener('storage', loadAllData);
      window.removeEventListener('venueBookingUpdated', loadAllData);
      window.removeEventListener('eventUpdated', loadAllData);
    };
  }, [events]);

  // ✅ FIX #2: Normalize Data to handle differences between formats
  const normalizedData = useMemo(() => {
    return bookings.map(item => {
      const isVenue = item.source === 'venue' || item.type === 'venue';
      
      let dateString = '';
      let timeString = item.eventTime || item.time || '';

      if (item.eventDate && typeof item.eventDate === 'string') {
        dateString = item.eventDate.split('T')[0];
      } else if (item.startDate && typeof item.startDate === 'string') {
        const parts = item.startDate.split('T');
        dateString = parts[0];
        if (!timeString && parts.length > 1) {
          timeString = parts[1];
        }
      }

      let loc = 'TBD';
      if (item.venueName) {
        loc = item.venueName;
      } else if (item.location && typeof item.location === 'object') {
        loc = [item.location.city, item.location.state].filter(Boolean).join(', ') || item.location.address || 'TBD';
      } else if (typeof item.location === 'string') {
        loc = item.location;
      }

      return {
        _id: item._id || Math.random().toString(36).substr(2, 9),
        source: isVenue ? 'venue' : 'event',
        title: item.eventName || item.title || item.eventTitle || item.purpose || 'Untitled Event',
        eventDate: dateString,
        eventTime: timeString || 'TBD',
        location: loc,
        duration: item.duration || (isVenue ? 4 : 1),
        guestCount: item.guestCount || item.participants?.length || item.attendees || 0,
        status: (item.status || 'Confirmed').toLowerCase(),
        totalPrice: item.totalPrice || item.budget?.total || 0,
      };
    }).filter(b => b.eventDate);
  }, [bookings]);

  const handleDeleteItem = async (item) => {
    if (!item) return;
    try {
      if (item.source === 'venue') {
        const storedBookings = JSON.parse(localStorage.getItem('venueBookings') || '[]');
        const updated = storedBookings.filter(b => b._id !== item._id);
        localStorage.setItem('venueBookings', JSON.stringify(updated));
        window.dispatchEvent(new Event('venueBookingUpdated'));
      } else {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (token && !item._id.toString().startsWith('event_') && !item._id.toString().startsWith('ai_')) {
          try {
            await axios.delete(`${API_URL}/api/events/${item._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (e) {
            console.warn('Backend delete failed, deleting locally:', e.message);
          }
        }
        const storedEvents = JSON.parse(localStorage.getItem('events') || '[]');
        const updated = storedEvents.filter(e => e._id !== item._id);
        localStorage.setItem('events', JSON.stringify(updated));
        window.dispatchEvent(new Event('eventUpdated'));
      }
      setBookings(prev => prev.filter(b => b._id !== item._id));
      setSelectedItem(null);
      setDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting activity:', err);
    }
  };

  // Calendar Grid Logic
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  // Filter Logic for Sidebar
  const filteredBookings = useMemo(() => {
    let result = normalizedData;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(term) ||
        b.location.toLowerCase().includes(term)
      );
    }
    
    if (filterType === 'venues') {
      result = result.filter(b => b.source === 'venue');
    } else if (filterType === 'events') {
      result = result.filter(b => b.source === 'event');
    } else if (filterType === 'draft') {
      result = result.filter(b => b.status === 'draft');
    } else if (filterType !== 'all') {
      result = result.filter(b => b.status === filterType);
    }

    if (selectedDate) {
      const targetStr = getFormattedDay(selectedDate);
      result = result.filter(b => b.eventDate === targetStr);
    } else {
      const currentMonthStr = getFormattedDay(currentDate).substring(0, 7);
      result = result.filter(b => b.eventDate.startsWith(currentMonthStr));
    }
    
    return result.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [normalizedData, searchTerm, filterType, selectedDate, currentDate]);

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const todayStr = getFormattedDay(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: '#0f172a'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-hidden">
      {/* Subtle Background Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-floatSlow"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* HEADER - Matching VenueBooking Style */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 mb-2 sm:mb-3">
            📅 {isStudent ? 'Student Event Calendar' : 'Master Calendar'}
          </h2>
          <p className="text-gray-400 text-lg">
            {isStudent 
              ? 'View allocated college events, workshops, schedules and registered sessions'
              : 'Unified view of your venue bookings and events'}
          </p>
          {isStudent && (
            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
              🎓 Student Account • Allocated & Schedule View Only
            </div>
          )}

          {/* Google Calendar Sync Button */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowGoogleSyncModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 border border-blue-400/30 hover:scale-[1.02]"
              title="Connect and sync your schedule with Google Calendar (100% Free)"
            >
              <span className="text-base">🌐</span>
              <span>Connect Google Calendar (100% Free)</span>
            </button>
            <button
              onClick={handleExportGoogleCalendarICS}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              title="Export all events into .ics calendar file"
            >
              <span>📥</span>
              <span>Export .ics</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - High-Gloss Acrylic Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 shadow-xl hover:-translate-y-1 hover:shadow-[0_15px_35px_-10px_rgba(59,130,246,0.3)] transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">TOTAL</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{normalizedData.length}</p>
            <p className="text-xs text-gray-300 mt-1 font-medium">Total Activities</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 shadow-xl hover:-translate-y-1 hover:shadow-[0_15px_35px_-10px_rgba(249,115,22,0.3)] transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5 text-orange-400" />
              <span className="text-xs text-orange-300 font-bold uppercase tracking-wider">VENUES</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {normalizedData.filter(b => b.source === 'venue').length}
            </p>
            <p className="text-xs text-gray-300 mt-1 font-medium">Venue Bookings</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 shadow-xl hover:-translate-y-1 hover:shadow-[0_15px_35px_-10px_rgba(168,85,247,0.3)] transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-purple-300 font-bold uppercase tracking-wider">EVENTS</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {normalizedData.filter(b => b.source === 'event').length}
            </p>
            <p className="text-xs text-gray-300 mt-1 font-medium">Created Events</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/40 shadow-xl hover:-translate-y-1 hover:shadow-[0_15px_35px_-10px_rgba(16,185,129,0.3)] transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">ACTIVE</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {normalizedData.filter(b => 
                b.status === 'confirmed' || b.status === 'published' || b.status === 'draft'
              ).length}
            </p>
            <p className="text-xs text-gray-300 mt-1 font-medium">Active Items</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Calendar Area - High-Gloss */}
          <div className="xl:col-span-2">
            <div className="relative overflow-hidden rounded-3xl p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-white/[0.09] via-white/[0.02] to-white/[0.04] backdrop-blur-2xl border border-white/15 border-t-white/35 shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"></div>
              
              {/* Calendar Header with Icon Badge */}
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => navigateMonth(-1)} 
                  className="p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  <CalendarDays size={24} className="text-indigo-400" />
                  <h3 className="text-lg sm:text-2xl font-semibold text-white">{monthYear}</h3>
                </div>
                
                <button 
                  onClick={() => navigateMonth(1)} 
                  className="p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-gray-400 text-xs sm:text-sm font-bold py-2 sm:py-3 uppercase tracking-wider">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
                
                {days.map((day, index) => {
                  const dayString = getFormattedDay(day);
                  const dayBookings = normalizedData.filter(b => b.eventDate === dayString);
                  
                  const isToday = dayString === todayStr;
                  const isSelected = selectedDate && dayString === getFormattedDay(selectedDate);

                  return (
                    <div
                      key={index}
                      onClick={() => day && setSelectedDate(day)}
                      className={`
                        min-h-[56px] sm:min-h-[85px] md:min-h-[110px] p-1 sm:p-2 rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between
                        ${!day ? 'invisible' : 'hover:bg-gray-800/60 hover:scale-[1.02]'}
                        ${isToday ? 'bg-indigo-500/20 border-indigo-500/50 ring-2 ring-indigo-500/30' : 'border-gray-700/30 bg-gray-800/30'}
                        ${isSelected ? 'ring-2 ring-purple-500 bg-purple-500/10 border-purple-500/50' : ''}
                      `}
                    >
                      {day && (
                        <>
                          <div className={`text-xs sm:text-sm font-bold flex items-center justify-between ${isToday ? 'text-indigo-400' : 'text-gray-300'}`}>
                            <span>{day.getDate()}</span>
                            {isToday && <span className="hidden sm:inline text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                          </div>
                          
                          {/* Desktop: Visible Chips in Calendar Cells */}
                          <div className="hidden sm:block space-y-1 flex-1 overflow-y-auto pr-1 mt-1" style={{scrollbarWidth: 'thin', scrollbarColor: 'rgba(107,114,128,0.3) transparent'}}>
                            {dayBookings.slice(0, 3).map((b, i) => (
                              <div 
                                key={i} 
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(b); }} 
                                className={`text-[10px] md:text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium border cursor-pointer hover:scale-105 transition-transform ${
                                  b.source === 'venue' 
                                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/25 hover:bg-orange-500/25' 
                                    : 'bg-purple-500/15 text-purple-300 border-purple-500/25 hover:bg-purple-500/25'
                                }`}
                                title={`${b.eventTime} - ${b.title}`}
                              >
                                {b.title}
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <div className="text-[10px] text-gray-500 text-center px-1">
                                +{dayBookings.length - 3} more
                              </div>
                            )}
                          </div>

                          {/* Mobile: Compact Colored Indicator Dots */}
                          <div className="sm:hidden flex items-center justify-center gap-1 mt-1">
                            {dayBookings.length > 0 && (
                              <span className={`w-2 h-2 rounded-full ${
                                dayBookings[0].source === 'venue' ? 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]' : 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]'
                              }`} />
                            )}
                            {dayBookings.length > 1 && (
                              <span className="text-[9px] font-bold text-gray-400">+{dayBookings.length}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Legend - Updated Style */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-6 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                  <span className="text-gray-400 text-sm font-medium">Venue Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>
                  <span className="text-gray-400 text-sm font-medium">Created Events</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                  <Filter size={14} /> Click any day to view details
                </div>
              </div>

            </div>
          </div>

          {/* Sidebar Detail View - High-Gloss Acrylic */}
          <div className="xl:col-span-1">
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-white/[0.09] via-white/[0.02] to-white/[0.04] backdrop-blur-2xl border border-white/15 border-t-white/35 shadow-2xl h-full flex flex-col max-h-[850px]">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-400/60 to-transparent"></div>
              
              {/* Sidebar Header & Search */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={20} className="text-indigo-400" />
                    <h3 className="text-xl font-bold text-white">
                      {selectedDate 
                        ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Month Overview'
                      }
                    </h3>
                  </div>
                  {selectedDate && (
                    <button 
                      onClick={() => setSelectedDate(null)} 
                      className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Search Input - Updated Style */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Filter Tabs - New Feature */}
                <div className="flex gap-2 bg-gray-800/50 p-1 rounded-xl">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Venues', value: 'venues' },
                    { label: 'Events', value: 'events' },
                    { label: 'Drafts', value: 'draft' },
                  ].map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setFilterType(filter.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        filterType === filter.value
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                <span className="text-sm text-gray-400">
                  {filteredBookings.length} {filteredBookings.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>

              {/* List of Events - Updated Style */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4" style={{scrollbarWidth: 'thin', scrollbarColor: 'rgba(107,114,128,0.3) transparent'}}>
                {filteredBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <CalendarDays size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">No activities found</p>
                    <p className="text-sm mt-1">Try selecting a different date or adjusting filters</p>
                  </div>
                ) : (
                  filteredBookings.map(item => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer group ${
                        item.source === 'venue' 
                          ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50' 
                          : 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-white text-base leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:to-pink-400 transition-colors">
                          {item.title}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ml-2 flex-shrink-0 ${
                          item.source === 'venue' 
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {item.source === 'venue' ? '🏛️ Venue' : '✨ Event'}
                        </span>
                      </div>
                      
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center text-gray-300">
                          <CalendarDays className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />
                          <span className="font-medium">{item.eventDate}</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            item.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            item.status === 'confirmed' || item.status === 'published' ? 'bg-green-500/20 text-green-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-gray-300">
                          <Clock className="w-4 h-4 mr-3 text-emerald-400 flex-shrink-0" />
                          <span>{item.eventTime}</span>
                          <span className="ml-2 text-gray-500">({item.duration} hrs)</span>
                        </div>
                        
                        <div className="flex items-center text-gray-300">
                          <MapPin className="w-4 h-4 mr-3 text-rose-400 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>

                        {(item.guestCount > 0 || item.totalPrice > 0) && (
                          <div className="flex items-center gap-4 pt-2 border-t border-gray-700/50 mt-2">
                            {item.guestCount > 0 && (
                              <div className="flex items-center text-gray-400 text-xs">
                                <Users size={12} className="mr-1" />
                                {item.guestCount} guests
                              </div>
                            )}
                            {item.totalPrice > 0 && (
                              <div className="flex items-center text-emerald-400 text-xs font-semibold">
                                ₹{item.totalPrice.toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Quick Stats Footer - Optional Enhancement */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-800">
               <div className="text-lg font-bold text-blue-400">
                 {new Set(normalizedData.map(b => b.eventDate)).size}
               </div>
               <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active Days</div>
             </div>
             <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-800">
               <div className="text-lg font-bold text-orange-400">
                 {normalizedData.reduce((sum, b) => sum + (b.guestCount || 0), 0)}
               </div>
               <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Total Guests</div>
             </div>
             <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-800">
               <div className="text-lg font-bold text-emerald-400">
                 ₹{normalizedData.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()}
               </div>
               <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Revenue</div>
             </div>
             <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-800">
               <div className="text-lg font-bold text-purple-400">
                 {Math.round(normalizedData.reduce((sum, b) => sum + (b.duration || 0), 0) / normalizedData.length) || 0}h
               </div>
               <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg Duration</div>
             </div>
          </div>
        </div>
      </div>


      {/* Activity Details & Deletion Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-fadeIn">
            <button 
              onClick={() => { setSelectedItem(null); setDeleteConfirm(false); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                selectedItem.source === 'venue' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {selectedItem.source === 'venue' ? '🏛️ Venue Booking' : '✨ Created Event'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                selectedItem.status === 'confirmed' || selectedItem.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {selectedItem.status}
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">{selectedItem.title}</h3>

            <div className="space-y-3 bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 mb-6">
              <div className="flex items-center text-gray-300 text-sm">
                <CalendarDays className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />
                <span className="font-semibold">{selectedItem.eventDate}</span>
                {selectedItem.eventTime && <span className="ml-2 text-gray-400">at {selectedItem.eventTime}</span>}
              </div>
              <div className="flex items-center text-gray-300 text-sm">
                <MapPin className="w-4 h-4 mr-3 text-rose-400 flex-shrink-0" />
                <span>{selectedItem.location || 'Location TBD'}</span>
              </div>
              {selectedItem.duration && (
                <div className="flex items-center text-gray-300 text-sm">
                  <Clock className="w-4 h-4 mr-3 text-emerald-400 flex-shrink-0" />
                  <span>Duration: {selectedItem.duration} hours</span>
                </div>
              )}
              {selectedItem.guestCount > 0 && (
                <div className="flex items-center text-gray-300 text-sm">
                  <Users className="w-4 h-4 mr-3 text-blue-400 flex-shrink-0" />
                  <span>Expected Attendees: {selectedItem.guestCount} guests</span>
                </div>
              )}
              {selectedItem.totalPrice > 0 && (
                <div className="flex items-center text-emerald-400 text-sm font-semibold">
                  <span className="mr-2">₹</span>
                  <span>Total Budget / Price: ₹{selectedItem.totalPrice.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* 1-Click Google Calendar Direct Web Sync */}
            <button
              type="button"
              onClick={() => handleAddToGoogleCalendar(selectedItem)}
              className="w-full py-3 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-4 text-sm shadow-md"
              title="Add this event to your personal Google Calendar at zero cost"
            >
              <span className="text-base">📅</span>
              <span>Add to Google Calendar (Free 1-Click Sync)</span>
            </button>

            {!isStudent && deleteConfirm ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-4">
                <p className="text-red-300 text-sm font-medium mb-3">
                  Are you sure you want to delete this {selectedItem.source === 'venue' ? 'booking' : 'event'}? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDeleteItem(selectedItem)}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
                  >
                    Yes, Delete Permanently
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {!isStudent && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 size={16} /> Delete Activity
                  </button>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all border border-gray-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automatic Google Calendar Sync Modal */}
      {showGoogleSyncModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-blue-500/50 rounded-3xl p-7 max-w-lg w-full shadow-2xl animate-fadeIn relative">
            <button
              onClick={() => { setShowGoogleSyncModal(false); setGoogleSyncSuccess(false); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/30 mb-3 shadow-lg">
                <span className="text-2xl">🌐</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Automatic Google Calendar Setup</h3>
              <p className="text-gray-300 text-xs mt-1">
                Zero manual file management. Auto-sync your entire MongoDB schedule directly into Google Calendar for 100% free.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Option 1: 1-Click Auto Subscription */}
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent rounded-2xl p-4 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">AUTOMATIC</span>
                    <span>1-Click Auto-Connect Live Feed</span>
                  </h4>
                  <span className="text-xs text-emerald-400 font-semibold">Recommended</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Opens Google Calendar and automatically adds the live feed subscription URL. Google Calendar will auto-refresh all events from MongoDB.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const feedUrl = `${API_URL}/api/events/calendar.ics`;
                    const gcalSubscribeUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl)}`;
                    window.open(gcalSubscribeUrl, '_blank', 'noopener,noreferrer');
                    setGoogleSyncSuccess(true);
                  }}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Connect Automatically to Google Calendar Now</span>
                </button>
              </div>

              {/* Option 2: Live Feed URL for Any Calendar App */}
              <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="text-purple-400">2.</span> Live iCal URL (Copy & Subscribe)
                </h4>
                <p className="text-xs text-gray-400">
                  You can also paste this live URL directly into Google Calendar (<strong className="text-gray-300">Other calendars &gt; From URL</strong>), Apple Calendar, or Outlook:
                </p>
                <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-xl border border-gray-700/80">
                  <input
                    type="text"
                    readOnly
                    value={`${API_URL}/api/events/calendar.ics`}
                    className="bg-transparent text-xs text-emerald-400 font-mono flex-1 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${API_URL}/api/events/calendar.ics`);
                      alert('Copied Live Calendar Feed URL to clipboard!');
                    }}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors font-semibold"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Option 3: Download Backup */}
              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>Want an offline copy instead?</span>
                <button
                  type="button"
                  onClick={handleExportGoogleCalendarICS}
                  className="text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Download .ics backup
                </button>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowGoogleSyncModal(false)}
                className="py-2.5 px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(107, 114, 128, 0.4); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.6); }
        
        /* Smooth transitions */
        * {
          transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }
      `}</style>
    </div>
  );
};

export default CalendarView;