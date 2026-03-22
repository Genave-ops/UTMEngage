const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database before requiring app
jest.mock('../config/database', () => {
  const mockDb = {
    initialize: jest.fn().mockResolvedValue(true),
    getEventById: jest.fn(),
    getEvents: jest.fn(),
    registerForEvent: jest.fn(),
    getRegistrationByCheckInCode: jest.fn(),
    checkInRegistration: jest.fn(),
    getEventCheckInStats: jest.fn(),
    getEventRegistrationsWithUsers: jest.fn(),
    isUserRegisteredForEvent: jest.fn(),
    getEventRegistrationCount: jest.fn(),
    unregisterFromEvent: jest.fn(),
    addLog: jest.fn().mockResolvedValue(true),
  };
  return mockDb;
});

// Mock socket
jest.mock('../socket', () => ({
  setupSocket: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  })),
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

// Mock EventRegistration model (used directly in my-ticket route)
jest.mock('../models/EventRegistration', () => ({
  findOne: jest.fn(),
}));

// Set env before requiring app
process.env.JWT_SECRET = 'test-secret-key-for-checkin-tests';
process.env.NODE_ENV = 'test';

const app = require('../index');
const db = require('../config/database');
const EventRegistration = require('../models/EventRegistration');

// Helper to generate test tokens
const generateTestToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const adminUser = { id: 'admin-1', email: 'admin@utm.ac.mu', role: 'admin', name: 'Test Admin' };
const studentUser = { id: 'student-1', email: 'student@utm.ac.mu', role: 'student', name: 'Test Student' };
const stakeholderUser = { id: 'stakeholder-1', email: 'stake@utm.ac.mu', role: 'stakeholder', name: 'Test Stakeholder' };

const adminToken = generateTestToken(adminUser);
const studentToken = generateTestToken(studentUser);
const stakeholderToken = generateTestToken(stakeholderUser);

const mockEvent = {
  id: 'event-1',
  title: 'Tech Conference 2026',
  date: '2026-04-15',
  time: '10:00 AM',
  location: 'Main Hall',
  status: 'approved',
  capacity: 100,
  attendees: 10,
  proposerId: 'stakeholder-1',
};

