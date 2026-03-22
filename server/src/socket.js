const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const CommitteeMember = require('./models/CommitteeMember');

let io;

function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, userRole } = socket;
    console.log(`Socket connected: user ${userId} (${userRole})`);

    socket.join(`user:${userId}`);
    socket.join(`role:${userRole}`);

    try {
      const memberships = await CommitteeMember.find({ userId }).select('committeeId').lean();
      memberships.forEach((m) => {
        socket.join(`committee:${m.committeeId}`);
      });
    } catch (error) {
      console.error('Error joining committee rooms:', error);
    }

    socket.on('join-committee', (committeeId) => {
      socket.join(`committee:${committeeId}`);
    });

    socket.on('leave-committee', (committeeId) => {
      socket.leave(`committee:${committeeId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { setupSocket, getIO };
