/**
 * Email Notifications & Committee Invitations Test Suite
 * Covers: Event status emails, Committee rejection emails, Committee invitations
 */

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

// Mock the email service to avoid sending real emails during tests
jest.mock('../src/utils/emailService', () => {
  const original = jest.requireActual('../src/utils/emailService');
  return {
    ...original,
    sendOTPEmail: jest.fn().mockResolvedValue({ messageId: 'mock-otp' }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'mock-reset' }),
    sendCommitteeRejectionEmail: jest.fn().mockResolvedValue({ messageId: 'mock-committee-reject' }),
    sendCommitteeInvitationEmail: jest.fn().mockResolvedValue({ messageId: 'mock-invitation' }),
    sendEventApprovedEmail: jest.fn().mockResolvedValue({ messageId: 'mock-event-approved' }),
    sendEventRejectedEmail: jest.fn().mockResolvedValue({ messageId: 'mock-event-rejected' }),
    sendMeetingScheduledEmail: jest.fn().mockResolvedValue({ messageId: 'mock-meeting' }),
  };
});

const emailService = require('../src/utils/emailService');

let adminToken, stakeholderToken;

beforeAll(async () => {
  await db.initialize();

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'a.ramgoolam@utm.ac.mu', password: 'admin123' });
  adminToken = adminRes.body.token;

  const stakeholderRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'contact@techcorp.mu', password: 'stakeholder123' });
  stakeholderToken = stakeholderRes.body.token;
}, 30000);

afterAll(async () => {
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EMAIL-001: Event Status Email Notifications', () => {

  describe('TC-EMAIL-001: Email sent on event approval', () => {

    it('TC-EMAIL-001-A: Should send approval email when admin approves event', async () => {
      if (!stakeholderToken || !adminToken) return;

      // Create a pending event
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          title: 'Email Test Event Approval',
          date: '2026-12-25',
          time: '10:00',
          type: 'Workshop',
          category: 'Academic',
          location: 'Room 101',
          capacity: 30
        });

      expect(createRes.status).toBe(201);
      const eventId = createRes.body.id;

      // Approve the event
      const approveRes = await request(app)
        .put(`/api/events/${eventId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('approved');

      // Verify email was called
      expect(emailService.sendEventApprovedEmail).toHaveBeenCalled();
      expect(emailService.sendEventApprovedEmail).toHaveBeenCalledWith(
        expect.any(String),           // email
        expect.any(String),           // userName
        'Email Test Event Approval'   // eventTitle
      );

      // Cleanup
      await db.deleteEvent(eventId);
    });
  });

  describe('TC-EMAIL-002: Email sent on event rejection', () => {

    it('TC-EMAIL-002-A: Should send rejection email when admin rejects event', async () => {
      if (!stakeholderToken || !adminToken) return;

      // Create a pending event
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          title: 'Email Test Event Rejection',
          date: '2026-12-26',
          time: '14:00',
          type: 'Seminar',
          category: 'Academic',
          location: 'Room 202',
          capacity: 50
        });

      expect(createRes.status).toBe(201);
      const eventId = createRes.body.id;

      // Reject the event
      const rejectRes = await request(app)
        .put(`/api/events/${eventId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.status).toBe('rejected');

      // Verify rejection email was called
      expect(emailService.sendEventRejectedEmail).toHaveBeenCalled();
      expect(emailService.sendEventRejectedEmail).toHaveBeenCalledWith(
        expect.any(String),            // email
        expect.any(String),            // userName
        'Email Test Event Rejection'   // eventTitle
      );

      // Verify approval email was NOT called
      expect(emailService.sendEventApprovedEmail).not.toHaveBeenCalled();

      // Cleanup
      await db.deleteEvent(eventId);
    });
  });
});

