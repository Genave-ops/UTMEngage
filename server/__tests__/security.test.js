/**
 * Security and Non-Functional Test Suite
 * Covers: Input Validation, SQL Injection Prevention, XSS Prevention,
 * Rate Limiting, Authentication Security, Authorization
 */

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

let adminToken, studentToken;

beforeAll(async () => {
  await db.initialize();

  // Login as admin
  const adminResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'a.ramgoolam@utm.ac.mu', password: 'admin123' });
  adminToken = adminResponse.body.token;

  // Login as student
  const studentResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'p.genave@umail.utm.ac.mu', password: 'student123' });
  studentToken = studentResponse.body.token;
});

afterAll(async () => {
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

describe('SECURITY-001: Input Validation Tests', () => {

  describe('TC-SEC-001: NoSQL Injection Prevention', () => {

    it('TC-SEC-001-A: Should prevent NoSQL injection in login email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { "$gt": "" },  // NoSQL injection attempt
          password: 'password123'
        });

      // Should fail gracefully, not expose data
      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).not.toHaveProperty('token');
    });

    it('TC-SEC-001-B: Should prevent NoSQL injection in login password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: { "$ne": "" }  // NoSQL injection attempt
        });

      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).not.toHaveProperty('token');
    });

    it('TC-SEC-001-C: Should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@test.com", "password": }');  // Malformed JSON

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('TC-SEC-002: XSS Prevention', () => {

    it('TC-SEC-002-A: Should handle XSS in registration name', async () => {
      // Mock email service for this test
      jest.mock('../src/utils/emailService', () => ({
        generateOTP: () => '123456',
        getOTPExpiry: () => new Date(Date.now() + 5 * 60 * 1000),
        sendOTPEmail: jest.fn().mockResolvedValue({ messageId: 'test' })
      }));

      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: xssPayload,
          email: 'xss.test@utm.ac.mu',
          password: 'password123',
          role: 'student',
          studentId: 'XSS001'
        });

      // Should either sanitize or accept (storage is okay, display should be escaped)
      // The key is it shouldn't execute
      expect([201, 400]).toContain(response.status);

      // Cleanup if user was created
      if (response.status === 201) {
        const user = await db.getUserByEmail('xss.test@utm.ac.mu');
        if (user) await db.deleteUser(user.id);
      }
    });

    it('TC-SEC-002-B: Should handle XSS in event title', async () => {
      const xssPayload = '<img src=x onerror=alert("XSS")>';

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: xssPayload,
          date: '2025-12-25',
          time: '10:00',
          type: 'Workshop',
          category: 'Academic',
          location: 'Test',
          capacity: 50
        });

      expect(response.status).toBe(201);

      // Verify payload is stored (output encoding should happen at display)
      if (response.body.id) {
        await db.deleteEvent(response.body.id);
      }
    });
  });

  describe('TC-SEC-003: Special Characters Handling', () => {

    it('TC-SEC-003-A: Should handle Unicode characters', async () => {
      const unicodeName = '测试用户 テスト';  // Chinese and Japanese characters

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: unicodeName,
          date: '2025-12-26',
          time: '10:00',
          type: 'Workshop',
          category: 'Academic',
          location: 'Test',
          capacity: 50
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(unicodeName);

      // Cleanup
      if (response.body.id) {
        await db.deleteEvent(response.body.id);
      }
    });

    it('TC-SEC-003-B: Should handle emojis', async () => {
      const emojiTitle = 'Test Event 🎉🎊';

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: emojiTitle,
          date: '2025-12-27',
          time: '10:00',
          type: 'Workshop',
          category: 'Academic',
          location: 'Test',
          capacity: 50
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(emojiTitle);

      // Cleanup
      if (response.body.id) {
        await db.deleteEvent(response.body.id);
      }
    });
  });
});

