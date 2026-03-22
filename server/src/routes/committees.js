const router = require('express').Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logActivity, requireCommitteeMembership, requireCommitteeCreator } = require('../middleware/helpers');
const googleCalendar = require('../services/googleCalendar');
const { notify, notifyCommittee } = require('../utils/notify');
const { sendCommitteeRejectionEmail, sendCommitteeInvitationEmail, sendMeetingScheduledEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Get all committees
router.get('/', verifyToken, async (req, res) => {
  try {
    let filters = {};
    if (req.user.role === 'student') {
      filters.status = ['active', 'approved'];
    }

    let committees = await db.getCommittees(filters);

    committees = await Promise.all(committees.map(async (committee) => {
      const isMember = await db.isUserCommitteeMember(committee.id, req.user.id);
      return { ...committee, isMember };
    }));

    res.json(committees);
  } catch (error) {
    console.error('Get committees error:', error);
    res.status(500).json({ error: 'Failed to get committees' });
  }
});

// Accept committee invitation
router.get('/invitations/:token/accept', async (req, res) => {
  try {
    const invitation = await db.getInvitationByToken(req.params.token);
    if (!invitation) {
      return res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#ef4444;">Invitation Not Found</h2><p>This invitation link is invalid or has expired.</p></body></html>');
    }

    if (invitation.status !== 'pending') {
      return res.status(400).send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>Invitation Already ${invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}</h2><p>This invitation has already been ${invitation.status}.</p></body></html>`);
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await db.updateInvitationStatus(req.params.token, 'expired');
      return res.status(410).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#ef4444;">Invitation Expired</h2><p>This invitation has expired. Please ask the committee creator to send a new one.</p></body></html>');
    }

    // Find user by email
    const user = await db.getUserByEmail(invitation.email);
    if (!user) {
      return res.status(404).send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#fffbeb;margin:0;min-height:100vh;">
        <div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:40px;box-shadow:0 4px 12px rgba(0,0,0,0.1);border-top:4px solid #f59e0b;">
          <div style="font-size:48px;margin-bottom:16px;">📝</div>
          <h2 style="color:#f59e0b;margin:0 0 16px 0;font-size:24px;">Registration Required</h2>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">No UTM Engage account was found for this email address.</p>
          <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="color:#92400e;font-size:14px;line-height:1.6;margin:0;">Don't worry! Your invitation will be automatically applied once you register with this email and verify your account.</p>
          </div>
          <a href="/register" style="display:inline-block;background:#f59e0b;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;margin:20px 0;transition:background 0.2s;">Register Now</a>
          <p style="color:#9ca3af;font-size:13px;margin-top:20px;">This invitation link expires in 7 days. Please register before then.</p>
        </div>
      </body></html>`);
    }

    // Check if already a member
    const isMember = await db.isUserCommitteeMember(invitation.committeeId, user.id);
    if (isMember) {
      await db.updateInvitationStatus(req.params.token, 'accepted');
      return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#16a34a;">Already a Member</h2><p>You are already a member of this committee.</p></body></html>');
    }

    // Add user as committee member
    await db.addCommitteeMember(invitation.committeeId, {
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });

    await db.updateInvitationStatus(req.params.token, 'accepted');

    // Send notification to the user
    try {
      const io = req.app.get('io');
      if (io) {
        await notify(io, {
          userId: user.id,
          type: 'join_request_approved',
          title: 'Invitation Accepted',
          message: `You have joined "${invitation.committeeName}" via invitation.`,
          relatedId: String(invitation.committeeId),
          relatedType: 'committee'
        });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }

    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#16a34a;">Invitation Accepted!</h2><p>You have successfully joined the committee <strong>' + invitation.committeeName + '</strong>.</p><p>Open the UTM Engage app to access the committee.</p></body></html>');
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#ef4444;">Error</h2><p>Something went wrong. Please try again later.</p></body></html>');
  }
});

// Decline committee invitation
router.get('/invitations/:token/decline', async (req, res) => {
  try {
    const invitation = await db.getInvitationByToken(req.params.token);
    if (!invitation) {
      return res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#ef4444;">Invitation Not Found</h2><p>This invitation link is invalid or has expired.</p></body></html>');
    }

    if (invitation.status !== 'pending') {
      return res.status(400).send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>Invitation Already ${invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}</h2><p>This invitation has already been ${invitation.status}.</p></body></html>`);
    }

    await db.updateInvitationStatus(req.params.token, 'declined');

    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#6b7280;">Invitation Declined</h2><p>You have declined the invitation to join <strong>' + invitation.committeeName + '</strong>.</p></body></html>');
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2 style="color:#ef4444;">Error</h2><p>Something went wrong. Please try again later.</p></body></html>');
  }
});

// Get single committee
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    const isMember = await db.isUserCommitteeMember(committee.id, req.user.id);
    const isAdmin = req.user.role === 'admin';
    const isCreator = committee.creatorId === req.user.id;

    if (!isMember && !isAdmin && !isCreator) {
      res.json({
        id: committee.id,
        name: committee.name,
        description: committee.description,
        status: committee.status,
        memberCount: committee.memberCount,
        membersCount: committee.memberCount,
        banner: committee.banner,
        creatorId: committee.creatorId,
        members: committee.members || [],
        isMember: false,
        restrictedAccess: true
      });
    } else {
      res.json({ ...committee, isMember: isMember || isCreator, restrictedAccess: false });
    }
  } catch (error) {
    console.error('Get committee error:', error);
    res.status(500).json({ error: 'Failed to get committee' });
  }
});

// Create committee
router.post('/', verifyToken, requireRole('admin', 'stakeholder'), async (req, res) => {
  try {
    const { name, description, email } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const newCommittee = await db.createCommittee({
      name,
      description,
      email,
      creatorId: req.user.id,
      creatorRole: req.user.role,
      status: req.user.role === 'admin' ? 'active' : 'pending',
      members: [{ userId: req.user.id, name: req.user.name, role: req.user.role }]
    });

    await db.addLog('Committee Created', `${req.user.name} created committee "${newCommittee.name}"`, 'info');

    // Send invitations if inviteEmails provided
    if (req.body.inviteEmails && Array.isArray(req.body.inviteEmails) && req.body.inviteEmails.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      for (const inviteeEmail of req.body.inviteEmails) {
        try {
          const trimmedEmail = inviteeEmail.trim().toLowerCase();
          if (!trimmedEmail) continue;

          // Check if already a pending invitation
          const existing = await db.getPendingInvitation(newCommittee.id, trimmedEmail);
          if (existing) continue;

          const token = crypto.randomBytes(32).toString('hex');
          await db.createCommitteeInvitation({
            committeeId: newCommittee.id,
            committeeName: newCommittee.name,
            email: trimmedEmail,
            invitedBy: req.user.id,
            invitedByName: req.user.name,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          });

          const acceptUrl = `${baseUrl}/api/committees/invitations/${token}/accept`;
          const declineUrl = `${baseUrl}/api/committees/invitations/${token}/decline`;
          await sendCommitteeInvitationEmail(trimmedEmail, req.user.name, newCommittee.name, acceptUrl, declineUrl);
        } catch (invErr) {
          console.error(`Failed to send invitation to ${inviteeEmail}:`, invErr);
        }
      }
    }

    res.status(201).json(newCommittee);
  } catch (error) {
    console.error('Create committee error:', error);
    res.status(500).json({ error: 'Failed to create committee' });
  }
});

// Approve/Reject committee
router.put('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    const updatedCommittee = await db.updateCommitteeStatus(committee.id, status);
    const action = status === 'active' ? 'Approved' : 'Rejected';
    await logActivity(
      `Committee ${action}`,
      `${committee.name} ${action.toLowerCase()} by ${req.user.name}`,
      status === 'active' ? 'success' : 'warning',
      req,
      { category: 'committee', targetType: 'committee', targetId: committee.id, targetName: committee.name }
    );
    // Send real-time notification
    try {
      const io = req.app.get('io');
      if (io) {
        if (status === 'active') {
          await notify(io, { userId: committee.creatorId, type: 'committee_approved', title: 'Committee Approved', message: `Your committee "${committee.name}" has been approved!`, relatedId: committee.id, relatedType: 'committee' });
        } else if (status === 'rejected') {
          await notify(io, { userId: committee.creatorId, type: 'committee_rejected', title: 'Committee Rejected', message: `Your committee "${committee.name}" was not approved.`, relatedId: committee.id, relatedType: 'committee' });
        }
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    // Send rejection email to the committee creator
    if (status === 'rejected') {
      try {
        const creator = await db.getUserById(committee.creatorId);
        if (creator && creator.email) {
          await sendCommitteeRejectionEmail(creator.email, creator.name, committee.name);
        }
      } catch (emailErr) {
        console.error('Committee rejection email error:', emailErr);
      }
    }
    res.json(updatedCommittee);
  } catch (error) {
    console.error('Update committee status error:', error);
    res.status(500).json({ error: 'Failed to update committee status' });
  }
});

// Update committee
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    if (req.user.role !== 'admin' && committee.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this committee' });
    }

    const { name, description, email } = req.body;
    const updatedCommittee = await db.updateCommittee(committee.id, { name, description, email });
    await db.addLog('Committee Updated', `${req.user.name} updated committee "${committee.name}"`, 'info');
    res.json(updatedCommittee);
  } catch (error) {
    console.error('Update committee error:', error);
    res.status(500).json({ error: 'Failed to update committee' });
  }
});

// Delete committee
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    if (req.user.role !== 'admin' && committee.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this committee' });
    }

    await db.deleteCommittee(committee.id);
    await db.addLog('Committee Deleted', `${req.user.name} deleted committee "${committee.name}"`, 'warning');
    res.json({ message: 'Committee deleted successfully' });
  } catch (error) {
    console.error('Delete committee error:', error);
    res.status(500).json({ error: 'Failed to delete committee' });
  }
});

// Join committee
router.post('/:id/join', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const committeeId = req.params.id;
    const committee = await db.getCommitteeById(committeeId);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    const isMember = await db.isUserCommitteeMember(committeeId, req.user.id);
    if (isMember) {
      return res.status(400).json({ error: 'Already a member' });
    }

    await db.addCommitteeMember(committeeId, {
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role
    });

    const updatedCommittee = await db.getCommitteeById(committeeId);
    res.json({ message: 'Joined successfully', committee: updatedCommittee });
  } catch (error) {
    console.error('Join committee error:', error);
    res.status(500).json({ error: 'Failed to join committee' });
  }
});

// Leave committee
router.delete('/:id/leave', verifyToken, async (req, res) => {
  try {
    const committeeId = req.params.id;
    const committee = await db.getCommitteeById(committeeId);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    await db.removeCommitteeMember(committeeId, req.user.id);
    const updatedCommittee = await db.getCommitteeById(committeeId);
    res.json({ message: 'Left successfully', committee: updatedCommittee });
  } catch (error) {
    console.error('Leave committee error:', error);
    res.status(500).json({ error: 'Failed to leave committee' });
  }
});

// Request to join committee
router.post('/:id/request-join', verifyToken, async (req, res) => {
  try {
    const committeeId = req.params.id;
    const committee = await db.getCommitteeById(committeeId);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    const isMember = await db.isUserCommitteeMember(committeeId, req.user.id);
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this committee' });
    }

    const existingRequests = await db.getJoinRequests({ committeeId, userId: req.user.id, status: 'pending' });
    if (existingRequests.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request for this committee' });
    }

    const joinRequest = await db.createJoinRequest({
      committeeId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role
    });

    // Notify committee creator of join request
    try {
      const io = req.app.get('io');
      if (io) {
        await notify(io, { userId: committee.creatorId, type: 'join_request_received', title: 'New Join Request', message: `${req.user.name} wants to join "${committee.name}"`, relatedId: committee.id, relatedType: 'committee' });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    res.status(201).json({ message: 'Join request submitted successfully', request: joinRequest });
  } catch (error) {
    console.error('Request join committee error:', error);
    res.status(500).json({ error: 'Failed to submit join request' });
  }
});

// Get join requests for a committee
router.get('/:id/join-requests', verifyToken, requireCommitteeCreator, async (req, res) => {
  try {
    const requests = await db.getJoinRequests({ committeeId: req.params.id, status: 'pending' });
    res.json(requests);
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Failed to get join requests' });
  }
});

// Approve join request
router.put('/:id/join-requests/:requestId/approve', verifyToken, requireCommitteeCreator, async (req, res) => {
  try {
    const joinRequest = await db.getJoinRequestById(req.params.requestId);
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed' });
    }

    await db.addCommitteeMember(req.committee.id, {
      userId: joinRequest.userId,
      userName: joinRequest.userName,
      userRole: joinRequest.userRole
    });

    const updatedRequest = await db.updateJoinRequest(joinRequest.id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.id
    });

    const updatedCommittee = await db.getCommitteeById(req.committee.id);
    // Notify user their join request was approved
    try {
      const io = req.app.get('io');
      if (io) {
        await notify(io, { userId: joinRequest.userId, type: 'join_request_approved', title: 'Join Request Approved', message: `You've been accepted into "${req.committee.name}"!`, relatedId: req.committee.id, relatedType: 'committee' });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    res.json({ message: 'Join request approved successfully', request: updatedRequest, committee: updatedCommittee });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ error: 'Failed to approve join request' });
  }
});

// Reject join request
router.put('/:id/join-requests/:requestId/reject', verifyToken, requireCommitteeCreator, async (req, res) => {
  try {
    const joinRequest = await db.getJoinRequestById(req.params.requestId);
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed' });
    }

    const updatedRequest = await db.updateJoinRequest(joinRequest.id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.id
    });

    // Notify user their join request was rejected
    try {
      const io = req.app.get('io');
      if (io) {
        await notify(io, { userId: joinRequest.userId, type: 'join_request_rejected', title: 'Join Request Declined', message: `Your request to join "${req.committee.name}" was declined.`, relatedId: req.committee.id, relatedType: 'committee' });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    res.json({ message: 'Join request rejected successfully', request: updatedRequest });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ error: 'Failed to reject join request' });
  }
});

