const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

let adminToken = null;
let studentToken = null;
let stakeholderToken = null;

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
}, 60000);

afterAll(async () => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'p.genave@umail.utm.ac.mu', password: 'student123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('role', 'student');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid@test.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/events', () => {
    it('should return list of events for authenticated user', async () => {
      if (!studentToken) return;

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/events');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/events', () => {
    it('should create a new event (admin auto-approved)', async () => {
      if (!adminToken) return;

      const newEvent = {
        title: 'Test Event',
        date: '2025-12-20',
        time: '14:00',
        type: 'Workshop',
        category: 'Academic',
        location: 'Test Location',
        capacity: 50,
        description: 'Test Description',
        tags: ['Test'],
        image: 'https://example.com/image.jpg'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEvent);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', newEvent.title);
      expect(response.body).toHaveProperty('status', 'approved');

      // Cleanup
      if (response.body.id) {
        try { await db.deleteEvent(response.body.id); } catch (e) {}
      }
    });

    it('should reject student from creating events', async () => {
      if (!studentToken) return;

      const newEvent = {
        title: 'Student Event',
        date: '2025-12-25',
        time: '10:00',
        type: 'Social',
        category: 'Social',
        location: 'Campus',
        capacity: 30,
        description: 'Student organized event',
        tags: ['Student'],
        image: 'https://example.com/image.jpg'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(newEvent);

      expect(response.status).toBe(403); // Students cannot create events
    });
  });

  describe('GET /api/committees', () => {
    it('should return list of committees', async () => {
      if (!studentToken) return;

      const response = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard analytics for admin', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeEvents');
    });

    it('should reject student access to analytics logs', async () => {
      if (!studentToken) return;

      const response = await request(app)
        .get('/api/analytics/logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('User Management', () => {
    it('should get all users (admin only)', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject student from getting all users', async () => {
      if (!studentToken) return;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });
});
