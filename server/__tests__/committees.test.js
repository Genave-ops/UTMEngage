/**
 * Committees Module Test Suite
 * Covers: CRUD Operations, Membership, Join Requests, Meetings
 */

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

let adminToken, studentToken, stakeholderToken;
let createdCommitteeId;

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

  // Login as stakeholder
  const stakeholderResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'contact@techcorp.mu', password: 'stakeholder123' });
  stakeholderToken = stakeholderResponse.body.token;
});

afterAll(async () => {
  if (createdCommitteeId) {
    try {
      await db.deleteCommittee(createdCommitteeId);
    } catch (e) { /* Ignore cleanup errors */ }
  }
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

describe('COMMITTEES-001: Get Committees Tests', () => {

  describe('TC-COM-001: Authentication Required', () => {

    it('TC-COM-001-A: Should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/committees');
      expect(response.status).toBe(401);
    });

    it('TC-COM-001-B: Should return committees for authenticated user', async () => {
      const response = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('TC-COM-002: Role-Based Committee Filtering - Decision Table', () => {
    /**
     * Decision Table for Committee Visibility:
     * | User Role   | Sees Pending | Sees Active |
     * |-------------|--------------|-------------|
     * | Student     | No           | Yes         |
     * | Stakeholder | Yes          | Yes         |
     * | Admin       | Yes          | Yes         |
     */

    it('TC-COM-002-A: Student should only see active/approved committees', async () => {
      const response = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      response.body.forEach(committee => {
        expect(['active', 'approved']).toContain(committee.status);
      });
    });

    it('TC-COM-002-B: Admin should see all committees', async () => {
      const response = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('COMMITTEES-002: Create Committee Tests', () => {

  const validCommittee = {
    name: 'Test Committee',
    description: 'A committee for testing purposes',
    category: 'Academic',
    banner: 'bg-blue-600'
  };

  describe('TC-COM-003: Role-Based Committee Creation - Decision Table', () => {
    /**
     * Decision Table for Committee Creation:
     * | User Role   | Can Create | Initial Status |
     * |-------------|------------|----------------|
     * | Student     | No         | N/A            |
     * | Stakeholder | Yes        | pending        |
     * | Admin       | Yes        | active         |
     */

    it('TC-COM-003-A: Admin should create active committee', async () => {
      const response = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCommittee);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'active');

      createdCommitteeId = response.body.id;
    });

    it('TC-COM-003-B: Stakeholder should create pending committee', async () => {
      const stakeholderCommittee = {
        ...validCommittee,
        name: 'Stakeholder Committee'
      };

      const response = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send(stakeholderCommittee);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'pending');

      // Cleanup
      if (response.body.id) {
        await db.deleteCommittee(response.body.id);
      }
    });

    it('TC-COM-003-C: Student should not create committee', async () => {
      const response = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validCommittee);

      expect(response.status).toBe(403);
    });
  });
});

describe('COMMITTEES-003: Get Single Committee Tests', () => {

  describe('TC-COM-004: Committee Retrieval', () => {

    it('TC-COM-004-A: Should get committee by valid ID', async () => {
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.length > 0) {
        const committeeId = listResponse.body[0].id;

        const response = await request(app)
          .get(`/api/committees/${committeeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', committeeId);
      }
    });

    it('TC-COM-004-B: Should return 404 for non-existent committee', async () => {
      const response = await request(app)
        .get('/api/committees/nonexistent123456789')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('TC-COM-004-C: Non-member should get restricted access', async () => {
      if (createdCommitteeId) {
        const response = await request(app)
          .get(`/api/committees/${createdCommitteeId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        // Non-member should get restricted access flag
        expect(response.body).toHaveProperty('restrictedAccess');
      }
    });
  });
});

describe('COMMITTEES-004: Committee Membership Tests', () => {

  describe('TC-COM-005: Join Committee - Path Coverage', () => {
    /**
     * Paths to test:
     * 1. Successful join
     * 2. Already a member
     * 3. Committee not found
     */

    it('TC-COM-005-A: Should join committee successfully', async () => {
      // Get a committee where student is not a member
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      const committees = listResponse.body.filter(c => !c.isMember && c.status === 'active');

      if (committees.length > 0) {
        const committeeId = committees[0].id;

        const response = await request(app)
          .post(`/api/committees/${committeeId}/join`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Joined');

        // Leave for cleanup
        await request(app)
          .delete(`/api/committees/${committeeId}/leave`)
          .set('Authorization', `Bearer ${studentToken}`);
      }
    });

    it('TC-COM-005-B: Should reject joining committee already a member of', async () => {
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      const committees = listResponse.body.filter(c => c.isMember);

      if (committees.length > 0) {
        const committeeId = committees[0].id;

        const response = await request(app)
          .post(`/api/committees/${committeeId}/join`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Already');
      }
    });

    it('TC-COM-005-C: Should return 404 for non-existent committee', async () => {
      const response = await request(app)
        .post('/api/committees/nonexistent123456789/join')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('TC-COM-006: Leave Committee', () => {

    it('TC-COM-006-A: Should leave committee successfully', async () => {
      // Join a committee first, then leave
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      const committees = listResponse.body.filter(c => !c.isMember && c.status === 'active');

      if (committees.length > 0) {
        const committeeId = committees[0].id;

        // Join first
        await request(app)
          .post(`/api/committees/${committeeId}/join`)
          .set('Authorization', `Bearer ${studentToken}`);

        // Leave
        const response = await request(app)
          .delete(`/api/committees/${committeeId}/leave`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Left');
      }
    });
  });
});

describe('COMMITTEES-005: Committee Status Change Tests', () => {

  describe('TC-COM-007: Admin Committee Approval - Decision Table', () => {
    /**
     * Decision Table for Status Change:
     * | User Role   | Can Approve | Can Reject |
     * |-------------|-------------|------------|
     * | Admin       | Yes         | Yes        |
     * | Stakeholder | No          | No         |
     * | Student     | No          | No         |
     */

    it('TC-COM-007-A: Admin should approve committee', async () => {
      // Create pending committee
      const createResponse = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          name: 'Committee for Approval Test',
          description: 'Testing approval',
          category: 'Academic'
        });

      if (createResponse.status === 201) {
        const committeeId = createResponse.body.id;

        const response = await request(app)
          .put(`/api/committees/${committeeId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'active' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('active');

        // Cleanup
        await db.deleteCommittee(committeeId);
      }
    });

    it('TC-COM-007-B: Student should not change committee status', async () => {
      if (createdCommitteeId) {
        const response = await request(app)
          .put(`/api/committees/${createdCommitteeId}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ status: 'rejected' });

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('COMMITTEES-006: Update Committee Tests', () => {

  describe('TC-COM-008: Authorization for Committee Update', () => {

    it('TC-COM-008-A: Admin should update any committee', async () => {
      if (createdCommitteeId) {
        const response = await request(app)
          .put(`/api/committees/${createdCommitteeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ description: 'Updated description' });

        expect(response.status).toBe(200);
        expect(response.body.description).toBe('Updated description');
      }
    });

    it('TC-COM-008-B: Non-creator non-admin should not update', async () => {
      if (createdCommitteeId) {
        const response = await request(app)
          .put(`/api/committees/${createdCommitteeId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ description: 'Unauthorized update' });

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('COMMITTEES-007: Delete Committee Tests', () => {

  describe('TC-COM-009: Authorization for Committee Deletion', () => {

    it('TC-COM-009-A: Admin should delete committee', async () => {
      // Create committee to delete
      const createResponse = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Committee to Delete',
          description: 'Will be deleted',
          category: 'Academic'
        });

      if (createResponse.status === 201) {
        const committeeId = createResponse.body.id;

        const response = await request(app)
          .delete(`/api/committees/${committeeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');
      }
    });

    it('TC-COM-009-B: Student should not delete committee', async () => {
      if (createdCommitteeId) {
        const response = await request(app)
          .delete(`/api/committees/${createdCommitteeId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('COMMITTEES-008: Committee Posts Tests', () => {

  describe('TC-COM-010: Post Access - Membership Required', () => {

    it('TC-COM-010-A: Member should access posts', async () => {
      // Get a committee where user is a member
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      const memberCommittees = listResponse.body.filter(c => c.isMember);

      if (memberCommittees.length > 0) {
        const committeeId = memberCommittees[0].id;

        const response = await request(app)
          .get(`/api/committees/${committeeId}/posts`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('TC-COM-010-B: Non-member should not access posts', async () => {
      // Get a committee where user is NOT a member
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      const nonMemberCommittees = listResponse.body.filter(c => !c.isMember);

      if (nonMemberCommittees.length > 0) {
        const committeeId = nonMemberCommittees[0].id;

        const response = await request(app)
          .get(`/api/committees/${committeeId}/posts`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(403);
      }
    });
  });
});

describe('COMMITTEES-009: Committee Meetings Tests', () => {

  describe('TC-COM-011: Schedule Meeting', () => {

    it('TC-COM-011-A: Member should schedule in-person meeting', async () => {
      // Get a committee where user is a member (admin is member of their committees)
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.length > 0) {
        // Admin created committee, so admin is member
        const committeeId = createdCommitteeId || listResponse.body[0].id;

        const response = await request(app)
          .post(`/api/committees/${committeeId}/meetings`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Test Meeting',
            description: 'Test meeting description',
            date: '2025-12-30',
            time: '14:00',
            endTime: '15:00',
            location: 'Conference Room A',
            meetingType: 'in-person'
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('meetingType', 'in-person');
      }
    });

    it('TC-COM-011-B: Online meeting without Google auth should fail', async () => {
      if (createdCommitteeId) {
        const response = await request(app)
          .post(`/api/committees/${createdCommitteeId}/meetings`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Online Meeting',
            date: '2025-12-31',
            time: '10:00',
            meetingType: 'online'
          });

        // Should either fail with requiresGoogleAuth or succeed if Google is connected
        expect([201, 400]).toContain(response.status);

        if (response.status === 400) {
          expect(response.body).toHaveProperty('requiresGoogleAuth', true);
        }
      }
    });
  });
});

describe('COMMITTEES-010: Join Request Tests', () => {

  describe('TC-COM-012: Join Request Flow', () => {

    it('TC-COM-012-A: Should create join request', async () => {
      // Get a committee where user is NOT a member
      const listResponse = await request(app)
        .get('/api/committees')
        .set('Authorization', `Bearer ${studentToken}`);

      const nonMemberCommittees = listResponse.body.filter(c => !c.isMember && c.status === 'active');

      if (nonMemberCommittees.length > 0) {
        const committeeId = nonMemberCommittees[0].id;

        const response = await request(app)
          .post(`/api/committees/${committeeId}/request-join`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect([200, 201, 400]).toContain(response.status);
        // 400 if already has pending request
      }
    });
  });
});
