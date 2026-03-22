const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
}

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
};

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// Committee membership access control
const requireCommitteeMembership = (db) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admin can access all committees
    if (req.user.role === 'admin') {
      return next();
    }

    const committeeId = parseInt(req.params.id);
    const committee = db.committees.find(c => c.id === committeeId);

    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    // Check if user is a member of the committee
    const isMember = committee.members?.some(m => m.userId === req.user.id);

    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden: You must be a committee member to access this resource'
      });
    }

    // Attach committee to request for use in route handlers
    req.committee = committee;
    next();
  };
};

// Check if user is committee leader
const requireCommitteeLeader = (db) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admin can perform leader actions
    if (req.user.role === 'admin') {
      return next();
    }

    const committeeId = parseInt(req.params.id);
    const committee = db.committees.find(c => c.id === committeeId);

    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    // Check if user is a leader of the committee
    const isLeader = committee.members?.some(m => m.userId === req.user.id && m.isLeader === true);

    if (!isLeader) {
      return res.status(403).json({
        error: 'Forbidden: You must be a committee leader to perform this action'
      });
    }

    req.committee = committee;
    next();
  };
};

// Check if user is committee creator
const requireCommitteeCreator = (db) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const committeeId = parseInt(req.params.id);
    const committee = db.committees.find(c => c.id === committeeId);

    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    // Admin can perform creator actions
    if (req.user.role === 'admin') {
      req.committee = committee;
      return next();
    }

    // Check if user is the creator of the committee
    if (committee.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the committee creator can perform this action'
      });
    }

    req.committee = committee;
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  requireRole,
  requireCommitteeMembership,
  requireCommitteeLeader,
  requireCommitteeCreator
};
