// Script to deduplicate events and committees - keep only 1 copy of each
// Run with: node scripts/dedup-db.js

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
  BroadcastMessage
} = require('../src/models');

async function dedup() {
  try {
    console.log('Connecting to MongoDB...\n');
    await connectDB();

    // ========== DEDUPLICATE EVENTS ==========
    console.log('--- DEDUP EVENTS ---');
    const allEvents = await Event.find().sort({ createdAt: -1 }).lean();
    console.log(`Total events: ${allEvents.length}`);

    const seenTitles = new Set();
    const eventsToDelete = [];

    for (const event of allEvents) {
      if (seenTitles.has(event.title)) {
        eventsToDelete.push(event);
      } else {
        seenTitles.add(event.title);
        console.log(`  Keeping: "${event.title}" (${event._id})`);
      }
    }

    console.log(`Removing ${eventsToDelete.length} duplicate events...`);
    for (const event of eventsToDelete) {
      await EventRegistration.deleteMany({ eventId: event._id });
      await Event.findByIdAndDelete(event._id);
    }

    // ========== DEDUPLICATE COMMITTEES ==========
    console.log('\n--- DEDUP COMMITTEES ---');
    const allCommittees = await Committee.find().sort({ createdAt: -1 }).lean();
    console.log(`Total committees: ${allCommittees.length}`);

    const seenNames = new Set();
    const committeesToDelete = [];

    for (const committee of allCommittees) {
      if (seenNames.has(committee.name)) {
        committeesToDelete.push(committee);
      } else {
        seenNames.add(committee.name);
        console.log(`  Keeping: "${committee.name}" (${committee._id})`);
      }
    }

    console.log(`Removing ${committeesToDelete.length} duplicate committees...`);
    for (const committee of committeesToDelete) {
      const cid = committee._id;
      await CommitteeMember.deleteMany({ committeeId: cid });
      await CommitteeMeeting.deleteMany({ committeeId: cid });
      await CommitteeDocument.deleteMany({ committeeId: cid });
      await CommitteeInvitation.deleteMany({ committeeId: cid });
      await JoinRequest.deleteMany({ committeeId: cid });
      const posts = await Post.find({ committeeId: cid }).lean();
      if (posts.length > 0) {
        const postIds = posts.map(p => p._id);
        await PostLike.deleteMany({ postId: { $in: postIds } });
        await PostComment.deleteMany({ postId: { $in: postIds } });
        await Post.deleteMany({ committeeId: cid });
      }
      await BroadcastMessage.deleteMany({ committeeId: cid });
      await Committee.findByIdAndDelete(cid);
    }

    // ========== FINAL STATE ==========
    console.log('\n========== FINAL STATE ==========');
    const finalEvents = await Event.find().lean();
    const finalCommittees = await Committee.find().lean();
    console.log(`Events: ${finalEvents.length}`);
    finalEvents.forEach(e => console.log(`  - ${e.title} (${e.status})`));
    console.log(`Committees: ${finalCommittees.length}`);
    finalCommittees.forEach(c => console.log(`  - ${c.name} (${c.status})`));

    console.log('\nDeduplication complete!');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

dedup();
