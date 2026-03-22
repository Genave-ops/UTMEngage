/**
 * Users Module Test Suite
 * Covers: User Management, Profile Updates, Ban/Unban, Role-Based Access
 */

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

let adminToken, studentToken, stakeholderToken;
let testUserId;

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
  testUserId = studentResponse.body.user.id;

  // Login as stakeholder
  const stakeholderResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'contact@techcorp.mu', password: 'stakeholder123' });
  stakeholderToken = stakeholderResponse.body.token;
});

afterAll(async () => {
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

describe('USERS-001: Get All Users Tests', () => {

  describe('TC-USR-001: Role-Based Access - Decision Table', () => {
    /**
     * Decision Table for Getting All Users:
     * | User Role   | Can Get All Users |
     * |-------------|-------------------|
     * | Admin       | Yes               |
     * | Stakeholder | No                |
     * | Student     | No                |
     */

    it('TC-USR-001-A: Admin should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should not include passwords
      response.body.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('TC-USR-001-B: Student should not get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    it('TC-USR-001-C: Stakeholder should not get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${stakeholderToken}`);

      expect(response.status).toBe(403);
    });

    it('TC-USR-001-D: Unauthenticated should not access', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
    });
  });
});

describe('USERS-002: Get User by ID Tests', () => {

  describe('TC-USR-002: User Retrieval', () => {

    it('TC-USR-002-A: Should get user by valid ID', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).not.toHaveProperty('password');
    });

    it('TC-USR-002-B: Should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/NONEXISTENT123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});

describe('USERS-003: Update User Profile Tests', () => {

  describe('TC-USR-003: Self Profile Update', () => {

    it('TC-USR-003-A: User should update own profile', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ bio: 'Updated bio for testing' });

      expect(response.status).toBe(200);
      expect(response.body.bio).toBe('Updated bio for testing');
    });

    it('TC-USR-003-B: User should update phone number', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ phone: '+230 5123 4567' });

      expect(response.status).toBe(200);
      expect(response.body.phone).toBe('+230 5123 4567');
    });

    it('TC-USR-003-C: User should NOT be able to change own role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ role: 'admin' });  // Trying to escalate privileges

      expect(response.status).toBe(200);
      // Role should remain unchanged
      expect(response.body.role).toBe('student');
    });

    it('TC-USR-003-D: User should NOT be able to change own status', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'admin' });  // Trying to change status

      expect(response.status).toBe(200);
      // Status should remain unchanged
      expect(response.body.status).toBe('active');
    });
  });

  describe('TC-USR-004: Admin Profile Update - Decision Table', () => {
    /**
     * Decision Table for Profile Update Authorization:
     * | User Role | Is Owner | Can Update | Can Change Role/Status |
     * |-----------|----------|------------|------------------------|
     * | Admin     | Yes      | Yes        | Yes                    |
     * | Admin     | No       | Yes        | Yes                    |
     * | Student   | Yes      | Yes        | No                     |
     * | Student   | No       | No         | No                     |
     */

    it('TC-USR-004-A: Admin should update any user', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bio: 'Admin updated this bio' });

      expect(response.status).toBe(200);
      expect(response.body.bio).toBe('Admin updated this bio');
    });

    it('TC-USR-004-B: Non-owner student should not update other user', async () => {
      // Get stakeholder's ID
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const stakeholder = usersResponse.body.find(u => u.role === 'stakeholder');

      if (stakeholder) {
        const response = await request(app)
          .put(`/api/users/${stakeholder.id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ bio: 'Trying to update another user' });

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('USERS-004: Ban User Tests', () => {

  describe('TC-USR-005: Ban User - Decision Table', () => {
    /**
     * Decision Table for Banning Users:
     * | User Role | Can Ban |
     * |-----------|---------|
     * | Admin     | Yes     |
     * | Student   | No      |
     * | Stakeholder | No    |
     */

    let testBanUserId;

    beforeAll(async () => {
      // Create a user to ban for testing
      jest.mock('../src/utils/emailService', () => ({
        generateOTP: () => '123456',
        getOTPExpiry: () => new Date(Date.now() + 5 * 60 * 1000),
        sendOTPEmail: jest.fn().mockResolvedValue({ messageId: 'test' })
      }));

      // Get an existing user that's not the admin
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const regularUser = usersResponse.body.find(u =>
        u.role === 'student' && u.status === 'active' && u.email !== 'p.genave@umail.utm.ac.mu'
      );

      if (regularUser) {
        testBanUserId = regularUser.id;
      }
    });

    it('TC-USR-005-A: Admin should ban user', async () => {
      if (testBanUserId) {
        const response = await request(app)
          .put(`/api/users/${testBanUserId}/ban`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('banned');

        // Unban for cleanup
        await request(app)
          .put(`/api/users/${testBanUserId}/unban`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    it('TC-USR-005-B: Student should not ban users', async () => {
      if (testBanUserId) {
        const response = await request(app)
          .put(`/api/users/${testBanUserId}/ban`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });

    it('TC-USR-005-C: Should return 404 for banning non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/NONEXISTENT123/ban')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('USERS-005: Unban User Tests', () => {

  describe('TC-USR-006: Unban User - Decision Table', () => {

    it('TC-USR-006-A: Admin should unban user', async () => {
      // Get a user to ban then unban
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const regularUser = usersResponse.body.find(u =>
        u.role === 'student' && u.email !== 'p.genave@umail.utm.ac.mu'
      );

      if (regularUser) {
        // Ban first
        await request(app)
          .put(`/api/users/${regularUser.id}/ban`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Unban
        const response = await request(app)
          .put(`/api/users/${regularUser.id}/unban`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('active');
      }
    });

    it('TC-USR-006-B: Student should not unban users', async () => {
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const bannedUser = usersResponse.body.find(u => u.status === 'banned');

      if (bannedUser) {
        const response = await request(app)
          .put(`/api/users/${bannedUser.id}/unban`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('USERS-006: Delete User Tests', () => {

  describe('TC-USR-007: Delete User - Decision Table', () => {
    /**
     * Decision Table for Deleting Users:
     * | User Role | Can Delete |
     * |-----------|------------|
     * | Admin     | Yes        |
     * | Student   | No         |
     */

    it('TC-USR-007-A: Student should not delete users', async () => {
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const anotherUser = usersResponse.body.find(u => u.id !== testUserId);

      if (anotherUser) {
        const response = await request(app)
          .delete(`/api/users/${anotherUser.id}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });

    it('TC-USR-007-B: Should return 404 for deleting non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/NONEXISTENT123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('USERS-007: Banned User Login Test', () => {

  it('TC-USR-008: Banned user should not be able to login', async () => {
    // Get a user to ban
    const usersResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    const regularUser = usersResponse.body.find(u =>
      u.role === 'student' && u.email !== 'p.genave@umail.utm.ac.mu'
    );

    if (regularUser) {
      // Ban the user
      await request(app)
        .put(`/api/users/${regularUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to login as banned user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: regularUser.email, password: 'student123' });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.error).toContain('suspended');

      // Unban for cleanup
      await request(app)
        .put(`/api/users/${regularUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});