// Posts routes (nested under committees)
router.get('/:id/posts', verifyToken, requireCommitteeMembership, async (req, res) => {
  try {
    const posts = await db.getPosts({ committeeId: req.params.id });

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const liked = await db.hasUserLikedPost(post.id, req.user.id);
      const comments = await db.getPostComments(post.id);
      return { ...post, liked, comments };
    }));

    res.json(postsWithDetails);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

// Create post
router.post('/:id/posts', verifyToken, requireCommitteeMembership, async (req, res) => {
  try {
    const newPost = await db.createPost({
      committeeId: req.params.id,
      userId: req.user.id,
      user: req.user.name,
      role: req.user.role,
      avatar: req.user.avatar,
      content: req.body.content,
      image: req.body.image || null
    });

    // Notify committee members of new post
    try {
      const io = req.app.get('io');
      if (io) {
        await notifyCommittee(io, req.params.id, {
          type: 'new_post',
          title: 'New Post',
          message: `${req.user.name || 'A member'} posted in the committee`,
          relatedId: String(newPost.id || newPost._id),
          relatedType: 'post',
          excludeUserId: req.user.id
        });
      }
    } catch (notifyErr) {
      console.error('Post notification error:', notifyErr);
    }

    res.status(201).json({ ...newPost, liked: false, comments: [] });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Schedule meeting
router.post('/:id/meetings', verifyToken, requireCommitteeMembership, async (req, res) => {
  try {
    const { title, description, date, time, endTime, location, meetingType } = req.body;

    let meetingData = {
      title,
      description,
      date,
      time,
      endTime,
      location,
      meetingType: meetingType || 'in-person',
      createdBy: req.user.id
    };

    // If meeting type is online or hybrid, create Google Meet link
    if (meetingType === 'online' || meetingType === 'hybrid') {
      // Check if user is connected to Google
      const isConnected = await googleCalendar.isUserConnected(req.user.id);

      if (!isConnected) {
        return res.status(400).json({
          error: 'Please connect your Google account first to create online meetings',
          requiresGoogleAuth: true
        });
      }

      try {
        const googleEvent = await googleCalendar.createMeetingWithGoogleMeet(req.user.id, {
          title,
          description,
          date,
          time,
          endTime,
          location,
          meetingType
        });

        meetingData.meetingLink = googleEvent.meetingLink;
        meetingData.googleEventId = googleEvent.googleEventId;
      } catch (googleError) {
        console.error('Google Meet creation error:', googleError);
        return res.status(500).json({
          error: 'Failed to create Google Meet. Please try again or create an in-person meeting.',
          details: googleError.message
        });
      }
    }

    const newMeeting = await db.addCommitteeMeeting(req.params.id, meetingData);

    await db.addLog('Meeting Scheduled', `Meeting scheduled for ${req.committee.name} by ${req.user.name}`, 'info');
    // Notify committee members of new meeting
    try {
      const io = req.app.get('io');
      if (io) {
        await notifyCommittee(io, req.params.id, { type: 'meeting_scheduled', title: 'New Meeting Scheduled', message: `Meeting "${title}" scheduled for ${date}`, relatedId: String(newMeeting.id || newMeeting._id), relatedType: 'meeting', excludeUserId: req.user.id });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    // Send email to all committee members
    try {
      const members = await db.getCommitteeMembers(req.params.id);
      const meetingEmailDetails = {
        title,
        description,
        date,
        time,
        endTime,
        location,
        meetingType: meetingData.meetingType,
        meetingLink: meetingData.meetingLink || null,
        committeeName: req.committee.name,
        scheduledBy: req.user.name
      };
      for (const member of members) {
        if (member.userId === req.user.id) continue; // skip the scheduler
        try {
          const memberUser = await db.getUserById(member.userId);
          if (memberUser && memberUser.email) {
            await sendMeetingScheduledEmail(memberUser.email, memberUser.name, meetingEmailDetails);
          }
        } catch (emailErr) {
          console.error(`Failed to send meeting email to ${member.userName}:`, emailErr);
        }
      }
    } catch (emailErr) {
      console.error('Meeting email notification error:', emailErr);
    }
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// Delete meeting
router.delete('/:id/meetings/:meetingId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    // Get the meeting to check for Google Calendar event
    const meeting = await db.getMeetingById(req.params.meetingId);
    if (meeting && meeting.googleEventId) {
      // Try to delete from Google Calendar
      await googleCalendar.deleteMeetingFromCalendar(meeting.createdBy, meeting.googleEventId);
    }

    await db.deleteCommitteeMeeting(req.params.meetingId);
    await db.addLog('Meeting Deleted', `Meeting deleted from ${committee.name}`, 'warning');
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Upload document
router.post('/:id/documents', verifyToken, requireCommitteeMembership, async (req, res) => {
  try {
    const { name, size, fileData } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Validate file size (10MB limit)
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const fileSizeBytes = Buffer.byteLength(base64Data, 'base64');
    if (fileSizeBytes > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Write file to disk
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');

    const uploadsDir = path.join(__dirname, '../../uploads/documents');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    const uniqueName = crypto.randomUUID() + ext;
    const filePath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/uploads/documents/${uniqueName}`;

    const newDocument = await db.addCommitteeDocument(req.params.id, {
      name,
      url: fileUrl,
      size,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name
    });

    await db.addLog('Document Uploaded', `${req.user.name} uploaded document to ${req.committee.name}`, 'info');
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Delete document
router.delete('/:id/documents/:documentId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const committee = await db.getCommitteeById(req.params.id);
    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    await db.deleteCommitteeDocument(req.params.documentId);
    await db.addLog('Document Deleted', `Document deleted from ${committee.name}`, 'warning');
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
