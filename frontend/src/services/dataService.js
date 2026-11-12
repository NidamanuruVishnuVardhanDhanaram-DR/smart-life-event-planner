import axios from 'axios';
import API_URL from '../config';

// Unified Storage Keys
export const VENUE_BOOKINGS_KEY = 'venueBookings';
export const EVENTS_KEY = 'events';
export const USERS_KEY = 'demoUsers';
export const ACCOUNT_REQUESTS_KEY = 'accountRequests';

// High-Fidelity Realistic Seed Data (Ensures Desktop & Mobile Match 100% on any network)
export const INITIAL_VENUE_BOOKINGS = [
  {
    _id: 'vb_seed_1',
    userId: 'seed_user_1',
    userName: 'Campus Tech Committee',
    userEmail: 'organizer@eventplanner.com',
    venue: '1',
    venueName: 'Grand Ball Room',
    location: 'Downtown Convention Center',
    eventName: 'Tech Horizon Annual Gala 2026',
    eventDate: '2026-11-15',
    eventTime: '18:00',
    duration: 6,
    guestCount: 450,
    notes: 'Keynote auditorium with central stage, live broadcast & audio setup.',
    totalPrice: 9000,
    status: 'Confirmed',
    createdAt: '2026-10-25T10:00:00.000Z'
  },
  {
    _id: 'vb_seed_2',
    userId: 'seed_user_2',
    userName: 'Cultural Affairs Club',
    userEmail: 'student@eventplanner.com',
    venue: '2',
    venueName: 'Garden Pavilion',
    location: 'Riverside Gardens',
    eventName: 'Spring Art & Acoustic Festival',
    eventDate: '2026-11-20',
    eventTime: '16:00',
    duration: 4,
    guestCount: 180,
    notes: 'Outdoor acoustic lighting, guest food stalls and acoustic sound monitors.',
    totalPrice: 3200,
    status: 'Confirmed',
    createdAt: '2026-10-26T14:30:00.000Z'
  },
  {
    _id: 'vb_seed_3',
    userId: 'seed_user_3',
    userName: 'Engineering Alumni Council',
    userEmail: 'organizer@eventplanner.com',
    venue: '5',
    venueName: 'Sri Venkateswara Function Hall',
    location: 'Narakodu',
    eventName: 'Silver Jubilee Alumni Reunion',
    eventDate: '2026-11-28',
    eventTime: '10:00',
    duration: 8,
    guestCount: 600,
    notes: 'Grand buffet dining, felicitation ceremony and commemorative exhibition.',
    totalPrice: 7600,
    status: 'Confirmed',
    createdAt: '2026-10-27T09:15:00.000Z'
  },
  {
    _id: 'vb_seed_4',
    userId: 'seed_user_4',
    userName: 'Innovation & Research Cell',
    userEmail: 'pro@eventplanner.com',
    venue: '3',
    venueName: 'Conference Hall',
    location: 'Business District Tower',
    eventName: 'International AI & Robotics Summit',
    eventDate: '2026-12-05',
    eventTime: '09:00',
    duration: 6,
    guestCount: 95,
    notes: 'Dual HD projectors, interactive Q&A mics and live video streaming.',
    totalPrice: 3600,
    status: 'Confirmed',
    createdAt: '2026-10-28T11:00:00.000Z'
  },
  {
    _id: 'vb_seed_5',
    userId: 'seed_user_5',
    userName: 'Executive Alumni Club',
    userEmail: 'organizer@eventplanner.com',
    venue: '4',
    venueName: 'Rooftop Lounge',
    location: 'Skyline Hotel',
    eventName: 'Industry Leadership Networking Dinner',
    eventDate: '2026-12-12',
    eventTime: '19:30',
    duration: 4,
    guestCount: 120,
    notes: 'Private lounge reservation with skyline vista and ambient lighting.',
    totalPrice: 4800,
    status: 'Confirmed',
    createdAt: '2026-10-29T16:20:00.000Z'
  }
];

