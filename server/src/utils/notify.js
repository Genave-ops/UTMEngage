const Notification = require('../models/Notification');

async function notify(io, options) {
  const { userId, type, title, message, relatedId, relatedType, room, excludeUserId } = options;

  if (room) {
    const sockets = await io.in(room).fetchSockets();
    let userIds = [...new Set(sockets.map(s => s.userId).filter(Boolean))];

    if (excludeUserId) {
      userIds = userIds.filter(uid => String(uid) !== String(excludeUserId));
    }

    if (userIds.length > 0) {
      const notifications = await Notification.insertMany(
        userIds.map(uid => ({ userId: uid, type, title, message, relatedId, relatedType }))
      );
      notifications.forEach(n => {
        io.to(`user:${n.userId}`).emit('notification', n);
      });
      return notifications;
    }
    return [];
  }

  const notification = await Notification.create({ userId, type, title, message, relatedId, relatedType });
  io.to(`user:${userId}`).emit('notification', notification);
  return notification;
}

async function notifyRole(io, role, options) {
  return notify(io, { ...options, room: `role:${role}` });
}

async function notifyCommittee(io, committeeId, options) {
  return notify(io, { ...options, room: `committee:${committeeId}` });
}

module.exports = { notify, notifyRole, notifyCommittee };