describe('QR Code Check-In Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // GET /api/events/:id/my-ticket
  // ============================================================
  describe('GET /api/events/:id/my-ticket', () => {
    it('should return ticket with QR code for registered user', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'reg-1',
          eventId: 'event-1',
          userId: 'student-1',
          checkInCode: 'uuid-1234',
          checkedIn: false,
          checkedInAt: null,
          registeredAt: new Date('2026-03-10'),
        }),
      });

      const res = await request(app)
        .get('/api/events/event-1/my-ticket')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.eventTitle).toBe('Tech Conference 2026');
      expect(res.body.ticket.checkInCode).toBe('uuid-1234');
      expect(res.body.ticket.qrCode).toContain('data:image/png');
      expect(res.body.ticket.attendeeName).toBe('Test Student');
      expect(res.body.ticket.checkedIn).toBe(false);
    });

    it('should return 404 if user is not registered', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/api/events/event-1/my-ticket')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not registered');
    });

    it('should return 404 for nonexistent event', async () => {
      db.getEventById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/events/fake-id/my-ticket')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Event not found');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/events/event-1/my-ticket');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // POST /api/events/:id/check-in
  // ============================================================
  describe('POST /api/events/:id/check-in', () => {
    it('should check in attendee successfully as admin', async () => {
      const checkInCode = 'test-uuid-1234';
      db.getEventById.mockResolvedValue(mockEvent);
      db.getRegistrationByCheckInCode.mockResolvedValue({
        id: 'reg-1',
        eventId: 'event-1',
        userId: 'student-1',
        checkInCode,
        checkedIn: false,
        user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu' },
      });
      db.checkInRegistration.mockResolvedValue({
        id: 'reg-1',
        eventId: 'event-1',
        userId: 'student-1',
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: 'admin-1',
        user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu' },
      });
      db.getEventCheckInStats.mockResolvedValue({ total: 10, checkedIn: 5, pending: 5 });

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ checkInCode });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Check-in successful');
      expect(res.body.registration.checkedIn).toBe(true);
      expect(res.body.stats).toEqual({ total: 10, checkedIn: 5, pending: 5 });
    });

    it('should check in attendee as event creator (stakeholder)', async () => {
      const checkInCode = 'test-uuid-5678';
      db.getEventById.mockResolvedValue(mockEvent);
      db.getRegistrationByCheckInCode.mockResolvedValue({
        id: 'reg-2', eventId: 'event-1', userId: 'student-1', checkInCode, checkedIn: false,
        user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu' },
      });
      db.checkInRegistration.mockResolvedValue({
        id: 'reg-2', eventId: 'event-1', userId: 'student-1', checkedIn: true,
        checkedInAt: new Date(), checkedInBy: 'stakeholder-1',
        user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu' },
      });
      db.getEventCheckInStats.mockResolvedValue({ total: 10, checkedIn: 6, pending: 4 });

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({ checkInCode });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Check-in successful');
    });

    it('should reject check-in by unauthorized student', async () => {
      db.getEventById.mockResolvedValue({ ...mockEvent, proposerId: 'someone-else' });

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ checkInCode: 'test-uuid' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Not authorized');
    });

    it('should reject already checked-in attendee', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.getRegistrationByCheckInCode.mockResolvedValue({
        id: 'reg-1', eventId: 'event-1', userId: 'student-1',
        checkInCode: 'test-uuid', checkedIn: true, checkedInAt: new Date(),
        user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu' },
      });

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ checkInCode: 'test-uuid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already checked in');
    });

    it('should reject invalid check-in code', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.getRegistrationByCheckInCode.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ checkInCode: 'nonexistent-code' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Invalid check-in code');
    });

    it('should reject check-in code from different event', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.getRegistrationByCheckInCode.mockResolvedValue({
        id: 'reg-1', eventId: 'event-999', userId: 'student-1',
        checkInCode: 'test-uuid', checkedIn: false,
        user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu' },
      });

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ checkInCode: 'test-uuid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('different event');
    });

    it('should require checkInCode in body', async () => {
      db.getEventById.mockResolvedValue(mockEvent);

      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 404 for nonexistent event', async () => {
      db.getEventById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/events/fake-id/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ checkInCode: 'test-uuid' });

      expect(res.status).toBe(404);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/events/event-1/check-in')
        .send({ checkInCode: 'test-uuid' });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // GET /api/events/:id/check-in-stats
  // ============================================================
  describe('GET /api/events/:id/check-in-stats', () => {
    it('should return stats for admin', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.getEventCheckInStats.mockResolvedValue({ total: 50, checkedIn: 30, pending: 20 });

      const res = await request(app)
        .get('/api/events/event-1/check-in-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 50, checkedIn: 30, pending: 20 });
    });

    it('should return stats for event creator', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.getEventCheckInStats.mockResolvedValue({ total: 50, checkedIn: 30, pending: 20 });

      const res = await request(app)
        .get('/api/events/event-1/check-in-stats')
        .set('Authorization', `Bearer ${stakeholderToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject unauthorized user', async () => {
      db.getEventById.mockResolvedValue({ ...mockEvent, proposerId: 'someone-else' });

      const res = await request(app)
        .get('/api/events/event-1/check-in-stats')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for nonexistent event', async () => {
      db.getEventById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/events/nonexistent/check-in-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // Regression: Existing event endpoints still work
  // ============================================================
  describe('Regression: Existing event endpoints', () => {
    it('GET /api/events should still work', async () => {
      db.getEvents = jest.fn().mockResolvedValue([]);

      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('events');
    });

    it('GET /api/events/:id should still work', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.isUserRegisteredForEvent.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/events/event-1')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Tech Conference 2026');
    });

    it('POST /api/events/:id/register should still work', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.isUserRegisteredForEvent.mockResolvedValue(false);
      db.registerForEvent.mockResolvedValue({
        id: 'reg-new',
        eventId: 'event-1',
        userId: 'student-1',
        checkInCode: 'some-uuid',
        registeredAt: new Date(),
      });
      db.getEventRegistrationCount.mockResolvedValue(11);

      const res = await request(app)
        .post('/api/events/event-1/register')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Registered');
    });

    it('DELETE /api/events/:id/register should still work', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.unregisterFromEvent.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/events/event-1/register')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
    });

    it('GET /api/events/:id/registrations should still work for admin', async () => {
      db.getEventById.mockResolvedValue(mockEvent);
      db.getEventRegistrationsWithUsers.mockResolvedValue([
        {
          id: 'reg-1',
          eventId: 'event-1',
          userId: 'student-1',
          registeredAt: new Date(),
          checkedIn: false,
          user: { id: 'student-1', name: 'Test Student', email: 'student@utm.ac.mu', role: 'student' },
        },
      ]);

      const res = await request(app)
        .get('/api/events/event-1/registrations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
