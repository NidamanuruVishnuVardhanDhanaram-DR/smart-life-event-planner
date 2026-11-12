import Event from '../models/Event.js';
import User from '../models/User.js';

// @desc    Get all events
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by user (events they created or participate in)
    if (req.query.myEvents === 'true') {
      filter.$or = [
        { organizer: req.user.id },
        { 'participants.user': req.user.id }
      ];
    }

    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      filter.startDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(filter);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('comments.user', 'name avatar');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user has access to this event
    const organizerId = (event.organizer?._id || event.organizer)?.toString();
    const isOrganizer = organizerId === req.user.id;
    const isParticipant = event.participants.some(p => (p.user?._id || p.user)?.toString() === req.user.id);

    if (event.visibility === 'private' && !isOrganizer && !isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private
const createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer: req.user.id,
    };

    const event = await Event.create(eventData);

    // Add event to user's created events
    await User.findByIdAndUpdate(req.user.id, {
      $push: { eventsCreated: event._id }
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'name email avatar');

    res.status(201).json(populatedEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer
    const organizerId = (event.organizer?._id || event.organizer)?.toString();
    if (organizerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('organizer', 'name email avatar')
      .populate('participants.user', 'name email avatar');

    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer
    const organizerId = (event.organizer?._id || event.organizer)?.toString();
    if (organizerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);

    // Remove event from user's created events
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { eventsCreated: req.params.id }
    });

    res.json({ message: 'Event removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join event
// @route   POST /api/events/:id/join
// @access  Private
const joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already a participant
    const isParticipant = event.participants.some(p => (p.user?._id || p.user)?.toString() === req.user.id);

    if (isParticipant) {
      return res.status(400).json({ message: 'Already participating in this event' });
    }

    event.participants.push({
      user: req.user.id,
      role: 'guest',
      status: 'accepted',
    });

    await event.save();

    // Add event to user's participating events
    await User.findByIdAndUpdate(req.user.id, {
      $push: { eventsParticipating: event._id }
    });

    res.json({ message: 'Joined event successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Leave event
// @route   POST /api/events/:id/leave
// @access  Private
const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Remove user from participants
    event.participants = event.participants.filter(p => (p.user?._id || p.user)?.toString() !== req.user.id);

    await event.save();

    // Remove event from user's participating events
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { eventsParticipating: req.params.id }
    });

    res.json({ message: 'Left event successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add comment to event
// @route   POST /api/events/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const comment = {
      user: req.user.id,
      text: req.body.text,
    };

    event.comments.push(comment);
    await event.save();

    const populatedEvent = await Event.findById(req.params.id)
      .populate('comments.user', 'name avatar');

    res.status(201).json(populatedEvent.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Allocate user/student to event (Plan Event / Admin)
// @route   POST /api/events/:id/allocate
// @access  Private
const allocateUserToEvent = async (req, res) => {
  try {
    const { userId, role = 'student' } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const existingIndex = event.participants.findIndex(p => (p.user?._id || p.user)?.toString() === userId);
    if (existingIndex !== -1) {
      event.participants[existingIndex].status = 'allocated';
      event.participants[existingIndex].role = role;
    } else {
      event.participants.push({
        user: userId,
        role: role,
        status: 'allocated',
      });
    }

    await event.save();

    // Also update student's eventsParticipating
    await User.findByIdAndUpdate(userId, {
      $addToSet: { eventsParticipating: event._id, allocatedEvents: event._id }
    });

    res.json({ message: 'User allocated to event successfully', event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Live Automatic Google Calendar Feed (RFC 5545 iCalendar)
// @route   GET /api/events/calendar.ics
// @access  Public (Required for Google Calendar automatic webcal subscription)
const getGoogleCalendarFeed = async (req, res) => {
  try {
    const events = await Event.find({ status: { $ne: 'cancelled' } })
      .populate('organizer', 'name email')
      .sort({ startDate: 1 });

    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smart Life Event Planner//Google Calendar Automatic Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Smart Life Event Planner (Live)',
      'X-WR-CALDESC:Live event stream automatically synced from Smart Life Event Planner',
      'X-WR-TIMEZONE:UTC',
      'X-PUBLISHED-TTL:PT15M',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    ];

    events.forEach((event, idx) => {
      const start = event.startDate ? new Date(event.startDate) : new Date();
      const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 3600000);

      const dtStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const summary = (event.title || 'Scheduled Event').replace(/,/g, '\\,');
      const location = (event.location?.address || event.location?.city || event.venueName || 'Online / TBD').replace(/,/g, '\\,');
      const description = (event.description || `Event organized by ${event.organizer?.name || 'Smart Life Planner'}`).replace(/\n/g, '\\n').replace(/,/g, '\\,');

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:event_${event._id}@smartlifeplanner.local`);
      icsLines.push(`DTSTAMP:${nowStamp}`);
      icsLines.push(`DTSTART:${dtStart}`);
      icsLines.push(`DTEND:${dtEnd}`);
      icsLines.push(`SUMMARY:${summary}`);
      icsLines.push(`LOCATION:${location}`);
      icsLines.push(`DESCRIPTION:${description}`);
      icsLines.push(`STATUS:${event.status === 'published' ? 'CONFIRMED' : 'TENTATIVE'}`);
      icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');

    const icsContent = icsLines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="smart-events.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(icsContent);
  } catch (error) {
    res.status(500).send('Error generating live calendar feed');
  }
};

// @desc    Get Google Calendar live connection details
// @route   GET /api/events/google-sync-info
// @access  Public
const getGoogleSyncInfo = async (req, res) => {
  try {
    const host = req.get('host') || 'localhost:5001';
    const protocol = req.protocol || 'http';
    const httpFeedUrl = `${protocol}://${host}/api/events/calendar.ics`;
    const webcalFeedUrl = `webcal://${host}/api/events/calendar.ics`;
    const googleAutoConnectUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpFeedUrl)}`;

    res.json({
      success: true,
      googleAutoConnectUrl,
      httpFeedUrl,
      webcalFeedUrl,
      settingsUrl: 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl',
      instructions: [
        'Click "Connect to Google Calendar Automatically" to register the live feed with 1 click.',
        'Google Calendar will automatically refresh and sync all events from MongoDB without manual downloads.',
        '100% Free - No Google Cloud API billing required.',
      ],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  addComment,
  allocateUserToEvent,
  getGoogleCalendarFeed,
  getGoogleSyncInfo,
};
