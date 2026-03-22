const router = require('express').Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Submit feedback (all authenticated users)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, subject, message, rating } = req.body;

    if (!type || !subject || !message) {
      return res.status(400).json({ error: 'Type, subject, and message are required' });
    }

    if (!['bug', 'feature', 'improvement', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const feedback = await db.createFeedback({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      type,
      subject,
      message,
      rating: rating || null
    });
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get feedback statistics (admin only) - MUST be before /:id route
router.get('/stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await db.getFeedbackStats();
    res.json(stats);
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ error: 'Failed to get feedback statistics' });
  }
});

// Export feedback as CSV (admin only) - MUST be before /:id route
router.get('/export/csv', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, type } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    filters.limit = 10000;

    const result = await db.getAllFeedback(filters);

    const headers = ['ID', 'Date', 'User', 'Email', 'Role', 'Type', 'Subject', 'Message', 'Rating', 'Status', 'Reviewed By', 'Reviewed At', 'Admin Notes'];
    const csvRows = [headers.join(',')];

    result.feedback.forEach(f => {
      const row = [
        f.id,
        new Date(f.createdAt).toISOString(),
        `"${(f.userName || '').replace(/"/g, '""')}"`,
        f.userEmail || '',
        f.userRole || '',
        f.type || '',
        `"${(f.subject || '').replace(/"/g, '""')}"`,
        `"${(f.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        f.rating || '',
        f.status || '',
        f.reviewedByName || '',
        f.reviewedAt ? new Date(f.reviewedAt).toISOString() : '',
        `"${(f.adminNotes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export feedback error:', error);
    res.status(500).json({ error: 'Failed to export feedback' });
  }
});

// Get all feedback (admin only)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, type, search, limit, offset } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await db.getAllFeedback(filters);
    res.json(result);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Get single feedback (admin only) - MUST be after specific routes
router.get('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const feedback = await db.getFeedbackById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Update feedback status (admin only)
router.put('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const validStatuses = ['new', 'reviewed', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const feedback = await db.updateFeedbackStatus(
      req.params.id,
      status,
      req.user.id,
      req.user.name,
      adminNotes
    );

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await db.addLog(
      'Feedback Status Updated',
      `Feedback marked as ${status} by ${req.user.name}`,
      'info',
      {
        category: 'feedback',
        userId: req.user.id,
        userName: req.user.name,
        targetType: 'feedback',
        targetId: req.params.id
      }
    );

    res.json(feedback);
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// Delete feedback (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await db.deleteFeedback(req.params.id);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
