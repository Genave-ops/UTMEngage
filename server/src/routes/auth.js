const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { generateToken, verifyToken } = require('../middleware/auth');
const { generateOTP, getOTPExpiry, sendOTPEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { logActivity } = require('../middleware/helpers');
const { notify } = require('../utils/notify');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role, department, studentId, organizationName, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    const existingUserByEmail = await db.getUserByEmailRaw(email);
    if (existingUserByEmail) {
      if (!existingUserByEmail.isVerified && existingUserByEmail.otpExpiry && new Date() > new Date(existingUserByEmail.otpExpiry)) {
        await db.deleteUser(existingUserByEmail.id);
      } else if (!existingUserByEmail.isVerified) {
        return res.status(400).json({
          error: 'A verification email was already sent. Please check your inbox or request a new code.',
          requiresVerification: true,
          email: email.toLowerCase()
        });
      } else {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    if (!['student', 'stakeholder'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin registration is not allowed. Admin accounts are created by the system administrator.' });
    }

    if (role === 'student' && !studentId) {
      return res.status(400).json({ error: 'Student ID is required for student registration' });
    }

    if (role === 'stakeholder' && !organizationName) {
      return res.status(400).json({ error: 'Organization name is required for stakeholder registration' });
    }

    let userId;
    if (role === 'student') {
      const existingStudent = await db.getUserById(studentId);
      if (existingStudent) {
        return res.status(400).json({ error: 'Student ID already registered' });
      }
      userId = studentId;
    } else {
      userId = `EXT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    const newUser = await db.createUser({
      id: userId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      status: 'unverified',
      isVerified: false,
      otp,
      otpExpiry,
      department: role === 'student' ? department : (role === 'stakeholder' ? organizationName : department),
      phone: phone || '',
      bio: '',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=005eb8&color=fff`,
      joined: new Date().toISOString().split('T')[0]
    });

    try {
      await sendOTPEmail(email, otp, name);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      await db.deleteUser(newUser.id);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    await logActivity('User Registration', `${name} registered as ${role} (pending verification)`, 'success', req, {
      category: 'auth',
      userId: newUser.id,
      userName: name,
      userEmail: email,
      userRole: role,
      targetType: 'user',
      targetId: newUser.id
    });

    res.status(201).json({
      message: 'Registration successful! Please verify your email.',
      requiresVerification: true,
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await db.getUserByEmailRaw(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    const updatedUser = await db.updateUser(user.id, {
      isVerified: true,
      status: user.role === 'admin' ? 'pending' : 'active',
      otp: null,
      otpExpiry: null
    });

    await logActivity('Email Verified', `${user.name} verified their email`, 'success', req, {
      category: 'auth',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      targetType: 'user',
      targetId: user.id
    });

    // Auto-process pending committee invitations for this email
    try {
      const pendingInvitations = await db.getPendingInvitationsByEmail(user.email);
      for (const invitation of pendingInvitations) {
        try {
          // Check if not expired
          if (new Date() > new Date(invitation.expiresAt)) {
            await db.updateInvitationStatus(invitation.token, 'expired');
            continue;
          }
          // Check if already a member
          const isMember = await db.isUserCommitteeMember(invitation.committeeId, user.id);
          if (isMember) {
            await db.updateInvitationStatus(invitation.token, 'accepted');
            continue;
          }
          // Add as committee member
          await db.addCommitteeMember(invitation.committeeId, {
            userId: user.id,
            userName: user.name,
            userRole: user.role
          });
          await db.updateInvitationStatus(invitation.token, 'accepted');
          // Send notification
          const io = req.app.get('io');
          if (io) {
            await notify(io, {
              userId: user.id,
              type: 'join_request_approved',
              title: 'Committee Invitation Accepted',
              message: `You have been added to "${invitation.committeeName}" via invitation.`,
              relatedId: String(invitation.committeeId),
              relatedType: 'committee'
            });
          }
        } catch (invErr) {
          console.error(`Failed to process invitation ${invitation.token}:`, invErr);
        }
      }
    } catch (invitationErr) {
      console.error('Error processing pending invitations:', invitationErr);
    }

    if (user.role === 'admin') {
      return res.json({
        message: 'Email verified! Your administrator account is pending approval.',
        verified: true,
        requiresApproval: true
      });
    }

    const token = generateToken(updatedUser);
    res.json({
      message: 'Email verified successfully!',
      verified: true,
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        department: updatedUser.department,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        phone: updatedUser.phone
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// Resend OTP
router.post('/resend-otp', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.getUserByEmailRaw(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (user.otpExpiry) {
      const lastSentTime = new Date(user.otpExpiry).getTime() - (5 * 60 * 1000);
      const timeSinceLastSend = Date.now() - lastSentTime;
      if (timeSinceLastSend < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastSend) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
          retryAfter: waitSeconds
        });
      }
    }

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    await db.updateUser(user.id, { otp, otpExpiry });

    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (emailError) {
      console.error('Failed to resend OTP email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.json({
      message: 'A new verification code has been sent to your email.',
      sent: true
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP. Please try again.' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getUserByEmailRaw(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(500).json({ error: 'Account data error. Please contact support.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ error: 'Please use the admin portal to log in.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Your email is not verified. Please check your inbox for the verification code sent during registration.'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    if (user.role === 'admin' && user.status === 'pending') {
      return res.status(403).json({ error: 'Your administrator account is pending approval.' });
    }

    const token = generateToken(user);
    await logActivity('User Login', `${user.name} logged in successfully`, 'success', req, {
      category: 'auth',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      targetType: 'user',
      targetId: user.id
    });

    res.json({
      token,
      mustChangePassword: user.mustChangePassword || false,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, department: user.department, avatar: user.avatar, bio: user.bio, phone: user.phone }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Change Password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    const user = await db.getUserByIdRaw(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.updateUser(user.id, {
      password: hashedNewPassword,
      mustChangePassword: false
    });

    const updatedUser = await db.getUserById(user.id);
    const newToken = generateToken(updatedUser);

    await logActivity('Password Changed', `${user.name} changed their password`, 'success', req, {
      category: 'auth',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      targetType: 'user',
      targetId: user.id
    });

    res.json({
      message: 'Password changed successfully',
      token: newToken,
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, status: updatedUser.status, department: updatedUser.department, avatar: updatedUser.avatar, bio: updatedUser.bio, phone: updatedUser.phone }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

// Forgot Password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.getUserByEmail(email);

    if (user) {
      const otp = generateOTP();
      const otpExpiry = getOTPExpiry();

      await db.updateUser(user.id, { otp, otpExpiry });

      try {
        await sendPasswordResetEmail(email, otp, user.name);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    }

    res.json({ message: 'If an account exists with that email, a reset code has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// Reset Password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    const user = await db.getUserByEmailRaw(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateUser(user.id, {
      password: hashedPassword,
      otp: null,
      otpExpiry: null
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, department: user.department, avatar: user.avatar, bio: user.bio, phone: user.phone });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