export const INITIAL_EVENTS = [
  {
    _id: 'evt_seed_1',
    title: 'National College Hackathon 2026',
    description: '36-hour multi-track code sprint tackling real-world sustainability and AI challenges.',
    category: 'hackathon',
    startDate: '2026-11-18T09:00:00.000Z',
    endDate: '2026-11-19T21:00:00.000Z',
    location: {
      address: 'Main Tech Campus Auditorium',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    guestCount: 350,
    budget: { total: 45000 },
    status: 'published',
    visibility: 'public',
    isPublic: true,
    allocatedUsers: [],
    createdAt: '2026-10-20T10:00:00.000Z'
  },
  {
    _id: 'evt_seed_2',
    title: 'Inter-University Cultural Fest: Tarang',
    description: 'Annual cultural extravaganza featuring dance, battle of bands, drama and fine arts.',
    category: 'cultural',
    startDate: '2026-11-24T10:00:00.000Z',
    endDate: '2026-11-26T22:00:00.000Z',
    location: {
      address: 'Open Air Amphitheatre',
      city: 'Guntur',
      state: 'Andhra Pradesh',
      country: 'India'
    },
    guestCount: 800,
    budget: { total: 75000 },
    status: 'published',
    visibility: 'public',
    isPublic: true,
    allocatedUsers: [],
    createdAt: '2026-10-22T12:00:00.000Z'
  },
  {
    _id: 'evt_seed_3',
    title: 'Career & Industry Placement Fair 2026',
    description: 'Top tech & core engineering companies conducting on-campus recruitment and interview drives.',
    category: 'career',
    startDate: '2026-12-02T09:30:00.000Z',
    endDate: '2026-12-03T18:00:00.000Z',
    location: {
      address: 'Placement Block & Seminar Halls',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    guestCount: 600,
    budget: { total: 30000 },
    status: 'published',
    visibility: 'public',
    isPublic: true,
    allocatedUsers: [],
    createdAt: '2026-10-24T08:30:00.000Z'
  },
  {
    _id: 'evt_seed_4',
    title: 'Hands-on AI & Deep Learning Masterclass',
    description: 'Intensive workshop on LLM fine-tuning, autonomous agents and multimodal models.',
    category: 'workshop',
    startDate: '2026-12-08T14:00:00.000Z',
    endDate: '2026-12-08T18:00:00.000Z',
    location: {
      address: 'Advanced Computing Lab 3',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    guestCount: 75,
    budget: { total: 12000 },
    status: 'published',
    visibility: 'public',
    isPublic: true,
    allocatedUsers: [],
    createdAt: '2026-10-27T15:00:00.000Z'
  }
];

export const INITIAL_DEMO_USERS = [
  {
    _id: 'demo_user_student',
    name: 'Demo Student Visitor',
    email: 'student@eventplanner.com',
    password: 'password',
    role: 'student',
    organization: 'University Engineering College'
  },
  {
    _id: 'demo_user_planner',
    name: 'Demo Plan Event Organizer',
    email: 'organizer@eventplanner.com',
    password: 'password',
    role: 'organizer',
    organization: 'Campus Events Directorate'
  },
  {
    _id: 'demo_user_pro',
    name: 'Demo Pro Tools Specialist',
    email: 'pro@eventplanner.com',
    password: 'password',
    role: 'professional',
    organization: 'Elite Production & Event Solutions'
  },
  {
    _id: 'demo_user_admin',
    name: 'Master Administrator',
    email: 'admin@eventplanner.com',
    password: 'password',
    role: 'admin',
    organization: 'Smart Life Systems'
  },
  {
    _id: 'demo_user_visitor',
    name: 'Demo Visitor',
    email: 'demo@eventplanner.com',
    password: 'demo123',
    role: 'organizer',
    organization: 'Smart Life Guest'
  }
];

// Initialize Storage: Guarantees Desktop & Mobile have consistent data out of the box
export const initializeDefaultData = () => {
  try {
    // 1. Seed Venue Bookings if missing or empty
    const rawVB = localStorage.getItem(VENUE_BOOKINGS_KEY);
    if (!rawVB || rawVB === '[]' || rawVB === 'null') {
      localStorage.setItem(VENUE_BOOKINGS_KEY, JSON.stringify(INITIAL_VENUE_BOOKINGS));
    }

    // 2. Seed Events if missing or empty
    const rawEvents = localStorage.getItem(EVENTS_KEY);
    if (!rawEvents || rawEvents === '[]' || rawEvents === 'null') {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(INITIAL_EVENTS));
    }

    // 3. Seed Demo Users if missing or empty
    const rawUsers = localStorage.getItem(USERS_KEY);
    if (!rawUsers || rawUsers === '[]' || rawUsers === 'null') {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_DEMO_USERS));
    } else {
      // Merge initial demo users so demo accounts always work
      try {
        const existing = JSON.parse(rawUsers);
        const userMap = new Map();
        INITIAL_DEMO_USERS.forEach(u => userMap.set(u.email.toLowerCase(), u));
        existing.forEach(u => userMap.set(u.email.toLowerCase(), u));
        localStorage.setItem(USERS_KEY, JSON.stringify(Array.from(userMap.values())));
      } catch {}
    }
  } catch (err) {
    console.warn('Storage initialization warning:', err.message);
  }
};

