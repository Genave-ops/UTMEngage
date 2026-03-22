const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

// Mock the email service to avoid needing SMTP in tests
jest.mock('../src/utils/emailService', () => ({
  generateOTP: () => '123456',
  getOTPExpiry: () => new Date(Date.now() + 5 * 60 * 1000),
  sendOTPEmail: jest.fn().mockResolvedValue({ messageId: 'test' })
}));

const TEST_USER = {
  name: 'OTP Test User',
  email: 'otp.test@utm.ac.mu',
  password: 'testpass123',
  role: 'student',
  studentId: 'TEST_OTP_001'
};

beforeAll(async () => {
  try {
    await db.initialize();
    // Clean up any leftover test user
    const existing = await db.getUserByEmail(TEST_USER.email);
    if (existing) await db.deleteUser(existing.id);
  } catch (error) {
    console.error('Setup error:', error.message);
  }
}, 30000);

afterAll(async () => {
  // Clean up test user
  const existing = await db.getUserByEmail(TEST_USER.email);
  if (existing) await db.deleteUser(existing.id);
  // Close DB connection to avoid open handles
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

describe('OTP is only for sign-up, not login', () => {
  describe('Registration (sign-up) should require OTP verification', () => {
    it('should return requiresVerification on successful registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('requiresVerification', true);
      expect(response.body).toHaveProperty('email', TEST_USER.email.toLowerCase());
      expect(response.body.message).toContain('verify');
    });
  });

  describe('Login with unverified user should NOT redirect to OTP', () => {
    it('should return 403 with error message only (no requiresVerification flag)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not verified');
      // These should NOT be present - OTP is only for sign-up
      expect(response.body).not.toHaveProperty('requiresVerification');
      expect(response.body).not.toHaveProperty('email');
    });

    it('should still reject wrong password for unverified user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('OTP verification should work during sign-up flow', () => {
    it('should verify OTP and return token for sign-up', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: TEST_USER.email, otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(TEST_USER.email.toLowerCase());
    });

    it('should allow login after OTP verification during sign-up', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('student');
    });
  });
});
