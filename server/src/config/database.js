// MongoDB Database Wrapper for UTM Engagement Platform
const connectDB = require('./mongodb');
const {
  User,
  Event,
  EventRegistration,
  Committee,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeDocument,
  Post,
  PostLike,
  PostComment,
  JoinRequest,
  Report,
  Feedback,
  SystemLog,
  BroadcastMessage,
  UserGoogleToken,
  CommitteeInvitation
} = require('../models');

class Database {
  constructor() {
    this.connected = false;
  }

  // ==================== USERS ====================
  async getUsers() {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    return users.map(u => this.transformUser(u));
  }

  async getUserById(id) {
    const user = await User.findById(id).lean();
    return user ? this.transformUser(user) : null;
  }

  async getUserByEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    return user ? this.transformUser(user) : null;
  }

  async getUserByEmailRaw(email) {
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    return user ? this.transformUserRaw(user) : null;
  }

  async getUserByIdRaw(id) {
    const user = await User.findById(id).lean();
    return user ? this.transformUserRaw(user) : null;
  }

  async createUser(user) {
    const userData = new User({
      _id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      password: user.password,
      role: user.role,
      status: user.status || 'active',
      joined: user.joined || new Date(),
      department: user.department || null,
      phone: user.phone || null,
      bio: user.bio || null,
      avatar: user.avatar || null,
      isVerified: user.isVerified || false,
      mustChangePassword: user.mustChangePassword || false,
      otp: user.otp || null,
      otpExpiry: user.otpExpiry || null
    });
    const saved = await userData.save();
    return this.transformUser(saved.toObject());
  }

  async updateUser(id, updates) {
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
    return user ? this.transformUser(user) : null;
  }

  async deleteUser(id) {
    await User.findByIdAndDelete(id);
    return true;
  }

  transformUser(user) {
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      joined: user.joined,
      department: user.department,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      isVerified: user.isVerified || false,
      mustChangePassword: user.mustChangePassword || false,
      createdAt: user.createdAt
    };
  }

  transformUserRaw(user) {
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      status: user.status,
      joined: user.joined,
      department: user.department,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      isVerified: user.isVerified || false,
      mustChangePassword: user.mustChangePassword || false,
      otp: user.otp,
      otpExpiry: user.otpExpiry,
      createdAt: user.createdAt
    };
  }

  // ==================== EVENTS ====================
  async getEvents(filters = {}) {
    let query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.category && filters.category !== 'All Events') {
      query.category = filters.category;
    }

    // Filter for upcoming events (future dates only)
    if (filters.upcoming) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.date = { $gte: today };
    }

    // Sort by date ascending for upcoming events, otherwise by creation date
    const sortOrder = filters.upcoming ? { date: 1 } : { createdAt: -1 };
    const events = await Event.find(query).sort(sortOrder).lean();

    // Add attendee count for each event
    const eventsWithCounts = await Promise.all(events.map(async (event) => {
      const attendees = await EventRegistration.countDocuments({ eventId: event._id });
      return this.transformEvent({ ...event, attendees });
    }));

    return eventsWithCounts;
  }

  async getEventById(id) {
    const event = await Event.findById(id).lean();
    if (!event) return null;

    const attendees = await EventRegistration.countDocuments({ eventId: event._id });
    return this.transformEvent({ ...event, attendees });
  }

  async createEvent(event) {
    const eventData = new Event({
      title: event.title,
      date: event.date,
      time: event.time,
      status: event.status || 'pending',
      type: event.type || null,
      category: event.category || null,
      proposer: event.proposer,
      proposerId: event.proposerId,
      proposerRole: event.proposerRole,
      location: event.location || null,
      capacity: event.capacity || 100,
      image: event.image || null,
      description: event.description || null,
      tags: event.tags || []
    });
    const saved = await eventData.save();
    return this.transformEvent({ ...saved.toObject(), attendees: 0 });
  }

  async updateEvent(id, updates) {
    const { attendees, registrations, isRegistered, ...validUpdates } = updates;
    await Event.findByIdAndUpdate(id, validUpdates);
    return this.getEventById(id);
  }

  async deleteEvent(id) {
    await Event.findByIdAndDelete(id);
    await EventRegistration.deleteMany({ eventId: id });
    return true;
  }

  transformEvent(event) {
    if (!event) return null;
    return {
      id: event._id,
      title: event.title,
      date: event.date,
      time: event.time,
      status: event.status,
      type: event.type,
      category: event.category,
      proposer: event.proposer,
      proposerId: event.proposerId,
      proposerRole: event.proposerRole,
      location: event.location,
      capacity: event.capacity,
      image: event.image,
      description: event.description,
      tags: event.tags,
      attendees: event.attendees || 0,
      createdAt: event.createdAt
    };
  }

  // ==================== EVENT REGISTRATIONS ====================
  async getEventRegistrations(eventId) {
    const registrations = await EventRegistration.find({ eventId }).lean();
    return registrations.map(r => r.userId);
  }

  async isUserRegisteredForEvent(eventId, userId) {
    const registration = await EventRegistration.findOne({ eventId, userId }).lean();
    return !!registration;
  }

  async registerForEvent(eventId, userId) {
    const { v4: uuidv4 } = require('uuid');
    const registration = new EventRegistration({ eventId, userId, checkInCode: uuidv4() });
    const saved = await registration.save();
    return {
      id: saved._id,
      eventId: saved.eventId,
      userId: saved.userId,
      checkInCode: saved.checkInCode,
      registeredAt: saved.registeredAt
    };
  }

  async unregisterFromEvent(eventId, userId) {
    await EventRegistration.deleteOne({ eventId, userId });
    return true;
  }

  async getEventRegistrationCount(eventId) {
    return await EventRegistration.countDocuments({ eventId });
  }

  async getEventRegistrationsWithUsers(eventId) {
    const registrations = await EventRegistration.find({ eventId }).lean();

    // Get user details for each registration
    const registrationsWithUsers = await Promise.all(
      registrations.map(async (reg) => {
        const user = await User.findById(reg.userId).lean();
        return {
          id: reg._id,
          eventId: reg.eventId,
          userId: reg.userId,
          registeredAt: reg.registeredAt,
          checkInCode: reg.checkInCode,
          checkedIn: reg.checkedIn || false,
          checkedInAt: reg.checkedInAt,
          checkedInBy: reg.checkedInBy,
          user: user ? {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            avatar: user.avatar
          } : null
        };
      })
    );

    return registrationsWithUsers;
  }

  async getRegistrationByCheckInCode(checkInCode) {
    const reg = await EventRegistration.findOne({ checkInCode }).lean();
    if (!reg) return null;
    const user = await User.findById(reg.userId).lean();
    return {
      id: reg._id,
      eventId: reg.eventId,
      userId: reg.userId,
      checkInCode: reg.checkInCode,
      checkedIn: reg.checkedIn,
      checkedInAt: reg.checkedInAt,
      checkedInBy: reg.checkedInBy,
      registeredAt: reg.registeredAt,
      user: user ? { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, avatar: user.avatar } : null
    };
  }

  async checkInRegistration(checkInCode, checkedInBy) {
    const reg = await EventRegistration.findOneAndUpdate(
      { checkInCode, checkedIn: false },
      { checkedIn: true, checkedInAt: new Date(), checkedInBy },
      { new: true }
    ).lean();
    if (!reg) return null;
    const user = await User.findById(reg.userId).lean();
    return {
      id: reg._id,
      eventId: reg.eventId,
      userId: reg.userId,
      checkedIn: reg.checkedIn,
      checkedInAt: reg.checkedInAt,
      checkedInBy: reg.checkedInBy,
      user: user ? { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, avatar: user.avatar } : null
    };
  }

  async getEventCheckInStats(eventId) {
    const total = await EventRegistration.countDocuments({ eventId });
    const checkedIn = await EventRegistration.countDocuments({ eventId, checkedIn: true });
    return { total, checkedIn, pending: total - checkedIn };
  }

  // ==================== COMMITTEES ====================
  async getCommittees(filters = {}) {
    let query = {};

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }

    const committees = await Committee.find(query).sort({ createdAt: -1 }).lean();

    const committeesWithCounts = await Promise.all(committees.map(async (committee) => {
      const memberCount = await CommitteeMember.countDocuments({ committeeId: committee._id });
      return this.transformCommittee({ ...committee, memberCount });
    }));

    return committeesWithCounts;
  }

  async getCommitteeById(id) {
    const committee = await Committee.findById(id).lean();
    if (!committee) return null;

    const [members, meetings, documents, memberCount] = await Promise.all([
      CommitteeMember.find({ committeeId: id }).lean(),
      CommitteeMeeting.find({ committeeId: id }).sort({ date: 1 }).lean(),
      CommitteeDocument.find({ committeeId: id }).sort({ uploadedAt: -1 }).lean(),
      CommitteeMember.countDocuments({ committeeId: id })
    ]);

    return {
      ...this.transformCommittee({ ...committee, memberCount }),
      members: members.map(m => this.transformCommitteeMember(m)),
      meetings: meetings.map(m => this.transformMeeting(m)),
      documents: documents.map(d => this.transformDocument(d))
    };
  }

  async createCommittee(committee) {
    const committeeData = new Committee({
      name: committee.name,
      description: committee.description || null,
      category: committee.category || null,
      banner: committee.banner || 'bg-blue-600',
      status: committee.status || 'pending',
      creatorId: committee.creatorId,
      creatorRole: committee.creatorRole,
      leader: committee.leader || null,
      nextMeeting: committee.nextMeeting || null
    });
    const saved = await committeeData.save();

    // Add creator as first member
    if (committee.members && committee.members.length > 0) {
      const firstMember = committee.members[0];
      await this.addCommitteeMember(saved._id, {
        userId: firstMember.userId,
        userName: firstMember.name,
        userRole: firstMember.role,
        isLeader: true
      });
    }

    return this.getCommitteeById(saved._id);
  }

  async updateCommitteeStatus(id, status) {
    await Committee.findByIdAndUpdate(id, { status });
    return this.getCommitteeById(id);
  }

  async updateCommittee(id, updates) {
    const { members, meetings, documents, memberCount, isMember, restrictedAccess, status, ...validUpdates } = updates;

    if (Object.keys(validUpdates).length > 0) {
      await Committee.findByIdAndUpdate(id, validUpdates);
    }

    return this.getCommitteeById(id);
  }

  async deleteCommittee(id) {
    await Committee.findByIdAndDelete(id);
    await CommitteeMember.deleteMany({ committeeId: id });
    await CommitteeMeeting.deleteMany({ committeeId: id });
    await CommitteeDocument.deleteMany({ committeeId: id });
    await Post.deleteMany({ committeeId: id });
    await JoinRequest.deleteMany({ committeeId: id });
    return true;
  }

  transformCommittee(committee) {
    if (!committee) return null;
    return {
      id: committee._id,
      name: committee.name,
      description: committee.description,
      category: committee.category,
      banner: committee.banner,
      status: committee.status,
      creatorId: committee.creatorId,
      creatorRole: committee.creatorRole,
      leader: committee.leader,
      nextMeeting: committee.nextMeeting,
      memberCount: committee.memberCount || 0,
      createdAt: committee.createdAt
    };
  }

  // ==================== COMMITTEE INVITATIONS ====================
  async createCommitteeInvitation(invitation) {
    const inv = new CommitteeInvitation(invitation);
    const saved = await inv.save();
    return saved.toObject();
  }

  async getInvitationByToken(token) {
    const inv = await CommitteeInvitation.findOne({ token }).lean();
    return inv || null;
  }

  async updateInvitationStatus(token, status) {
    const inv = await CommitteeInvitation.findOneAndUpdate({ token }, { status }, { new: true }).lean();
    return inv || null;
  }

  async getPendingInvitation(committeeId, email) {
    const inv = await CommitteeInvitation.findOne({ committeeId, email: email.toLowerCase(), status: 'pending' }).lean();
    return inv || null;
  }

  async getPendingInvitationsByEmail(email) {
    const invitations = await CommitteeInvitation.find({ email: email.toLowerCase(), status: 'pending' }).lean();
    return invitations;
  }

  // ==================== COMMITTEE MEMBERS ====================
  async getCommitteeMembers(committeeId) {
    const members = await CommitteeMember.find({ committeeId }).lean();
    return members.map(m => this.transformCommitteeMember(m));
  }

  async isUserCommitteeMember(committeeId, userId) {
    const member = await CommitteeMember.findOne({ committeeId, userId }).lean();
    return !!member;
  }

  async addCommitteeMember(committeeId, member) {
    const memberData = new CommitteeMember({
      committeeId,
      userId: member.userId,
      userName: member.userName,
      userRole: member.userRole,
      isLeader: member.isLeader || false
    });
    const saved = await memberData.save();
    return this.transformCommitteeMember(saved.toObject());
  }

  async removeCommitteeMember(committeeId, userId) {
    await CommitteeMember.deleteOne({ committeeId, userId });
    return true;
  }

  transformCommitteeMember(member) {
    if (!member) return null;
    return {
      id: member._id,
      committeeId: member.committeeId,
      userId: member.userId,
      userName: member.userName,
      userRole: member.userRole,
      isLeader: member.isLeader,
      joinedAt: member.joinedAt
    };
  }

  // ==================== COMMITTEE MEETINGS ====================
  async addCommitteeMeeting(committeeId, meeting) {
    const meetingData = new CommitteeMeeting({
      committeeId,
      title: meeting.title,
      description: meeting.description || null,
      date: meeting.date,
      time: meeting.time || null,
      endTime: meeting.endTime || null,
      location: meeting.location || null,
      meetingType: meeting.meetingType || 'in-person',
      meetingLink: meeting.meetingLink || null,
      googleEventId: meeting.googleEventId || null,
      createdBy: meeting.createdBy
    });
    const saved = await meetingData.save();
    return this.transformMeeting(saved.toObject());
  }

  async getMeetingById(meetingId) {
    const meeting = await CommitteeMeeting.findById(meetingId).lean();
    return meeting ? this.transformMeeting(meeting) : null;
  }

  async deleteCommitteeMeeting(meetingId) {
    await CommitteeMeeting.findByIdAndDelete(meetingId);
    return true;
  }

  transformMeeting(meeting) {
    if (!meeting) return null;
    return {
      id: meeting._id,
      committeeId: meeting.committeeId,
      title: meeting.title,
      description: meeting.description,
      date: meeting.date,
      time: meeting.time,
      endTime: meeting.endTime,
      location: meeting.location,
      meetingType: meeting.meetingType || 'in-person',
      meetingLink: meeting.meetingLink,
      googleEventId: meeting.googleEventId,
      createdBy: meeting.createdBy,
      createdAt: meeting.createdAt
    };
  }

  // ==================== GOOGLE TOKENS ====================
  async saveGoogleToken(userId, tokenData) {
    const data = {
      userId,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
      tokenType: tokenData.tokenType || 'Bearer'
    };

    const token = await UserGoogleToken.findOneAndUpdate(
      { userId },
      data,
      { upsert: true, new: true }
    ).lean();

    return this.transformGoogleToken(token);
  }

  async getGoogleToken(userId) {
    const token = await UserGoogleToken.findOne({ userId }).lean();
    return token ? this.transformGoogleToken(token) : null;
  }

  async deleteGoogleToken(userId) {
    await UserGoogleToken.deleteOne({ userId });
    return true;
  }

  async isUserGoogleConnected(userId) {
    const token = await UserGoogleToken.findOne({ userId }).lean();
    return !!token;
  }

  transformGoogleToken(token) {
    if (!token) return null;
    return {
      id: token._id,
      userId: token.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scope: token.scope,
      tokenType: token.tokenType,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt
    };
  }

  // ==================== COMMITTEE DOCUMENTS ====================
  async addCommitteeDocument(committeeId, document) {
    const documentData = new CommitteeDocument({
      committeeId,
      name: document.name,
      size: document.size || null,
      url: document.url || null,
      uploadedBy: document.uploadedBy,
      uploadedByName: document.uploadedByName
    });
    const saved = await documentData.save();
    return this.transformDocument(saved.toObject());
  }

  async deleteCommitteeDocument(documentId) {
    await CommitteeDocument.findByIdAndDelete(documentId);
    return true;
  }

  transformDocument(doc) {
    if (!doc) return null;
    return {
      id: doc._id,
      committeeId: doc.committeeId,
      name: doc.name,
      size: doc.size,
      url: doc.url,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName,
      uploadedAt: doc.uploadedAt
    };
  }

  // ==================== POSTS ====================
  async getPosts(filters = {}) {
    let query = {};

    if (filters.committeeId) {
      query.committeeId = filters.committeeId;
    }

    const posts = await Post.find(query).sort({ createdAt: -1 }).lean();

    const postsWithCounts = await Promise.all(posts.map(async (post) => {
      const [likesCount, commentsCount] = await Promise.all([
        PostLike.countDocuments({ postId: post._id }),
        PostComment.countDocuments({ postId: post._id })
      ]);
      return this.transformPost({ ...post, likesCount, commentsCount });
    }));

    return postsWithCounts;
  }

  async getPostById(id) {
    const post = await Post.findById(id).lean();
    if (!post) return null;

    const [likesCount, commentsCount] = await Promise.all([
      PostLike.countDocuments({ postId: post._id }),
      PostComment.countDocuments({ postId: post._id })
    ]);

    return this.transformPost({ ...post, likesCount, commentsCount });
  }

  async createPost(post) {
    const postData = new Post({
      committeeId: post.committeeId,
      userId: post.userId,
      userName: post.user,
      userRole: post.role,
      avatar: post.avatar || null,
      content: post.content,
      image: post.image || null
    });
    const saved = await postData.save();
    return this.transformPost({ ...saved.toObject(), likesCount: 0, commentsCount: 0 });
  }

  async deletePost(id) {
    await Post.findByIdAndDelete(id);
    await PostLike.deleteMany({ postId: id });
    await PostComment.deleteMany({ postId: id });
    return true;
  }

  transformPost(post) {
    if (!post) return null;
    return {
      id: post._id,
      committeeId: post.committeeId,
      userId: post.userId,
      userName: post.userName,
      userRole: post.userRole,
      avatar: post.avatar,
      content: post.content,
      image: post.image,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      createdAt: post.createdAt
    };
  }

  // ==================== POST LIKES ====================
  async getPostLikes(postId) {
    const likes = await PostLike.find({ postId }).lean();
    return likes.map(l => l.userId);
  }

  async hasUserLikedPost(postId, userId) {
    const like = await PostLike.findOne({ postId, userId }).lean();
    return !!like;
  }

  async likePost(postId, userId) {
    const like = new PostLike({ postId, userId });
    await like.save();
    return true;
  }

  async unlikePost(postId, userId) {
    await PostLike.deleteOne({ postId, userId });
    return true;
  }

  // ==================== POST COMMENTS ====================
  async getPostComments(postId) {
    const comments = await PostComment.find({ postId }).sort({ createdAt: 1 }).lean();
    return comments.map(c => this.transformComment(c));
  }

  async addPostComment(postId, comment) {
    const commentData = new PostComment({
      postId,
      userId: comment.userId,
      userName: comment.userName,
      text: comment.text
    });
    const saved = await commentData.save();
    return this.transformComment(saved.toObject());
  }

  transformComment(comment) {
    if (!comment) return null;
    return {
      id: comment._id,
      postId: comment.postId,
      userId: comment.userId,
      userName: comment.userName,
      text: comment.text,
      createdAt: comment.createdAt
    };
  }

  // ==================== REPORTS ====================
  async getReports(filters = {}) {
    const query = {};
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters.contentType) {
      query.contentType = filters.contentType;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = reports.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return sorted.map(r => this.transformReport(r));
  }

  async getReportById(id) {
    const report = await Report.findById(id).lean();
    return report ? this.transformReport(report) : null;
  }

  async createReport(report) {
    // Determine priority based on reason
    let priority = 'medium';
    if (report.reason === 'harassment' || report.reason === 'hate_speech') {
      priority = 'critical';
    } else if (report.reason === 'misinformation') {
      priority = 'high';
    } else if (report.reason === 'spam') {
      priority = 'low';
    }

    const reportData = new Report({
      reporterId: report.reporterId,
      reporterName: report.reporterName,
      reporterEmail: report.reporterEmail,
      contentType: report.contentType || 'post',
      contentId: String(report.contentId || ''),
      contentPreview: report.contentPreview,
      contentAuthorId: report.contentAuthorId,
      contentAuthorName: report.contentAuthorName,
      reason: report.reason,
      description: report.description || null,
      status: 'pending',
      priority
    });
    const saved = await reportData.save();
    return this.transformReport(saved.toObject());
  }

  async updateReportStatus(id, status, adminId, adminName) {
    const updateData = { status };
    if (status === 'reviewing') {
      updateData.resolvedBy = adminId;
      updateData.resolvedByName = adminName;
    }

    const report = await Report.findByIdAndUpdate(id, updateData, { new: true }).lean();
    return report ? this.transformReport(report) : null;
  }

  async resolveReport(id, resolution, resolutionNotes, adminId, adminName) {
    const report = await Report.findByIdAndUpdate(id, {
      status: 'resolved',
      resolution,
      resolutionNotes,
      resolvedBy: adminId,
      resolvedByName: adminName,
      resolvedAt: new Date()
    }, { new: true }).lean();
    return report ? this.transformReport(report) : null;
  }

  async dismissReport(id, resolutionNotes, adminId, adminName) {
    const report = await Report.findByIdAndUpdate(id, {
      status: 'dismissed',
      resolution: 'no_action',
      resolutionNotes,
      resolvedBy: adminId,
      resolvedByName: adminName,
      resolvedAt: new Date()
    }, { new: true }).lean();
    return report ? this.transformReport(report) : null;
  }

  async deleteReport(id) {
    await Report.findByIdAndDelete(id);
    return true;
  }

  transformReport(report) {
    if (!report) return null;
    return {
      id: report._id,
      reporterId: report.reporterId,
      reporterName: report.reporterName,
      reporterEmail: report.reporterEmail,
      contentType: report.contentType,
      contentId: report.contentId,
      contentPreview: report.contentPreview,
      contentAuthorId: report.contentAuthorId,
      contentAuthorName: report.contentAuthorName,
      reason: report.reason,
      description: report.description,
      status: report.status,
      priority: report.priority,
      resolvedBy: report.resolvedBy,
      resolvedByName: report.resolvedByName,
      resolvedAt: report.resolvedAt,
      resolution: report.resolution,
      resolutionNotes: report.resolutionNotes,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  }

  // ==================== FEEDBACK ====================
  async getAllFeedback(filters = {}) {
    const query = {};

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters.type && filters.type !== 'all') {
      query.type = filters.type;
    }
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.search) {
      query.$or = [
        { message: { $regex: filters.search, $options: 'i' } },
        { subject: { $regex: filters.search, $options: 'i' } },
        { userName: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const limit = filters.limit || 100;
    const skip = filters.offset || 0;

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Feedback.countDocuments(query);

    return {
      feedback: feedback.map(f => this.transformFeedback(f)),
      total,
      limit,
      offset: skip
    };
  }

  async getFeedbackById(id) {
    const feedback = await Feedback.findById(id).lean();
    return feedback ? this.transformFeedback(feedback) : null;
  }

  async createFeedback(feedback) {
    const feedbackData = new Feedback({
      userId: feedback.userId,
      userName: feedback.userName,
      userEmail: feedback.userEmail || null,
      userRole: feedback.userRole || null,
      type: feedback.type || 'general',
      subject: feedback.subject || null,
      message: feedback.message,
      rating: feedback.rating || null,
      status: 'new'
    });
    const saved = await feedbackData.save();
    return this.transformFeedback(saved.toObject());
  }

  async updateFeedbackStatus(id, status, adminId, adminName, adminNotes) {
    const updateData = { status };

    if (status === 'reviewed' || status === 'archived') {
      updateData.reviewedBy = adminId;
      updateData.reviewedByName = adminName;
      updateData.reviewedAt = new Date();
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const feedback = await Feedback.findByIdAndUpdate(id, updateData, { new: true }).lean();
    return feedback ? this.transformFeedback(feedback) : null;
  }

  async deleteFeedback(id) {
    await Feedback.findByIdAndDelete(id);
    return true;
  }

  async getFeedbackStats() {
    const [total, newCount, reviewedCount, archivedCount, byType, avgRating] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'new' }),
      Feedback.countDocuments({ status: 'reviewed' }),
      Feedback.countDocuments({ status: 'archived' }),
      Feedback.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Feedback.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ])
    ]);

    return {
      total,
      new: newCount,
      reviewed: reviewedCount,
      archived: archivedCount,
      byType: byType.reduce((acc, item) => {
        acc[item._id || 'general'] = item.count;
        return acc;
      }, {}),
      averageRating: avgRating[0]?.avgRating ? parseFloat(avgRating[0].avgRating.toFixed(1)) : null
    };
  }

  transformFeedback(feedback) {
    if (!feedback) return null;
    return {
      id: feedback._id,
      userId: feedback.userId,
      userName: feedback.userName,
      userEmail: feedback.userEmail,
      userRole: feedback.userRole,
      type: feedback.type,
      subject: feedback.subject,
      message: feedback.message,
      rating: feedback.rating,
      status: feedback.status,
      adminNotes: feedback.adminNotes,
      reviewedBy: feedback.reviewedBy,
      reviewedByName: feedback.reviewedByName,
      reviewedAt: feedback.reviewedAt,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt
    };
  }

  // ==================== SYSTEM LOGS ====================
  async getLogs(filters = {}) {
    const query = {};

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      query.category = filters.category;
    }

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      query.type = filters.type;
    }

    // Filter by user
    if (filters.userId) {
      query.userId = filters.userId;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    // Filter by action (search)
    if (filters.search) {
      query.$or = [
        { action: { $regex: filters.search, $options: 'i' } },
        { details: { $regex: filters.search, $options: 'i' } },
        { userName: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const limit = filters.limit || 200;
    const skip = filters.offset || 0;

    const logs = await SystemLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await SystemLog.countDocuments(query);

    return {
      logs: logs.map(l => this.transformLog(l)),
      total,
      limit,
      offset: skip
    };
  }

  async getLogStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, todayCount, weekCount, byCategory, byType] = await Promise.all([
      SystemLog.countDocuments(),
      SystemLog.countDocuments({ createdAt: { $gte: today } }),
      SystemLog.countDocuments({ createdAt: { $gte: weekAgo } }),
      SystemLog.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      SystemLog.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    return {
      total,
      today: todayCount,
      thisWeek: weekCount,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {})
    };
  }

  async addLog(action, details, type = 'info', options = {}) {
    try {
      const logData = new SystemLog({
        action,
        details,
        type,
        category: options.category || 'system',
        userId: options.userId || null,
        userName: options.userName || null,
        userEmail: options.userEmail || null,
        userRole: options.userRole || null,
        targetType: options.targetType || null,
        targetId: options.targetId || null,
        targetName: options.targetName || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        method: options.method || null,
        path: options.path || null,
        metadata: options.metadata || {},
        status: options.status || 'success'
      });
      const saved = await logData.save();
      return this.transformLog(saved.toObject());
    } catch (error) {
      console.error('Failed to add log:', error);
      return null;
    }
  }

  transformLog(log) {
    if (!log) return null;
    return {
      id: log._id,
      action: log.action,
      category: log.category,
      type: log.type,
      details: log.details,
      userId: log.userId,
      userName: log.userName,
      userEmail: log.userEmail,
      userRole: log.userRole,
      targetType: log.targetType,
      targetId: log.targetId,
      targetName: log.targetName,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      method: log.method,
      path: log.path,
      metadata: log.metadata,
      status: log.status,
      createdAt: log.createdAt
    };
  }

  // ==================== JOIN REQUESTS ====================
  async getJoinRequests(filters = {}) {
    let query = {};

    if (filters.committeeId) {
      query.committeeId = filters.committeeId;
    }
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    const requests = await JoinRequest.find(query).sort({ requestedAt: -1 }).lean();
    return requests.map(r => this.transformJoinRequest(r));
  }

  async getJoinRequestById(id) {
    const request = await JoinRequest.findById(id).lean();
    return request ? this.transformJoinRequest(request) : null;
  }

  async createJoinRequest(request) {
    const requestData = new JoinRequest({
      committeeId: request.committeeId,
      userId: request.userId,
      userName: request.userName,
      userRole: request.userRole,
      status: 'pending'
    });
    const saved = await requestData.save();
    return this.transformJoinRequest(saved.toObject());
  }

  async updateJoinRequest(id, updates) {
    const request = await JoinRequest.findByIdAndUpdate(id, updates, { new: true }).lean();
    return request ? this.transformJoinRequest(request) : null;
  }

  transformJoinRequest(request) {
    if (!request) return null;
    return {
      id: request._id,
      committeeId: request.committeeId,
      userId: request.userId,
      userName: request.userName,
      userRole: request.userRole,
      status: request.status,
      requestedAt: request.requestedAt,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy
    };
  }

  // ==================== BROADCAST MESSAGES ====================
  async getBroadcastMessages(filters = {}) {
    let query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.targetType) {
      query.targetType = filters.targetType;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const messages = await BroadcastMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .lean();

    return messages.map(m => this.transformBroadcastMessage(m));
  }

  async getBroadcastMessageById(id) {
    const message = await BroadcastMessage.findById(id).lean();
    return message ? this.transformBroadcastMessage(message) : null;
  }

  async getBroadcastMessagesForUser(userId, committeeIds = []) {
    // Check if user is a committee leader
    const isLeader = await CommitteeMember.exists({ userId, isLeader: true });

    // Get messages that are:
    // 1. Sent to all committees
    // 2. Sent to specific committees the user belongs to
    // 3. Sent to committee leaders (if user is a leader)
    const orConditions = [
      { targetType: 'all' },
      { targetType: 'specific', targetCommittees: { $in: committeeIds } }
    ];

    // Include 'leaders' broadcasts only if user is a committee leader
    if (isLeader) {
      orConditions.push({ targetType: 'leaders' });
    }

    const query = {
      status: 'sent',
      $or: orConditions
    };

    const messages = await BroadcastMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return messages.map(m => ({
      ...this.transformBroadcastMessage(m),
      isRead: m.readBy?.includes(userId) || false
    }));
  }

  async createBroadcastMessage(message) {
    const messageData = new BroadcastMessage({
      title: message.title,
      message: message.message,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      targetType: message.targetType || 'all',
      targetCategory: message.targetCategory || null,
      targetCommittees: message.targetCommittees || [],
      priority: message.priority || 'normal',
      status: message.status || 'sent',
      scheduledFor: message.scheduledFor || null,
      recipientCount: message.recipientCount || 0
    });
    const saved = await messageData.save();
    return this.transformBroadcastMessage(saved.toObject());
  }

  async markBroadcastAsRead(messageId, userId) {
    await BroadcastMessage.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } }
    );
    return true;
  }

  async updateBroadcastMessage(id, updates) {
    const { readBy, senderId, senderName, senderRole, createdAt, updatedAt, ...validUpdates } = updates;

    if (Object.keys(validUpdates).length > 0) {
      await BroadcastMessage.findByIdAndUpdate(id, validUpdates);
    }

    return this.getBroadcastMessageById(id);
  }

  async deleteBroadcastMessage(id) {
    await BroadcastMessage.findByIdAndDelete(id);
    return true;
  }

  async getUnreadBroadcastCount(userId, committeeIds = []) {
    // Check if user is a committee leader
    const isLeader = await CommitteeMember.exists({ userId, isLeader: true });

    const orConditions = [
      { targetType: 'all' },
      { targetType: 'specific', targetCommittees: { $in: committeeIds } }
    ];

    // Include 'leaders' broadcasts only if user is a committee leader
    if (isLeader) {
      orConditions.push({ targetType: 'leaders' });
    }

    const query = {
      status: 'sent',
      readBy: { $ne: userId },
      $or: orConditions
    };
    return await BroadcastMessage.countDocuments(query);
  }

  async getAllCommitteeMemberUserIds(committeeIds = []) {
    let query = {};
    if (committeeIds.length > 0) {
      query.committeeId = { $in: committeeIds };
    }
    const members = await CommitteeMember.find(query).distinct('userId');
    return members;
  }

  async getCommitteeLeaderUserIds() {
    const leaders = await CommitteeMember.find({ isLeader: true }).distinct('userId');
    return leaders;
  }

  transformBroadcastMessage(message) {
    if (!message) return null;
    return {
      id: message._id,
      title: message.title,
      message: message.message,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      targetType: message.targetType,
      targetCategory: message.targetCategory,
      targetCommittees: message.targetCommittees,
      priority: message.priority,
      status: message.status,
      scheduledFor: message.scheduledFor,
      readBy: message.readBy,
      recipientCount: message.recipientCount,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };
  }

  // ==================== ANALYTICS ====================
  async getAnalytics() {
    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      totalCommittees,
      activeCommittees,
      pendingCommittees,
      totalUsers,
      totalPosts,
      totalRegistrations,
      pendingReports
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'rejected' }),
      Committee.countDocuments(),
      Committee.countDocuments({ status: 'active' }),
      Committee.countDocuments({ status: 'pending' }),
      User.countDocuments(),
      Post.countDocuments(),
      EventRegistration.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);

    // Get top committees by member count (include active and pending)
    const committees = await Committee.find({ status: { $in: ['active', 'pending'] } }).lean();
    const committeesWithMembers = await Promise.all(
      committees.map(async (committee) => {
        const memberCount = await CommitteeMember.countDocuments({ committeeId: committee._id });
        return {
          name: committee.name.length > 15 ? committee.name.substring(0, 15) + '...' : committee.name,
          members: memberCount,
          fullName: committee.name
        };
      })
    );
    // Sort by member count and take top 5
    const topCommittees = committeesWithMembers
      .sort((a, b) => b.members - a.members)
      .slice(0, 5);

    // Get user activity for the last 7 days
    const now = new Date();
    const userActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const [loginsCount, registrationsCount] = await Promise.all([
        SystemLog.countDocuments({
          action: { $regex: /login/i },
          createdAt: { $gte: dayStart, $lt: dayEnd }
        }),
        EventRegistration.countDocuments({
          registeredAt: { $gte: dayStart, $lt: dayEnd }
        })
      ]);

      userActivity.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        logins: loginsCount,
        registrations: registrationsCount
      });
    }

    return {
      totalEvents: totalEvents || 0,
      totalUsers: totalUsers || 0,
      totalCommittees: activeCommittees || 0,
      totalRegistrations: totalRegistrations || 0,
      totalPosts: totalPosts || 0,
      pendingReports: pendingReports || 0,
      eventsByStatus: {
        approved: approvedEvents || 0,
        pending: pendingEvents || 0,
        rejected: rejectedEvents || 0
      },
      topCommittees: topCommittees,
      userActivity: userActivity
    };
  }

  // ==================== INITIALIZATION ====================
  async initialize() {
    console.log('Connecting to MongoDB...');
    try {
      await connectDB();
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  // Seed initial data
  async seed() {
    const { INITIAL_EVENTS, INITIAL_COMMITTEES, INITIAL_USERS, INITIAL_POSTS, SYSTEM_LOGS } = require('../data/seed');

    console.log('Seeding database...');

    // Seed users
    for (const user of INITIAL_USERS) {
      try {
        const existing = await User.findById(user.id);
        if (!existing) {
          await this.createUser(user);
          console.log(`  Created user: ${user.email}`);
        } else {
          console.log(`  User exists: ${user.email}`);
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  User exists: ${user.email}`);
        } else {
          console.error(`  Failed to create user ${user.email}:`, error.message);
        }
      }
    }

    // Seed events (skip duplicates by checking title)
    for (const event of INITIAL_EVENTS) {
      try {
        const { id, attendees, registrations, ...eventData } = event;
        const existing = await Event.findOne({ title: eventData.title });
        if (existing) {
          console.log(`  Event exists: ${event.title}`);
          continue;
        }
        const newEvent = await this.createEvent(eventData);
        console.log(`  Created event: ${event.title}`);

        // Add registrations
        if (registrations && registrations.length > 0) {
          for (const userId of registrations) {
            try {
              await this.registerForEvent(newEvent.id, userId);
            } catch (e) {
              // Ignore registration errors
            }
          }
        }
      } catch (error) {
        console.error(`  Failed to create event ${event.title}:`, error.message);
      }
    }

    // Seed committees (skip duplicates by checking name)
    for (const committee of INITIAL_COMMITTEES) {
      try {
        const { id, _id, membersCount, memberCount, isMember, members, meetings, documents, ...committeeData } = committee;

        const existingCommittee = await Committee.findOne({ name: committeeData.name });
        if (existingCommittee) {
          console.log(`  Committee exists: ${committee.name}`);
          continue;
        }

        // Create committee
        const newCommittee = new Committee({
          name: committeeData.name,
          description: committeeData.description,
          category: committeeData.category,
          banner: committeeData.banner,
          status: committeeData.status,
          creatorId: committeeData.creatorId,
          creatorRole: committeeData.creatorRole,
          leader: committeeData.leader,
          nextMeeting: committeeData.nextMeeting
        });
        await newCommittee.save();
        console.log(`  Created committee: ${committee.name}`);

        // Add members
        if (members && members.length > 0) {
          for (const member of members) {
            try {
              await this.addCommitteeMember(newCommittee._id, {
                userId: member.userId,
                userName: member.name,
                userRole: member.role,
                isLeader: member.isLeader || false
              });
            } catch (e) {
              // Ignore member errors
            }
          }
        }

        // Add meetings
        if (meetings && meetings.length > 0) {
          for (const meeting of meetings) {
            try {
              await this.addCommitteeMeeting(newCommittee._id, {
                title: meeting.title,
                description: meeting.description,
                date: meeting.date,
                time: meeting.time,
                location: meeting.location,
                createdBy: meeting.createdBy
              });
            } catch (e) {
              // Ignore meeting errors
            }
          }
        }

        // Add documents
        if (documents && documents.length > 0) {
          for (const doc of documents) {
            try {
              await this.addCommitteeDocument(newCommittee._id, {
                name: doc.name,
                size: doc.size,
                uploadedBy: doc.uploadedBy,
                uploadedByName: doc.uploadedBy
              });
            } catch (e) {
              // Ignore document errors
            }
          }
        }
      } catch (error) {
        console.error(`  Failed to create committee ${committee.name}:`, error.message);
      }
    }

    // Seed posts (skip if posts already exist for the committee)
    const existingPostCount = await Post.countDocuments();
    if (existingPostCount === 0) {
      for (const post of INITIAL_POSTS) {
        try {
          const { id, time, likes, comments, ...postData } = post;
          const committees = await Committee.find().lean();
          if (committees.length > 0) {
            const targetCommittee = committees[0];
            await this.createPost({ ...postData, committeeId: targetCommittee._id });
            console.log(`  Created post in committee`);
          }
        } catch (error) {
          console.error(`  Failed to create post:`, error.message);
        }
      }
    } else {
      console.log(`  Posts already exist, skipping post seed`);
    }

    // Seed system logs (skip if logs already exist)
    const existingLogCount = await SystemLog.countDocuments();
    if (existingLogCount === 0) {
      for (const log of SYSTEM_LOGS) {
        try {
          await this.addLog(log.action, log.details, log.type);
          console.log(`  Created log: ${log.action}`);
        } catch (error) {
          console.error(`  Failed to create log:`, error.message);
        }
      }
    } else {
      console.log(`  Logs already exist, skipping log seed`);
    }

    console.log('Database seeding complete');
  }
}

// Export singleton
const db = new Database();
module.exports = db;
