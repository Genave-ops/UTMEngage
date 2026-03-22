// Script to clean the database for production
// Keeps only 3 events and 3 committees, removes all related orphaned data
// Run with: node scripts/clean-db.js

require('dotenv').config();
const connectDB = require('../src/config/mongodb');
const {
  Event,
  EventRegistration,
  Committee,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeDocument,
  CommitteeInvitation,
  Post,
  PostLike,
  PostComment,
  JoinRequest,
  Report,
  Feedback,
  SystemLog,
  BroadcastMessage,
  Notification
} = require('../src/models');

// Events to KEEP (by title)
const KEEP_EVENTS = [
  "Tech Innovation Summit 2025",
  "Career Fair 2025",
  "Community Beach Cleanup"
];

// Committees to KEEP (by name)
const KEEP_COMMITTEES = [
  "Sustainability Committee",
  "Coding & Hackathon Club",
  "Industry Advisory Panel"
];

async function cleanDatabase() {
  try {
    console.log('Connecting to MongoDB...\n');
    await connectDB();

    // ========== EVENTS CLEANUP ==========
    console.log('--- EVENTS CLEANUP ---');

    const allEvents = await Event.find().lean();
    console.log(`Total events in DB: ${allEvents.length}`);

    const eventsToRemove = allEvents.filter(e => !KEEP_EVENTS.includes(e.title));
    const eventsToKeep = allEvents.filter(e => KEEP_EVENTS.includes(e.title));

    console.log(`Keeping: ${eventsToKeep.map(e => e.title).join(', ')}`);
    console.log(`Removing: ${eventsToRemove.length} events`);

    for (const event of eventsToRemove) {
      const eventId = event._id;
      console.log(`  Deleting event: "${event.title}" (${eventId})`);

      // Delete related registrations
      const regCount = await EventRegistration.countDocuments({ eventId });
      if (regCount > 0) {
        await EventRegistration.deleteMany({ eventId });
        console.log(`    - Removed ${regCount} registrations`);
      }

      // Delete the event
      await Event.findByIdAndDelete(eventId);
    }

    // ========== COMMITTEES CLEANUP ==========
    console.log('\n--- COMMITTEES CLEANUP ---');

    const allCommittees = await Committee.find().lean();
    console.log(`Total committees in DB: ${allCommittees.length}`);

    const committeesToRemove = allCommittees.filter(c => !KEEP_COMMITTEES.includes(c.name));
    const committeesToKeep = allCommittees.filter(c => KEEP_COMMITTEES.includes(c.name));

    console.log(`Keeping: ${committeesToKeep.map(c => c.name).join(', ')}`);
    console.log(`Removing: ${committeesToRemove.length} committees`);

    for (const committee of committeesToRemove) {
      const committeeId = committee._id;
      console.log(`  Deleting committee: "${committee.name}" (${committeeId})`);

      // Delete related members
      const memberCount = await CommitteeMember.countDocuments({ committeeId });
      if (memberCount > 0) {
        await CommitteeMember.deleteMany({ committeeId });
        console.log(`    - Removed ${memberCount} members`);
      }

      // Delete related meetings
      const meetingCount = await CommitteeMeeting.countDocuments({ committeeId });
      if (meetingCount > 0) {
        await CommitteeMeeting.deleteMany({ committeeId });
        console.log(`    - Removed ${meetingCount} meetings`);
      }

      // Delete related documents
      const docCount = await CommitteeDocument.countDocuments({ committeeId });
      if (docCount > 0) {
        await CommitteeDocument.deleteMany({ committeeId });
        console.log(`    - Removed ${docCount} documents`);
      }

      // Delete related invitations
      const inviteCount = await CommitteeInvitation.countDocuments({ committeeId });
      if (inviteCount > 0) {
        await CommitteeInvitation.deleteMany({ committeeId });
        console.log(`    - Removed ${inviteCount} invitations`);
      }

      // Delete related join requests
      const joinCount = await JoinRequest.countDocuments({ committeeId });
      if (joinCount > 0) {
        await JoinRequest.deleteMany({ committeeId });
        console.log(`    - Removed ${joinCount} join requests`);
      }

      // Delete related posts and their likes/comments
      const posts = await Post.find({ committeeId }).lean();
      if (posts.length > 0) {
        const postIds = posts.map(p => p._id);
        const likeCount = await PostLike.countDocuments({ postId: { $in: postIds } });
        const commentCount = await PostComment.countDocuments({ postId: { $in: postIds } });
        if (likeCount > 0) await PostLike.deleteMany({ postId: { $in: postIds } });
        if (commentCount > 0) await PostComment.deleteMany({ postId: { $in: postIds } });
        await Post.deleteMany({ committeeId });
        console.log(`    - Removed ${posts.length} posts, ${likeCount} likes, ${commentCount} comments`);
      }

      // Delete related broadcast messages
      const broadcastCount = await BroadcastMessage.countDocuments({ committeeId });
      if (broadcastCount > 0) {
        await BroadcastMessage.deleteMany({ committeeId });
        console.log(`    - Removed ${broadcastCount} broadcast messages`);
      }

      // Delete the committee
      await Committee.findByIdAndDelete(committeeId);
    }

    // ========== CLEANUP SYSTEM LOGS ==========
    console.log('\n--- SYSTEM LOGS CLEANUP ---');
    const logCount = await SystemLog.countDocuments();
    if (logCount > 0) {
      await SystemLog.deleteMany({});
      console.log(`Cleared ${logCount} system logs`);
    }

    // ========== CLEANUP NOTIFICATIONS ==========
    console.log('\n--- NOTIFICATIONS CLEANUP ---');
    const notifCount = await Notification.countDocuments();
    if (notifCount > 0) {
      await Notification.deleteMany({});
      console.log(`Cleared ${notifCount} notifications`);
    }

    // ========== CLEANUP REPORTS ==========
    console.log('\n--- REPORTS CLEANUP ---');
    const reportCount = await Report.countDocuments();
    if (reportCount > 0) {
      await Report.deleteMany({});
      console.log(`Cleared ${reportCount} reports`);
    }

    // ========== CLEANUP FEEDBACK ==========
    console.log('\n--- FEEDBACK CLEANUP ---');
    const feedbackCount = await Feedback.countDocuments();
    if (feedbackCount > 0) {
      await Feedback.deleteMany({});
      console.log(`Cleared ${feedbackCount} feedback entries`);
    }

    // ========== FINAL SUMMARY ==========
    console.log('\n========== FINAL STATE ==========');
    const finalEvents = await Event.find().lean();
    const finalCommittees = await Committee.find().lean();
    console.log(`Events remaining: ${finalEvents.length}`);
    finalEvents.forEach(e => console.log(`  - ${e.title} (${e.status})`));
    console.log(`Committees remaining: ${finalCommittees.length}`);
    finalCommittees.forEach(c => console.log(`  - ${c.name} (${c.status})`));

    console.log('\nDatabase cleaned for production!');
    process.exit(0);
  } catch (error) {
    console.error('\nCleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanDatabase();
