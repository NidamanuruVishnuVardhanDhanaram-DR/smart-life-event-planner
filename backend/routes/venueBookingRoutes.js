import express from 'express';
import VenueBooking from '../models/VenueBooking.js';

const router = express.Router();

// Sample initial bookings to seed into MongoDB if empty
const getInitialBookings = () => {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextMonth = new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const soon = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    {
      venue: '1',
      venueName: 'Grand Ball Room',
      location: 'Downtown Convention Center',
      eventName: 'Annual Tech Innovation Symposium',
      eventDate: nextWeek,
      eventTime: '10:00',
      duration: 5,
      guestCount: 350,
      notes: 'Main auditorium stage and audio setup required',
      totalPrice: 7500,
      status: 'Confirmed'
    },
    {
      venue: '2',
      venueName: 'Garden Pavilion',
      location: 'Riverside Gardens',
      eventName: 'Alumni Leadership & Networking Gala',
      eventDate: nextMonth,
      eventTime: '17:00',
      duration: 4,
      guestCount: 180,
      notes: 'Evening outdoor seating and buffet setup',
      totalPrice: 3200,
      status: 'Confirmed'
    },
    {
      venue: '3',
      venueName: 'Conference Hall',
      location: 'Business District Tower',
      eventName: 'Generative AI Developer Workshop',
      eventDate: soon,
      eventTime: '09:30',
      duration: 4,
      guestCount: 90,
      notes: 'High-speed Wi-Fi and presentation projector',
      totalPrice: 2400,
      status: 'Confirmed'
    }
  ];
};

// @route   GET /api/venue-bookings
// @desc    Get all venue bookings (from MongoDB, with auto-seed)
// @access  Public
router.get('/', async (req, res) => {
  try {
    let bookings = await VenueBooking.find().sort({ eventDate: 1 });

    // Seed if collection is currently empty
    if (!bookings || bookings.length === 0) {
      const initialItems = getInitialBookings();
      bookings = await VenueBooking.insertMany(initialItems);
      console.log(`✅ Seeded ${bookings.length} initial venue bookings to MongoDB`);
    }

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    console.error('Error fetching venue bookings from MongoDB:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue bookings',
      error: err.message
    });
  }
});

// @route   POST /api/venue-bookings
// @desc    Create a new venue booking in MongoDB
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      venue,
      venueName,
      location,
      eventName,
      eventDate,
      eventTime,
      duration,
      guestCount,
      notes,
      totalPrice,
      status
    } = req.body;

    if (!venueName || !eventName || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'venueName, eventName, and eventDate are required'
      });
    }

    const booking = new VenueBooking({
      userId: userId || 'guest',
      userName: userName || 'User',
      userEmail: userEmail || '',
      venue: venue || '1',
      venueName,
      location: location || 'Main Campus',
      eventName,
      eventDate,
      eventTime: eventTime || '10:00',
      duration: Number(duration) || 4,
      guestCount: Number(guestCount) || 50,
      notes: notes || '',
      totalPrice: Number(totalPrice) || 0,
      status: status || 'Confirmed'
    });

    const savedBooking = await booking.save();
    console.log(`✅ New venue booking saved to MongoDB: "${savedBooking.eventName}" at "${savedBooking.venueName}"`);

    res.status(201).json({
      success: true,
      message: 'Venue booking created successfully in MongoDB',
      booking: savedBooking
    });
  } catch (err) {
    console.error('Error creating venue booking:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create venue booking',
      error: err.message
    });
  }
});

// @route   PUT /api/venue-bookings/:id
// @desc    Update a venue booking
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let booking;

    if (id.length === 24) {
      booking = await VenueBooking.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      // Find by custom ID or field if matched
      booking = await VenueBooking.findOneAndUpdate({ _id: id }, req.body, { new: true });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Venue booking not found' });
    }

    res.json({
      success: true,
      message: 'Venue booking updated in MongoDB',
      booking
    });
  } catch (err) {
    console.error('Error updating venue booking:', err);
    res.status(500).json({ success: false, message: 'Failed to update venue booking' });
  }
});

// @route   DELETE /api/venue-bookings/:id
// @desc    Delete a venue booking
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id.length === 24) {
      await VenueBooking.findByIdAndDelete(id);
    } else {
      await VenueBooking.deleteOne({ _id: id });
    }

    res.json({
      success: true,
      message: 'Venue booking deleted from MongoDB'
    });
  } catch (err) {
    console.error('Error deleting venue booking:', err);
    res.status(500).json({ success: false, message: 'Failed to delete venue booking' });
  }
});

export default router;
