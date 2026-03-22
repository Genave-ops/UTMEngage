const router = require('express').Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logActivity } = require('../middleware/helpers');
const { notifyRole } = require('../utils/notify');

// Get all broadcast messages (admin only)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, targetType, priority, limit } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (targetType) filters.targetType = targetType;
    if (priority) filters.priority = priority;
    if (limit) filters.limit = parseInt(limit);

    const messages = await db.getBroadcastMessages(filters);
    res.json(messages);
  } catch (error) {
    console.error('Get broadcast messages error:', error);
    res.status(500).json({ error: 'Failed to get broadcast messages' });
  }
});

// Get broadcast messages for current user (committee members)
router.get('/my', verifyToken, async (req, res) => {
  try {
    const committees = await db.getCommittees({});
    const userCommitteeIds = [];

    for (const committee of committees) {
      const isMember = await db.isUserCommitteeMember(committee.id, req.user.id);
      if (isMember) {
        userCommitteeIds.push(committee.id);
      }
    }

    const messages = await db.getBroadcastMessagesForUser(req.user.id, userCommitteeIds);
    res.json(messages);
  } catch (error) {
    console.error('Get user broadcast messages error:', error);
    res.status(500).json({ error: 'Failed to get broadcast messages' });
  }
});

// Get unread broadcast count for current user
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const committees = await db.getCommittees({});
    const userCommitteeIds = [];

    for (const committee of committees) {
      const isMember = await db.isUserCommitteeMember(committee.id, req.user.id);
      if (isMember) {
        userCommitteeIds.push(committee.id);
      }
    }

    const count = await db.getUnreadBroadcastCount(req.user.id, userCommitteeIds);
    res.json({ count });
  } catch (error) {
    console.error('Get unread broadcast count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Create broadcast message (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, targetType, targetCategory, targetCommittees, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    let recipientCount = 0;
    if (targetType === 'all') {
      const allMemberIds = await db.getAllCommitteeMemberUserIds();
      recipientCount = [...new Set(allMemberIds)].length;
    } else if (targetType === 'specific' && targetCommittees?.length > 0) {
      const memberIds = await db.getAllCommitteeMemberUserIds(targetCommittees);
      recipientCount = [...new Set(memberIds)].length;
    } else if (targetType === 'leaders') {
      const leaderIds = await db.getCommitteeLeaderUserIds();
      recipientCount = leaderIds.length;
    }

    const newBroadcast = await db.createBroadcastMessage({
      title,
      message,
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      targetType: targetType || 'all',
      targetCategory,
      targetCommittees: targetCommittees || [],
      priority: priority || 'normal',
      status: 'sent',
      recipientCount
    });

    await logActivity(
      'Broadcast Sent',
      `Admin ${req.user.name} sent broadcast: "${title}" to ${targetType === 'all' ? 'all committees' : targetType}`,
      'info',
      req,
      {
        category: 'broadcast',
        targetType: 'broadcast',
        targetId: newBroadcast.id,
        targetName: title
      }
    );

    // Send real-time notification for broadcast
    try {
      const io = req.app.get('io');
      if (io) {
        if (targetType === 'all') {
          await notifyRole(io, 'student', { type: 'broadcast', title: title, message: message.substring(0, 100), relatedId: String(newBroadcast.id || newBroadcast._id), relatedType: 'broadcast', excludeUserId: req.user.id });
          await notifyRole(io, 'stakeholder', { type: 'broadcast', title: title, message: message.substring(0, 100), relatedId: String(newBroadcast.id || newBroadcast._id), relatedType: 'broadcast', excludeUserId: req.user.id });
        } else if (targetType === 'leaders') {
          await notifyRole(io, 'stakeholder', { type: 'broadcast', title: title, message: message.substring(0, 100), relatedId: String(newBroadcast.id || newBroadcast._id), relatedType: 'broadcast', excludeUserId: req.user.id });
        }
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    res.status(201).json(newBroadcast);
  } catch (error) {
    console.error('Create broadcast message error:', error);
    res.status(500).json({ error: 'Failed to create broadcast message' });
  }
});

// Mark broadcast as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    await db.markBroadcastAsRead(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark broadcast read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Update broadcast message (admin only)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const existing = await db.getBroadcastMessageById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Broadcast message not found' });
    }

    const { title, message, targetType, targetCommittees, priority } = req.body;
    const updatedBroadcast = await db.updateBroadcastMessage(req.params.id, {
      title,
      message,
      targetType,
      targetCommittees,
      priority
    });
    await logActivity(
      'Broadcast Updated',
      `Admin ${req.user.name} updated broadcast: "${updatedBroadcast.title}"`,
      'info',
      req,
      {
        category: 'broadcast',
        targetType: 'broadcast',
        targetId: updatedBroadcast.id,
        targetName: updatedBroadcast.title
      }
    );
    res.json(updatedBroadcast);
  } catch (error) {
    console.error('Update broadcast message error:', error);
    res.status(500).json({ error: 'Failed to update broadcast message' });
  }
});

// Delete broadcast message (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await db.deleteBroadcastMessage(req.params.id);
    await logActivity('Broadcast Deleted', `Broadcast message deleted by ${req.user.name}`, 'warning', req, {
      category: 'broadcast'
    });
    res.json({ message: 'Broadcast deleted successfully' });
  } catch (error) {
    console.error('Delete broadcast message error:', error);
    res.status(500).json({ error: 'Failed to delete broadcast message' });
  }
});

module.exports = router;
