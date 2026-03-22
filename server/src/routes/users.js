const router = require('express').Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Get all users
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await db.getUsers();
    const usersWithoutPassword = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPassword);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, role, department, phone, bio, avatar } = req.body;

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Email changes are not allowed. Contact an administrator.' });
    }

    let updates = {};
    if (name) updates.name = name;
    if (department !== undefined) updates.department = department;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    if (req.user.role === 'admin' && req.user.id !== req.params.id) {
      // Admins can change role for other users only
      if (role) updates.role = role;
    }

    const updatedUser = await db.updateUser(user.id, updates);
    const { password: pwd, ...userData } = updatedUser;
    res.json(userData);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Ban user
router.put('/:id/ban', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await db.updateUser(user.id, { status: 'banned' });
    await db.addLog('User Banned', `${user.name} was banned by ${req.user.name}`, 'error');
    const { password, ...userData } = updatedUser;
    res.json(userData);
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.put('/:id/unban', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await db.updateUser(user.id, { status: 'active' });
    await db.addLog('User Unbanned', `${user.name} was unbanned by ${req.user.name}`, 'success');
    const { password, ...userData } = updatedUser;
    res.json(userData);
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Delete user
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.deleteUser(user.id);
    await db.addLog('User Deleted', `${user.name} was deleted by ${req.user.name}`, 'error');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
