const router = require('express').Router();
const QRCode = require('qrcode');
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logActivity } = require('../middleware/helpers');
const { notify, notifyRole } = require('../utils/notify');
const { sendEventApprovedEmail, sendEventRejectedEmail } = require('../utils/emailService');

// Get all events
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, category, limit, upcoming } = req.query;
    let filters = {};

    if (req.user.role === 'student') {
      filters.status = 'approved';
    } else if (status) {
      filters.status = status;
    }

    if (category) {
      filters.category = category;
    }

    if (upcoming === 'true') {
      filters.upcoming = true;
    }

    let events = await db.getEvents(filters);

    events = await Promise.all(events.map(async (event) => {
      const isRegistered = await db.isUserRegisteredForEvent(event.id, req.user.id);
      return { ...event, isRegistered };
    }));

    const limitNum = parseInt(limit);
    if (limitNum && limitNum > 0) {
      events = events.slice(0, limitNum);
    }

    res.json({ events, total: events.length });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get single event
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isRegistered = await db.isUserRegisteredForEvent(event.id, req.user.id);
    res.json({ ...event, isRegistered });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// Create event
router.post('/', verifyToken, requireRole('admin', 'stakeholder'), async (req, res) => {
  try {
    const { title, description, date, time, location, capacity, image, type, category, tags } = req.body;

    if (!title || !date || !time) {
      return res.status(400).json({ error: 'Title, date, and time are required' });
    }

    // Validate that the event date is not in the past
    const eventDate = new Date(date);
    const today = new Date();
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    const newEvent = await db.createEvent({
      title,
      description,
      date,
      time,
      location,
      capacity: parseInt(capacity) || 100,
      image,
      type,
      category,
      tags,
      proposerId: req.user.id,
      proposer: req.user.name,
      proposerRole: req.user.role,
      status: req.user.role === 'admin' ? 'approved' : 'pending'
    });

    await db.addLog('Event Created', `${req.user.name} created event "${newEvent.title}"`, 'info');
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.proposerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    const { title, description, date, time, location, capacity, image, type, category, tags } = req.body;

    // Validate that the updated event date is not in the past
    if (date !== undefined) {
      const eventDate = new Date(date);
      const today = new Date();
      eventDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        return res.status(400).json({ error: 'Event date cannot be in the past' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (location !== undefined) updates.location = location;
    if (capacity !== undefined) updates.capacity = parseInt(capacity) || 100;
    if (image !== undefined) updates.image = image;
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;

    const updatedEvent = await db.updateEvent(event.id, updates);
    await db.addLog('Event Updated', `${req.user.name} updated event "${event.title}"`, 'info');
    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Approve/Reject event
router.put('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }
    const event = await db.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await db.updateEvent(event.id, { status });
    const action = status === 'approved' ? 'Approved' : 'Rejected';
    await logActivity(
      `Event ${action}`,
      `${event.title} ${action.toLowerCase()} by ${req.user.name}`,
      status === 'approved' ? 'success' : 'warning',
      req,
      { category: 'event', targetType: 'event', targetId: event.id, targetName: event.title }
    );
    // Send real-time notification
    try {
      const io = req.app.get('io');
      if (io) {
        if (status === 'approved') {
          await notify(io, { userId: event.proposerId, type: 'event_approved', title: 'Event Approved', message: `Your event "${event.title}" has been approved!`, relatedId: event.id, relatedType: 'event' });
          await notifyRole(io, 'student', { type: 'new_event', title: 'New Event Available', message: `Check out "${event.title}"`, relatedId: event.id, relatedType: 'event', excludeUserId: req.user.id });
        } else {
          await notify(io, { userId: event.proposerId, type: 'event_rejected', title: 'Event Not Approved', message: `Your event "${event.title}" was not approved.`, relatedId: event.id, relatedType: 'event' });
        }
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    // Send email notification to event proposer
    try {
      const proposer = await db.getUserById(event.proposerId);
      if (proposer && proposer.email) {
        if (status === 'approved') {
          await sendEventApprovedEmail(proposer.email, proposer.name, event.title);
        } else {
          await sendEventRejectedEmail(proposer.email, proposer.name, event.title);
        }
      }
    } catch (emailErr) {
      console.error('Event status email error:', emailErr);
    }
    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
});

// Register for event
router.post('/:id/register', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only allow registration for approved events
    if (event.status !== 'approved') {
      return res.status(400).json({ error: 'Can only register for approved events' });
    }

    const isRegistered = await db.isUserRegisteredForEvent(eventId, req.user.id);
    if (isRegistered) {
      return res.status(400).json({ error: 'Already registered' });
    }

    if (event.attendees >= event.capacity) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Register and then verify capacity was not exceeded (compensating transaction)
    const registration = await db.registerForEvent(eventId, req.user.id);

    // Re-check registration count after insert to handle race condition
    const currentCount = await db.getEventRegistrationCount(eventId);
    if (currentCount > event.capacity) {
      // Over capacity due to race condition — roll back this registration
      await db.unregisterFromEvent(eventId, req.user.id);
      return res.status(400).json({ error: 'Event is full' });
    }

    const updatedEvent = await db.getEventById(eventId);

    // Notify event proposer of new registration
    try {
      const io = req.app.get('io');
      if (io) {
        await notify(io, { userId: event.proposerId, type: 'event_registration', title: 'New Registration', message: `Someone registered for "${event.title}"`, relatedId: event.id, relatedType: 'event' });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    res.json({ message: 'Registered successfully', event: { ...updatedEvent, isRegistered: true } });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Unregister from event
router.delete('/:id/register', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await db.unregisterFromEvent(eventId, req.user.id);
    const updatedEvent = await db.getEventById(eventId);

    res.json({ message: 'Unregistered successfully', event: { ...updatedEvent, isRegistered: false } });
  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({ error: 'Failed to unregister from event' });
  }
});

// Delete event
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.proposerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await db.deleteEvent(event.id);
    await db.addLog('Event Deleted', `${req.user.name} deleted event "${event.title}"`, 'warning');
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get event registrations
router.get('/:id/registrations', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isCreator = event.proposerId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view registrations' });
    }

    const registrations = await db.getEventRegistrationsWithUsers(eventId);
    res.json(registrations);
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ error: 'Failed to get event registrations' });
  }
});

// Get my ticket (QR code) for an event
router.get('/:id/my-ticket', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const EventRegistration = require('../models/EventRegistration');
    const registration = await EventRegistration.findOne({ eventId, userId: req.user.id }).lean();
    if (!registration) return res.status(404).json({ error: 'You are not registered for this event' });

    // Generate QR code as data URL
    const qrData = JSON.stringify({
      type: 'utm-checkin',
      eventId,
      checkInCode: registration.checkInCode,
      userId: req.user.id
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    res.json({
      ticket: {
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        attendeeName: req.user.name,
        attendeeEmail: req.user.email,
        checkInCode: registration.checkInCode,
        qrCode: qrCodeDataUrl,
        registeredAt: registration.registeredAt,
        checkedIn: registration.checkedIn || false,
        checkedInAt: registration.checkedInAt
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to generate ticket' });
  }
});

// Check in attendee (admin/stakeholder/event creator scans QR)
router.post('/:id/check-in', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { checkInCode } = req.body;
    if (!checkInCode) return res.status(400).json({ error: 'Check-in code is required' });

    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Only admin, stakeholder, or event creator can check in attendees
    const isCreator = event.proposerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isStakeholder = req.user.role === 'stakeholder';
    if (!isCreator && !isAdmin && !isStakeholder) {
      return res.status(403).json({ error: 'Not authorized to check in attendees' });
    }

    // Verify the check-in code
    const registration = await db.getRegistrationByCheckInCode(checkInCode);
    if (!registration) return res.status(404).json({ error: 'Invalid check-in code' });
    if (registration.eventId.toString() !== eventId) {
      return res.status(400).json({ error: 'This ticket is for a different event' });
    }
    if (registration.checkedIn) {
      return res.status(400).json({ error: 'Attendee already checked in', registration });
    }

    const updated = await db.checkInRegistration(checkInCode, req.user.id);
    if (!updated) return res.status(400).json({ error: 'Check-in failed' });

    const stats = await db.getEventCheckInStats(eventId);

    // Notify the attendee
    try {
      const io = req.app.get('io');
      if (io) {
        await notify(io, {
          userId: registration.userId,
          type: 'event_checkin',
          title: 'Checked In!',
          message: `You've been checked in to "${event.title}"`,
          relatedId: eventId,
          relatedType: 'event'
        });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }

    res.json({ message: 'Check-in successful', registration: updated, stats });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in attendee' });
  }
});

// Get check-in stats for an event
router.get('/:id/check-in-stats', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const isCreator = event.proposerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const stats = await db.getEventCheckInStats(eventId);
    res.json(stats);
  } catch (error) {
    console.error('Get check-in stats error:', error);
    res.status(500).json({ error: 'Failed to get check-in stats' });
  }
});

module.exports = router;
