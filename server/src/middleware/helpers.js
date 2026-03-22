const db = require('../config/database');

const getRequestInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  method: req.method,
  path: req.originalUrl || req.path
});

const logActivity = async (action, details, type, req, options = {}) => {
  const requestInfo = getRequestInfo(req);
  await db.addLog(action, details, type, {
    ...options,
    userId: req.user?.id || options.userId,
    userName: req.user?.name || options.userName,
    userEmail: req.user?.email || options.userEmail,
    userRole: req.user?.role || options.userRole,
    ...requestInfo
  });
};

const requireCommitteeMembership = async (req, res, next) => {
  try {
    const committeeId = req.params.id;
    const committee = await db.getCommitteeById(committeeId);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }
    const isMember = await db.isUserCommitteeMember(committeeId, req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isMember && !isAdmin) {
      return res.status(403).json({ error: 'You must be a member of this committee' });
    }
    req.committee = committee;
    next();
  } catch (error) {
    console.error('Committee membership check error:', error);
    res.status(500).json({ error: 'Failed to check committee membership' });
  }
};

const requireCommitteeCreator = async (req, res, next) => {
  try {
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }
    const isCreator = committee.creatorId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Only the committee creator can perform this action' });
    }
    req.committee = committee;
    next();
  } catch (error) {
    console.error('Committee creator check error:', error);
    res.status(500).json({ error: 'Failed to check committee creator' });
  }
};

module.exports = {
  getRequestInfo,
  logActivity,
  requireCommitteeMembership,
  requireCommitteeCreator
};
