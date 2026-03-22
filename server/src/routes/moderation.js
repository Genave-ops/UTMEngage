const router = require('express').Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Get all reports (with optional filters)
router.get('/reports', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, contentType, priority } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (contentType) filters.contentType = contentType;
    if (priority) filters.priority = priority;

    const reports = await db.getReports(filters);
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Get single report
router.get('/reports/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Create report (any authenticated user can report)
router.post('/reports', verifyToken, async (req, res) => {
  try {
    const { contentType, contentId, reason, description } = req.body;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ error: 'Content type, content ID, and reason are required' });
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'misinformation', 'inappropriate', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid report reason' });
    }

    const validContentTypes = ['post', 'comment', 'event', 'user'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    let contentPreview = '';
    let contentAuthorId = '';
    let contentAuthorName = '';

    if (contentType === 'post') {
      const post = await db.getPostById(contentId);
      if (post) {
        contentPreview = post.content?.substring(0, 200) || '';
        contentAuthorId = post.userId;
        contentAuthorName = post.userName;
      }
    } else if (contentType === 'comment') {
      contentPreview = req.body.contentPreview || '';
      contentAuthorId = req.body.contentAuthorId || '';
      contentAuthorName = req.body.contentAuthorName || '';
    } else if (contentType === 'event') {
      const event = await db.getEventById(contentId);
      if (event) {
        contentPreview = `${event.title}: ${event.description?.substring(0, 150) || ''}`;
        contentAuthorId = event.proposerId;
        contentAuthorName = event.proposer;
      }
    } else if (contentType === 'user') {
      const targetUser = await db.getUserById(contentId);
      if (targetUser) {
        contentPreview = `User: ${targetUser.name} (${targetUser.email})`;
        contentAuthorId = targetUser.id;
        contentAuthorName = targetUser.name;
      }
    }

    const newReport = await db.createReport({
      reporterId: req.user.id,
      reporterName: req.user.name,
      reporterEmail: req.user.email,
      contentType,
      contentId,
      contentPreview: contentPreview || req.body.contentPreview || '',
      contentAuthorId: contentAuthorId || req.body.contentAuthorId || '',
      contentAuthorName: contentAuthorName || req.body.contentAuthorName || '',
      reason,
      description
    });

    await db.addLog('Content Reported', `${contentType} reported by ${req.user.name}: ${reason}`, 'warning');
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report status (mark as reviewing)
router.put('/reports/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'reviewing'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await db.updateReportStatus(req.params.id, status, req.user.id, req.user.name);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await db.addLog('Report Status Updated', `Report marked as ${status} by ${req.user.name}`, 'info');
    res.json(report);
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

// Resolve report with action
router.put('/reports/:id/resolve', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { resolution, resolutionNotes } = req.body;
    if (!['content_removed', 'user_warned', 'user_banned', 'no_action'].includes(resolution)) {
      return res.status(400).json({ error: 'Invalid resolution type' });
    }

    const existingReport = await db.getReportById(req.params.id);
    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (resolution === 'content_removed') {
      if (existingReport.contentType === 'post') {
        await db.deletePost(existingReport.contentId);
      }
    }

    if (resolution === 'user_banned' && existingReport.contentAuthorId) {
      await db.updateUser(existingReport.contentAuthorId, { status: 'banned' });
      await db.addLog('User Banned', `${existingReport.contentAuthorName} banned due to report`, 'error');
    }

    const report = await db.resolveReport(
      req.params.id,
      resolution,
      resolutionNotes,
      req.user.id,
      req.user.name
    );

    await db.addLog('Report Resolved', `Report resolved by ${req.user.name}: ${resolution}`, 'success');
    res.json(report);
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// Dismiss report
router.put('/reports/:id/dismiss', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { resolutionNotes } = req.body;

    const report = await db.dismissReport(
      req.params.id,
      resolutionNotes || 'No violation found',
      req.user.id,
      req.user.name
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await db.addLog('Report Dismissed', `Report dismissed by ${req.user.name}`, 'info');
    res.json(report);
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
});

// Delete report (permanent deletion)
router.delete('/reports/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await db.deleteReport(req.params.id);
    res.json({ message: 'Report deleted permanently' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
