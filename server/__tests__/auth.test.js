/**
 * Authentication Module Test Suite
 * Covers: Unit Tests, Integration Tests, Boundary Value Analysis,
 * Equivalence Partitioning, Decision Table Testing
 */

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

// Mock email service
jest.mock('../src/utils/emailService', () => ({
  generateOTP: () => '123456',
  getOTPExpiry: () => new Date(Date.now() + 5 * 60 * 1000),
  sendOTPEmail: jest.fn().mockResolvedValue({ messageId: 'test' })
}));

// Test data constants
const VALID_STUDENT = {
  name: 'Test Student',
  email: 'test.student@utm.ac.mu',
  password: 'password123',
  role: 'student',
  studentId: 'TEST001'
};

const VALID_STAKEHOLDER = {
  name: 'Test Stakeholder',
  email: 'test.stakeholder@company.com',
  password: 'password123',
  role: 'stakeholder',
  organizationName: 'Test Company Ltd'
};

let testUserId;

beforeAll(async () => {
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}, 30000);

afterAll(async () => {
  // Cleanup test users
  const testEmails = [VALID_STUDENT.email, VALID_STAKEHOLDER.email];
  for (const email of testEmails) {
    const user = await db.getUserByEmail(email);
    if (user) await db.deleteUser(user.id);
  }
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

describe('AUTH-001: Registration Tests', () => {

  describe('TC-AUTH-001: Valid Registration - Equivalence Partitioning (Valid Class)', () => {

    it('TC-AUTH-001-A: Should register student with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(VALID_STUDENT);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('requiresVerification', true);
      expect(response.body).toHaveProperty('email', VALID_STUDENT.email.toLowerCase());
      expect(response.body.message).toContain('verify');
    });

    it('TC-AUTH-001-B: Should register stakeholder with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(VALID_STAKEHOLDER);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('requiresVerification', true);
    });
  });

  describe('TC-AUTH-002: Invalid Registration - Equivalence Partitioning (Invalid Class)', () => {

    it('TC-AUTH-002-A: Should reject registration with missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'noname@test.com',
          password: 'password123',
          role: 'student',
          studentId: 'TEST002'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('TC-AUTH-002-B: Should reject registration with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Email User',
          password: 'password123',
          role: 'student',
          studentId: 'TEST003'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('TC-AUTH-002-C: Should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Password User',
          email: 'nopass@test.com',
          role: 'student',
          studentId: 'TEST004'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('TC-AUTH-002-D: Should reject registration with missing role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Role User',
          email: 'norole@test.com',
          password: 'password123',
          studentId: 'TEST005'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('TC-AUTH-002-E: Should reject registration with invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Role User',
          email: 'invalidrole@test.com',
          password: 'password123',
          role: 'superuser'  // Invalid role
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid role');
    });

    it('TC-AUTH-002-F: Should reject admin role registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'password123',
          role: 'admin'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin registration is not allowed');
    });
  });

  describe('TC-AUTH-003: Email Validation - Boundary Value Analysis', () => {

    it('TC-AUTH-003-A: Should reject invalid email format (no @)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email',
          email: 'invalidemail.com',
          password: 'password123',
          role: 'student',
          studentId: 'TEST006'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('TC-AUTH-003-B: Should reject invalid email format (no domain)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email',
          email: 'test@',
          password: 'password123',
          role: 'student',
          studentId: 'TEST007'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('TC-AUTH-003-C: Should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: VALID_STUDENT.email,  // Already registered
          password: 'password123',
          role: 'student',
          studentId: 'TEST008'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('TC-AUTH-004: Password Validation - Boundary Value Analysis', () => {

    it('TC-AUTH-004-A: Should reject password with 5 characters (below minimum)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Password',
          email: 'shortpass@test.com',
          password: '12345',  // 5 characters - below minimum
          role: 'student',
          studentId: 'TEST009'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 6 characters');
    });

    it('TC-AUTH-004-B: Should accept password with exactly 6 characters (minimum boundary)', async () => {
      const testUser = {
        name: 'Min Password',
        email: 'minpass@test.com',
        password: '123456',  // Exactly 6 characters - minimum
        role: 'student',
        studentId: 'TEST010'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);

      // Cleanup
      const user = await db.getUserByEmail(testUser.email);
      if (user) await db.deleteUser(user.id);
    });
  });

  describe('TC-AUTH-005: Student Registration - Decision Table', () => {
    /**
     * Decision Table for Student Registration:
     * | studentId | Result |
     * |-----------|--------|
     * | Provided  | Pass   |
     * | Missing   | Fail   |
     * | Duplicate | Fail   |
     */

    it('TC-AUTH-005-A: Student with missing studentId should fail', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No StudentId',
          email: 'nostudentid@test.com',
          password: 'password123',
          role: 'student'
          // Missing studentId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Student ID is required');
    });
  });

  describe('TC-AUTH-006: Stakeholder Registration - Decision Table', () => {
    /**
     * Decision Table for Stakeholder Registration:
     * | organizationName | Result |
     * |------------------|--------|
     * | Provided         | Pass   |
     * | Missing          | Fail   |
     */

    it('TC-AUTH-006-A: Stakeholder with missing organizationName should fail', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Organization',
          email: 'noorg@test.com',
          password: 'password123',
          role: 'stakeholder'
          // Missing organizationName
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Organization name is required');
    });
  });
});

describe('AUTH-002: OTP Verification Tests', () => {

  describe('TC-AUTH-007: OTP Verification Flow', () => {

    it('TC-AUTH-007-A: Should verify correct OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: VALID_STUDENT.email, otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('TC-AUTH-007-B: Should reject incorrect OTP', async () => {
      // First, re-register to get a new OTP
      const user = await db.getUserByEmail(VALID_STAKEHOLDER.email);
      if (user && !user.isVerified) {
        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({ email: VALID_STAKEHOLDER.email, otp: '000000' });  // Wrong OTP

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid OTP');
      }
    });

    it('TC-AUTH-007-C: Should reject OTP for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'nonexistent@test.com', otp: '123456' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('User not found');
    });

    it('TC-AUTH-007-D: Should reject OTP for already verified user', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: VALID_STUDENT.email, otp: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already verified');
    });
  });
});

describe('AUTH-003: Login Tests', () => {

  describe('TC-AUTH-008: Valid Login - Equivalence Partitioning (Valid Class)', () => {

    it('TC-AUTH-008-A: Should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: VALID_STUDENT.email, password: VALID_STUDENT.password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('role', 'student');
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('TC-AUTH-009: Invalid Login - Equivalence Partitioning (Invalid Class)', () => {

    it('TC-AUTH-009-A: Should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: VALID_STUDENT.email, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('TC-AUTH-009-B: Should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('TC-AUTH-009-C: Should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('TC-AUTH-009-D: Should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: VALID_STUDENT.email });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('TC-AUTH-009-E: Should reject login with empty body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('TC-AUTH-010: Login with Unverified User', () => {

    it('TC-AUTH-010-A: Should reject login for unverified user', async () => {
      // Verify stakeholder is still unverified
      const user = await db.getUserByEmail(VALID_STAKEHOLDER.email);
      if (user && !user.isVerified) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: VALID_STAKEHOLDER.email, password: VALID_STAKEHOLDER.password });

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('not verified');
      }
    });
  });
});

describe('AUTH-004: JWT Token Tests', () => {
  let validToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_STUDENT.email, password: VALID_STUDENT.password });
    validToken = loginResponse.body.token;
  });

  describe('TC-AUTH-011: Token Validation', () => {

    it('TC-AUTH-011-A: Should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', VALID_STUDENT.email.toLowerCase());
    });

    it('TC-AUTH-011-B: Should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token');
    });

    it('TC-AUTH-011-C: Should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('TC-AUTH-011-D: Should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', validToken);  // Missing 'Bearer ' prefix

      expect(response.status).toBe(401);
    });
  });
});

describe('AUTH-005: Password Change Tests', () => {
  let userToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_STUDENT.email, password: VALID_STUDENT.password });
    userToken = loginResponse.body.token;
  });

  describe('TC-AUTH-012: Password Change - Boundary Value Analysis', () => {

    it('TC-AUTH-012-A: Should reject new password with 7 characters (below 8 minimum for change)', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: VALID_STUDENT.password,
          newPassword: '1234567'  // 7 characters - below minimum for password change
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 8 characters');
    });

    it('TC-AUTH-012-B: Should reject if current password is wrong', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('incorrect');
    });

    it('TC-AUTH-012-C: Should reject if new password same as current', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: VALID_STUDENT.password,
          newPassword: VALID_STUDENT.password  // Same as current
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('different');
    });
  });
});
