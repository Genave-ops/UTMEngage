// Script to clean all users except specified ones
// Run with: node scripts/clean-users.js

require('dotenv').config();
const connectDB = require('../src/config/mongodb');
const {
  User,
  EventRegistration,
  CommitteeMember,
  Post,
  PostLike,
  PostComment,
  JoinRequest,
  Notification,
  UserGoogleToken,
  BroadcastMessage
} = require('../src/models');

const KEEP_EMAILS = [
  'a.ramgoolam@utm.ac.mu',
  'superadmin@utm.ac.mu'
];

async function cleanUsers() {
  try {
    console.log('Connecting to MongoDB...\n');
    await connectDB();

    const allUsers = await User.find().lean();
    console.log(`Total users in DB: ${allUsers.length}`);

    const usersToKeep = allUsers.filter(u => KEEP_EMAILS.includes(u.email));
    const usersToRemove = allUsers.filter(u => !KEEP_EMAILS.includes(u.email));

    console.log(`\nKeeping:`);
    usersToKeep.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));

    console.log(`\nRemoving ${usersToRemove.length} users...`);

    for (const user of usersToRemove) {
      const uid = user._id;
      console.log(`  Deleting: "${user.name}" (${user.email}) [${user.role}]`);

      // Clean up related data
      const regCount = await EventRegistration.deleteMany({ userId: uid });
      if (regCount.deletedCount > 0) console.log(`    - Removed ${regCount.deletedCount} event registrations`);

      const memberCount = await CommitteeMember.deleteMany({ userId: uid });
      if (memberCount.deletedCount > 0) console.log(`    - Removed ${memberCount.deletedCount} committee memberships`);

      const posts = await Post.find({ userId: uid }).lean();
      if (posts.length > 0) {
        const postIds = posts.map(p => p._id);
        await PostLike.deleteMany({ postId: { $in: postIds } });
        await PostComment.deleteMany({ postId: { $in: postIds } });
        await Post.deleteMany({ userId: uid });
        console.log(`    - Removed ${posts.length} posts`);
      }

      await PostLike.deleteMany({ userId: uid });
      await PostComment.deleteMany({ userId: uid });

      const joinCount = await JoinRequest.deleteMany({ userId: uid });
      if (joinCount.deletedCount > 0) console.log(`    - Removed ${joinCount.deletedCount} join requests`);

      await Notification.deleteMany({ userId: uid });
      await UserGoogleToken.deleteMany({ userId: uid });

      await User.findByIdAndDelete(uid);
    }

    // Final state
    console.log('\n========== FINAL STATE ==========');
    const finalUsers = await User.find().lean();
    console.log(`Users remaining: ${finalUsers.length}`);
    finalUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));

    console.log('\nUser cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanUsers();