describe('EMAIL-002: Committee Rejection Email Notifications', () => {

  describe('TC-EMAIL-003: Email sent on committee rejection', () => {

    it('TC-EMAIL-003-A: Should send rejection email when admin rejects committee', async () => {
      if (!stakeholderToken || !adminToken) return;

      // Create a pending committee
      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          name: 'Email Test Committee Rejection',
          description: 'Testing rejection email'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.status).toBe('pending');
      const committeeId = createRes.body.id;

      // Reject the committee
      const rejectRes = await request(app)
        .put(`/api/committees/${committeeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' });

      expect(rejectRes.status).toBe(200);

      // Verify rejection email was called
      expect(emailService.sendCommitteeRejectionEmail).toHaveBeenCalled();
      expect(emailService.sendCommitteeRejectionEmail).toHaveBeenCalledWith(
        expect.any(String),                     // email
        expect.any(String),                     // userName
        'Email Test Committee Rejection'        // committeeName
      );

      // Cleanup
      await db.deleteCommittee(committeeId);
    });
  });

  describe('TC-EMAIL-004: No email on committee approval', () => {

    it('TC-EMAIL-004-A: Should NOT send rejection email when committee is approved', async () => {
      if (!stakeholderToken || !adminToken) return;

      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .send({
          name: 'Email Test Committee Approval',
          description: 'Testing approval - no rejection email'
        });

      expect(createRes.status).toBe(201);
      const committeeId = createRes.body.id;

      // Approve the committee
      await request(app)
        .put(`/api/committees/${committeeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      // Rejection email should NOT be called
      expect(emailService.sendCommitteeRejectionEmail).not.toHaveBeenCalled();

      // Cleanup
      await db.deleteCommittee(committeeId);
    });
  });
});

describe('EMAIL-003: Committee Invitation System', () => {

  describe('TC-EMAIL-005: Invitations sent during committee creation', () => {

    it('TC-EMAIL-005-A: Should send invitation emails when inviteEmails provided', async () => {
      if (!adminToken) return;

      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invitation Test Committee',
          description: 'Testing invitations',
          inviteEmails: ['testinvite1@example.com', 'testinvite2@example.com']
        });

      expect(createRes.status).toBe(201);
      const committeeId = createRes.body.id;

      // Verify invitation emails were sent
      expect(emailService.sendCommitteeInvitationEmail).toHaveBeenCalledTimes(2);
      expect(emailService.sendCommitteeInvitationEmail).toHaveBeenCalledWith(
        'testinvite1@example.com',
        expect.any(String),               // inviterName
        'Invitation Test Committee',      // committeeName
        expect.stringContaining('/accept'),  // acceptUrl
        expect.stringContaining('/decline')  // declineUrl
      );

      // Cleanup
      await db.deleteCommittee(committeeId);
    });

    it('TC-EMAIL-005-B: Should create committee without errors when no inviteEmails', async () => {
      if (!adminToken) return;

      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Invite Committee',
          description: 'No invitations sent'
        });

      expect(createRes.status).toBe(201);
      expect(emailService.sendCommitteeInvitationEmail).not.toHaveBeenCalled();

      // Cleanup
      await db.deleteCommittee(createRes.body.id);
    });

    it('TC-EMAIL-005-C: Should handle empty inviteEmails array', async () => {
      if (!adminToken) return;

      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empty Invite Committee',
          description: 'Empty array',
          inviteEmails: []
        });

      expect(createRes.status).toBe(201);
      expect(emailService.sendCommitteeInvitationEmail).not.toHaveBeenCalled();

      // Cleanup
      await db.deleteCommittee(createRes.body.id);
    });
  });

  describe('TC-EMAIL-006: Invitation accept/decline endpoints', () => {

    it('TC-EMAIL-006-A: Should return 404 for invalid invitation token', async () => {
      const res = await request(app)
        .get('/api/committees/invitations/invalidtoken123/accept');

      expect(res.status).toBe(404);
      expect(res.text).toContain('Invitation Not Found');
    });

    it('TC-EMAIL-006-B: Should return 404 for invalid decline token', async () => {
      const res = await request(app)
        .get('/api/committees/invitations/invalidtoken123/decline');

      expect(res.status).toBe(404);
      expect(res.text).toContain('Invitation Not Found');
    });

    it('TC-EMAIL-006-C: Should accept valid invitation for registered user', async () => {
      if (!adminToken) return;

      // Create committee with invitation for a known user
      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Accept Test Committee',
          description: 'Testing accept flow',
          inviteEmails: ['p.genave@umail.utm.ac.mu']  // existing student
        });

      expect(createRes.status).toBe(201);
      const committeeId = createRes.body.id;

      // Get the invitation token from the email call
      const emailCall = emailService.sendCommitteeInvitationEmail.mock.calls[0];
      // acceptUrl is the 4th argument, extract token from it
      const acceptUrl = emailCall[3];
      const token = acceptUrl.split('/invitations/')[1].split('/accept')[0];

      // Accept the invitation
      const acceptRes = await request(app)
        .get(`/api/committees/invitations/${token}/accept`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.text).toContain('Invitation Accepted');

      // Verify the user is now a member
      const student = await db.getUserByEmail('p.genave@umail.utm.ac.mu');
      const isMember = await db.isUserCommitteeMember(committeeId, student.id);
      expect(isMember).toBe(true);

      // Cleanup
      await db.removeCommitteeMember(committeeId, student.id);
      await db.deleteCommittee(committeeId);
    });

    it('TC-EMAIL-006-D: Should decline valid invitation', async () => {
      if (!adminToken) return;

      // Create committee with invitation
      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Decline Test Committee',
          description: 'Testing decline flow',
          inviteEmails: ['p.genave@umail.utm.ac.mu']
        });

      expect(createRes.status).toBe(201);
      const committeeId = createRes.body.id;

      // Get the decline URL token
      const emailCall = emailService.sendCommitteeInvitationEmail.mock.calls[0];
      const declineUrl = emailCall[4];
      const token = declineUrl.split('/invitations/')[1].split('/decline')[0];

      // Decline the invitation
      const declineRes = await request(app)
        .get(`/api/committees/invitations/${token}/decline`);

      expect(declineRes.status).toBe(200);
      expect(declineRes.text).toContain('Invitation Declined');

      // Verify the user is NOT a member
      const student = await db.getUserByEmail('p.genave@umail.utm.ac.mu');
      const isMember = await db.isUserCommitteeMember(committeeId, student.id);
      expect(isMember).toBe(false);

      // Cleanup
      await db.deleteCommittee(committeeId);
    });

    it('TC-EMAIL-006-E: Should not accept already accepted invitation', async () => {
      if (!adminToken) return;

      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Double Accept Committee',
          description: 'Testing double accept',
          inviteEmails: ['p.genave@umail.utm.ac.mu']
        });

      expect(createRes.status).toBe(201);
      const committeeId = createRes.body.id;

      const emailCall = emailService.sendCommitteeInvitationEmail.mock.calls[0];
      const acceptUrl = emailCall[3];
      const token = acceptUrl.split('/invitations/')[1].split('/accept')[0];

      // Accept first time
      await request(app).get(`/api/committees/invitations/${token}/accept`);

      // Try accepting again
      const secondAccept = await request(app)
        .get(`/api/committees/invitations/${token}/accept`);

      expect(secondAccept.status).toBe(400);
      expect(secondAccept.text).toContain('Already');

      // Cleanup
      const student = await db.getUserByEmail('p.genave@umail.utm.ac.mu');
      await db.removeCommitteeMember(committeeId, student.id);
      await db.deleteCommittee(committeeId);
    });

    it('TC-EMAIL-006-F: Should show registration page for unregistered email', async () => {
      if (!adminToken) return;

      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Unregistered User Committee',
          description: 'Testing unregistered flow',
          inviteEmails: ['nonexistent@example.com']
        });

      expect(createRes.status).toBe(201);
      const committeeId = createRes.body.id;

      const emailCall = emailService.sendCommitteeInvitationEmail.mock.calls[0];
      const acceptUrl = emailCall[3];
      const token = acceptUrl.split('/invitations/')[1].split('/accept')[0];

      const acceptRes = await request(app)
        .get(`/api/committees/invitations/${token}/accept`);

      // Should show registration required page
      expect(acceptRes.text).toContain('Registration Required');
      expect(acceptRes.text).toContain('Register Now');

      // Cleanup
      await db.deleteCommittee(committeeId);
    });
  });
});

