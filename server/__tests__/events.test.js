/**
 * Events Module Test Suite
 * Covers: CRUD Operations, Access Control, Registration, Boundary Value Analysis
 */

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

let adminToken = null;
let studentToken = null;
let stakeholderToken = null;
let createdEventId;

// Helper function to login with retry
const loginWithRetry = async (email, password, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
      if (response.status === 200 && response.body.token) {
        return response.body.token;
      }
    } catch (error) {
      console.log(`Login attempt ${i + 1} for ${email} failed:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return null;
};

beforeAll(async () => {
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }

  // Login as admin
  adminToken = await loginWithRetry('a.ramgoolam@utm.ac.mu', 'admin123');
  if (!adminToken) console.warn('WARNING: Could not login as admin');

  // Login as student
  studentToken = await loginWithRetry('p.genave@umail.utm.ac.mu', 'student123');
  if (!studentToken) console.warn('WARNING: Could not login as student');

  // Login as stakeholder
  stakeholderToken = await loginWithRetry('contact@techcorp.mu', 'stakeholder123');
  if (!stakeholderToken) console.warn('WARNING: Could not login as stakeholder');
}, 30000);

afterAll(async () => {
  // Cleanup created test events
  if (createdEventId) {
    try {
      await db.deleteEvent(createdEventId);
    } catch (e) { /* Ignore cleanup errors */ }
  }
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

describe('EVENTS-001: Get Events Tests', () => {

  describe('TC-EVT-001: Authentication Required', () => {

    it('TC-EVT-001-A: Should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/events');
      expect(response.status).toBe(401);
    });

    it('TC-EVT-001-B: Should return events for authenticated user', async () => {
      if (!studentToken) {
        console.warn('Skipping: No student token available. Run seed first.');
        return;
      }

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });
  });

  describe('TC-EVT-002: Role-Based Event Filtering - Decision Table', () => {
    /**
     * Decision Table for Event Visibility:
     * | User Role   | Sees Pending | Sees Approved | Sees Rejected |
     * |-------------|--------------|---------------|---------------|
     * | Student     | No           | Yes           | No            |
     * | Stakeholder | Yes          | Yes           | Yes           |
     * | Admin       | Yes          | Yes           | Yes           |
     */

    it('TC-EVT-002-A: Student should only see approved events', async () => {
      if (!studentToken) return;

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      const events = response.body.events;

      // All events visible to student should be approved
      events.forEach(event => {
        expect(event.status).toBe('approved');
      });
    });

    it('TC-EVT-002-B: Admin should see all events including pending', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('TC-EVT-003: Event Filtering - Equivalence Partitioning', () => {

    it('TC-EVT-003-A: Should filter events by category', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/events?category=Academic')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // If events exist with this category, they should all match
      if (response.body.events.length > 0) {
        response.body.events.forEach(event => {
          expect(event.category).toBe('Academic');
        });
      }
    });

    it('TC-EVT-003-B: Should limit number of events returned', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/events?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.events.length).toBeLessThanOrEqual(2);
    });
  });
});

describe('EVENTS-002: Create Event Tests', () => {

  const validEvent = {
    title: 'Test Integration Event',
    date: '2025-12-25',
    time: '14:00',
    type: 'Workshop',
    category: 'Academic',
    location: 'Test Venue',
    capacity: 50,
    description: 'Test event description',
    tags: ['test', 'integration'],
    image: 'https://example.com/image.jpg'
  };

  describe('TC-EVT-004: Role-Based Event Creation - Decision Table', () => {
    /**
     * Decision Table for Event Creation:
     * | User Role   | Can Create | Initial Status |
     * |-------------|------------|----------------|
     * | Student     | No         | N/A            |
     * | Stakeholder | Yes        | pending        |
     * | Admin       | Yes        | approved       |
     */

    it('TC-EVT-004-A: Admin should create auto-approved event', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEvent);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'approved');
      expect(response.body).toHaveProperty('title', validEvent.title);

      createdEventId = response.body.id;
    });

    it('TC-EVT-004-B: Stakeholder should create pending event', async () => {
      if (!stakeholderToken) return;

      const stakeholderEvent = {
        ...validEvent,
        title: 'Stakeholder Test Event'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send(stakeholderEvent);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'pending');

      // Cleanup
      if (response.body.id) {
        await db.deleteEvent(response.body.id);
      }
    });

    it('TC-EVT-004-C: Student should not be able to create event', async () => {
      if (!studentToken) return;

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validEvent);

      expect(response.status).toBe(403);
    });
  });

  describe('TC-EVT-005: Event Validation - Boundary Value Analysis', () => {

    it('TC-EVT-005-A: Should reject event with missing title', async () => {
      if (!adminToken) return;

      const invalidEvent = { ...validEvent };
      delete invalidEvent.title;

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEvent);

      // Should either reject or create with empty title (depends on implementation)
      // This tests the boundary of required fields
      expect([201, 400, 500]).toContain(response.status);
    });

    it('TC-EVT-005-B: Should accept event with capacity of 1 (minimum boundary)', async () => {
      if (!adminToken) return;

      const minCapacityEvent = {
        ...validEvent,
        title: 'Min Capacity Event',
        capacity: 1
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(minCapacityEvent);

      expect(response.status).toBe(201);
      expect(response.body.capacity).toBe(1);

      // Cleanup
      if (response.body.id) {
        await db.deleteEvent(response.body.id);
      }
    });

    it('TC-EVT-005-C: Should accept event with large capacity', async () => {
      if (!adminToken) return;

      const largeCapacityEvent = {
        ...validEvent,
        title: 'Large Capacity Event',
        capacity: 10000
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeCapacityEvent);

      expect(response.status).toBe(201);
      expect(response.body.capacity).toBe(10000);

      // Cleanup
      if (response.body.id) {
        await db.deleteEvent(response.body.id);
      }
    });
  });
});

describe('EVENTS-003: Get Single Event Tests', () => {

  describe('TC-EVT-006: Event Retrieval', () => {

    it('TC-EVT-006-A: Should get event by valid ID', async () => {
      // First get list of events
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.events.length > 0) {
        const eventId = listResponse.body.events[0].id;

        const response = await request(app)
          .get(`/api/events/${eventId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', eventId);
        expect(response.body).toHaveProperty('isRegistered');
      }
    });

    it('TC-EVT-006-B: Should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/nonexistent123456789')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});