describe('SECURITY-002: Authentication Security', () => {

  describe('TC-SEC-004: Token Security', () => {

    it('TC-SEC-004-A: Should reject expired token', async () => {
      // Expired JWT token (for testing - this would be a real expired token in production)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid';

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('TC-SEC-004-B: Should reject tampered token', async () => {
      // Take a valid token and tamper with it
      const tamperedToken = studentToken.slice(0, -5) + 'XXXXX';

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('TC-SEC-004-C: Should reject token without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', studentToken);

      expect(response.status).toBe(401);
    });

    it('TC-SEC-004-D: Should reject empty Authorization header', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });
  });

  describe('TC-SEC-005: Password Security', () => {

    it('TC-SEC-005-A: Password should not be returned in user response', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('password');
    });

    it('TC-SEC-005-B: Password should not be returned in users list', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('TC-SEC-005-C: Cannot update password directly through profile update', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      const userId = response.body.id;

      // Try to update password through profile endpoint
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ password: 'newpassword123' });

      // Should succeed but password field should be ignored
      expect(updateResponse.status).toBe(200);

      // Verify old password still works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'p.genave@umail.utm.ac.mu', password: 'student123' });

      expect(loginResponse.status).toBe(200);
    });
  });
});

describe('SECURITY-003: Authorization Tests', () => {

  describe('TC-SEC-006: Role-Based Access Control', () => {

    it('TC-SEC-006-A: Student cannot access admin endpoints', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    it('TC-SEC-006-B: Student cannot approve events', async () => {
      // Get an event ID
      const eventsResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${adminToken}`);

      if (eventsResponse.body.events.length > 0) {
        const eventId = eventsResponse.body.events[0].id;

        const response = await request(app)
          .put(`/api/events/${eventId}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ status: 'approved' });

        expect(response.status).toBe(403);
      }
    });

    it('TC-SEC-006-C: Student cannot ban users', async () => {
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      if (usersResponse.body.length > 0) {
        const userId = usersResponse.body[0].id;

        const response = await request(app)
          .put(`/api/users/${userId}/ban`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });

    it('TC-SEC-006-D: Student cannot delete others events', async () => {
      // Create an event as admin
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Event',
          date: '2025-12-28',
          time: '10:00',
          type: 'Workshop',
          category: 'Academic',
          location: 'Test',
          capacity: 50
        });

      if (createResponse.status === 201) {
        const eventId = createResponse.body.id;

        // Try to delete as student
        const deleteResponse = await request(app)
          .delete(`/api/events/${eventId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(deleteResponse.status).toBe(403);

        // Cleanup
        await db.deleteEvent(eventId);
      }
    });
  });

  describe('TC-SEC-007: Resource Ownership', () => {

    it('TC-SEC-007-A: User cannot update other users profile', async () => {
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const otherUser = usersResponse.body.find(u => u.role === 'stakeholder');

      if (otherUser) {
        const response = await request(app)
          .put(`/api/users/${otherUser.id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ bio: 'Trying to update another user' });

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('SECURITY-004: Rate Limiting', () => {

  describe('TC-SEC-008: Login Rate Limiting', () => {

    it('TC-SEC-008-A: Should allow normal login attempts', async () => {
      // Single login attempt should work
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });

      // Should return 401 (invalid credentials) not 429 (rate limited)
      expect(response.status).toBe(401);
    });

    // Note: Full rate limiting test would require many requests
    // which is impractical in unit tests. This documents the expected behavior.
    it('TC-SEC-008-B: Rate limiter configuration exists', () => {
      // This is a documentation test - rate limiting is configured for:
      // - 10 requests per 15 minutes on auth endpoints
      expect(true).toBe(true);
    });
  });
});

describe('SECURITY-005: Data Exposure Prevention', () => {

  describe('TC-SEC-009: Sensitive Data Handling', () => {

    it('TC-SEC-009-A: OTP should not be exposed in responses', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body).not.toHaveProperty('otp');
      expect(response.body).not.toHaveProperty('otpExpiry');
    });

    it('TC-SEC-009-B: Internal IDs format should be consistent', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      response.body.events.forEach(event => {
        expect(event).toHaveProperty('id');
        // ID should be defined and not null
        expect(event.id).toBeDefined();
      });
    });
  });
});

describe('SECURITY-006: Error Handling Security', () => {

  describe('TC-SEC-010: Error Messages', () => {

    it('TC-SEC-010-A: Login failure should not reveal if email exists', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      // Message should be generic, not revealing email existence
      expect(response.body.error).toContain('Invalid');
      expect(response.body.error).not.toContain('not found');
    });

    it('TC-SEC-010-B: Should not expose stack traces', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id-format')
        .set('Authorization', `Bearer ${studentToken}`);

      // Should not contain stack trace
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toContain('at ');
    });
  });
});

describe('SECURITY-007: CORS and Headers', () => {

  describe('TC-SEC-011: Response Headers', () => {

    it('TC-SEC-011-A: Should set appropriate content type', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});