describe('EMAIL-004: Meeting Scheduled Email Notifications', () => {

  let testCommitteeId = null;

  afterAll(async () => {
    if (testCommitteeId) {
      try { await db.deleteCommittee(testCommitteeId); } catch (e) {}
    }
  });

  describe('TC-EMAIL-007: Email sent when meeting is scheduled', () => {

    it('TC-EMAIL-007-A: Should create meeting and not email the scheduler', async () => {
      if (!adminToken) return;

      // Create a committee (admin auto-joins as member)
      const createRes = await request(app)
        .post('/api/committees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Meeting Email Test Committee',
          description: 'Testing meeting emails'
        });

      expect(createRes.status).toBe(201);
      testCommitteeId = createRes.body.id;

      jest.clearAllMocks();

      // Schedule an in-person meeting (admin is only member)
      const meetingRes = await request(app)
        .post(`/api/committees/${testCommitteeId}/meetings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Solo Meeting',
          date: '2026-12-20',
          time: '10:00',
          endTime: '11:00',
          location: 'Dewan Sultan Iskandar, UTM',
          meetingType: 'in-person'
        });

      expect(meetingRes.status).toBe(201);
      // Admin is the scheduler and only member - no email sent
      expect(emailService.sendMeetingScheduledEmail).not.toHaveBeenCalled();
    });

    it('TC-EMAIL-007-B: Should send meeting email to other members with correct details', async () => {
      if (!adminToken || !testCommitteeId) return;

      const student = await db.getUserByEmail('p.genave@umail.utm.ac.mu');
      if (!student) return;

      try {
        await db.addCommitteeMember(testCommitteeId, {
          userId: student.id,
          userName: student.name,
          userRole: student.role
        });
      } catch (e) { /* might already be member */ }

      jest.clearAllMocks();

      const meetingRes = await request(app)
        .post(`/api/committees/${testCommitteeId}/meetings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Project Review',
          description: 'Review project deliverables',
          date: '2026-12-21',
          time: '14:00',
          endTime: '15:30',
          location: 'Room 301, FSKSM',
          meetingType: 'in-person'
        });

      expect(meetingRes.status).toBe(201);

      // Verify email was sent to the student member
      expect(emailService.sendMeetingScheduledEmail).toHaveBeenCalled();
      const emailCall = emailService.sendMeetingScheduledEmail.mock.calls[0];
      expect(emailCall[0]).toBe(student.email);
      expect(emailCall[1]).toBe(student.name);
      expect(emailCall[2]).toMatchObject({
        title: 'Project Review',
        description: 'Review project deliverables',
        date: '2026-12-21',
        time: '14:00',
        endTime: '15:30',
        location: 'Room 301, FSKSM',
        meetingType: 'in-person',
        committeeName: 'Meeting Email Test Committee'
      });

      await db.removeCommitteeMember(testCommitteeId, student.id);
    });

    it('TC-EMAIL-007-C: Should include scheduledBy and committeeName in email details', async () => {
      if (!adminToken || !testCommitteeId) return;

      const student = await db.getUserByEmail('p.genave@umail.utm.ac.mu');
      if (!student) return;

      try {
        await db.addCommitteeMember(testCommitteeId, {
          userId: student.id,
          userName: student.name,
          userRole: student.role
        });
      } catch (e) {}

      jest.clearAllMocks();

      const meetingRes = await request(app)
        .post(`/api/committees/${testCommitteeId}/meetings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Team Sync',
          date: '2026-12-22',
          time: '09:00',
          endTime: '10:00',
          location: 'Lab 2',
          meetingType: 'in-person'
        });

      if (meetingRes.status === 201) {
        expect(emailService.sendMeetingScheduledEmail).toHaveBeenCalled();
        const details = emailService.sendMeetingScheduledEmail.mock.calls[0][2];
        expect(details).toHaveProperty('meetingType', 'in-person');
        expect(details).toHaveProperty('scheduledBy');
        expect(details).toHaveProperty('committeeName', 'Meeting Email Test Committee');
      }

      await db.removeCommitteeMember(testCommitteeId, student.id);
    });
  });
});
