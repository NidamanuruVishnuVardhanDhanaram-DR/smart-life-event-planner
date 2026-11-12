import mongoose from 'mongoose';

const venueBookingSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'guest',
  },
  userName: {
    type: String,
    default: 'User',
  },
  userEmail: {
    type: String,
  },
  venue: {
    type: String,
    required: [true, 'Venue ID is required'],
  },
  venueName: {
    type: String,
    required: [true, 'Venue name is required'],
  },
  location: {
    type: String,
    default: 'Main Campus',
  },
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
  },
  eventDate: {
    type: String,
    required: [true, 'Event date is required (YYYY-MM-DD)'],
  },
  eventTime: {
    type: String,
    default: '10:00',
  },
  duration: {
    type: Number,
    default: 4,
  },
  guestCount: {
    type: Number,
    default: 50,
  },
  notes: {
    type: String,
    default: '',
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Cancelled', 'Completed', 'confirmed', 'pending', 'cancelled'],
    default: 'Confirmed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const VenueBooking = mongoose.model('VenueBooking', venueBookingSchema);

export default VenueBooking;
