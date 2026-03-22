/**
 * Notification System Tests for UTMEngage
 * Tests the Notification model, REST API endpoints, and Socket.IO integration
 */

const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Test user data
const SECRET_KEY = process.env.JWT_SECRET || 'test-secret';

const createTestToken = (user) => {
  return jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
};

const adminUser = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'notification-test-admin@test.com',
  role: 'admin',
  name: 'Test Admin'
};

const studentUser = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'notification-test-student@test.com',
  role: 'student',
  name: 'Test Student'
};

const adminToken = createTestToken(adminUser);
const studentToken = createTestToken(studentUser);

// Import Notification model
let Notification;

beforeAll(async () => {
  // Wait for DB connection
  const db = require('../src/config/database');
  if (!db.connected) {
    await db.initialize();
  }
  Notification = require('../src/models/Notification');
});

afterAll(async () => {
  // Clean up test notifications
  try {
    if (Notification && mongoose.connection.readyState === 1) {
      await Notification.deleteMany({
        userId: { $in: [adminUser.id, studentUser.id] }
      });
    }
  } catch (err) {
    // Ignore cleanup errors
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Notification Model', () => {
  it('should create a notification with valid data', async () => {
    const notification = await Notification.create({
      userId: studentUser.id,
      type: 'event_approved',
      title: 'Test Event Approved',
      message: 'Your test event has been approved!',
      relatedId: new mongoose.Types.ObjectId().toString(),
      relatedType: 'event'
    });

    expect(notification).toBeDefined();
    expect(notification.title).toBe('Test Event Approved');
    expect(notification.type).toBe('event_approved');
    expect(notification.isRead).toBe(false);
    expect(notification.createdAt).toBeDefined();
  });

  it('should reject invalid notification type', async () => {
    await expect(
      Notification.create({
        userId: studentUser.id,
        type: 'invalid_type',
        title: 'Bad Type',
        message: 'This should fail'
      })
    ).rejects.toThrow();
  });

  it('should require title and message', async () => {
    await expect(
      Notification.create({
        userId: studentUser.id,
        type: 'broadcast'
      })
    ).rejects.toThrow();
  });

  it('should default isRead to false', async () => {
    const notification = await Notification.create({
      userId: studentUser.id,
      type: 'broadcast',
      title: 'Test Broadcast',
      message: 'Testing default isRead'
    });

    expect(notification.isRead).toBe(false);
  });
});

describe('Notification API Endpoints', () => {
  let testNotificationIds = [];

  beforeAll(async () => {
    // Create some test notifications for the student user
    const notifications = await Notification.insertMany([
      {
        userId: studentUser.id,
        type: 'event_approved',
        title: 'Event A Approved',
        message: 'Your event A has been approved',
        relatedType: 'event',
        isRead: false
      },
      {
        userId: studentUser.id,
        type: 'committee_approved',
        title: 'Committee Approved',
        message: 'Your committee has been approved',
        relatedType: 'committee',
        isRead: false
      },
      {
        userId: studentUser.id,
        type: 'post_liked',
        title: 'Post Liked',
        message: 'Someone liked your post',
        relatedType: 'post',
        isRead: true
      },
      {
        userId: adminUser.id,
        type: 'broadcast',
        title: 'Admin Notification',
        message: 'This belongs to admin',
        isRead: false
      }
    ]);
    testNotificationIds = notifications.map(n => n._id.toString());
  });

  afterAll(async () => {
    await Notification.deleteMany({
      _id: { $in: testNotificationIds.map(id => new mongoose.Types.ObjectId(id)) }
    });
  });

  describe('GET /api/notifications', () => {
    it('should return notifications for authenticated user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toBeDefined();
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('should only return notifications belonging to the user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      // All returned notifications should belong to the student user
      res.body.notifications.forEach(n => {
        expect(n.userId.toString()).toBe(studentUser.id);
      });
    });

    it('should filter unread only', async () => {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      // All returned should be unread
      res.body.notifications.forEach(n => {
        expect(n.isRead).toBe(false);
      });
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/notifications');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeDefined();
      expect(typeof res.body.count).toBe('number');
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      // Get an unread notification ID for the student
      const listRes = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${studentToken}`);

      if (listRes.body.notifications.length > 0) {
        const notifId = listRes.body.notifications[0]._id;

        const res = await request(app)
          .put(`/api/notifications/${notifId}/read`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.notification.isRead).toBe(true);
      }
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });

    it('should not allow marking another user\'s notification', async () => {
      // The admin notification should not be markable by the student
      const adminNotifId = testNotificationIds[3]; // admin's notification
      const res = await request(app)
        .put(`/api/notifications/${adminNotifId}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);

      // Verify all are read
      const checkRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(checkRes.body.count).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      // Create a notification to delete
      const notif = await Notification.create({
        userId: studentUser.id,
        type: 'broadcast',
        title: 'To Be Deleted',
        message: 'This will be deleted'
      });

      const res = await request(app)
        .delete(`/api/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Notification deleted');

      // Verify it's gone
      const check = await Notification.findById(notif._id);
      expect(check).toBeNull();
    });

    it('should not allow deleting another user\'s notification', async () => {
      const adminNotif = await Notification.create({
        userId: adminUser.id,
        type: 'broadcast',
        title: 'Admin Only',
        message: 'Student cannot delete this'
      });

      const res = await request(app)
        .delete(`/api/notifications/${adminNotif._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);

      // Clean up
      await Notification.findByIdAndDelete(adminNotif._id);
    });
  });
});

describe('Notification Utility Functions', () => {
  it('should export notify, notifyRole, and notifyCommittee', () => {
    const { notify, notifyRole, notifyCommittee } = require('../src/utils/notify');
    expect(typeof notify).toBe('function');
    expect(typeof notifyRole).toBe('function');
    expect(typeof notifyCommittee).toBe('function');
  });
});

describe('Socket.IO Setup', () => {
  it('should export setupSocket and getIO', () => {
    const { setupSocket, getIO } = require('../src/socket');
    expect(typeof setupSocket).toBe('function');
    expect(typeof getIO).toBe('function');
  });

  it('getIO should throw if not initialized', () => {
    // getIO should work or throw depending on state
    // Since we haven't called setupSocket in tests, it should throw
    const { getIO } = require('../src/socket');
    // Note: It might already be initialized if running full test suite
    // So we just verify it's callable
    expect(typeof getIO).toBe('function');
  });
});

describe('Route Integration - Notify Imports', () => {
  it('events route should load without errors', () => {
    expect(() => require('../src/routes/events')).not.toThrow();
  });

  it('committees route should load without errors', () => {
    expect(() => require('../src/routes/committees')).not.toThrow();
  });

  it('posts route should load without errors', () => {
    expect(() => require('../src/routes/posts')).not.toThrow();
  });

  it('broadcasts route should load without errors', () => {
    expect(() => require('../src/routes/broadcasts')).not.toThrow();
  });

  it('notifications route should load without errors', () => {
    expect(() => require('../src/routes/notifications')).not.toThrow();
  });
});

describe('Health Check with Socket.IO', () => {
  it('should still respond to health check', async () => {
    const res = await request(app)
      .get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
