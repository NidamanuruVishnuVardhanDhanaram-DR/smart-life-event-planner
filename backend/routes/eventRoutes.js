import express from 'express';
const router = express.Router();
import {
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
} from '../controllers/eventController.js';

import { authMiddleware } from '../config/authMiddleware.js';

// Public Live Automatic Google Calendar Feeds (NO AUTH required so Google Calendar can auto-sync)
router.get('/calendar.ics', getGoogleCalendarFeed);
router.get('/feed.ics', getGoogleCalendarFeed);
router.get('/google-sync-info', getGoogleSyncInfo);

// All protected routes require authentication
router.use(authMiddleware);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id')
  .get(getEvent)
  .put(updateEvent)
  .delete(deleteEvent);

router.post('/:id/join', joinEvent);
router.post('/:id/leave', leaveEvent);
router.post('/:id/comments', addComment);
router.post('/:id/allocate', allocateUserToEvent);

export default router;
