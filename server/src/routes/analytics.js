const router = require('express').Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Get dashboard analytics
router.get('/dashboard', verifyToken, requireRole('admin', 'stakeholder'), async (req, res) => {
  try {
    const stats = await db.getAnalytics();
    res.json(stats);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get stakeholder dashboard - personalized stats
router.get('/stakeholder-dashboard', verifyToken, requireRole('stakeholder'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get events proposed by this stakeholder
    const allEvents = await db.getEvents();
    const myEvents = allEvents.filter(e => e.proposerId === userId);
    const approvedEvents = myEvents.filter(e => e.status === 'approved');
    const pendingEvents = myEvents.filter(e => e.status === 'pending');

    // Get registration + check-in stats for my approved events
    let totalRegistrations = 0;
    let totalCheckIns = 0;
    const eventDetails = [];
    for (const event of approvedEvents.slice(0, 10)) {
      try {
        const stats = await db.getEventCheckInStats(event.id || event._id);
        totalRegistrations += stats.total || 0;
        totalCheckIns += stats.checkedIn || 0;
        eventDetails.push({
          id: event.id || event._id,
          title: event.title,
          date: event.date,
          status: event.status,
          registrations: stats.total || 0,
          checkedIn: stats.checkedIn || 0,
          capacity: event.capacity || 0,
        });
      } catch (e) {
        eventDetails.push({
          id: event.id || event._id,
          title: event.title,
          date: event.date,
          status: event.status,
          registrations: event.attendees || 0,
          checkedIn: 0,
          capacity: event.capacity || 0,
        });
      }
    }

    // Get committees created by this stakeholder
    const allCommittees = await db.getCommittees();
    const myCommittees = allCommittees.filter(c => c.creatorId === userId);
    const activeCommittees = myCommittees.filter(c => c.status === 'active');
    const pendingCommittees = myCommittees.filter(c => c.status === 'pending');

    // Get committee details with member counts
    const committeeDetails = [];
    let totalMembers = 0;
    let pendingJoinRequests = 0;
    for (const committee of activeCommittees.slice(0, 10)) {
      const members = committee.memberCount || 0;
      totalMembers += members;
      try {
        const requests = await db.getJoinRequests({ committeeId: committee.id || committee._id, status: 'pending' });
        const pendingCount = Array.isArray(requests) ? requests.length : 0;
        pendingJoinRequests += pendingCount;
        committeeDetails.push({
          id: committee.id || committee._id,
          name: committee.name,
          members,
          pendingRequests: pendingCount,
        });
      } catch (e) {
        committeeDetails.push({
          id: committee.id || committee._id,
          name: committee.name,
          members,
          pendingRequests: 0,
        });
      }
    }

    // Upcoming events (approved, future date)
    const now = new Date();
    const upcomingEvents = approvedEvents
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    res.json({
      myEvents: {
        total: myEvents.length,
        approved: approvedEvents.length,
        pending: pendingEvents.length,
        rejected: myEvents.filter(e => e.status === 'rejected').length,
      },
      myCommittees: {
        total: myCommittees.length,
        active: activeCommittees.length,
        pending: pendingCommittees.length,
      },
      engagement: {
        totalRegistrations,
        totalCheckIns,
        totalMembers,
        pendingJoinRequests,
        attendanceRate: totalRegistrations > 0 ? Math.round((totalCheckIns / totalRegistrations) * 100) : 0,
      },
      eventDetails,
      committeeDetails,
      upcomingEvents,
    });
  } catch (error) {
    console.error('Get stakeholder dashboard error:', error);
    res.status(500).json({ error: 'Failed to get stakeholder dashboard' });
  }
});

// Get log statistics (must be before /logs to prevent route conflicts)
router.get('/logs/stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await db.getLogStats();
    res.json(stats);
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ error: 'Failed to get log statistics' });
  }
});

// Get activity logs with filters
router.get('/logs', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { category, type, userId, search, startDate, endDate, limit, offset } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (userId) filters.userId = userId;
    if (search) filters.search = search;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await db.getLogs(filters);
    res.json(result);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

module.exports = router;