// Safe API caller with strict timeout so UI never freezes when backend is unreachable
const safeApiCall = async (fn, fallbackValue) => {
  try {
    const res = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('API Timeout')), 2500))
    ]);
    return res;
  } catch {
    return fallbackValue;
  }
};

// Get Venue Bookings (combines API & LocalStorage)
export const fetchAllVenueBookings = async () => {
  initializeDefaultData();
  let localData = [];
  try {
    localData = JSON.parse(localStorage.getItem(VENUE_BOOKINGS_KEY) || '[]');
  } catch {
    localData = INITIAL_VENUE_BOOKINGS;
  }

  // Attempt backend sync
  const apiRes = await safeApiCall(() => axios.get(`${API_URL}/api/venue-bookings`), null);
  if (apiRes?.data?.bookings && Array.isArray(apiRes.data.bookings) && apiRes.data.bookings.length > 0) {
    const map = new Map();
    localData.forEach(item => map.set(item._id, item));
    apiRes.data.bookings.forEach(item => map.set(item._id, item));
    const merged = Array.from(map.values());
    localStorage.setItem(VENUE_BOOKINGS_KEY, JSON.stringify(merged));
    return merged;
  }

  return localData;
};

// Save Venue Booking
export const persistVenueBooking = async (booking) => {
  initializeDefaultData();
  let current = [];
  try {
    current = JSON.parse(localStorage.getItem(VENUE_BOOKINGS_KEY) || '[]');
  } catch {
    current = [];
  }

  const existingIndex = current.findIndex(b => b._id === booking._id);
  let updated;
  if (existingIndex >= 0) {
    updated = current.map(b => (b._id === booking._id ? booking : b));
  } else {
    updated = [booking, ...current];
  }

  localStorage.setItem(VENUE_BOOKINGS_KEY, JSON.stringify(updated));

  // Sync to backend asynchronously
  safeApiCall(() => axios.post(`${API_URL}/api/venue-bookings`, booking), null).catch(() => {});

  // Dispatch events for live updates across views
  window.dispatchEvent(new Event('venueBookingUpdated'));
  window.dispatchEvent(new Event('bookingsUpdated'));

  return updated;
};

// Delete Venue Booking
export const removeVenueBooking = async (bookingId) => {
  let current = [];
  try {
    current = JSON.parse(localStorage.getItem(VENUE_BOOKINGS_KEY) || '[]');
  } catch {
    current = [];
  }

  const updated = current.filter(b => b._id !== bookingId);
  localStorage.setItem(VENUE_BOOKINGS_KEY, JSON.stringify(updated));

  // Sync to backend asynchronously
  safeApiCall(() => axios.delete(`${API_URL}/api/venue-bookings/${bookingId}`), null).catch(() => {});

  window.dispatchEvent(new Event('venueBookingUpdated'));
  window.dispatchEvent(new Event('bookingsUpdated'));

  return updated;
};

// Fetch Events
export const fetchAllEvents = async () => {
  initializeDefaultData();
  let localData = [];
  try {
    localData = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    localData = INITIAL_EVENTS;
  }

  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const apiRes = await safeApiCall(() => axios.get(`${API_URL}/api/events?myEvents=true`, { headers }), null);
  if (apiRes?.data?.events && Array.isArray(apiRes.data.events) && apiRes.data.events.length > 0) {
    const map = new Map();
    localData.forEach(item => map.set(item._id, item));
    apiRes.data.events.forEach(item => map.set(item._id, item));
    const merged = Array.from(map.values());
    localStorage.setItem(EVENTS_KEY, JSON.stringify(merged));
    return merged;
  }

  return localData;
};

export default {
  VENUE_BOOKINGS_KEY,
  EVENTS_KEY,
  USERS_KEY,
  ACCOUNT_REQUESTS_KEY,
  INITIAL_VENUE_BOOKINGS,
  INITIAL_EVENTS,
  INITIAL_DEMO_USERS,
  initializeDefaultData,
  fetchAllVenueBookings,
  persistVenueBooking,
  removeVenueBooking,
  fetchAllEvents
};