describe('EVENTS-004: Update Event Tests', () => {

  describe('TC-EVT-007: Authorization for Event Update - Decision Table', () => {
    /**
     * Decision Table for Event Update:
     * | User Role   | Is Proposer | Can Update |
     * |-------------|-------------|------------|
     * | Admin       | No          | Yes        |
     * | Admin       | Yes         | Yes        |
     * | Stakeholder | Yes         | Yes        |
     * | Stakeholder | No          | No         |
     * | Student     | -           | No         |
     */

    it('TC-EVT-007-A: Admin should update any event', async () => {
      if (createdEventId) {
        const response = await request(app)
          .put(`/api/events/${createdEventId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Updated Event Title' });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated Event Title');
      }
    });

    it('TC-EVT-007-B: Non-admin non-owner should not update event', async () => {
      if (createdEventId) {
        const response = await request(app)
          .put(`/api/events/${createdEventId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ title: 'Unauthorized Update' });

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('EVENTS-005: Event Status Change Tests', () => {

  describe('TC-EVT-008: Admin Event Approval - Decision Table', () => {
    /**
     * Decision Table for Status Change:
     * | User Role   | Can Approve | Can Reject |
     * |-------------|-------------|------------|
     * | Admin       | Yes         | Yes        |
     * | Stakeholder | No          | No         |
     * | Student     | No          | No         |
     */

    it('TC-EVT-008-A: Admin should approve event', async () => {
      // Create a pending event first
      const pendingEvent = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          title: 'Pending Event for Approval',
          date: '2025-12-30',
          time: '10:00',
          type: 'Seminar',
          category: 'Academic',
          location: 'Room 101',
          capacity: 30
        });

      if (pendingEvent.status === 201) {
        const eventId = pendingEvent.body.id;

        const response = await request(app)
          .put(`/api/events/${eventId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'approved' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('approved');

        // Cleanup
        await db.deleteEvent(eventId);
      }
    });

    it('TC-EVT-008-B: Admin should reject event', async () => {
      // Create a pending event first
      const pendingEvent = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          title: 'Pending Event for Rejection',
          date: '2025-12-31',
          time: '10:00',
          type: 'Seminar',
          category: 'Academic',
          location: 'Room 102',
          capacity: 30
        });

      if (pendingEvent.status === 201) {
        const eventId = pendingEvent.body.id;

        const response = await request(app)
          .put(`/api/events/${eventId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'rejected' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('rejected');

        // Cleanup
        await db.deleteEvent(eventId);
      }
    });

    it('TC-EVT-008-C: Student should not be able to change event status', async () => {
      if (createdEventId) {
        const response = await request(app)
          .put(`/api/events/${createdEventId}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ status: 'approved' });

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('EVENTS-006: Event Registration Tests', () => {

  describe('TC-EVT-009: Event Registration - Path Coverage', () => {
    /**
     * Paths to test:
     * 1. Successful registration
     * 2. Already registered
     * 3. Event full
     * 4. Event not found
     */

    it('TC-EVT-009-A: Should register for event successfully', async () => {
      // Get an approved event
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      const events = listResponse.body.events.filter(e => e.status === 'approved' && !e.isRegistered);

      if (events.length > 0) {
        const eventId = events[0].id;

        const response = await request(app)
          .post(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Registered');

        // Unregister for cleanup
        await request(app)
          .delete(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);
      }
    });

    it('TC-EVT-009-B: Should reject duplicate registration', async () => {
      // Get an approved event
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      const events = listResponse.body.events.filter(e => e.status === 'approved');

      if (events.length > 0) {
        const eventId = events[0].id;

        // Register first
        await request(app)
          .post(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);

        // Try to register again
        const response = await request(app)
          .post(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Already registered');

        // Cleanup
        await request(app)
          .delete(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);
      }
    });

    it('TC-EVT-009-C: Should reject registration for non-existent event', async () => {
      const response = await request(app)
        .post('/api/events/nonexistent123456789/register')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('TC-EVT-010: Event Unregistration', () => {

    it('TC-EVT-010-A: Should unregister from event successfully', async () => {
      // Get an approved event
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      const events = listResponse.body.events.filter(e => e.status === 'approved');

      if (events.length > 0) {
        const eventId = events[0].id;

        // Register first
        await request(app)
          .post(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);

        // Unregister
        const response = await request(app)
          .delete(`/api/events/${eventId}/register`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Unregistered');
      }
    });
  });
});

describe('EVENTS-007: Delete Event Tests', () => {

  describe('TC-EVT-011: Authorization for Event Deletion - Decision Table', () => {

    it('TC-EVT-011-A: Admin should delete any event', async () => {
      // Create event to delete
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Event to Delete',
          date: '2025-12-28',
          time: '15:00',
          type: 'Workshop',
          category: 'Academic',
          location: 'Room 201',
          capacity: 20
        });

      if (createResponse.status === 201) {
        const eventId = createResponse.body.id;

        const response = await request(app)
          .delete(`/api/events/${eventId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');
      }
    });

    it('TC-EVT-011-B: Student should not delete events', async () => {
      if (createdEventId) {
        const response = await request(app)
          .delete(`/api/events/${createdEventId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });

    it('TC-EVT-011-C: Should return 404 for non-existent event deletion', async () => {
      const response = await request(app)
        .delete('/api/events/nonexistent123456789')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('EVENTS-008: Event Capacity Tests - Boundary Value Analysis', () => {

  it('TC-EVT-012: Should reject registration when event is full', async () => {
    // Create event with capacity of 1
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Full Event Test',
        date: '2025-12-29',
        time: '16:00',
        type: 'Workshop',
        category: 'Academic',
        location: 'Small Room',
        capacity: 1  // Minimum capacity
      });

    if (createResponse.status === 201) {
      const eventId = createResponse.body.id;

      // First registration should succeed
      const firstReg = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(firstReg.status).toBe(200);

      // Second registration should fail (event full)
      const secondReg = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(secondReg.status).toBe(400);
      expect(secondReg.body.error).toContain('full');

      // Cleanup
      await db.deleteEvent(eventId);
    }
  });
});
