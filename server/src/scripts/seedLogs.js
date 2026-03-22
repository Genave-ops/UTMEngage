const mongoose = require('mongoose');
require('dotenv').config();

const SystemLog = require('../models/SystemLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/utmengage';

const sampleLogs = [
  // Authentication logs
  {
    action: 'User Login',
    category: 'auth',
    type: 'success',
    details: 'Pierre Adrien Genave logged in successfully',
    userId: '230325359',
    userName: 'Pierre Adrien Genave',
    userEmail: 'p.genave@umail.utm.ac.mu',
    userRole: 'student',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    targetType: 'user',
    targetId: '230325359',
    status: 'success'
  },
  {
    action: 'User Login Failed',
    category: 'auth',
    type: 'warning',
    details: 'Failed login attempt for unknown@email.com - Invalid credentials',
    ipAddress: '192.168.1.200',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    status: 'failure'
  },
  {
    action: 'User Registration',
    category: 'auth',
    type: 'success',
    details: 'New student John Doe registered',
    userId: '230325400',
    userName: 'John Doe',
    userEmail: 'j.doe@umail.utm.ac.mu',
    userRole: 'student',
    ipAddress: '192.168.1.150',
    targetType: 'user',
    targetId: '230325400',
    status: 'success'
  },
  {
    action: 'Password Reset Requested',
    category: 'auth',
    type: 'info',
    details: 'Password reset requested for user@example.com',
    ipAddress: '10.0.0.50',
    status: 'success'
  },

  // Event logs
  {
    action: 'Event Created',
    category: 'event',
    type: 'success',
    details: 'Created event "Tech Innovation Summit 2026"',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userEmail: 'a.ramgoolam@utm.ac.mu',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'event',
    targetId: 'evt_001',
    targetName: 'Tech Innovation Summit 2026',
    status: 'success'
  },
  {
    action: 'Event Approved',
    category: 'event',
    type: 'success',
    details: 'Approved event "Campus Cleanup Day"',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'event',
    targetId: 'evt_002',
    targetName: 'Campus Cleanup Day',
    status: 'success'
  },
  {
    action: 'Event Registration',
    category: 'event',
    type: 'info',
    details: 'User registered for "Tech Innovation Summit 2026"',
    userId: '230325359',
    userName: 'Pierre Adrien Genave',
    userRole: 'student',
    ipAddress: '192.168.1.105',
    targetType: 'event',
    targetId: 'evt_001',
    targetName: 'Tech Innovation Summit 2026',
    status: 'success'
  },
  {
    action: 'Event Rejected',
    category: 'event',
    type: 'warning',
    details: 'Rejected event "Unapproved Gathering" - Does not meet guidelines',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'event',
    targetId: 'evt_003',
    status: 'success'
  },

  // Committee logs
  {
    action: 'Committee Created',
    category: 'committee',
    type: 'success',
    details: 'Created committee "Environmental Club"',
    userId: '230325359',
    userName: 'Pierre Adrien Genave',
    userRole: 'student',
    ipAddress: '192.168.1.105',
    targetType: 'committee',
    targetId: 'com_001',
    targetName: 'Environmental Club',
    status: 'success'
  },
  {
    action: 'Committee Approved',
    category: 'committee',
    type: 'success',
    details: 'Approved committee "Environmental Club"',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'committee',
    targetId: 'com_001',
    targetName: 'Environmental Club',
    status: 'success'
  },
  {
    action: 'Member Joined Committee',
    category: 'committee',
    type: 'info',
    details: 'User joined "Environmental Club"',
    userId: '230325360',
    userName: 'Jane Smith',
    userRole: 'student',
    ipAddress: '192.168.1.120',
    targetType: 'committee',
    targetId: 'com_001',
    targetName: 'Environmental Club',
    status: 'success'
  },

  // User management logs
  {
    action: 'User Banned',
    category: 'user',
    type: 'warning',
    details: 'Banned user "spammer@fake.com" for violating community guidelines',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'user',
    targetId: 'user_spam_001',
    targetName: 'Spam Account',
    status: 'success'
  },
  {
    action: 'User Unbanned',
    category: 'user',
    type: 'success',
    details: 'Unbanned user after appeal review',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'user',
    targetId: 'user_002',
    status: 'success'
  },
  {
    action: 'User Role Updated',
    category: 'user',
    type: 'info',
    details: 'Changed user role from student to stakeholder',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'user',
    targetId: '230325361',
    status: 'success'
  },

  // Moderation logs
  {
    action: 'Content Reported',
    category: 'moderation',
    type: 'warning',
    details: 'Post reported for harassment',
    userId: '230325359',
    userName: 'Pierre Adrien Genave',
    userRole: 'student',
    ipAddress: '192.168.1.105',
    targetType: 'post',
    targetId: 'post_001',
    status: 'success'
  },
  {
    action: 'Report Resolved',
    category: 'moderation',
    type: 'success',
    details: 'Report resolved - Content removed',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'report',
    targetId: 'report_001',
    status: 'success'
  },
  {
    action: 'Report Dismissed',
    category: 'moderation',
    type: 'info',
    details: 'Report dismissed - No violation found',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    ipAddress: '192.168.1.10',
    targetType: 'report',
    targetId: 'report_002',
    status: 'success'
  },

  // Security logs
  {
    action: 'Suspicious Login Attempt',
    category: 'security',
    type: 'error',
    details: 'Multiple failed login attempts detected from IP 203.0.113.50',
    ipAddress: '203.0.113.50',
    userAgent: 'curl/7.64.1',
    status: 'failure'
  },
  {
    action: 'Session Expired',
    category: 'security',
    type: 'info',
    details: 'User session expired due to inactivity',
    userId: '230325362',
    userName: 'Mike Wilson',
    userRole: 'student',
    ipAddress: '192.168.1.130',
    status: 'success'
  },

  // System logs
  {
    action: 'Database Backup',
    category: 'system',
    type: 'success',
    details: 'Automated database backup completed successfully',
    status: 'success'
  },
  {
    action: 'Server Restart',
    category: 'system',
    type: 'info',
    details: 'Server restarted for maintenance',
    status: 'success'
  },
  {
    action: 'Email Service Error',
    category: 'system',
    type: 'error',
    details: 'Failed to send notification emails - SMTP connection timeout',
    status: 'failure'
  },
  {
    action: 'Cache Cleared',
    category: 'system',
    type: 'info',
    details: 'Application cache cleared by admin',
    userId: 'STAFF_001',
    userName: 'Dr. A. Ramgoolam',
    userRole: 'admin',
    status: 'success'
  }
];

async function seedLogs() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Add timestamps to logs (spread across the last 7 days)
    const now = new Date();
    const logsWithTimestamps = sampleLogs.map((log, index) => {
      // Spread logs across last 7 days, with more recent logs having higher indices
      const daysAgo = Math.floor((sampleLogs.length - index) / 4);
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);

      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);
      timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

      return {
        ...log,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });

    console.log(`Inserting ${logsWithTimestamps.length} sample activity logs...`);
    await SystemLog.insertMany(logsWithTimestamps);

    console.log('Sample activity logs inserted successfully!');

    // Show summary
    const totalLogs = await SystemLog.countDocuments();
    const byCategory = await SystemLog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    console.log(`\nTotal logs in database: ${totalLogs}`);
    console.log('Logs by category:');
    byCategory.forEach(cat => {
      console.log(`  - ${cat._id}: ${cat.count}`);
    });

  } catch (error) {
    console.error('Error seeding logs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedLogs();
